# GEV ICMS — Phase 4 Prompt for Claude Code
## Visitor Registration + Razorpay + WhatsApp QR Delivery

---

## WHAT IS ALREADY DONE

- Database running with all tables
- Auth API working
- Persons CRUD working
- QR scan API working
- Gate Tablet App connected to real backend

## WHAT WE ARE BUILDING IN THIS PHASE

The complete visitor registration loop:
1. Visitor fills the Smart Registration Page on their phone
2. Pays online via Razorpay (for paid visits)
3. System creates their person record + QR pass
4. QR pass image sent to their WhatsApp via Interakt
5. Visitor arrives at gate, scans QR, gets allowed

This is the most important user-facing flow. When this works, real visitors can register themselves.

---

## STEP 1: INSTALL NEW DEPENDENCIES

```bash
npm install razorpay axios
```

---

## STEP 2: ADD TO .env

```env
# Razorpay (get from razorpay.com dashboard)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# Interakt WhatsApp (get from app.interakt.ai)
INTERAKT_API_KEY=your_interakt_api_key
INTERAKT_BASE_URL=https://api.interakt.ai/v1/public

# App URL (used in QR links)
APP_BASE_URL=http://localhost:3000
```

---

## STEP 3: WHATSAPP SERVICE

Create `src/services/whatsappService.js`:

```javascript
const axios = require('axios');

const BASE = process.env.INTERAKT_BASE_URL;
const KEY  = process.env.INTERAKT_API_KEY;

// Send a WhatsApp text message
async function sendMessage(mobile, message) {
  try {
    await axios.post(`${BASE}/message/`, {
      countryCode: '+91',
      phoneNumber: mobile.replace('+91','').replace(/\s/g,''),
      callbackData: 'gev-icms',
      type: 'Text',
      data: { message }
    }, {
      headers: { Authorization: `Basic ${KEY}` }
    });
    console.log(`WhatsApp sent to ${mobile}`);
  } catch (err) {
    console.error('WhatsApp send error:', err.response?.data || err.message);
  }
}

// Send QR pass image via WhatsApp
async function sendQRPass(mobile, qr_image_url, person_name, valid_until) {
  try {
    // First send text message with details
    await sendMessage(mobile,
      `Hare Krishna ${person_name}!\n\nYour GEV Campus QR Pass is ready.\n` +
      `Valid until: ${valid_until}\n\n` +
      `Show this QR at the gate. Jai Govardhan! 🙏`
    );

    // Then send QR image
    await axios.post(`${BASE}/message/`, {
      countryCode: '+91',
      phoneNumber: mobile.replace('+91','').replace(/\s/g,''),
      callbackData: 'gev-qr-pass',
      type: 'Image',
      data: {
        mediaUrl: qr_image_url,
        caption:  `GEV Campus QR Pass — ${person_name}`
      }
    }, {
      headers: { Authorization: `Basic ${KEY}` }
    });

    console.log(`QR pass sent to ${mobile} for ${person_name}`);
  } catch (err) {
    console.error('WhatsApp QR send error:', err.response?.data || err.message);
  }
}

// Send nightly forecast
async function sendNightlyForecast(mobile, forecastData) {
  const msg =
    `GEV Annakshetra — Tomorrow's Forecast\n\n` +
    `Breakfast: ${forecastData.breakfast}\n` +
    `Free Lunch: ${forecastData.free_lunch} (est.)\n` +
    `Dinner: ${forecastData.dinner}\n\n` +
    `Breakdown:\n` +
    `Staff: ${forecastData.staff}\n` +
    `Volunteers: ${forecastData.volunteers}\n` +
    `Labourers: ${forecastData.labourers}\n` +
    `Students: ${forecastData.students}\n\n` +
    `Jai Govardhan! 🙏`;
  await sendMessage(mobile, msg);
}

module.exports = { sendMessage, sendQRPass, sendNightlyForecast };
```

---

## STEP 4: QR IMAGE GENERATION + STORAGE

For now we will serve QR images directly from the API as base64.
In production you would upload to S3 — but for Phase 4 this is fine.

Update `src/services/qrService.js` — add this function:

```javascript
const QRCode = require('qrcode');

// Generate QR as base64 data URL
async function generateQRDataURL(qr_id) {
  return await QRCode.toDataURL(qr_id, {
    width: 400, margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
}

// For WhatsApp we need a public URL — for now serve from our API.
// In production: upload to S3 and return S3 URL.
// The image route lives under /api/gate (where the rest of the QR plumbing
// is), so the URL must match.
function getQRPublicURL(qr_id) {
  return `${process.env.APP_BASE_URL}/api/gate/image/${qr_id}`;
}

module.exports = { createQRPass, generateQRImage, generateQRDataURL, getQRPublicURL, getZoneAccess };
```

Add a QR image endpoint to your gate routes (`src/routes/gate.js`):

```javascript
// GET /api/gate/image/:qr_id — returns QR code as PNG image.
// Public route — the QR is the credential; serving the image doesn't reveal
// anything beyond what the visitor's WhatsApp message already shows them.
router.get('/image/:qr_id', async (req, res) => {
  const QRCode = require('qrcode');
  const img = await QRCode.toBuffer(req.params.qr_id, { width: 400, margin: 2 });
  res.setHeader('Content-Type', 'image/png');
  res.send(img);
});
```

---

## STEP 5: REGISTRATION CONTROLLER

Create `src/controllers/registrationController.js`:

```javascript
const pool      = require('../db');
const Razorpay  = require('razorpay');
const crypto    = require('crypto');
const { createQRPass, getZoneAccess, getQRPublicURL } = require('../services/qrService');
const { sendQRPass } = require('../services/whatsappService');

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/register/vf-slots — live VF tour slot availability.
// Source of truth is vf_tour_slots (with booked_count maintained by trigger).
// Returns next 7 days of slots.
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

// GET /api/register/cafe-capacity — Govindas Zone 3 café availability.
// Defaults to GGA + lunch (the typical Smart Reg flow). Pass ?cafe=GGA&meal=lunch
// for explicit selection. Falls back to system_config.cafe_daily_capacity if
// the manager hasn't declared today's capacity yet.
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

// POST /api/payments/create — create Razorpay order.
//
// v4 has no general `payments` table and no `visitor_registrations` table.
// For now we treat the Razorpay order_id as the link key and let the webhook
// look up the matching record by looking in `zone_upgrade_payments` (Zone 3
// upgrade flow) or in `vf_slot_bookings` / `qr_passes.programme_details`
// (paid day visit and VF tour bookings). Scoping to those tables means each
// purpose has a dedicated home — no generic ledger needed.
//
// If a generic ledger becomes necessary later, add a `payments` table and
// migrate. Until then: every Razorpay order corresponds to exactly one
// domain row that the calling controller already knows how to find.
async function createPayment(req, res) {
  const { amount, purpose, person_name, mobile } = req.body;

  if (!amount || !purpose) {
    return res.status(400).json({ error: 'amount and purpose required' });
  }

  try {
    const order = await razorpay.orders.create({
      amount:   amount * 100, // Razorpay uses paise
      currency: 'INR',
      notes:    { purpose, person_name, mobile }
    });

    res.json({
      data: {
        order_id:   order.id,
        amount:     amount,
        currency:   'INR',
        key_id:     process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (err) {
    console.error('Payment create error:', err);
    res.status(500).json({ error: 'Payment creation failed' });
  }
}

// POST /api/payments/webhook — Razorpay payment success webhook.
//
// Public endpoint, signature-verified. On success, the webhook checks each
// table that could own this order_id and finalises that flow.
async function paymentWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const body      = JSON.stringify(req.body);

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expected) {
    console.error('Invalid Razorpay webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const event = req.body;

  if (event.event === 'payment.captured') {
    const payment  = event.payload.payment.entity;
    const order_id = payment.order_id;

    try {
      // Try Zone 3 upgrade first (most common Razorpay flow at SBT Gate)
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
        // The cafe_capacity_recount trigger will update booked_count
        // automatically once cafe_booking_confirmed is set elsewhere.
        return res.json({ received: true, kind: 'zone3_upgrade' });
      }

      // TODO: extend with paid_day_visit and VF tour booking lookups when
      // those flows are wired. For now log and move on.
      console.log(`Razorpay order ${order_id} captured but no matching record`);

    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  res.json({ received: true });
}

// POST /api/register/visitor — main registration endpoint (public — no auth).
//
// Schema notes:
// - `persons` carries identity only. Validity dates and group_size live on
//   the leader's `qr_passes` row. There's no `email` or `lunch_indicated`
//   column on persons — capture meal preference in `qr_passes.programme_details`.
// - `group_members.leader_qr_id` is NOT NULL and FKs to qr_passes(qr_id),
//   so we create the QR pass first, then insert members.
// - vf_slot_bookings has only (slot_id, person_id, status) — date/time are
//   on vf_tour_slots. Look the slot up by id.
// - `mobile` is partial-unique except for staff_dependant; group members are
//   stored in group_members (not as their own persons rows).
async function registerVisitor(req, res) {
  const {
    full_name, mobile,
    person_type, group_size,
    members,          // array of { full_name, age, gender, relation_to_leader }
    visit_date,
    vf_slot_id,       // UUID from /api/register/vf-slots
    lunch_indicated,
    zone3_upgrade
  } = req.body;

  if (!full_name || !mobile || !person_type) {
    return res.status(400).json({ error: 'full_name, mobile, person_type required' });
  }

  const visitDay = visit_date ? new Date(visit_date) : new Date();
  const dayEnd   = new Date(visitDay);
  dayEnd.setHours(20, 0, 0, 0);  // default day-pass expiry — overridden by system_config

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Persons row (leader only — group members are tracked in group_members)
    const personResult = await client.query(
      `INSERT INTO persons
        (full_name, person_type, mobile, status, registration_source)
       VALUES ($1, $2, $3, 'pre_registered', 'smart_registration')
       RETURNING *`,
      [full_name, person_type, mobile]
    );
    const person = personResult.rows[0];

    // 2. Compute zone access
    let zones = getZoneAccess(person_type);
    if (zone3_upgrade) zones = [...new Set([...zones, 'zone3'])];

    // 3. QR pass (created before group_members because they FK to qr_id).
    //    Capture lunch_indicated as a flag in programme_details JSON.
    const qrInsert = await client.query(
      `INSERT INTO qr_passes
        (person_id, pass_type, zone_access, valid_from, valid_until,
         group_size, programme_details, is_active)
       VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7::jsonb, true)
       RETURNING *`,
      [
        person.person_id,
        'day_pass',
        JSON.stringify(zones),
        visitDay,
        dayEnd,
        group_size || 1,
        JSON.stringify({ lunch_indicated: !!lunch_indicated })
      ]
    );
    const qrPass = qrInsert.rows[0];

    // 4. Group members (member_number 1 = leader, then 2,3,4...)
    if (members && members.length > 0) {
      let n = 2;
      for (const m of members) {
        await client.query(
          `INSERT INTO group_members
            (leader_qr_id, leader_person_id, member_number,
             full_name, age, gender, relation_to_leader)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            qrPass.qr_id, person.person_id, n++,
            m.full_name, m.age || null, m.gender || null,
            m.relation_to_leader || m.relation || null
          ]
        );
      }
    }

    // 5. VF slot booking — caller passes the slot_id from /api/register/vf-slots
    if (vf_slot_id) {
      await client.query(
        `INSERT INTO vf_slot_bookings (slot_id, person_id, status)
         VALUES ($1, $2, 'confirmed')`,
        [vf_slot_id, person.person_id]
      );
      // The vf_slot_bookings_count_trg trigger updates vf_tour_slots.booked_count.
    }

    await client.query('COMMIT');

    // 6. Send QR via WhatsApp (async — do not await)
    const qrURL = getQRPublicURL(qrPass.qr_id);
    sendQRPass(mobile, qrURL, full_name, new Date(qrPass.valid_until).toLocaleDateString('en-IN'))
      .catch(err => console.error('WhatsApp send failed:', err.message));

    res.status(201).json({
      success: true,
      message: 'Registration complete. QR pass sent to your WhatsApp.',
      data: {
        person_id: person.person_id,
        qr_id:     qrPass.qr_id,
        qr_url:    qrURL,
        zones:     zones
      }
    });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
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
```

Create `src/routes/registration.js`:
```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/registrationController');
const { auditLog } = require('../middleware/audit');

// Public endpoints — no auth required.
// auditLog still runs (with user_id = NULL) so the action is on the trail.
// The `module` field captures the source.
router.get('/vf-slots',        ctrl.getVFSlots);
router.get('/cafe-capacity',   ctrl.getCafeCapacity);
router.post('/visitor',        auditLog('REGISTER_VISITOR','public_registration','persons'), ctrl.registerVisitor);
router.post('/payment/create', ctrl.createPayment);
// Razorpay webhook needs the raw body to verify the signature.
router.post('/payment/webhook',
  express.raw({type: 'application/json'}),
  auditLog('RAZORPAY_WEBHOOK','webhook_razorpay','zone_upgrade_payments'),
  ctrl.paymentWebhook
);

module.exports = router;
```

Add to `src/index.js`:
```javascript
app.use('/api/register', require('./routes/registration'));
```

---

## STEP 6: CONNECT SMART REGISTRATION PAGE TO REAL API

Open `GEV_Smart_Registration_Page.html`.

Find where VF slot availability is fetched and replace with:
```javascript
async function loadVFSlots() {
  const resp = await fetch('http://localhost:3000/api/register/vf-slots');
  const data = await resp.json();
  // populate the slot selector with data.data
}
```

Find the form submission and replace with:
```javascript
async function submitRegistration(formData) {
  const resp = await fetch('http://localhost:3000/api/register/visitor', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(formData)
  });
  const result = await resp.json();
  if (result.success) {
    showSuccessScreen(result.data);
  }
}
```

---

## DONE WHEN

1. `POST /api/register/visitor` creates a person + QR pass in the database
2. QR image accessible at `GET /api/qr/image/:qr_id` as PNG
3. WhatsApp message sent to mobile (check Interakt dashboard for delivery)
4. The QR from WhatsApp can be scanned in the Gate Tablet App and returns ALLOW
5. Razorpay test payment completes and triggers webhook
6. Smart Registration Page form submits successfully

This is the first complete end-to-end loop:
**Visitor registers → Pays → Gets QR on WhatsApp → Scans at gate → Allowed**

When this loop works — Phase 4 is complete. Move to Phase 5.

---

## DO NOT DO IN THIS PHASE

- Do not build the canteen app yet
- Do not build eZee integration yet
- Do not build Zone 3 upgrade payment yet (next phase)
- Do not build admin portal backend yet

---

*Next phase: Phase 5 — Canteen App + Annakshetra meal management*
