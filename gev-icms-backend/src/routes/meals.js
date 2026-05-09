const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mealsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.post('/scan',      requireAuth, auditLog('meal_scan', 'ams', 'meal_token_events'), ctrl.scanMeal);
router.post('/tap',       requireAuth, auditLog('meal_tap',  'ams', 'free_meal_counts'),  ctrl.tapCounter);
router.get('/today',      requireAuth, ctrl.todayStats);
router.get('/registered', requireAuth, ctrl.registeredList);
router.get('/billing',    requireAuth, requireRole('super_admin','management','module_admin'), ctrl.contractorBilling);

module.exports = router;
