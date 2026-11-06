const { AuditLog } = require('../models');

// Same wrap-res.json pattern as the Postgres backend's middleware/audit.js:
// fires an audit_log insert only on 2xx responses, for both authenticated
// and public routes (req.user may be absent -> user_id NULL, which the
// schema allows — see CLAUDE.md invariant 3). `old_value`/`new_value` are
// DataTypes.JSON columns, so the request body is passed as a plain object;
// Sequelize handles serialization (no manual JSON.stringify, unlike the
// Postgres backend's raw-SQL version).
function auditLog(action, module, tableName) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function (body) {
      if (res.statusCode < 400) {
        try {
          const recordId = body?.data?.person_id || body?.data?.id || body?.data?.qr_id || null;
          await AuditLog.create({
            user_id: req.user?.user_id || null,
            action,
            module,
            table_name: tableName || module,
            record_id: recordId,
            old_value: null,
            new_value: req.body,
            ip_address: req.ip,
          });
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
