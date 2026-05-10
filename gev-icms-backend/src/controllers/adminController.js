const pool = require('../db');

async function dashboardSummary(req, res) {
  try {
    const today = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE person_type = 'room_guest')                                  AS room_guests,
         COUNT(*) FILTER (WHERE person_type IN ('free_day_visitor','paid_day_visitor'))       AS day_visitors,
         COUNT(*) FILTER (WHERE person_type IN ('resident_staff','staff_dependant'))          AS staff,
         COUNT(*) FILTER (WHERE person_type IN ('volunteer_seva','sustainability_intern'))    AS volunteers_students,
         COUNT(*) FILTER (WHERE person_type IN (
           'construction_labourer','weekly_labourer_local','weekly_labourer_outstation'
         ))                                                                                   AS labourers,
         COUNT(*) FILTER (WHERE person_type IN ('brahmachari','varishtha_vaishnava'))         AS ashram,
         COUNT(*)                                                                             AS total
       FROM persons
       WHERE status = 'on_campus'`
    );

    const gateToday = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'allowed') AS entries,
         COUNT(*) FILTER (WHERE result = 'denied')  AS denials
       FROM gate_events
       WHERE scanned_at::date = CURRENT_DATE`
    );

    const mealsToday = await pool.query(
      `SELECT meal_type, COUNT(*) AS served
       FROM meal_token_events
       WHERE meal_date = CURRENT_DATE
       GROUP BY meal_type`
    );

    const pending = await pool.query(
      `SELECT COUNT(*) AS count FROM contractor_labourers WHERE approval_status = 'pending'`
    );

    res.json({
      data: {
        population:       today.rows[0],
        gate:             gateToday.rows[0],
        meals:            mealsToday.rows,
        pending_approvals: parseInt(pending.rows[0].count)
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function personsByType(req, res) {
  const { type, page = 1, limit = 50, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = [`p.status IN ('on_campus','pre_registered')`];
    const params   = [];

    if (type) {
      params.push(type);
      conditions.push(`p.person_type = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.full_name ILIKE $${params.length} OR p.mobile ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT
         p.*, d.dept_name,
         qp.qr_id, qp.valid_until, qp.zone_access, qp.is_active AS qr_active
       FROM persons p
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       LEFT JOIN qr_passes qp  ON qp.person_id = p.person_id AND qp.is_active = true
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, count: result.rows.length, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function pendingApprovals(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         p.person_id, p.full_name, p.person_type, p.mobile,
         p.created_at, p.dept_id, d.dept_name,
         cl.cl_id, cl.camp_location, cl.annakshetra_bd_opted,
         con.company_name AS contractor_name
       FROM contractor_labourers cl
       JOIN persons p      ON p.person_id = cl.person_id
       JOIN contractors con ON con.contractor_id = cl.contractor_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       WHERE cl.approval_status = 'pending'
       ORDER BY p.created_at ASC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function approvePerson(req, res) {
  const { person_id } = req.params;
  const { valid_from, valid_until, group_size } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const cl = await client.query(
      `SELECT cl_id FROM contractor_labourers
        WHERE person_id = $1 AND approval_status = 'pending'`,
      [person_id]
    );
    if (cl.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No pending approval for this person' });
    }

    await client.query(
      `UPDATE contractor_labourers
          SET approval_status = 'approved', approved_by = $1, approved_at = NOW()
        WHERE cl_id = $2`,
      [req.user.user_id, cl.rows[0].cl_id]
    );

    await client.query(
      `UPDATE persons SET status = 'on_campus', updated_at = NOW() WHERE person_id = $1`,
      [person_id]
    );

    const personResult = await client.query(
      'SELECT * FROM persons WHERE person_id = $1', [person_id]
    );
    const person = personResult.rows[0];

    const { createQRPass, getZoneAccess, getQRPublicURL } = require('../services/qrService');
    const zones  = getZoneAccess(person.person_type);
    const qrPass = await createQRPass(
      person_id, zones,
      valid_from  || new Date(),
      valid_until || null,
      group_size  || 1,
      'stay_pass'
    );

    await client.query('COMMIT');

    const { sendQRPass } = require('../services/whatsappService');
    sendQRPass(
      person.mobile,
      getQRPublicURL(qrPass.qr_id),
      person.full_name,
      valid_until ? new Date(valid_until).toLocaleDateString('en-IN') : 'Valid until further notice'
    ).catch(err => console.error('WhatsApp failed:', err.message));

    res.json({ success: true, qr_id: qrPass.qr_id, message: 'Approved and QR sent' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approval error:', err);
    res.status(500).json({ error: 'Approval failed' });
  } finally {
    client.release();
  }
}

async function auditTrail(req, res) {
  const { page = 1, limit = 100, user_id, module } = req.query;
  const offset = (page - 1) * limit;

  try {
    const conditions = [];
    const params     = [];

    if (user_id) { params.push(user_id); conditions.push(`al.user_id = $${params.length}`); }
    if (module)  { params.push(module);  conditions.push(`al.module = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT al.*, su.username, p.full_name
         FROM audit_log al
         LEFT JOIN system_users su ON al.user_id = su.user_id
         LEFT JOIN persons p       ON su.person_id = p.person_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         su.user_id, su.username, su.role, su.module_access, su.dept_id,
         su.is_active, su.is_locked, su.last_login,
         p.full_name, p.mobile
       FROM system_users su
       JOIN persons p ON su.person_id = p.person_id
       ORDER BY su.role, p.full_name`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function createUser(req, res) {
  const bcrypt = require('bcrypt');
  const { person_id, username, password, role, module_access, dept_id } = req.body;

  if (!person_id || !username || !password || !role) {
    return res.status(400).json({ error: 'person_id, username, password, role required' });
  }

  try {
    const hash   = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO system_users
        (person_id, username, password_hash, role, module_access, dept_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, username, role, module_access`,
      [person_id, username, hash, role, module_access || [], dept_id || null, req.user.user_id]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'person_id does not exist' });
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  dashboardSummary, personsByType, pendingApprovals,
  approvePerson, auditTrail, listUsers, createUser
};
