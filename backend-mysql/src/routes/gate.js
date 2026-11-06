const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const ctrl = require('../controllers/gateController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const { generatePass } = require('../services/passService');
const gateService = require('../services/gateService');

router.post('/scan', requireAuth, auditLog('GATE_SCAN', 'gate', 'gate_events'), ctrl.scanQR);
router.get('/stats', requireAuth, ctrl.gateStats);
router.post('/batch', requireAuth, auditLog('GATE_BATCH', 'gate', 'gate_events'), ctrl.batchEntry);
router.post(
  '/override',
  requireAuth,
  requireRole('super_admin', 'module_admin'),
  auditLog('GATE_OVERRIDE', 'gate', 'gate_events'),
  ctrl.override
);
router.post('/zone3-upgrade', requireAuth, ctrl.zone3Upgrade);

// Plain QR PNG — public (used for WhatsApp delivery). Keeps its own
// try/catch (rather than throwing to the shared JSON errorHandler) because
// this route's content type is image/png, not application/json.
router.get('/image/:qr_id', async (req, res) => {
  try {
    const img = await QRCode.toBuffer(req.params.qr_id, { width: 400, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.send(img);
  } catch (err) {
    res.status(500).send('QR generation failed');
  }
});

// Branded PDF pass — public (downloaded by person or printed at gate).
// Same reasoning as /image above: plain-text/PDF error responses, not JSON.
router.get('/pass/:qr_id', async (req, res) => {
  try {
    const passData = await gateService.getPassDetails(req.params.qr_id);
    if (!passData) return res.status(404).send('Pass not found');

    const pdf = await generatePass(passData);
    const safeName = (passData.full_name || 'pass').replace(/[^a-zA-Z0-9]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="GEV_Pass_${safeName}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error('Pass generation error:', err);
    res.status(500).send('Pass generation failed');
  }
});

module.exports = router;
