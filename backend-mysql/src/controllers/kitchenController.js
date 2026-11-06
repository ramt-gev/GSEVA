const svc = require('../services/kitchenService');

// Thin: parse request -> call service -> shape response. Errors bubble to
// the shared errorHandler (see authController.js's comment).

async function overview(req, res) {
  res.json({ data: await svc.getOverview() });
}
async function historical(req, res) {
  res.json({ data: await svc.getHistoricalCount(req.query) });
}
async function departments(req, res) {
  res.json({ data: await svc.listKitchenDepartments() });
}
async function catalogItems(req, res) {
  res.json({ data: await svc.listCatalogItems() });
}

async function getMeeting(req, res) {
  res.json({ data: await svc.getMeeting(req.query) });
}
async function saveMeeting(req, res) {
  res.json({ data: await svc.saveMeetingInputs(req.body, req.user.user_id) });
}
async function finalizeMeeting(req, res) {
  res.json({ data: await svc.finalizeMeeting(req.body, req.user.user_id) });
}
async function meetingSummary(req, res) {
  res.json({ data: await svc.meetingPendingSummary() });
}

async function menuCycle(req, res) {
  res.json({ data: await svc.getCurrentCycle() });
}
async function menuList(req, res) {
  res.json({ data: await svc.listMenuEntries(req.query) });
}
async function menuSections(req, res) {
  res.json({ data: await svc.menuSections() });
}
async function addMenu(req, res) {
  res.status(201).json({ data: await svc.addMenuEntry(req.body, req.user.user_id) });
}
async function lockMenu(req, res) {
  res.json({ data: await svc.lockMenuCycle(req.user.user_id) });
}

async function bldSections(req, res) {
  res.json({ data: await svc.bldSections() });
}
async function deptSummary(req, res) {
  res.json({ data: await svc.deptSummary() });
}
async function addBld(req, res) {
  res.status(201).json({ data: await svc.addBldEntry(req.body, req.user.user_id) });
}

async function storageList(req, res) {
  res.json({ data: await svc.listTransactions('STORAGE') });
}
async function addStorage(req, res) {
  res.status(201).json({ data: await svc.addTransaction('STORAGE', req.body, req.user.user_id) });
}
async function wastageList(req, res) {
  res.json({ data: await svc.listTransactions('WASTAGE') });
}
async function addWastage(req, res) {
  res.status(201).json({ data: await svc.addTransaction('WASTAGE', req.body, req.user.user_id) });
}

async function specialList(req, res) {
  res.json({ data: await svc.listSpecialRequests() });
}
async function specialDecide(req, res) {
  res.json({ data: await svc.decideSpecialRequest(req.params.id, req.body.decision, req.user.user_id) });
}

async function preachList(req, res) {
  res.json({ data: await svc.listPreaching() });
}
async function addPreach(req, res) {
  res.status(201).json({ data: await svc.addPreaching(req.body, req.user.user_id) });
}

async function khichdiList(req, res) {
  res.json({ data: await svc.listKhichdi() });
}
async function saveKhichdi(req, res) {
  res.json({ data: await svc.saveKhichdi(req.body) });
}

async function procurementList(req, res) {
  res.json({ data: await svc.listProcurement() });
}
async function addProcurement(req, res) {
  res.status(201).json({ data: await svc.addProcurement(req.body, req.user.user_id) });
}
async function cpdCandidates(req, res) {
  res.json({ data: await svc.getCpdCandidates() });
}
async function cpdSendBatch(req, res) {
  res.json({ data: await svc.sendCpdBatch(req.body, req.user.user_id) });
}

async function distributionBoard(req, res) {
  res.json({ data: await svc.getDistributionBoard() });
}
async function collectionStatus(req, res) {
  res.json({ data: await svc.listCollectionStatus() });
}
async function markStage(req, res) {
  res.json({ data: await svc.markDistributionStage(req.params.bldId, req.body.stage, req.user.user_id) });
}

async function finalCounts(req, res) {
  res.json({ data: await svc.listFinalCounts() });
}
async function submitFinalCount(req, res) {
  res.json({ data: await svc.submitFinalCount(req.params.bldId, req.body.actual_amount, req.user.user_id) });
}

module.exports = {
  overview, historical, departments, catalogItems,
  getMeeting, saveMeeting, finalizeMeeting, meetingSummary,
  menuCycle, menuList, menuSections, addMenu, lockMenu,
  bldSections, deptSummary, addBld,
  storageList, addStorage, wastageList, addWastage,
  specialList, specialDecide,
  preachList, addPreach,
  khichdiList, saveKhichdi,
  procurementList, addProcurement, cpdCandidates, cpdSendBatch,
  distributionBoard, collectionStatus, markStage,
  finalCounts, submitFinalCount,
};
