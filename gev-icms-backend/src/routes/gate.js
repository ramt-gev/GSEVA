const express = require('express');
const router  = express.Router();
const QRCode  = require('qrcode');
const ctrl    = require('../controllers/gateController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog }                 = require('../middleware/audit');

// Scans need authentication; the audit row records who scanned what.
router.post('/scan',     requireAuth, auditLog('GATE_SCAN','gate','gate_events'), ctrl.scanQR);
router.get('/stats',     requireAuth, ctrl.gateStats);
router.post('/batch',    requireAuth, auditLog('GATE_BATCH','gate','gate_events'), ctrl.batchEntry);
router.post('/override', requireAuth, requireRole('super_admin','module_admin'),
                         auditLog('GATE_OVERRIDE','gate','gate_events'), ctrl.override);

// Public route — the QR is itself the credential, the image just renders it.
router.get('/image/:qr_id', async (req, res) => {
  try {
    const img = await QRCode.toBuffer(req.params.qr_id, { width: 400, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.send(img);
  } catch (err) {
    res.status(500).send('QR generation failed');
  }
});

module.exports = router;
