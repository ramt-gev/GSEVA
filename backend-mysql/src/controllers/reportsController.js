const reportsService = require('../services/reportsService');

async function hourlyGateStats(req, res) {
  const data = await reportsService.hourlyGateStats();
  res.json({ data });
}

async function occupancyReport(req, res) {
  const data = await reportsService.occupancyReport(req.query);
  res.json(data);
}

async function gateActivity(req, res) {
  const data = await reportsService.gateActivity(req.query);
  res.json(data);
}

async function mealConsumption(req, res) {
  const data = await reportsService.mealConsumption(req.query);
  res.json(data);
}

async function policeReport(req, res) {
  const result = await reportsService.policeReport(req.query);

  if (result.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    return res.send(result.buffer);
  }

  res.json({ month: result.month, total: result.total, records: result.records });
}

async function cafeRevenueSummary(req, res) {
  const data = await reportsService.cafeRevenueSummary(req.query);
  res.json({ data });
}

async function registrationsReport(req, res) {
  const data = await reportsService.registrationsReport(req.query);
  res.json(data);
}

module.exports = {
  hourlyGateStats, occupancyReport, gateActivity, mealConsumption, policeReport,
  cafeRevenueSummary, registrationsReport,
};
