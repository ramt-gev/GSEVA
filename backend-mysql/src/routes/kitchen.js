const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/kitchenController');
const { requireAuth, requireRole } = require('../middleware/auth');

// super_admin gets oversight everywhere, same convention as the rest of the
// app (admin.js/reports.js) — the 3 real Kitchen roles are otherwise scoped
// exactly to what their prototype screen showed.
const SUPERVISOR = ['kitchen_supervisor', 'super_admin'];
const HOD = ['kitchen_hod', 'super_admin'];
const COLLECTION = ['kitchen_collection_distribution', 'super_admin'];
const SUPERVISOR_HOD = ['kitchen_supervisor', 'kitchen_hod', 'super_admin'];
const ANY_KITCHEN = ['kitchen_supervisor', 'kitchen_hod', 'kitchen_collection_distribution', 'super_admin'];

router.use(requireAuth);

// Shared overview bar + lookups
router.get('/overview', requireRole(...ANY_KITCHEN), ctrl.overview);
router.get('/historical', requireRole(...ANY_KITCHEN), ctrl.historical);
router.get('/departments', requireRole(...ANY_KITCHEN), ctrl.departments);
router.get('/catalog-items', requireRole(...ANY_KITCHEN), ctrl.catalogItems);

// Meeting — Supervisor enters, HOD finalizes, both view
router.get('/meeting', requireRole(...SUPERVISOR_HOD), ctrl.getMeeting);
router.post('/meeting', requireRole(...SUPERVISOR), ctrl.saveMeeting);
router.post('/meeting/finalize', requireRole(...HOD), ctrl.finalizeMeeting);
router.get('/meeting/summary', requireRole(...HOD), ctrl.meetingSummary);

// Menu — Supervisor plans/locks, HOD views (with filters)
router.get('/menu/cycle', requireRole(...SUPERVISOR_HOD), ctrl.menuCycle);
router.get('/menu', requireRole(...SUPERVISOR_HOD), ctrl.menuList);
router.get('/menu/sections', requireRole(...SUPERVISOR_HOD), ctrl.menuSections);
router.post('/menu', requireRole(...SUPERVISOR), ctrl.addMenu);
router.post('/menu/lock', requireRole(...SUPERVISOR), ctrl.lockMenu);

// BLD — Supervisor enters, HOD views
router.get('/bld/sections', requireRole(...SUPERVISOR_HOD), ctrl.bldSections);
router.get('/bld/dept-summary', requireRole(...SUPERVISOR_HOD), ctrl.deptSummary);
router.post('/bld', requireRole(...SUPERVISOR), ctrl.addBld);

// Storage / Wastage — Supervisor enters, HOD views
router.get('/storage', requireRole(...SUPERVISOR_HOD), ctrl.storageList);
router.post('/storage', requireRole(...SUPERVISOR), ctrl.addStorage);
router.get('/wastage', requireRole(...SUPERVISOR_HOD), ctrl.wastageList);
router.post('/wastage', requireRole(...SUPERVISOR), ctrl.addWastage);

// Special Requests — Supervisor views only, HOD approves/rejects
router.get('/special-requests', requireRole(...SUPERVISOR_HOD), ctrl.specialList);
router.post('/special-requests/:id/decide', requireRole(...HOD), ctrl.specialDecide);

// Preaching Programs — Supervisor enters, HOD views
router.get('/preaching', requireRole(...SUPERVISOR_HOD), ctrl.preachList);
router.post('/preaching', requireRole(...SUPERVISOR), ctrl.addPreach);

// Khichdi — Supervisor enters (upsert by date), HOD views
router.get('/khichdi', requireRole(...SUPERVISOR_HOD), ctrl.khichdiList);
router.post('/khichdi', requireRole(...SUPERVISOR), ctrl.saveKhichdi);

// CPD Procurement — Supervisor only, no HOD tab for this module
router.get('/procurement', requireRole(...SUPERVISOR), ctrl.procurementList);
router.post('/procurement', requireRole(...SUPERVISOR), ctrl.addProcurement);
router.get('/procurement/cpd-candidates', requireRole(...SUPERVISOR), ctrl.cpdCandidates);
router.post('/procurement/cpd-send', requireRole(...SUPERVISOR), ctrl.cpdSendBatch);

// Distribution board + collection status — Collection/Distribution role only
router.get('/distribution/board', requireRole(...COLLECTION), ctrl.distributionBoard);
router.get('/distribution/collection-status', requireRole(...COLLECTION), ctrl.collectionStatus);
router.post('/distribution/:bldId/stage', requireRole(...COLLECTION), ctrl.markStage);

// Final Distribution Count — moved to the Supervisor dashboard (see kitchenService comment)
router.get('/final-counts', requireRole(...SUPERVISOR), ctrl.finalCounts);
router.post('/final-counts/:bldId', requireRole(...SUPERVISOR), ctrl.submitFinalCount);

module.exports = router;
