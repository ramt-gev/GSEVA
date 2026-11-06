const adminService = require('../services/adminService');
const greythrService = require('../services/greythrService');

async function dashboardSummary(req, res) {
  const data = await adminService.dashboardSummary();
  res.json({ data });
}

async function personsByType(req, res) {
  const result = await adminService.personsByType(req.query);
  res.json(result);
}

async function pendingApprovals(req, res) {
  const data = await adminService.pendingApprovals();
  res.json({ data });
}

async function approvePerson(req, res) {
  const result = await adminService.approvePerson(req.params.person_id, req.body, req.user, req.ip);
  res.json({ success: true, qr_id: result.qr_id, message: 'Approved and QR sent' });
}

async function updateVolunteerSevaPeriod(req, res) {
  const result = await adminService.updateVolunteerSevaPeriod(req.params.person_id, req.body, req.user, req.ip);
  res.json({ success: true, ...result });
}

async function updatePersonAccommodationMeals(req, res) {
  const result = await adminService.updatePersonAccommodationMeals(req.params.person_id, req.body, req.user, req.ip);
  res.json({ success: true, ...result });
}

async function auditTrail(req, res) {
  const data = await adminService.auditTrail(req.query);
  res.json({ data });
}

async function listUsers(req, res) {
  const data = await adminService.listUsers();
  res.json({ data });
}

async function createUser(req, res) {
  const data = await adminService.createUser(req.body, req.user.user_id);
  res.status(201).json({ data });
}

async function listDepartments(req, res) {
  const data = await adminService.listDepartments();
  res.json({ data });
}

async function createSevak(req, res) {
  const result = await adminService.createSevak(req.body, req.user.user_id, req.ip);
  res.status(201).json({ success: true, ...result });
}

async function listSevaks(req, res) {
  const result = await adminService.listSevaks(req.query, req.user);
  res.json(result);
}

async function festivalsList(req, res) {
  const data = await adminService.festivalsList();
  res.json({ data });
}

async function toggleFestivalMode(req, res) {
  const data = await adminService.toggleFestivalMode(
    req.params.festival_id, req.body.festival_mode_on, req.user.user_id, req.ip
  );
  res.json({ data });
}

async function gacMembersList(req, res) {
  const data = await adminService.gacMembersList();
  res.json({ data });
}

async function deptHodsList(req, res) {
  const data = await adminService.deptHodsList();
  res.json({ data });
}

async function cafeCapacityList(req, res) {
  const data = await adminService.cafeCapacityList(req.query);
  res.json({ data });
}

async function declareCafeCapacity(req, res) {
  const data = await adminService.declareCafeCapacity(req.body, req.user.username, req.user.user_id, req.ip);
  res.status(201).json({ data });
}

async function vfSlotsListAdmin(req, res) {
  const data = await adminService.vfSlotsListAdmin(req.query);
  res.json({ data });
}

async function upsertVfSlot(req, res) {
  const data = await adminService.upsertVfSlot(req.body, req.user.user_id, req.ip);
  res.status(201).json({ data });
}

async function deleteVfSlot(req, res) {
  const data = await adminService.deleteVfSlot(req.params.slot_id, req.user.user_id, req.ip);
  res.json(data);
}

async function zone3UpgradesToday(req, res) {
  const data = await adminService.zone3UpgradesToday(req.query);
  res.json({ data });
}

async function contractorsListAdmin(req, res) {
  const data = await adminService.contractorsListAdmin();
  res.json({ data });
}

async function pendingContractors(req, res) {
  const data = await adminService.pendingContractors();
  res.json({ data });
}

async function approveContractor(req, res) {
  const result = await adminService.approveContractor(req.params.contractor_id, req.user.user_id, req.ip);
  res.json({ success: true, ...result });
}

async function registerPerson(req, res) {
  const result = await adminService.registerPerson(req.body, req.user.user_id, req.ip);
  res.status(201).json({ success: true, ...result });
}

async function ashramBulkImport(req, res) {
  const result = await adminService.ashramBulkImport(req.body, req.user.user_id, req.ip);
  res.json({ success: true, ...result });
}

// Greythr sync normally runs on its own cron schedule (6 AM staff sync,
// hourly attendance) — these let super_admin trigger a run on demand, e.g.
// to test the integration in Swagger without waiting for the schedule.
async function greythrSyncStaff(req, res) {
  const result = await greythrService.syncStaff();
  res.status(result.success ? 200 : 502).json(result);
}

async function greythrSyncAttendance(req, res) {
  const result = await greythrService.syncAttendance();
  res.status(result.success ? 200 : 502).json(result);
}

module.exports = {
  dashboardSummary, personsByType, pendingApprovals,
  approvePerson, updateVolunteerSevaPeriod, updatePersonAccommodationMeals, auditTrail, listUsers, createUser,
  listDepartments, createSevak, listSevaks,
  festivalsList, toggleFestivalMode, gacMembersList, deptHodsList,
  cafeCapacityList, declareCafeCapacity, zone3UpgradesToday,
  contractorsListAdmin, registerPerson, ashramBulkImport,
  pendingContractors, approveContractor,
  vfSlotsListAdmin, upsertVfSlot, deleteVfSlot,
  greythrSyncStaff, greythrSyncAttendance,
};
