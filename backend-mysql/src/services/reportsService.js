const PDFDoc = require('pdfkit');
const { fn, col, literal, Op, QueryTypes } = require('sequelize');
const {
  sequelize, GateEvent, Person, SystemUser, MealTokenEvent, FreeMealCount, Department,
} = require('../models');

// Hourly gate event counts for today (for the bar chart)
async function hourlyGateStats() {
  const rows = await GateEvent.findAll({
    attributes: [
      [fn('HOUR', col('scanned_at')), 'hour'],
      [fn('SUM', literal(`CASE WHEN result = 'allowed' THEN 1 ELSE 0 END`)), 'entries'],
      [fn('SUM', literal(`CASE WHEN result = 'denied' THEN 1 ELSE 0 END`)), 'denials'],
    ],
    where: literal('DATE(scanned_at) = CURDATE()'),
    group: [literal('HOUR(scanned_at)')],
    raw: true,
  });

  const slots = Array.from({ length: 24 }, (_, i) => ({ hour: i, entries: 0, denials: 0 }));
  for (const row of rows) {
    slots[row.hour].entries = Number(row.entries);
    slots[row.hour].denials = Number(row.denials);
  }
  return slots;
}

// Daily campus occupancy (current or for a past date)
async function occupancyReport({ date }) {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const byType = await Person.findAll({
    attributes: ['person_type', [fn('COUNT', col('person_id')), 'count']],
    where: { status: 'on_campus' },
    group: ['person_type'],
    order: [[literal('count'), 'DESC']],
    raw: true,
  });

  const total = await Person.count({ where: { status: 'on_campus' } });

  const [gateRow] = await GateEvent.findAll({
    attributes: [
      [fn('SUM', literal(`CASE WHEN result = 'allowed' THEN 1 ELSE 0 END`)), 'entries'],
      [fn('SUM', literal(`CASE WHEN result = 'denied' THEN 1 ELSE 0 END`)), 'denials'],
    ],
    where: sequelize.where(fn('DATE', col('scanned_at')), targetDate),
    raw: true,
  });

  return {
    date: targetDate,
    total,
    by_type: byType.map((r) => ({ ...r, count: Number(r.count) })),
    gate: { entries: Number(gateRow.entries), denials: Number(gateRow.denials) },
  };
}

// Gate activity log
async function gateActivity({ date, gate, limit = 100, offset = 0 }) {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const conditions = [sequelize.where(fn('DATE', col('scanned_at')), targetDate)];
  if (gate) conditions.push({ gate });

  const events = await GateEvent.findAll({
    where: { [Op.and]: conditions },
    include: [{ model: Person, as: 'person', required: false, attributes: ['full_name', 'person_type'] }],
    order: [['scanned_at', 'DESC']],
    limit: Number(limit),
    offset: Number(offset),
  });

  // The Postgres backend selected su.display_name, a column that does not
  // exist anywhere in the schema (system_users has no name field of its
  // own — names live on persons via person_id). This would throw
  // "column su.display_name does not exist" on every call. Fixed here by
  // resolving the scanning user's name through system_users -> persons.
  const scannerIds = [...new Set(events.map((e) => e.scanned_by).filter(Boolean))];
  const scanners = scannerIds.length
    ? await SystemUser.findAll({
        where: { user_id: scannerIds },
        include: [{ model: Person, as: 'person', attributes: ['full_name'] }],
      })
    : [];
  const scannerNameById = Object.fromEntries(scanners.map((s) => [s.user_id, s.person?.full_name || null]));

  const shapedEvents = events.map((e) => ({
    event_id: e.event_id,
    gate: e.gate,
    result: e.result,
    deny_reason: e.deny_reason,
    scanned_at: e.scanned_at,
    is_batch_count: e.is_batch_count,
    batch_count: e.batch_count,
    full_name: e.person?.full_name || null,
    person_type: e.person?.person_type || null,
    scanned_by_name: scannerNameById[e.scanned_by] || null,
  }));

  const [totalsRow] = await GateEvent.findAll({
    attributes: [
      [fn('SUM', literal(`CASE WHEN result = 'allowed' THEN 1 ELSE 0 END`)), 'entries'],
      [fn('SUM', literal(`CASE WHEN result = 'denied' THEN 1 ELSE 0 END`)), 'denials'],
      [fn('SUM', literal(`CASE WHEN result = 'manual_override' THEN 1 ELSE 0 END`)), 'overrides'],
    ],
    where: sequelize.where(fn('DATE', col('scanned_at')), targetDate),
    raw: true,
  });

  return {
    date: targetDate,
    totals: {
      entries: Number(totalsRow.entries),
      denials: Number(totalsRow.denials),
      overrides: Number(totalsRow.overrides),
    },
    events: shapedEvents,
  };
}

// Meal consumption report
async function mealConsumption({ date }) {
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const served = await MealTokenEvent.findAll({
    attributes: ['meal_type', [fn('COUNT', col('token_id')), 'count']],
    where: { meal_date: targetDate },
    group: ['meal_type'],
    raw: true,
  });

  // The Postgres backend queried free_meal_counts.count_date and .meal_type
  // — neither column exists (real names: meal_date, meal_slot — confirmed
  // against Docs/GEV_Database_Schema_v3_Final.sql). Would throw "column
  // free_meal_counts.count_date does not exist" on every call. Fixed here;
  // response key kept as `meal_type` for API-contract compatibility with
  // whatever the original intended callers to receive.
  const taps = await FreeMealCount.findAll({
    attributes: [[col('meal_slot'), 'meal_type'], [fn('SUM', col('count')), 'total']],
    where: { meal_date: targetDate },
    group: ['meal_slot'],
    raw: true,
  });

  return {
    date: targetDate,
    registered_served: served.map((r) => ({ ...r, count: Number(r.count) })),
    free_tap_counts: taps.map((r) => ({ ...r, total: Number(r.total) })),
  };
}

// Not a real person_type_enum value (not in the 16-value list) — harmless
// in the Postgres backend's NOT IN list (never matches anything), kept
// as-is since it doesn't change behavior either way.
const POLICE_REPORT_EXCLUDED_TYPES = [
  'free_day_visitor', 'paid_day_visitor', 'corporate_tour_group', 'vf_tour_visitor',
];

async function getPoliceReportRecords() {
  const placeholders = POLICE_REPORT_EXCLUDED_TYPES.map(() => '?').join(',');
  // The Postgres backend selected p.address, a column that does not exist
  // (real name: perm_address — confirmed against the schema; the
  // monthly_police_report VIEW actually uses the correct name, only this
  // hand-written controller query has the bug). Would throw "column
  // p.address does not exist" on every call — the monthly police report is
  // a compliance deliverable (CLAUDE.md), so this was a serious gap. Fixed
  // here (aliased back to `address` in the SELECT so the JSON/PDF response
  // shape is unchanged).
  return sequelize.query(
    `SELECT
       p.person_id, p.full_name, p.person_type, p.mobile, p.gender, p.date_of_birth,
       p.id_proof_type, p.id_proof_number, p.perm_address AS address, p.city, p.state, p.pincode,
       d.dept_name, ps.check_in_date, ps.check_out_date, ps.stay_type,
       c.company_name AS contractor_name
     FROM persons p
     LEFT JOIN departments d ON p.dept_id = d.dept_id
     LEFT JOIN person_stays ps ON ps.person_id = p.person_id AND ps.is_active = true
     LEFT JOIN contractor_labourers cl ON cl.person_id = p.person_id
     LEFT JOIN contractors c ON c.contractor_id = cl.contractor_id
     WHERE p.status IN ('on_campus')
       AND p.person_type NOT IN (${placeholders})
     ORDER BY p.person_type, p.full_name`,
    { replacements: POLICE_REPORT_EXCLUDED_TYPES, type: QueryTypes.SELECT }
  );
}

// Renders the branded landscape PDF and returns it as a Buffer (rather than
// piping directly to `res`) — keeps the service layer HTTP-agnostic, same
// pattern as passService.generatePass.
function generatePoliceReportPDF(records, { year, month, monthName }) {
  const doc = new PDFDoc({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  const now = new Date();

  doc.fontSize(14).font('Helvetica-Bold').text('Govardhan EcoVillage — ISKCON GEV', { align: 'center' });
  doc.fontSize(11).font('Helvetica').text(`Monthly Campus Resident Register — ${monthName}`, { align: 'center' });
  doc.text('Galtare, Hamrapur, Wada, Palghar — 421303, Maharashtra', { align: 'center' });
  doc.text(
    `Report Date: ${now.toLocaleDateString('en-IN')} · Total Records: ${records.length} · Prepared by: Premanjan P (Security HOD)`,
    { align: 'center' }
  );
  doc.moveDown(0.5);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.5);

  const cols = [28, 130, 100, 100, 90, 60, 70, 80, 95];
  const headers = ['#', 'Full Name', 'Type', 'Dept / Company', 'ID Proof', 'DOB', 'Arrived', 'Stay Until', 'Address'];
  let x = 40;
  let y = doc.y;

  doc.fontSize(8).font('Helvetica-Bold');
  headers.forEach((h, i) => {
    doc.text(h, x, y, { width: cols[i], lineBreak: false });
    x += cols[i];
  });
  doc.moveDown(0.3);
  doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
  doc.moveDown(0.2);

  doc.font('Helvetica').fontSize(7);
  records.forEach((r, idx) => {
    if (doc.y > doc.page.height - 60) {
      doc.addPage();
      doc.fontSize(7).font('Helvetica');
    }
    x = 40;
    y = doc.y;
    const idProof = r.id_proof_type && r.id_proof_number
      ? `${r.id_proof_type} ${String(r.id_proof_number).slice(-4).padStart(r.id_proof_number.length, 'X')}`
      : '—';
    const arrived = r.check_in_date ? new Date(r.check_in_date).toLocaleDateString('en-IN') : 'Permanent';
    const until = r.check_out_date ? new Date(r.check_out_date).toLocaleDateString('en-IN') : '—';
    const address = [r.address, r.city, r.state, r.pincode].filter(Boolean).join(', ');

    const cells = [
      String(idx + 1),
      r.full_name || '—',
      r.person_type?.replace(/_/g, ' ') || '—',
      r.contractor_name || r.dept_name || '—',
      idProof,
      r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('en-IN') : '—',
      arrived,
      until,
      address || '—',
    ];

    cells.forEach((cell, i) => {
      doc.text(cell, x, y, { width: cols[i] - 2, lineBreak: false, ellipsis: true });
      x += cols[i];
    });
    doc.moveDown(0.5);
  });

  doc.moveDown(1);
  doc.fontSize(8).font('Helvetica');
  doc.text('Premanjan P — Security HOD        Signature: ______________', 40);
  doc.text(`Vasudev Prabhuji — Final Authority        Signature: ______________`, 40);

  doc.end();

  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

async function policeReport({ year, month, format }) {
  const now = new Date();
  const y = parseInt(year, 10) || now.getFullYear();
  const m = parseInt(month, 10) || now.getMonth() + 1;

  const records = await getPoliceReportRecords();
  const monthName = new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  if (format === 'pdf') {
    const buffer = await generatePoliceReportPDF(records, { year: y, month: m, monthName });
    return { format: 'pdf', buffer, filename: `GEV_Police_Report_${y}_${String(m).padStart(2, '0')}.pdf` };
  }

  return { format: 'json', month: monthName, total: records.length, records };
}

// Café Revenue Summary — derived from zone_upgrade_payments (the same table
// admin's zone3-upgrades-today reads), grouped for a monthly Reports Library
// view rather than just "today".
async function cafeRevenueSummary({ month, year }) {
  const now = new Date();
  const y = parseInt(year, 10) || now.getFullYear();
  const m = parseInt(month, 10) || now.getMonth() + 1;

  const rows = await sequelize.query(
    `SELECT cafe_code, meal_type, COUNT(*) AS payment_count,
            SUM(persons_count) AS total_persons, SUM(total_amount) AS total_revenue
     FROM zone_upgrade_payments
     WHERE payment_status = 'paid' AND YEAR(meal_date) = ? AND MONTH(meal_date) = ?
     GROUP BY cafe_code, meal_type
     ORDER BY total_revenue DESC`,
    { replacements: [y, m], type: QueryTypes.SELECT }
  );

  const shaped = rows.map((r) => ({
    ...r,
    payment_count: Number(r.payment_count),
    total_persons: Number(r.total_persons),
    total_revenue: Number(r.total_revenue),
  }));

  return {
    month: new Date(y, m - 1, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
    total_revenue: shaped.reduce((sum, r) => sum + r.total_revenue, 0),
    breakdown: shaped,
  };
}

// Same 6-bucket grouping as adminService.dashboardSummary's population
// CASE, plus two buckets it has no reason to carry (dashboardSummary only
// counts on_campus people, so course_student joins Volunteers/Students here
// and the remaining 3 rarely-used types land in Others instead of being
// silently dropped).
const CATEGORY_TYPES = {
  'Room Guests': ['room_guest'],
  'Day Visitors': ['free_day_visitor', 'paid_day_visitor'],
  'Staff & Family': ['resident_staff', 'staff_dependant'],
  'Volunteers/Students': ['volunteer_seva', 'sustainability_intern', 'course_student'],
  Labourers: ['construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation'],
  Ashram: ['brahmachari', 'varishtha_vaishnava'],
  Others: ['vendor_supplier', 'corporate_tour_group', 'vip_dignitary'],
};
const TYPE_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TYPES).flatMap(([cat, types]) => types.map((t) => [t, cat]))
);
const CATEGORY_CASE_SQL = `CASE ${Object.entries(CATEGORY_TYPES)
  .map(([cat, types]) => `WHEN p.person_type IN (${types.map((t) => `'${t}'`).join(',')}) THEN '${cat}'`)
  .join(' ')} END`;

// Registration trend + roster — when each visitor type registered, not just
// who's on campus today (dashboardSummary/occupancyReport are status-scoped
// to 'on_campus'; this is scoped to created_at, so departed/pre_registered
// people still show up on the date they signed up).
async function registrationsReport({ from, to, category, search, page = 1, limit = 50 }) {
  const toDate = to || new Date().toISOString().slice(0, 10);
  const fromDate = from || new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const categoryList = category ? category.split(',').map((c) => c.trim()) : null;
  const typeFilter = categoryList ? categoryList.flatMap((c) => CATEGORY_TYPES[c] || []) : null;

  const replacements = {
    from: `${fromDate} 00:00:00`,
    to: `${toDate} 23:59:59`,
    ...(typeFilter ? { types: typeFilter } : {}),
    ...(search ? { search: `%${search}%` } : {}),
  };
  const extraSql = `${typeFilter ? ' AND p.person_type IN (:types)' : ''}${
    search ? ' AND (p.full_name LIKE :search OR p.mobile LIKE :search)' : ''
  }`;

  const trendRows = await sequelize.query(
    `SELECT DATE_FORMAT(p.created_at, '%Y-%m-%d') AS date, ${CATEGORY_CASE_SQL} AS category, COUNT(*) AS count
     FROM persons p
     WHERE p.created_at BETWEEN :from AND :to${extraSql}
     GROUP BY DATE(p.created_at), category
     ORDER BY date ASC`,
    { replacements, type: QueryTypes.SELECT }
  );

  const totalsRows = await sequelize.query(
    `SELECT ${CATEGORY_CASE_SQL} AS category, COUNT(*) AS count
     FROM persons p
     WHERE p.created_at BETWEEN :from AND :to${extraSql}
     GROUP BY category
     ORDER BY count DESC`,
    { replacements, type: QueryTypes.SELECT }
  );

  const where = { created_at: { [Op.gte]: replacements.from, [Op.lte]: replacements.to } };
  if (typeFilter) where.person_type = { [Op.in]: typeFilter };
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  const rows = await Person.findAll({
    where,
    attributes: ['person_id', 'full_name', 'mobile', 'person_type', 'status', 'created_at'],
    include: [{ model: Department, as: 'department', attributes: ['dept_name'], required: false }],
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });
  const total = await Person.count({ where });

  return {
    from: fromDate,
    to: toDate,
    trend: trendRows.map((r) => ({ date: r.date, category: r.category, count: Number(r.count) })),
    totals: totalsRows.map((r) => ({ category: r.category, count: Number(r.count) })),
    rows: rows.map((r) => ({
      person_id: r.person_id,
      full_name: r.full_name,
      mobile: r.mobile,
      person_type: r.person_type,
      category: TYPE_TO_CATEGORY[r.person_type] || 'Others',
      status: r.status,
      dept_name: r.department?.dept_name || null,
      created_at: r.created_at,
    })),
    total,
    page: Number(page),
    limit: Number(limit),
  };
}

module.exports = {
  hourlyGateStats, occupancyReport, gateActivity, mealConsumption, policeReport,
  cafeRevenueSummary, registrationsReport,
};
