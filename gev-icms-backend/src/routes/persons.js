const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/personsController');
const { requireAuth } = require('../middleware/auth');
const { auditLog }    = require('../middleware/audit');

router.get('/',     requireAuth, ctrl.list);
router.get('/:id',  requireAuth, ctrl.getById);
router.post('/',    requireAuth, auditLog('CREATE_PERSON','vms','persons'), ctrl.create);
router.put('/:id',  requireAuth, auditLog('UPDATE_PERSON','vms','persons'), ctrl.update);

module.exports = router;
