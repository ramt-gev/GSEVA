const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/personsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog }    = require('../middleware/audit');

const CAN_WRITE = ['super_admin', 'management', 'module_admin'];

router.get('/',     requireAuth, ctrl.list);
router.get('/:id',  requireAuth, ctrl.getById);
router.post('/',    requireAuth, requireRole(...CAN_WRITE), auditLog('CREATE_PERSON','vms','persons'), ctrl.create);
router.put('/:id',  requireAuth, requireRole(...CAN_WRITE), auditLog('UPDATE_PERSON','vms','persons'), ctrl.update);

module.exports = router;
