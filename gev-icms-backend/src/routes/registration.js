const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/registrationController');
const { auditLog } = require('../middleware/audit');

// Public endpoints — no auth required.
// auditLog middleware still writes rows with user_id = NULL for the audit trail.
router.get('/public-config', ctrl.publicConfig);
router.get('/vf-slots',      ctrl.getVFSlots);
router.get('/cafe-capacity', ctrl.getCafeCapacity);

router.post('/visitor',
  auditLog('REGISTER_VISITOR', 'public_registration', 'persons'),
  ctrl.registerVisitor
);

router.post('/payment/create', ctrl.createPayment);

// Webhook needs raw body for HMAC verification
router.post('/payment/webhook',
  express.raw({ type: 'application/json' }),
  ctrl.paymentWebhook
);

module.exports = router;
