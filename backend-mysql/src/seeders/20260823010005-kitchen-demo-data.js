'use strict';
const { randomUUID } = require('crypto');

function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// Seeds one representative day of Kitchen activity — mirrors the exact
// scenario baked into the 3 prototypes (dinner today, lunch+breakfast
// tomorrow) but anchored to whatever "today" actually is when this runs,
// not a hardcoded 2026-08-08.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');
    const TODAY = toDateOnly(today);
    const TOMORROW = toDateOnly(addDays(today, 1));
    const YESTERDAY = toDateOnly(addDays(today, -1));

    const [depts] = await queryInterface.sequelize.query('SELECT dept_id, dept_code FROM departments');
    const deptId = Object.fromEntries(depts.map((d) => [d.dept_code, d.dept_id]));

    const [items] = await queryInterface.sequelize.query('SELECT catalog_item_id, item_name FROM catalog_items');
    const itemId = Object.fromEntries(items.map((i) => [i.item_name, i.catalog_item_id]));

    const [users] = await queryInterface.sequelize.query(
      "SELECT user_id, username FROM system_users WHERE username IN ('nitai.chandra','gauranga.hod','radhapriya.cd')"
    );
    const userId = Object.fromEntries(users.map((u) => [u.username, u.user_id]));
    const supervisorId = userId['nitai.chandra'] || null;
    const hodId = userId['gauranga.hod'] || null;

    // Meeting — IN_PROGRESS, awaiting HOD finalization (matches the prototypes' demo state)
    const meetingId = randomUUID();
    await queryInterface.bulkInsert('kitchen_meetings', [{
      meeting_id: meetingId,
      for_date: TODAY,
      convened_at: now,
      prasadam_taker_estimate: 640,
      quantity_notes: 'Rice +8% vs. yesterday; Dal steady.',
      machinery_status_note: 'Steam boiler #2 serviced yesterday — normal.',
      status: 'IN_PROGRESS',
      created_by: supervisorId,
      finalized_by: null,
      finalized_at: null,
      created_at: now,
      updated_at: now,
    }]);

    // Open (unlocked) menu cycle
    const cycleId = randomUUID();
    await queryInterface.bulkInsert('kitchen_menu_cycles', [{
      cycle_id: cycleId,
      start_date: TODAY,
      end_date: toDateOnly(addDays(today, 15)),
      is_locked: false,
      locked_by: null,
      locked_at: null,
      created_at: now,
    }]);

    // Menu entries
    const menuRows = [
      [TODAY, 'DEITYFL', 'DINNER', 'Chapati'],
      [TODAY, 'GUESTHSE', 'DINNER', 'Rice'],
      [TOMORROW, 'GUESTHSE', 'LUNCH', 'Rice'],
      [TOMORROW, 'BOOKDIST', 'LUNCH', 'Dal Tadka'],
      [TOMORROW, 'DEITYFL', 'BREAKFAST', 'Puri'],
      [TOMORROW, 'GOSHA', 'BREAKFAST', 'Halwa'],
      [toDateOnly(addDays(today, 3)), 'PRASADSV', 'LUNCH', 'Dal Tadka'],
    ].map(([for_date, deptCode, meal_type, item]) => ({
      menu_id: randomUUID(), for_date, dept_id: deptId[deptCode], meal_type,
      catalog_item_id: itemId[item], cycle_id: cycleId, created_by: supervisorId, created_at: now,
    }));
    await queryInterface.bulkInsert('menu_entries', menuRows);

    // BLD entries (also drives distribution_logs below)
    const bldDefs = [
      [TODAY, 'DEITYFL', 'DINNER', 'Chapati', 42, 6.4, 'KG', 'DEPT'],
      [TODAY, 'GUESTHSE', 'DINNER', 'Rice', 90, 15, 'KG', 'HR_API'],
      [TODAY, 'BOOKDIST', 'DINNER', 'Dal Tadka', 55, 7.8, 'KG', 'DEPT'],
      [TOMORROW, 'GUESTHSE', 'LUNCH', 'Rice', 118, 21.5, 'KG', 'HR_API'],
      [TOMORROW, 'BOOKDIST', 'LUNCH', 'Dal Tadka', 65, 9.2, 'KG', 'BIOMETRIC'],
      [TOMORROW, 'PRASADSV', 'LUNCH', 'Mixed Veg Sabzi', 40, 5, 'KG', 'DEPT'],
      [TOMORROW, 'DEITYFL', 'BREAKFAST', 'Puri', 42, 6.3, 'KG', 'DEPT'],
      [TOMORROW, 'GOSHA', 'BREAKFAST', 'Halwa', 20, 3, 'KG', 'DEPT'],
    ];
    const bldRows = bldDefs.map(([for_date, deptCode, meal_type, item, people_count, total_item_amount, unit, source]) => ({
      bld_id: randomUUID(), for_date, dept_id: deptId[deptCode], meal_type,
      catalog_item_id: itemId[item], people_count, total_item_amount, unit, source,
      created_by: supervisorId, created_at: now,
    }));
    await queryInterface.bulkInsert('bld_entries', bldRows);

    // Distribution logs — one PENDING row per today+tomorrow BLD entry (Collection/Distribution's starting board)
    await queryInterface.bulkInsert(
      'kitchen_distribution_logs',
      bldRows.map((b) => ({
        log_id: randomUUID(), bld_id: b.bld_id, status: 'PENDING',
        collected_at: null, delivered_at: null, actual_distributed_amount: null, submitted_at: null,
        updated_by: null, created_at: now, updated_at: now,
      }))
    );

    // Storage + wastage (kitchen_transactions)
    await queryInterface.bulkInsert('kitchen_transactions', [
      { txn_id: randomUUID(), record_type: 'STORAGE', entry_date: TODAY, catalog_item_id: itemId['Rice'], quantity: 340, unit: 'KG', status: 'HELD', remarks: 'Cold store, bay 3', reason: null, recorded_by: supervisorId, created_at: now },
      { txn_id: randomUUID(), record_type: 'STORAGE', entry_date: TODAY, catalog_item_id: itemId['Dal Tadka'], quantity: 90, unit: 'KG', status: 'PARTIALLY_RESOLVED', remarks: 'Half moved to kitchen line', reason: null, recorded_by: supervisorId, created_at: now },
      { txn_id: randomUUID(), record_type: 'WASTAGE', entry_date: TODAY, catalog_item_id: itemId['Chapati'], quantity: 4.5, unit: 'KG', status: null, remarks: null, reason: 'Over-preparation, evening batch', recorded_by: supervisorId, created_at: now },
    ]);

    // Special requests — one pre-approved (yesterday), two pending for HOD
    await queryInterface.bulkInsert('special_request_entries', [
      { request_id: randomUUID(), for_date: TODAY, dept_id: deptId['GUESTHSE'], catalog_item_id: itemId['Sweet Rice (Kheer)'], amount: 5, unit: 'KG', requested_by: 'Guest House Coordinator', status: 'REQUESTED', approved_by: null, approved_at: null, created_at: now },
      { request_id: randomUUID(), for_date: TOMORROW, dept_id: deptId['BOOKDIST'], catalog_item_id: itemId['Buttermilk'], amount: 20, unit: 'LITRE', requested_by: 'BD Coordinator', status: 'REQUESTED', approved_by: null, approved_at: null, created_at: now },
      { request_id: randomUUID(), for_date: YESTERDAY, dept_id: deptId['GOSHA'], catalog_item_id: itemId['Rice'], amount: 10, unit: 'KG', requested_by: 'Goshala Coordinator', status: 'APPROVED', approved_by: hodId, approved_at: now, created_at: now },
    ]);

    // Preaching programs
    await queryInterface.bulkInsert('preaching_program_entries', [
      { preaching_id: randomUUID(), for_date: TODAY, preacher_name: 'Bhakti Vinoda Swami', people_count: 55, catalog_item_id: itemId['Khichdi Rice'], created_by: supervisorId, created_at: now },
      { preaching_id: randomUUID(), for_date: TOMORROW, preacher_name: 'Krishna Kripa Das', people_count: 30, catalog_item_id: itemId['Puri'], created_by: supervisorId, created_at: now },
    ]);

    // Khichdi
    await queryInterface.bulkInsert('khichdi_entries', [
      { khichdi_id: randomUUID(), for_date: TODAY, morning_amount: 25, evening_amount: 18, unit: 'KG', created_at: now, updated_at: now },
      { khichdi_id: randomUUID(), for_date: YESTERDAY, morning_amount: 22, evening_amount: 20, unit: 'KG', created_at: now, updated_at: now },
    ]);

    // Procurement requests
    await queryInterface.bulkInsert('procurement_requests', [
      { procurement_id: randomUUID(), request_date: TODAY, catalog_item_id: itemId['Rice'], quantity: 300, unit: 'KG', is_supplementary: false, is_adhoc: false, cpd_partner: 'GEV Central Purchase Department', status: 'CONFIRMED', created_by: supervisorId, created_at: now },
      { procurement_id: randomUUID(), request_date: TODAY, catalog_item_id: itemId['Dal Tadka'], quantity: 80, unit: 'KG', is_supplementary: true, is_adhoc: false, cpd_partner: 'GEV Central Purchase Department', status: 'REQUESTED', created_by: supervisorId, created_at: now },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('procurement_requests', null, {});
    await queryInterface.bulkDelete('khichdi_entries', null, {});
    await queryInterface.bulkDelete('preaching_program_entries', null, {});
    await queryInterface.bulkDelete('special_request_entries', null, {});
    await queryInterface.bulkDelete('kitchen_transactions', null, {});
    await queryInterface.bulkDelete('kitchen_distribution_logs', null, {});
    await queryInterface.bulkDelete('bld_entries', null, {});
    await queryInterface.bulkDelete('menu_entries', null, {});
    await queryInterface.bulkDelete('kitchen_menu_cycles', null, {});
    await queryInterface.bulkDelete('kitchen_meetings', null, {});
  },
};
