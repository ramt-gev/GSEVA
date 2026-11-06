const { fn, col, literal, QueryTypes } = require('sequelize');
const {
  sequelize, QrPass, Person, Department, MealRegistration, MealTokenEvent, FreeMealCount,
} = require('../models');
const { ValidationError } = require('../errors/AppError');

const MEAL_SLOTS = {
  breakfast: { label: 'Breakfast', time: '07:15-08:15', billing_relevant: true },
  khichadi_am: { label: 'Khichadi AM', time: '09:30-12:30', billing_relevant: false },
  free_lunch: { label: 'Free Lunch', time: '12:45-14:30', billing_relevant: false },
  khichadi_pm: { label: 'Khichadi PM', time: '16:00-19:30', billing_relevant: false },
  dinner: { label: 'Dinner', time: '18:30-19:15', billing_relevant: true },
};

function buildMealPersonResponse(person) {
  return {
    name: person.full_name,
    type: person.person_type,
    dept: person.dept_name || '—',
    person_id: person.person_id,
    group_size: person.group_size || 1,
  };
}

async function scanMeal({ qr_id, meal_type }, scannedByUserId) {
  if (!qr_id || !meal_type) throw new ValidationError('qr_id and meal_type required');
  if (!MEAL_SLOTS[meal_type]) throw new ValidationError('Invalid meal_type');

  const qrPass = await QrPass.findOne({
    where: { qr_id, is_active: true },
    include: [{ model: Person, as: 'person', include: [{ model: Department, as: 'department' }] }],
  });

  if (!qrPass) {
    return { result: 'deny', reason: 'QR not found or inactive' };
  }

  const person = {
    person_id: qrPass.person.person_id,
    full_name: qrPass.person.full_name,
    person_type: qrPass.person.person_type,
    dept_name: qrPass.person.department?.dept_name || null,
    group_size: qrPass.group_size || 1,
  };

  let reg_id = null;
  if (MEAL_SLOTS[meal_type].billing_relevant) {
    const reg = await MealRegistration.findOne({
      where: { person_id: person.person_id, meal_type, is_active: true },
    });
    if (!reg) {
      return {
        result: 'deny',
        person: buildMealPersonResponse(person),
        reason: `${person.full_name} is not registered for ${MEAL_SLOTS[meal_type].label}`,
      };
    }
    reg_id = reg.reg_id;
  }

  const dup = await MealTokenEvent.findOne({
    where: { person_id: person.person_id, meal_type, meal_date: fn('CURDATE') },
  });
  if (dup) {
    return {
      result: 'already_served',
      person: buildMealPersonResponse(person),
      message: `${person.full_name} already received ${MEAL_SLOTS[meal_type].label} today`,
    };
  }

  await MealTokenEvent.create({
    person_id: person.person_id,
    reg_id,
    meal_type,
    meal_date: sequelize.literal('CURDATE()'),
    served_by: scannedByUserId,
    group_size: person.group_size,
  });

  return { result: 'served', person: buildMealPersonResponse(person), meal: MEAL_SLOTS[meal_type].label };
}

async function tapCounter({ meal_type, count = 1 }, recordedByUserId) {
  if (!meal_type || !MEAL_SLOTS[meal_type]) throw new ValidationError('Valid meal_type required');
  if (MEAL_SLOTS[meal_type].billing_relevant) {
    throw new ValidationError('Tap counter is for free meals only — use /scan for B/D');
  }

  await FreeMealCount.create({
    meal_date: sequelize.literal('CURDATE()'),
    meal_slot: meal_type,
    count,
    entry_type: count > 1 ? 'bulk' : 'single',
    recorded_by: recordedByUserId,
  });

  const [{ total }] = await sequelize.query(
    `SELECT
       COALESCE((SELECT SUM(count) FROM free_meal_counts WHERE meal_date = CURDATE() AND meal_slot = ?), 0)
       + COALESCE((SELECT COUNT(*) FROM meal_token_events WHERE meal_date = CURDATE() AND meal_type = ?), 0)
       AS total`,
    { replacements: [meal_type, meal_type], type: QueryTypes.SELECT }
  );

  return { success: true, meal_type, tap_count: count, total_today: parseInt(total, 10) };
}

async function todayStats() {
  // SUM(group_size), not COUNT(*) — a scanned QR can be a day-visitor group
  // (one row, group_size>1); B/D rows are always group_size=1 (staff don't
  // have groups) so this doesn't change those numbers at all.
  const slotCounts = await MealTokenEvent.findAll({
    attributes: [
      'meal_type',
      [fn('SUM', col('group_size')), 'scanned'],
      [fn('SUM', literal('CASE WHEN reg_id IS NOT NULL THEN group_size ELSE 0 END')), 'bd_scanned'],
      [fn('SUM', literal('CASE WHEN reg_id IS NULL THEN group_size ELSE 0 END')), 'free_scanned'],
    ],
    where: literal('meal_date = CURDATE()'),
    group: ['meal_type'],
    raw: true,
  });

  const tapCounts = await FreeMealCount.findAll({
    attributes: ['meal_slot', [fn('SUM', col('count')), 'tapped']],
    where: literal('meal_date = CURDATE()'),
    group: ['meal_slot'],
    raw: true,
  });

  const registered = await Person.findAll({
    attributes: ['person_type', [fn('COUNT', col('person_id')), 'count']],
    where: {
      status: ['on_campus', 'pre_registered'],
      person_type: [
        'resident_staff', 'staff_dependant', 'brahmachari', 'varishtha_vaishnava',
        'volunteer_seva', 'construction_labourer', 'weekly_labourer_local',
        'weekly_labourer_outstation', 'course_student',
      ],
    },
    group: ['person_type'],
    raw: true,
  });

  // Day visitors who ticked "Annakshetra Free Lunch" on Smart Registration —
  // stored on qr_passes.programme_details (JSON), never in a countable table.
  // This is the planning number (indicated), separate from slot_counts'
  // free_lunch (actually scanned/served) — Annakshetra wants both.
  const [{ lunch_indicated }] = await sequelize.query(
    `SELECT COALESCE(SUM(COALESCE(group_size, 1)), 0) AS lunch_indicated
     FROM qr_passes
     WHERE pass_type = 'day_pass'
       AND DATE(valid_from) = CURDATE()
       AND JSON_UNQUOTE(JSON_EXTRACT(programme_details, '$.lunch_indicated')) = 'true'`,
    { type: QueryTypes.SELECT }
  );

  return {
    slot_counts: slotCounts.map((r) => ({ ...r, scanned: Number(r.scanned), bd_scanned: Number(r.bd_scanned), free_scanned: Number(r.free_scanned) })),
    tap_counts: tapCounts.map((r) => ({ ...r, tapped: Number(r.tapped) })),
    registered_bd: registered.map((r) => ({ ...r, count: Number(r.count) })),
    lunch_indicated_today: Number(lunch_indicated),
    date: new Date().toLocaleDateString('en-IN'),
  };
}

async function registeredList({ meal_type = 'breakfast' }) {
  if (!['breakfast', 'dinner'].includes(meal_type)) {
    throw new ValidationError('meal_type must be breakfast or dinner');
  }

  const rows = await sequelize.query(
    `SELECT
       p.full_name, p.person_type, p.mobile, d.dept_name,
       mr.payment_method,
       CASE WHEN mte.token_id IS NOT NULL THEN true ELSE false END AS served_today
     FROM meal_registrations mr
     JOIN persons p ON mr.person_id = p.person_id
     LEFT JOIN departments d ON p.dept_id = d.dept_id
     LEFT JOIN meal_token_events mte
       ON mte.person_id = p.person_id
      AND mte.meal_type = mr.meal_type
      AND mte.meal_date = CURDATE()
     WHERE mr.is_active = TRUE
       AND mr.meal_type = ?
       AND p.status IN ('on_campus','pre_registered')
     ORDER BY p.person_type, p.full_name`,
    { replacements: [meal_type], type: QueryTypes.SELECT }
  );

  // MySQL/MariaDB have no native boolean type — CASE WHEN...THEN true comes
  // back as 1/0, unlike Postgres's real JSON true/false. Normalize so the
  // API contract matches exactly (matters if any consumer does === true).
  const data = rows.map((r) => ({ ...r, served_today: Boolean(r.served_today) }));
  return { data, count: data.length };
}

// GET /api/meals/billing — reproduces the Postgres backend's
// monthly_billing_summary VIEW as a plain query rather than a real MySQL
// view (per plan: views only earn a real DB view when something outside
// the app — e.g. phpMyAdmin browsing — needs them; this one is only ever
// read from here). Rate still comes from system_config, never hardcoded
// (CLAUDE.md invariant 2). NOTE: month/year query params are accepted but
// unused, matching the Postgres backend's view exactly — it aggregates
// current active registrations only, with no date-range filter.
async function contractorBilling() {
  return sequelize.query(
    `SELECT
       d.dept_name, d.dept_code, dh.hod_name, cl.contractor_id, c.company_name AS contractor_company,
       mr.payment_method,
       COUNT(DISTINCT mr.person_id) AS registered_persons,
       COUNT(DISTINCT CASE WHEN mr.meal_type IN ('breakfast','dinner') THEN mr.person_id END) AS bd_registered,
       COUNT(DISTINCT mr.person_id) * (SELECT CAST(config_value AS DECIMAL(12,2)) FROM system_config WHERE config_key = 'bd_monthly_rate') AS monthly_amount_to_recover,
       CURDATE() AS report_month
     FROM meal_registrations mr
     LEFT JOIN persons p ON mr.person_id = p.person_id
     LEFT JOIN departments d ON p.dept_id = d.dept_id
     LEFT JOIN dept_hods dh ON dh.dept_code = d.dept_code
     LEFT JOIN contractor_labourers cl ON p.person_id = cl.person_id
     LEFT JOIN contractors c ON cl.contractor_id = c.contractor_id
     WHERE mr.is_active = TRUE
       AND mr.meal_type IN ('breakfast', 'dinner')
       AND mr.payment_method != 'self_paid'
       AND cl.contractor_id IS NOT NULL
     GROUP BY d.dept_name, d.dept_code, dh.hod_name, cl.contractor_id, c.company_name, mr.payment_method
     ORDER BY monthly_amount_to_recover DESC`,
    { type: QueryTypes.SELECT }
  );
}

module.exports = { scanMeal, tapCounter, todayStats, registeredList, contractorBilling, MEAL_SLOTS };
