const gateService = require('../services/gateService');

async function scanQR(req, res) {
  const result = await gateService.scanQR(req.body, req.user?.user_id);
  res.json(result);
}

async function gateStats(req, res) {
  const data = await gateService.gateStats();
  res.json({ data });
}

async function batchEntry(req, res) {
  const result = await gateService.batchEntry(req.body, req.user.user_id);
  res.json(result);
}

async function override(req, res) {
  const result = await gateService.override(req.body, req.user.user_id, req.ip);
  res.json(result);
}

async function zone3Upgrade(req, res) {
  const result = await gateService.zone3Upgrade(req.body, req.user.user_id, req.ip);
  res.json({ success: true, ...result });
}

module.exports = { scanQR, gateStats, batchEntry, override, zone3Upgrade };
