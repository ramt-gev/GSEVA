const pool     = require('../db');
const Razorpay = require('razorpay');
const crypto   = require('crypto');
const { createQRPass, getZoneAccess, getQRPublicURL } = require('../services/qrService');
const { sendQRPass } = require('../services/whatsappService');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/register/vf-slots — next 7 days of VF tour slots
async function getVFSlots(req, res) {
  try {
    const slots = await pool.query(
      `SELECT slot_id, tour_date, slot_time, capacity, booked_count,
              (capacity - booked_count) AS available, tour_type
         FROM vf_tour_slots
        WHERE tour_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
        ORDER BY tour_date, slot_time`
    );
    res.json({ data: slots.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/register/cafe-capacity — Govindas Zone 3 cafe availability
async function getCafeCapacity(req, res) {
  const cafe_code = (req.query.cafe || 'GGA').toUpperCase();
  const meal_type = (req.query.meal || 'lunch').toLowerCase();
  try {
    const result = await pool.query(
      `SELECT cafe_code, capacity_date, meal_type,
              threshold AS capacity, booked_count,
              (threshold - booked_count) AS available
         FROM cafe_capacity
        WHERE capacity_date = CURRENT_DATE
          AND cafe_code = $1
          AND meal_type = $2`,
      [cafe_code, meal_type]
    );
    if (result.rows.length === 0) {
      const config = await pool.query(
        "SELECT config_value FROM system_config WHERE config_key = 'cafe_daily_capacity'"
      );
      const cap = parseInt(config.rows[0]?.config_value || 50);
      return res.json({
        data: { cafe_code, meal_type, capacity: cap, booked_count: 0, available: cap }
      });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/register/payment/create — create Razorpay order
async function createPayment(req, res) {
  const { amount, purpose, person_name, mobile } = req.body;

  if (!amount || !purpose) {
    return res.status(400).json({ error: 'amount and purpose required' });
  }

  const isTestMode = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_REPLACE_ME';
  if (isTestMode) {
    return res.json({
      data: {
        order_id: 'order_test_' + Date.now(),
        amount,
        currency: 'INR',
        key_id:   process.env.RAZORPAY_KEY_ID,
        test_mode: true
      }
    });
  }

  try {
    const order = await razorpay.orders.create({
      amount:   amount * 100,
      currency: 'INR',
      notes:    { purpose, person_name, mobile }
    });
    res.json({
      data: {
        order_id: order.id,
        amount,
        currency: 'INR',
        key_id:   process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Payment creation failed' });
  }
}

// POST /api/register/payment/webhook — Razorpay payment success webhook
async function paymentWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const body      = req.body.toString();

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expected) {
    console.error('Invalid Razorpay webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = JSON.parse(body);

  if (event.event === 'payment.captured') {
    const payment  = event.payload.payment.entity;
    const order_id = payment.order_id;

    try {
      const zoneRes = await pool.query(
        `UPDATE zone_upgrade_payments
            SET payment_status = 'paid',
                razorpay_payment_id = $1,
                paid_at = NOW()
          WHERE razorpay_order_id = $2 AND payment_status = 'pending'
          RETURNING upgrade_id, qr_id`,
        [payment.id, order_id]
      );
      if (zoneRes.rows.length > 0) {
        return res.json({ received: true, kind: 'zone3_upgrade' });
      }
      console.log(`Razorpay order ${order_id} captured — no matching pending record`);
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  res.json({ received: true });
}

// POST /api/register/visitor — public visitor registration (no auth)
async function registerVisitor(req, res) {
  const {
    full_name, mobile,
    person_type = 'free_day_visitor',
    group_size,
    members,
    visit_date,
    vf_slot_id,
    lunch_indicated,
    zone3_upgrade,
    razorpay_payment_id,
    razorpay_order_id,
  } = req.body;

  if (!full_name || !mobile || !person_type) {
    return res.status(400).json({ error: 'full_name, mobile, person_type required' });
  }

  const visitDay = visit_date ? new Date(visit_date) : new Date();
  const dayEnd   = new Date(visitDay);

  // Read day-pass expiry from system_config
  let expiryTime = '20:00';
  try {
    const cfg = await pool.query(
      "SELECT config_value FROM system_config WHERE config_key = 'day_pass_valid_until'"
    );
    expiryTime = cfg.rows[0]?.config_value || '20:00';
  } catch (_) {}
  const [exHour, exMin] = expiryTime.split(':').map(Number);
  dayEnd.setHours(exHour, exMin, 0, 0);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Person row (leader only)
    const personResult = await client.query(
      `INSERT INTO persons
        (full_name, person_type, mobile, status, registration_source)
       VALUES ($1, $2, $3, 'pre_registered', 'smart_registration')
       RETURNING *`,
      [full_name, person_type, mobile]
    );
    const person = personResult.rows[0];

    // 2. Zone access — Zone 3 added if paid upgrade or paid programme
    let zones = getZoneAccess(person_type);
    if (zone3_upgrade || person_type === 'paid_day_visitor') {
      zones = [...new Set([...zones, 'zone3'])];
    }

    // 3. QR pass (must exist before group_members due to FK)
    const passType = person_type === 'paid_day_visitor' ? 'day_pass' : 'day_pass';
    const qrInsert = await client.query(
      `INSERT INTO qr_passes
        (person_id, pass_type, zone_access, valid_from, valid_until,
         group_size, programme_details, is_active)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, true)
       RETURNING *`,
      [
        person.person_id,
        passType,
        JSON.stringify(zones),
        visitDay,
        dayEnd,
        group_size || 1,
        JSON.stringify({
          lunch_indicated: !!lunch_indicated,
          razorpay_payment_id: razorpay_payment_id || null,
          razorpay_order_id:   razorpay_order_id   || null,
        })
      ]
    );
    const qrPass = qrInsert.rows[0];

    // 4. Group members (leader is member 1)
    if (members && members.length > 0) {
      let n = 1;
      for (const m of members) {
        await client.query(
          `INSERT INTO group_members
            (leader_qr_id, leader_person_id, member_number,
             full_name, age, gender, relation_to_leader)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            qrPass.qr_id, person.person_id, n++,
            m.name || m.full_name, m.age || null, m.gender || null,
            m.relation || m.relation_to_leader || (n === 2 ? 'Leader' : 'Group member')
          ]
        );
      }
    }

    // 5. VF slot booking
    if (vf_slot_id) {
      await client.query(
        `INSERT INTO vf_slot_bookings (slot_id, person_id, status)
         VALUES ($1, $2, 'confirmed')`,
        [vf_slot_id, person.person_id]
      );
    }

    // 6. Audit log (public path — user_id = NULL)
    await client.query(
      `INSERT INTO audit_log
        (user_id, action, module, table_name, record_id, new_value, ip_address)
       VALUES (NULL, 'REGISTER_VISITOR', 'public_registration', 'persons', $1, $2, $3)`,
      [person.person_id, JSON.stringify({ person_type, group_size, vf_slot_id }), req.ip]
    );

    await client.query('COMMIT');

    // 7. Send QR via WhatsApp (async — don't block response)
    const qrURL = getQRPublicURL(qrPass.qr_id);
    const validUntilStr = dayEnd.toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
    sendQRPass(mobile, qrURL, full_name, validUntilStr)
      .catch(err => console.error('WhatsApp send failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Registration complete. QR pass sent to your WhatsApp.',
      data: {
        person_id: person.person_id,
        qr_id:     qrPass.qr_id,
        qr_url:    qrURL,
        zones,
        valid_until: dayEnd.toISOString(),
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    if (err.code === '23505' && err.constraint?.includes('mobile')) {
      return res.status(409).json({
        error: 'A visitor with this mobile number is already registered for today. Please contact the gate.'
      });
    }
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  } finally {
    client.release();
  }
}

module.exports = {
  getVFSlots, getCafeCapacity,
  createPayment, paymentWebhook,
  registerVisitor
};
