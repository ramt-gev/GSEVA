const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const cfgCtrl = require('../controllers/configController');
const { requireAuth, requireRole } = require('../middleware/auth');

const SA = ['super_admin'];
const ADM = ['super_admin', 'management', 'module_admin'];
const MGT = ['super_admin', 'management', 'module_admin', 'dept_manager'];

router.get('/dashboard', requireAuth, ctrl.dashboardSummary);
router.get('/persons', requireAuth, ctrl.personsByType);
router.get('/pending-approvals', requireAuth, requireRole(...MGT), ctrl.pendingApprovals);
router.post('/approve/:person_id', requireAuth, requireRole(...MGT), ctrl.approvePerson);
router.post('/seva-period/:person_id', requireAuth, requireRole(...MGT), ctrl.updateVolunteerSevaPeriod);
router.put('/persons/:person_id/accommodation-meals', requireAuth, requireRole(...MGT), ctrl.updatePersonAccommodationMeals);
router.get('/audit', requireAuth, requireRole(...SA), ctrl.auditTrail);
router.get('/users', requireAuth, requireRole(...SA), ctrl.listUsers);
router.post('/users', requireAuth, requireRole(...SA), ctrl.createUser);
router.get('/config', requireAuth, cfgCtrl.getConfig);
router.put('/config', requireAuth, requireRole(...SA), cfgCtrl.updateConfig);
router.get('/departments', requireAuth, ctrl.listDepartments);
router.get('/sevaks', requireAuth, requireRole(...MGT), ctrl.listSevaks);
router.post('/sevak', requireAuth, requireRole(...MGT), ctrl.createSevak);

router.get('/festivals', requireAuth, ctrl.festivalsList);
router.put('/festivals/:festival_id', requireAuth, requireRole(...ADM), ctrl.toggleFestivalMode);
router.get('/gac-members', requireAuth, ctrl.gacMembersList);
router.get('/dept-hods', requireAuth, ctrl.deptHodsList);
router.get('/cafe-capacity', requireAuth, ctrl.cafeCapacityList);
router.post('/cafe-capacity', requireAuth, requireRole(...ADM), ctrl.declareCafeCapacity);
router.get('/zone3-upgrades', requireAuth, ctrl.zone3UpgradesToday);
router.get('/contractors', requireAuth, ctrl.contractorsListAdmin);
router.get('/contractors/pending', requireAuth, requireRole(...MGT), ctrl.pendingContractors);
router.post('/contractors/:contractor_id/approve', requireAuth, requireRole(...MGT), ctrl.approveContractor);
router.post('/register-person', requireAuth, requireRole(...ADM), ctrl.registerPerson);
router.post('/ashram/bulk-import', requireAuth, requireRole(...ADM), ctrl.ashramBulkImport);
router.get('/vf-slots', requireAuth, ctrl.vfSlotsListAdmin);
router.post('/vf-slots', requireAuth, requireRole(...MGT), ctrl.upsertVfSlot);
router.delete('/vf-slots/:slot_id', requireAuth, requireRole(...MGT), ctrl.deleteVfSlot);

router.post('/greythr/sync-staff', requireAuth, requireRole(...SA), ctrl.greythrSyncStaff);
router.post('/greythr/sync-attendance', requireAuth, requireRole(...SA), ctrl.greythrSyncAttendance);

module.exports = router;
