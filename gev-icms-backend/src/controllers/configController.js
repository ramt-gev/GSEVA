const pool = require('../db');

async function getConfig(req, res) {
  try {
    const result = await pool.query(
      'SELECT config_key, config_value, config_type, description FROM system_config ORDER BY config_key'
    );
    const config = {};
    result.rows.forEach(row => { config[row.config_key] = row.config_value; });
    res.json({ data: config });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateConfig(req, res) {
  const updates = req.body;

  try {
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        `UPDATE system_config
            SET config_value = $1, updated_at = NOW(), updated_by = $2
          WHERE config_key = $3`,
        [String(value), req.user.user_id, key]
      );
    }

    await pool.query(
      `INSERT INTO audit_log
        (user_id, action, module, table_name, new_value, ip_address)
       VALUES ($1, 'UPDATE_SYSTEM_CONFIG', 'admin', 'system_config', $2, $3)`,
      [req.user.user_id, JSON.stringify(updates), req.ip]
    );

    res.json({ success: true, message: 'Configuration updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getConfig, updateConfig };
