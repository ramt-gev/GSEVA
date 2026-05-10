const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/adminController');
const cfgCtrl  = require('../controllers/configController');
const { requireAuth, requireRole } = require('../middleware/auth');

const SA  = ['super_admin'];
const ADM = ['super_admin', 'management', 'module_admin'];

router.get('/dashboard',              requireAuth,                          ctrl.dashboardSummary);
router.get('/persons',                requireAuth,                          ctrl.personsByType);
router.get('/pending-approvals',      requireAuth, requireRole(...ADM),     ctrl.pendingApprovals);
router.post('/approve/:person_id',    requireAuth, requireRole(...ADM),     ctrl.approvePerson);
router.get('/audit',                  requireAuth, requireRole(...SA),      ctrl.auditTrail);
router.get('/users',                  requireAuth, requireRole(...SA),      ctrl.listUsers);
router.post('/users',                 requireAuth, requireRole(...SA),      ctrl.createUser);
router.get('/config',                 requireAuth,                          cfgCtrl.getConfig);
router.put('/config',                 requireAuth, requireRole(...SA),      cfgCtrl.updateConfig);

module.exports = router;
