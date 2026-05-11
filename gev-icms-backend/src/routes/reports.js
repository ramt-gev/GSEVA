const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportsController');
const { requireAuth, requireRole } = require('../middleware/auth');

const SA_MGT_ADM = ['super_admin', 'management', 'module_admin'];

router.get('/hourly',    requireAuth, ctrl.hourlyGateStats);
router.get('/occupancy', requireAuth, ctrl.occupancyReport);
router.get('/gate',      requireAuth, ctrl.gateActivity);
router.get('/meals',     requireAuth, ctrl.mealConsumption);

// Police report — management+ only; supports ?format=pdf
router.get('/police', (req, res, next) => {
  // Allow token as query param for PDF download (window.open can't set headers)
  if (req.query.token && !req.headers['authorization']) {
    req.headers['authorization'] = `Bearer ${req.query.token}`;
  }
  next();
}, requireAuth, requireRole(...SA_MGT_ADM), ctrl.policeReport);

module.exports = router;
