const configService = require('../services/configService');

async function getConfig(req, res) {
  const data = await configService.getConfig();
  res.json({ data });
}

async function updateConfig(req, res) {
  const result = await configService.updateConfig(req.body, req.user.user_id, req.ip);
  res.json(result);
}

module.exports = { getConfig, updateConfig };
