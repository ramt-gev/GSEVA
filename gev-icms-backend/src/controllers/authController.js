const pool   = require('../db');
const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query(
      `SELECT su.user_id, su.username, su.password_hash, su.role,
              su.module_access, su.dept_id, su.is_active, su.is_locked,
              p.person_id, p.full_name, p.mobile
         FROM system_users su
         JOIN persons p ON su.person_id = p.person_id
        WHERE su.username = $1
          AND su.is_active = TRUE
          AND su.is_locked = FALSE`,
      [username.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user  = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      // Auto-lock at 5 failed attempts.
      await pool.query(
        `UPDATE system_users
            SET failed_login_count = failed_login_count + 1,
                is_locked = (failed_login_count + 1 >= 5)
          WHERE user_id = $1`,
        [user.user_id]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        user_id:       user.user_id,
        username:      user.username,
        role:          user.role,
        module_access: user.module_access,
        dept_id:       user.dept_id,
        name:          user.full_name,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );

    await pool.query(
      `UPDATE system_users
          SET last_login = NOW(), failed_login_count = 0
        WHERE user_id = $1`,
      [user.user_id]
    );

    res.json({
      token,
      user: {
        user_id:       user.user_id,
        username:      user.username,
        name:          user.full_name,
        role:          user.role,
        module_access: user.module_access,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT su.user_id, su.username, su.role, su.module_access, su.dept_id,
              p.full_name, p.mobile
         FROM system_users su
         JOIN persons p ON su.person_id = p.person_id
        WHERE su.user_id = $1`,
      [req.user.user_id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { login, me };
