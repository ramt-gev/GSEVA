const pool = require('../db');

// Schema column names (v4):
//   user_id, person_id, action, module, table_name, record_id,
//   old_value, new_value, ip_address, device_id, notes, created_at
//
// Used for both authenticated routes and public paths (Smart Registration,
// Razorpay/eZee/WhatsApp webhooks, Greythr cron). When req.user is absent,
// the row is written with user_id = NULL — schema allows it. Use the
// `module` column to capture the source.
function auditLog(action, module, tableName) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      if (res.statusCode < 400) {
        try {
          const recordId =
            body?.data?.person_id || body?.data?.id || body?.data?.qr_id || null;
          await pool.query(
            `INSERT INTO audit_log
              (user_id, action, module, table_name, record_id,
               old_value, new_value, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              req.user?.user_id || null,
              action,
              module,
              tableName || module,
              recordId,
              null,
              JSON.stringify(req.body),
              req.ip,
            ]
          );
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog };
