const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize, Department, CatalogItem, SystemUser, Person, FestivalEvent,
  KitchenMeeting, KitchenMenuCycle, MenuEntry, BldEntry, KitchenTransaction,
  SpecialRequestEntry, PreachingProgramEntry, KhichdiEntry, ProcurementRequest,
  KitchenDistributionLog, KitchenWeatherSnapshot,
} = require('../models');
const { ValidationError, NotFoundError, ConflictError } = require('../errors/AppError');

const MEAL_ORDER = ['DINNER', 'LUNCH', 'BREAKFAST'];
const DEPT_CODES = ['DEITYFL', 'BOOKDIST', 'GUESTHSE', 'PRASADSV', 'GOSHA'];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// Dinner is planned/served for today; Lunch and Breakfast are planned the
// evening before, for tomorrow — matches all 3 prototypes' mealSectionDate().
function mealSectionDate(meal, today = todayStr()) {
  return meal === 'DINNER' ? today : addDaysStr(today, 1);
}
function personName(user) {
  return user?.person?.full_name || user?.username || null;
}

// ---------- Shared context: overview bar (Prasadam count / weather / event) ----------

async function dailyPeopleTotal(for_date) {
  const [bldTotal, preachTotal] = await Promise.all([
    BldEntry.sum('people_count', { where: { for_date } }),
    PreachingProgramEntry.sum('people_count', { where: { for_date } }),
  ]);
  return Number(bldTotal || 0) + Number(preachTotal || 0);
}

async function getOverview() {
  const today = todayStr();
  const yesterday = addDaysStr(today, -1);
  const tomorrow = addDaysStr(today, 1);

  const [todayTotal, yesterdayTotal, weather, festival] = await Promise.all([
    dailyPeopleTotal(today),
    dailyPeopleTotal(yesterday),
    KitchenWeatherSnapshot.findOne({ where: { for_date: tomorrow } }),
    FestivalEvent.findOne({ where: { festival_date: { [Op.gte]: today } }, order: [['festival_date', 'ASC']] }),
  ]);

  return {
    today: { date: today, total: todayTotal },
    yesterday: { date: yesterday, total: yesterdayTotal },
    weather: weather
      ? { date: tomorrow, condition_text: weather.condition_text, temp_c: Number(weather.temp_c), rain_mm: Number(weather.rain_mm) }
      : null,
    event:
      festival && festival.festival_date <= tomorrow
        ? { date: festival.festival_date, name: festival.festival_name, expected_attendance: festival.expected_footfall }
        : null,
  };
}

async function getHistoricalCount({ date }) {
  if (!date) throw new ValidationError('date is required');
  const total = await dailyPeopleTotal(date);
  const festival = await FestivalEvent.findOne({ where: { festival_date: date } });
  return { date, total, event: festival ? festival.festival_name : null };
}

// ---------- Lookups (departments this subsystem plans against, catalog items) ----------

async function listKitchenDepartments() {
  return Department.findAll({
    where: { dept_code: DEPT_CODES },
    attributes: ['dept_id', 'dept_name', 'dept_code'],
    order: [['dept_name', 'ASC']],
  });
}

async function listCatalogItems() {
  return CatalogItem.findAll({
    where: { is_active: true },
    attributes: ['catalog_item_id', 'item_name', 'default_unit'],
    order: [['item_name', 'ASC']],
  });
}

// ---------- Meeting ----------

async function getMeeting({ for_date } = {}) {
  const date = for_date || todayStr();
  const meeting = await KitchenMeeting.findOne({
    where: { for_date: date },
    include: [
      { model: SystemUser, as: 'creator', include: [{ model: Person, as: 'person' }], required: false },
      { model: SystemUser, as: 'finalizer', include: [{ model: Person, as: 'person' }], required: false },
    ],
  });
  if (!meeting) return { for_date: date, status: null };

  return {
    for_date: meeting.for_date,
    convened_at: meeting.convened_at,
    prasadam_taker_estimate: meeting.prasadam_taker_estimate,
    quantity_notes: meeting.quantity_notes,
    machinery_status_note: meeting.machinery_status_note,
    status: meeting.status,
    created_by_name: personName(meeting.creator),
    finalized_by_name: personName(meeting.finalizer),
    finalized_at: meeting.finalized_at,
  };
}

// Supervisor-only — convenes/updates today's meeting inputs. Upsert by
// for_date; status always stays/returns to IN_PROGRESS here (only
// finalizeMeeting moves it to FINALIZED).
async function saveMeetingInputs(body, currentUserId) {
  const { for_date, prasadam_taker_estimate, quantity_notes, machinery_status_note } = body;
  const date = for_date || todayStr();

  const [meeting, created] = await KitchenMeeting.findOrCreate({
    where: { for_date: date },
    defaults: {
      convened_at: new Date(),
      prasadam_taker_estimate: prasadam_taker_estimate ?? null,
      quantity_notes: quantity_notes || null,
      machinery_status_note: machinery_status_note || null,
      status: 'IN_PROGRESS',
      created_by: currentUserId,
    },
  });

  if (!created) {
    if (meeting.status === 'FINALIZED') {
      throw new ConflictError("Today's meeting is already finalized by the HOD — inputs can no longer be changed");
    }
    await meeting.update({
      convened_at: new Date(),
      prasadam_taker_estimate: prasadam_taker_estimate ?? meeting.prasadam_taker_estimate,
      quantity_notes: quantity_notes ?? meeting.quantity_notes,
      machinery_status_note: machinery_status_note ?? meeting.machinery_status_note,
    });
  }

  return getMeeting({ for_date: date });
}

// HOD-only — approves & finalizes the day's plan.
async function finalizeMeeting({ for_date }, currentUserId) {
  const date = for_date || todayStr();
  const meeting = await KitchenMeeting.findOne({ where: { for_date: date } });
  if (!meeting) throw new NotFoundError('No meeting has been convened for this date yet');
  if (meeting.status === 'FINALIZED') throw new ConflictError('Meeting is already finalized');

  await meeting.update({ status: 'FINALIZED', finalized_by: currentUserId, finalized_at: new Date() });
  return getMeeting({ for_date: date });
}

async function meetingPendingSummary() {
  const today = todayStr();
  const [pendingSR, bldCount, lockedTotal] = await Promise.all([
    SpecialRequestEntry.count({ where: { status: 'REQUESTED' } }),
    BldEntry.count(),
    BldEntry.sum('people_count', { where: { for_date: { [Op.lte]: today } } }),
  ]);
  return { pending_special_requests: pendingSR, bld_rows_logged: bldCount, locked_total_people: Number(lockedTotal || 0) };
}

// ---------- Menu (15-day cycle) ----------

async function getCurrentCycle() {
  let cycle = await KitchenMenuCycle.findOne({ order: [['created_at', 'DESC']] });
  if (!cycle) {
    const today = todayStr();
    cycle = await KitchenMenuCycle.create({ start_date: today, end_date: addDaysStr(today, 15), is_locked: false });
  }
  return cycle;
}

async function listMenuEntries({ dept_id, meal_type } = {}) {
  const today = todayStr();
  const where = { for_date: { [Op.between]: [today, addDaysStr(today, 15)] } };
  if (dept_id) where.dept_id = dept_id;
  if (meal_type) where.meal_type = meal_type;

  const rows = await MenuEntry.findAll({
    where,
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      { model: SystemUser, as: 'creator', include: [{ model: Person, as: 'person' }], required: false },
    ],
    order: [['for_date', 'ASC']],
  });

  return rows.map((r) => ({
    for_date: r.for_date,
    department: r.department?.dept_name,
    meal_type: r.meal_type,
    item: r.item?.item_name,
    created_by: personName(r.creator) || 'System',
  }));
}

// Upcoming-meals sections: Dinner (today) → Lunch → Breakfast (tomorrow) —
// the same grouping every dashboard shows first.
async function menuSections() {
  const today = todayStr();
  const sections = [];
  for (const meal of MEAL_ORDER) {
    const for_date = mealSectionDate(meal, today);
    const rows = await MenuEntry.findAll({
      where: { for_date, meal_type: meal },
      include: [
        { model: Department, as: 'department', attributes: ['dept_name'] },
        { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      ],
    });
    sections.push({
      meal_type: meal,
      for_date,
      rows: rows.map((r) => ({ department: r.department?.dept_name, item: r.item?.item_name })),
    });
  }
  return sections;
}

async function addMenuEntry(body, currentUserId) {
  const { for_date, dept_id, meal_type, catalog_item_id } = body;
  if (!for_date || !dept_id || !meal_type || !catalog_item_id) {
    throw new ValidationError('for_date, dept_id, meal_type, catalog_item_id are required');
  }

  const cycle = await getCurrentCycle();
  if (cycle.is_locked) throw new ConflictError('The current 15-day menu cycle is locked — no further rows can be added');

  return MenuEntry.create({ for_date, dept_id, meal_type, catalog_item_id, cycle_id: cycle.cycle_id, created_by: currentUserId });
}

async function lockMenuCycle(currentUserId) {
  const cycle = await getCurrentCycle();
  if (cycle.is_locked) throw new ConflictError('Cycle is already locked');
  await cycle.update({ is_locked: true, locked_by: currentUserId, locked_at: new Date() });
  return cycle;
}

// ---------- BLD (Breakfast / Lunch / Dinner) ----------

// Booking window: editable day-before, until 12:00 PM — locks automatically,
// no manual "lock" action anywhere in any of the 3 prototypes.
function isBldLocked(for_date, today = todayStr()) {
  const lockDate = addDaysStr(for_date, -1);
  if (lockDate < today) return true;
  if (lockDate === today) return new Date().getHours() >= 12;
  return false;
}

async function bldSections() {
  const today = todayStr();
  const sections = [];
  for (const meal of MEAL_ORDER) {
    const for_date = mealSectionDate(meal, today);
    const rows = await BldEntry.findAll({
      where: { for_date, meal_type: meal },
      include: [
        { model: Department, as: 'department', attributes: ['dept_name'] },
        { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      ],
      order: [['created_at', 'ASC']],
    });
    sections.push({
      meal_type: meal,
      for_date,
      locked: isBldLocked(for_date, today),
      rows: rows.map((r) => ({
        department: r.department?.dept_name, item: r.item?.item_name,
        people_count: r.people_count, total_item_amount: Number(r.total_item_amount), unit: r.unit, source: r.source,
      })),
    });
  }
  return sections;
}

async function deptSummary() {
  const today = todayStr();
  const tomorrow = addDaysStr(today, 1);

  const rows = await BldEntry.findAll({
    where: { [Op.or]: [{ for_date: today, meal_type: 'DINNER' }, { for_date: tomorrow, meal_type: { [Op.in]: ['LUNCH', 'BREAKFAST'] } }] },
    include: [{ model: Department, as: 'department', attributes: ['dept_name'] }],
  });

  const byDept = {};
  for (const r of rows) {
    const name = r.department?.dept_name || 'Unknown';
    byDept[name] = byDept[name] || { department: name, dinner: 0, lunch: 0, breakfast: 0 };
    if (r.meal_type === 'DINNER') byDept[name].dinner += r.people_count;
    if (r.meal_type === 'LUNCH') byDept[name].lunch += r.people_count;
    if (r.meal_type === 'BREAKFAST') byDept[name].breakfast += r.people_count;
  }

  return {
    dinner_date: today,
    lunch_date: tomorrow,
    breakfast_date: tomorrow,
    rows: Object.values(byDept).map((d) => ({ ...d, total: d.dinner + d.lunch + d.breakfast })),
  };
}

async function addBldEntry(body, currentUserId) {
  const { for_date, dept_id, meal_type, catalog_item_id, people_count, total_item_amount, unit, source } = body;
  if (!for_date || !dept_id || !meal_type || !catalog_item_id) {
    throw new ValidationError('for_date, dept_id, meal_type, catalog_item_id are required');
  }

  const entry = await BldEntry.create({
    for_date, dept_id, meal_type, catalog_item_id,
    people_count: Number(people_count) || 0,
    total_item_amount: Number(total_item_amount) || 0,
    unit: unit || 'KG',
    source: source || 'DEPT',
    created_by: currentUserId,
  });

  // A distribution board row should exist the moment the item is plannable —
  // Collection/Distribution reads it well before anything is finalized.
  await KitchenDistributionLog.create({ bld_id: entry.bld_id, status: 'PENDING' });

  return entry;
}

// ---------- Storage / Wastage (kitchen_transactions) ----------

async function listTransactions(record_type) {
  const rows = await KitchenTransaction.findAll({
    where: { record_type },
    include: [
      { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      { model: SystemUser, as: 'recorder', include: [{ model: Person, as: 'person' }], required: false },
    ],
    order: [['entry_date', 'DESC'], ['created_at', 'DESC']],
  });

  return rows.map((r) => ({
    entry_date: r.entry_date, item: r.item?.item_name, quantity: Number(r.quantity), unit: r.unit,
    status: r.status, remarks: r.remarks, reason: r.reason, recorded_by: personName(r.recorder) || 'System',
  }));
}

async function addTransaction(record_type, body, currentUserId) {
  const { catalog_item_id, quantity, unit, status, remarks, reason, entry_date } = body;
  if (!catalog_item_id) throw new ValidationError('catalog_item_id is required');
  if (record_type === 'STORAGE' && !status) throw new ValidationError('status is required for a storage entry');

  return KitchenTransaction.create({
    record_type,
    entry_date: entry_date || todayStr(),
    catalog_item_id,
    quantity: Number(quantity) || 0,
    unit: unit || 'KG',
    status: record_type === 'STORAGE' ? status : null,
    remarks: record_type === 'STORAGE' ? remarks || null : null,
    reason: record_type === 'WASTAGE' ? reason || null : null,
    recorded_by: currentUserId,
  });
}

// ---------- Special Requests ----------

async function listSpecialRequests() {
  const rows = await SpecialRequestEntry.findAll({
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      { model: SystemUser, as: 'approver', include: [{ model: Person, as: 'person' }], required: false },
    ],
    order: [['for_date', 'DESC']],
  });

  return rows.map((r) => ({
    request_id: r.request_id, for_date: r.for_date, department: r.department?.dept_name, item: r.item?.item_name,
    amount: Number(r.amount), unit: r.unit, requested_by: r.requested_by, status: r.status,
    approved_by: personName(r.approver), approved_at: r.approved_at,
  }));
}

// HOD-only — the one module in this whole subsystem where this role writes.
async function decideSpecialRequest(request_id, decision, currentUserId) {
  if (!['APPROVED', 'REJECTED'].includes(decision)) throw new ValidationError('decision must be APPROVED or REJECTED');
  const row = await SpecialRequestEntry.findByPk(request_id);
  if (!row) throw new NotFoundError('Special request not found');
  if (row.status !== 'REQUESTED') throw new ConflictError('This request has already been decided');

  await row.update({ status: decision, approved_by: currentUserId, approved_at: new Date() });
  return row;
}

// ---------- Preaching Programs ----------

async function listPreaching() {
  const rows = await PreachingProgramEntry.findAll({
    include: [{ model: CatalogItem, as: 'item', attributes: ['item_name'] }],
    order: [['for_date', 'DESC']],
  });
  return rows.map((r) => ({ for_date: r.for_date, preacher_name: r.preacher_name, people_count: r.people_count, item: r.item?.item_name }));
}

async function addPreaching(body, currentUserId) {
  const { for_date, preacher_name, people_count, catalog_item_id } = body;
  if (!for_date || !catalog_item_id) throw new ValidationError('for_date and catalog_item_id are required');

  return PreachingProgramEntry.create({
    for_date, preacher_name: preacher_name?.trim() || 'Unnamed Preacher',
    people_count: Number(people_count) || 0, catalog_item_id, created_by: currentUserId,
  });
}

// ---------- Khichdi ----------

async function listKhichdi() {
  const rows = await KhichdiEntry.findAll({ order: [['for_date', 'DESC']] });
  return rows.map((r) => ({ for_date: r.for_date, morning_amount: Number(r.morning_amount), evening_amount: Number(r.evening_amount), unit: r.unit }));
}

// Upsert by for_date (khichdi_entries.for_date is UNIQUE).
async function saveKhichdi(body) {
  const { for_date, morning_amount, evening_amount, unit } = body;
  if (!for_date) throw new ValidationError('for_date is required');

  const [row] = await KhichdiEntry.findOrCreate({
    where: { for_date },
    defaults: { morning_amount: Number(morning_amount) || 0, evening_amount: Number(evening_amount) || 0, unit: unit || 'KG' },
  });
  await row.update({ morning_amount: Number(morning_amount) || 0, evening_amount: Number(evening_amount) || 0, unit: unit || 'KG' });
  return row;
}

// ---------- CPD Procurement ----------

async function listProcurement() {
  const rows = await ProcurementRequest.findAll({
    include: [{ model: CatalogItem, as: 'item', attributes: ['item_name'] }],
    order: [['request_date', 'DESC'], ['created_at', 'DESC']],
  });
  return rows.map((r) => ({
    request_date: r.request_date, item: r.item?.item_name, quantity: Number(r.quantity), unit: r.unit,
    is_supplementary: r.is_supplementary, is_adhoc: r.is_adhoc, status: r.status,
  }));
}

async function addProcurement(body, currentUserId) {
  const { catalog_item_id, quantity, unit, is_supplementary, is_adhoc, cpd_partner } = body;
  if (!catalog_item_id) throw new ValidationError('catalog_item_id is required');

  return ProcurementRequest.create({
    request_date: todayStr(), catalog_item_id, quantity: Number(quantity) || 0, unit: unit || 'KG',
    is_supplementary: !!is_supplementary, is_adhoc: !!is_adhoc,
    cpd_partner: cpd_partner || 'GEV Central Purchase Department', status: 'REQUESTED', created_by: currentUserId,
  });
}

// Candidate items to send to CPD: upcoming (not-yet-requested) menu items,
// and items currently sitting in storage. Suggested quantities are a
// starting point only — both lists are qty-editable before sending, same as
// the prototype's own inline qty inputs.
async function getCpdCandidates() {
  const today = todayStr();

  const menuRows = await MenuEntry.findAll({
    where: { for_date: { [Op.gt]: today } },
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: CatalogItem, as: 'item', attributes: ['catalog_item_id', 'item_name', 'default_unit'] },
    ],
    order: [['for_date', 'ASC']],
    limit: 20,
  });
  const menu_candidates = menuRows.map((r) => ({
    catalog_item_id: r.catalog_item_id, item: r.item?.item_name, unit: r.item?.default_unit || 'KG',
    context: `${r.meal_type.charAt(0)}${r.meal_type.slice(1).toLowerCase()} · ${r.department?.dept_name} · ${r.for_date}`,
    suggested_qty: 10,
  }));

  const storageRows = await KitchenTransaction.findAll({
    where: { record_type: 'STORAGE', status: { [Op.in]: ['HELD', 'PARTIALLY_RESOLVED'] } },
    include: [{ model: CatalogItem, as: 'item', attributes: ['catalog_item_id', 'item_name', 'default_unit'] }],
    order: [['entry_date', 'DESC']],
  });
  const storage_candidates = storageRows.map((r) => ({
    catalog_item_id: r.catalog_item_id, item: r.item?.item_name, unit: r.item?.default_unit || 'KG',
    context: `Storage — ${r.status}, ${Number(r.quantity)} ${r.unit} on hand`,
    suggested_qty: Math.max(1, Math.round(Number(r.quantity) / 5)),
  }));

  return { menu_candidates, storage_candidates };
}

async function sendCpdBatch({ selections }, currentUserId) {
  if (!Array.isArray(selections) || selections.length === 0) throw new ValidationError('selections must be a non-empty array');

  const rows = await Promise.all(
    selections.map((s) =>
      ProcurementRequest.create({
        request_date: todayStr(), catalog_item_id: s.catalog_item_id, quantity: Number(s.quantity) || 0,
        unit: s.unit || 'KG', is_supplementary: s.source === 'storage', is_adhoc: false,
        cpd_partner: 'GEV Central Purchase Department', status: 'REQUESTED', created_by: currentUserId,
      })
    )
  );
  return { created: rows.length };
}

// ---------- Distribution board (Collection/Distribution role) ----------

// Today's finalized plan for handoff: dinner (today) + lunch/breakfast
// (tomorrow) BLD rows, each paired with its distribution_logs row, plus
// today's khichdi and preaching programs — gated by whether the meeting for
// `today` has been finalized by the HOD.
async function getDistributionBoard() {
  const today = todayStr();
  const tomorrow = addDaysStr(today, 1);

  const meeting = await KitchenMeeting.findOne({
    where: { for_date: today },
    include: [{ model: SystemUser, as: 'finalizer', include: [{ model: Person, as: 'person' }], required: false }],
  });

  const bldRows = await BldEntry.findAll({
    where: { [Op.or]: [{ for_date: today, meal_type: 'DINNER' }, { for_date: tomorrow, meal_type: { [Op.in]: ['LUNCH', 'BREAKFAST'] } }] },
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      { model: KitchenDistributionLog, as: 'distribution' },
    ],
    order: [['meal_type', 'ASC']],
  });

  const sections = MEAL_ORDER.map((meal) => ({
    meal_type: meal,
    for_date: mealSectionDate(meal, today),
    rows: bldRows
      .filter((r) => r.meal_type === meal)
      .map((r) => ({
        bld_id: r.bld_id, department: r.department?.dept_name, item: r.item?.item_name,
        people_count: r.people_count, total_item_amount: Number(r.total_item_amount), unit: r.unit,
        status: r.distribution?.status || 'PENDING', collected_at: r.distribution?.collected_at || null,
        delivered_at: r.distribution?.delivered_at || null,
      })),
  }));

  const [khichdi, preaching] = await Promise.all([
    KhichdiEntry.findOne({ where: { for_date: today } }),
    PreachingProgramEntry.findAll({
      where: { for_date: today },
      include: [{ model: CatalogItem, as: 'item', attributes: ['item_name'] }],
    }),
  ]);

  return {
    finalized: meeting?.status === 'FINALIZED',
    finalized_by: personName(meeting?.finalizer),
    finalized_at: meeting?.finalized_at || null,
    dept_summary: await deptSummary(),
    sections,
    khichdi: khichdi ? { morning_amount: Number(khichdi.morning_amount), evening_amount: Number(khichdi.evening_amount), unit: khichdi.unit } : null,
    preaching: preaching.map((p) => ({ preacher_name: p.preacher_name, people_count: p.people_count, item: p.item?.item_name })),
  };
}

async function listCollectionStatus() {
  const today = todayStr();
  const tomorrow = addDaysStr(today, 1);

  const rows = await BldEntry.findAll({
    where: { [Op.or]: [{ for_date: today, meal_type: 'DINNER' }, { for_date: tomorrow, meal_type: { [Op.in]: ['LUNCH', 'BREAKFAST'] } }] },
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      { model: KitchenDistributionLog, as: 'distribution' },
    ],
    order: [['meal_type', 'ASC']],
  });

  return rows.map((r) => ({
    bld_id: r.bld_id,
    item_label: `${r.item?.item_name} (${r.department?.dept_name} · ${r.meal_type.charAt(0)}${r.meal_type.slice(1).toLowerCase()})`,
    department: r.department?.dept_name,
    status: r.distribution?.status || 'PENDING',
  }));
}

// M5.1 (collected from kitchen) and M5.5 (delivered to department) are
// separate events each stamped at its own time — enforced as a strict
// PENDING -> COLLECTED -> DELIVERED sequence.
async function markDistributionStage(bld_id, stage, currentUserId) {
  if (!['COLLECTED', 'DELIVERED'].includes(stage)) throw new ValidationError('stage must be COLLECTED or DELIVERED');

  const log = await KitchenDistributionLog.findOne({ where: { bld_id } });
  if (!log) throw new NotFoundError('No distribution record for this item');
  if (stage === 'COLLECTED' && log.status !== 'PENDING') throw new ConflictError('Item is not pending collection');
  if (stage === 'DELIVERED' && log.status !== 'COLLECTED') throw new ConflictError('Item must be collected before it can be delivered');

  const patch = { status: stage, updated_by: currentUserId };
  if (stage === 'COLLECTED') patch.collected_at = new Date();
  if (stage === 'DELIVERED') patch.delivered_at = new Date();
  await log.update(patch);
  return log;
}

// ---------- Final Distribution Count (Supervisor tab, per the prototypes' note) ----------

async function listFinalCounts() {
  const today = todayStr();
  const rows = await BldEntry.findAll({
    where: { for_date: today, meal_type: 'DINNER' },
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: CatalogItem, as: 'item', attributes: ['item_name'] },
      { model: KitchenDistributionLog, as: 'distribution' },
    ],
  });

  return rows.map((r) => ({
    bld_id: r.bld_id,
    item_label: `${r.item?.item_name} (${r.department?.dept_name} · Dinner)`,
    expected: `${Number(r.total_item_amount)} ${r.unit}`,
    actual: r.distribution?.actual_distributed_amount != null ? Number(r.distribution.actual_distributed_amount) : null,
    submitted: !!r.distribution?.submitted_at,
  }));
}

async function submitFinalCount(bld_id, actual_amount, currentUserId) {
  const log = await KitchenDistributionLog.findOne({ where: { bld_id } });
  if (!log) throw new NotFoundError('No distribution record for this item');
  if (log.submitted_at) throw new ConflictError('Final count already submitted for this item');

  await log.update({ actual_distributed_amount: Number(actual_amount) || 0, submitted_at: new Date(), updated_by: currentUserId });
  return log;
}

module.exports = {
  getOverview, getHistoricalCount,
  listKitchenDepartments, listCatalogItems,
  getMeeting, saveMeetingInputs, finalizeMeeting, meetingPendingSummary,
  getCurrentCycle, listMenuEntries, menuSections, addMenuEntry, lockMenuCycle,
  bldSections, deptSummary, addBldEntry,
  listTransactions, addTransaction,
  listSpecialRequests, decideSpecialRequest,
  listPreaching, addPreaching,
  listKhichdi, saveKhichdi,
  listProcurement, addProcurement, getCpdCandidates, sendCpdBatch,
  getDistributionBoard, listCollectionStatus, markDistributionStage,
  listFinalCounts, submitFinalCount,
};
