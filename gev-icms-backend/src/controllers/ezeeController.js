const pool = require('../db');
const { createQRPass, getZoneAccess, getQRPublicURL } = require('../services/qrService');
const { sendQRPass } = require('../services/whatsappService');

async function handleBooking(req, res) {
  const secret = req.headers['x-ezee-secret'];
  if (secret !== process.env.EZEE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const booking = req.body;

  try {
    const { GuestName, GuestMobile, CheckIn, CheckOut, BookingID, Adults } = booking;

    // Match by mobile — room_guest mobile is unique (partial-unique excludes staff_dependant only)
    const existing = await pool.query(
      `SELECT person_id FROM persons WHERE mobile = $1 AND person_type = 'room_guest'`,
      [GuestMobile]
    );

    let person_id;
    if (existing.rows.length > 0) {
      person_id = existing.rows[0].person_id;
      await pool.query(
        `UPDATE persons
            SET full_name = $1, ezee_guest_id = $2, status = 'on_campus', updated_at = NOW()
          WHERE person_id = $3`,
        [GuestName, BookingID, person_id]
      );
      await pool.query(
        `UPDATE qr_passes SET is_active = false WHERE person_id = $1`, [person_id]
      );
    } else {
      const personResult = await pool.query(
        `INSERT INTO persons
          (full_name, person_type, mobile, ezee_guest_id, status, registration_source)
         VALUES ($1, 'room_guest', $2, $3, 'on_campus', 'ezee_sync')
         RETURNING person_id`,
        [GuestName, GuestMobile, BookingID]
      );
      person_id = personResult.rows[0].person_id;
    }

    await pool.query(
      `INSERT INTO person_stays
        (person_id, stay_type, check_in_date, check_out_date,
         is_overnight, is_active, ezee_reservation_id, booking_source)
       VALUES ($1, 'overnight', $2, $3, true, true, $4, 'ezee')`,
      [person_id, CheckIn, CheckOut, BookingID]
    );

    const qrPass = await createQRPass(
      person_id, getZoneAccess('room_guest'),
      CheckIn, CheckOut, Adults || 1, 'stay_pass'
    );

    await pool.query(
      `INSERT INTO audit_log (user_id, action, module, table_name, record_id, new_value)
       VALUES (NULL, 'EZEE_BOOKING', 'webhook_ezee', 'persons', $1, $2)`,
      [person_id, JSON.stringify({ booking_id: BookingID, guest: GuestName })]
    );

    if (GuestMobile) {
      sendQRPass(
        GuestMobile,
        getQRPublicURL(qrPass.qr_id),
        GuestName,
        new Date(CheckOut).toLocaleDateString('en-IN')
      ).catch(err => console.error('WhatsApp failed:', err.message));
    }

    res.json({ success: true, person_id, qr_id: qrPass.qr_id });

  } catch (err) {
    console.error('eZee booking webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckout(req, res) {
  const secret = req.headers['x-ezee-secret'];
  if (secret !== process.env.EZEE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { BookingID, GuestMobile } = req.body;

  try {
    await pool.query(
      `UPDATE person_stays
          SET is_active = false, actual_check_out = NOW()
        WHERE ezee_reservation_id = $1`,
      [BookingID]
    );
    await pool.query(
      `UPDATE persons SET status = 'departed', updated_at = NOW()
        WHERE mobile = $1 AND person_type = 'room_guest'`,
      [GuestMobile]
    );
    await pool.query(
      `UPDATE qr_passes qp
          SET is_active = false
         FROM persons p
        WHERE qp.person_id = p.person_id
          AND p.mobile = $1
          AND p.person_type = 'room_guest'`,
      [GuestMobile]
    );

    await pool.query(
      `INSERT INTO audit_log (user_id, action, module, table_name, new_value)
       VALUES (NULL, 'EZEE_CHECKOUT', 'webhook_ezee', 'persons', $1)`,
      [JSON.stringify({ booking_id: BookingID, mobile: GuestMobile })]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('eZee checkout webhook error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { handleBooking, handleCheckout };
