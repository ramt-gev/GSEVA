const pool = require('../db');

const ALIVE_STATUSES = ['pre_registered', 'on_campus'];

async function list(req, res) {
  const { type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `SELECT * FROM persons WHERE status = ANY($1)`;
    const params = [ALIVE_STATUSES];

    if (type) {
      params.push(type);
      query += ` AND person_type = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getById(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM persons WHERE person_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function create(req, res) {
  const {
    full_name, person_type, mobile,
    dept_id, id_proof_type, id_proof_number,
    date_of_birth, gender,
    perm_address, city, state, pincode,
    accommodation_block, room_number,
    registration_source,
  } = req.body;

  if (!full_name || !person_type || !mobile) {
    return res.status(400).json({ error: 'full_name, person_type, and mobile are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO persons
        (full_name, person_type, mobile, dept_id,
         id_proof_type, id_proof_number, date_of_birth, gender,
         perm_address, city, state, pincode,
         accommodation_block, room_number,
         registered_by, registration_source, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pre_registered')
       RETURNING *`,
      [
        full_name, person_type, mobile, dept_id,
        id_proof_type, id_proof_number, date_of_birth, gender,
        perm_address, city, state, pincode,
        accommodation_block, room_number,
        req.user.user_id, registration_source || 'admin_portal',
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function update(req, res) {
  const fields = req.body;
  const allowed = [
    'full_name','mobile','dept_id','id_proof_type','id_proof_number',
    'date_of_birth','gender','perm_address','city','state','pincode',
    'accommodation_block','room_number','status',
  ];

  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (keys.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const updates = keys.map((k, i) => `${k} = $${i + 2}`);
  const values  = keys.map(k => fields[k]);

  try {
    const result = await pool.query(
      `UPDATE persons SET ${updates.join(', ')}, updated_at = NOW()
       WHERE person_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { list, getById, create, update };
