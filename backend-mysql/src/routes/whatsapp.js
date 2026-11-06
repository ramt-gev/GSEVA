const express = require('express');
const router = express.Router();
const { AuditLog } = require('../models');

// POST /api/whatsapp/webhook — Interakt inbound message webhook
// Interakt sends a POST when a user replies to a WhatsApp message.
// Currently logs the inbound for audit; future flows can route by keyword.
router.post('/webhook', async (req, res) => {
  try {
    const payload = req.body;

    // Log inbound for audit trail (non-blocking — never fail the webhook response over this)
    AuditLog.create({
      user_id: null,
      action: 'WHATSAPP_INBOUND',
      module: 'webhook_whatsapp',
      table_name: 'audit_log',
      new_value: {
        from: payload?.data?.customer?.phone_number,
        message: payload?.data?.message?.message,
        type: payload?.data?.message?.type,
      },
    }).catch(() => {});

    // Interakt requires 200 within 5 seconds
    res.json({ received: true });
  } catch (err) {
    res.json({ received: true });
  }
});

module.exports = router;
