const axios = require('axios');
const cron  = require('node-cron');
const pool  = require('../db');
const { createQRPass, getZoneAccess } = require('./qrService');

async function syncStaff() {
  console.log('Starting Greythr staff sync...');

  try {
    const response = await axios.get(
      `${process.env.GREYTHR_BASE_URL}/employees`,
      { headers: { Authorization: `Bearer ${process.env.GREYTHR_API_KEY}` } }
    );

    const employees = response.data.employees || [];
    let created = 0, updated = 0, deactivated = 0;

    for (const emp of employees) {
      const existing = await pool.query(
        'SELECT person_id FROM persons WHERE greythr_id = $1',
        [emp.employeeId]
      );

      if (existing.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO persons
            (full_name, person_type, mobile, dept_id,
             greythr_id, status, registration_source)
           SELECT $1, 'resident_staff', $2, d.dept_id, $3, 'on_campus', 'greythr_sync'
             FROM departments d
            WHERE d.dept_name ILIKE $4
            LIMIT 1
           RETURNING person_id`,
          [emp.name, emp.mobile, emp.employeeId, emp.department]
        );

        if (result.rows.length > 0) {
          await createQRPass(
            result.rows[0].person_id,
            getZoneAccess('resident_staff'),
            new Date(), null, 1, 'permanent'
          );
          await pool.query(
            `INSERT INTO audit_log (user_id, action, module, table_name, record_id, new_value)
             VALUES (NULL, 'GREYTHR_CREATE', 'cron_greythr', 'persons', $1, $2)`,
            [result.rows[0].person_id, JSON.stringify({ greythr_id: emp.employeeId, name: emp.name })]
          );
          created++;
        }
      } else {
        await pool.query(
          `UPDATE persons SET full_name = $1, mobile = $2, updated_at = NOW()
            WHERE person_id = $3`,
          [emp.name, emp.mobile, existing.rows[0].person_id]
        );
        updated++;
      }
    }

    // Archive employees no longer in Greythr — soft delete only, never hard delete
    const activeIds = employees.map(e => e.employeeId);
    if (activeIds.length > 0) {
      const archiveResult = await pool.query(
        `UPDATE persons
            SET status = 'archived', updated_at = NOW()
          WHERE greythr_id IS NOT NULL
            AND greythr_id != ALL($1)
            AND status NOT IN ('archived','departed')
          RETURNING person_id`,
        [activeIds]
      );

      for (const row of archiveResult.rows) {
        await pool.query(
          'UPDATE qr_passes SET is_active = false WHERE person_id = $1',
          [row.person_id]
        );
        await pool.query(
          `INSERT INTO audit_log (user_id, action, module, table_name, record_id)
           VALUES (NULL, 'GREYTHR_ARCHIVE', 'cron_greythr', 'persons', $1)`,
          [row.person_id]
        );
        deactivated++;
      }
    }

    console.log(`Greythr sync done: ${created} created, ${updated} updated, ${deactivated} archived`);

  } catch (err) {
    console.error('Greythr sync error:', err.message);
  }
}

function startGreythrSync() {
  if (!process.env.GREYTHR_API_KEY || process.env.GREYTHR_API_KEY === 'REPLACE_ME') {
    console.log('Greythr sync skipped — GREYTHR_API_KEY not configured');
    return;
  }
  // 6 AM IST = 00:30 UTC
  cron.schedule('30 0 * * *', syncStaff);
  console.log('Greythr sync scheduled for 6:00 AM IST daily');
}

module.exports = { startGreythrSync, syncStaff };
