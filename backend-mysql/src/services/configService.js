const { SystemConfig, AuditLog } = require('../models');

async function getConfig() {
  const rows = await SystemConfig.findAll({ order: [['config_key', 'ASC']] });
  const config = {};
  rows.forEach((r) => { config[r.config_key] = r.config_value; });
  return config;
}

async function updateConfig(updates, currentUserId, ip) {
  for (const [key, value] of Object.entries(updates)) {
    await SystemConfig.update(
      { config_value: String(value), updated_by: currentUserId },
      { where: { config_key: key } }
    );
  }

  await AuditLog.create({
    user_id: currentUserId,
    action: 'UPDATE_SYSTEM_CONFIG',
    module: 'admin',
    table_name: 'system_config',
    new_value: updates,
    ip_address: ip,
  });

  return { success: true, message: 'Configuration updated' };
}

module.exports = { getConfig, updateConfig };
