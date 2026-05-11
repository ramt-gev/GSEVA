const express = require('express');
const router  = express.Router();
const pool    = require('../db');

// POST /api/whatsapp/webhook — Interakt inbound message webhook
// Interakt sends a POST when a user replies to a WhatsApp message.
// Currently logs the inbound for audit; future flows can route by keyword.
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;

    // Log inbound for audit trail
    await pool.query(
      `INSERT INTO audit_log (user_id, action, module, table_name, new_value)
       VALUES (NULL, 'WHATSAPP_INBOUND', 'webhook_whatsapp', 'audit_log', $1)`,
      [JSON.stringify({
        from:    payload?.data?.customer?.phone_number,
        message: payload?.data?.message?.message,
        type:    payload?.data?.message?.type,
      })]
    ).catch(() => {}); // non-blocking

    // Interakt requires 200 within 5 seconds
    res.json({ received: true });
  } catch (err) {
    res.json({ received: true });
  }
});

module.exports = router;
