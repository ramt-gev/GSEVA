const mealsService = require('../services/mealsService');

async function scanMeal(req, res) {
  const result = await mealsService.scanMeal(req.body, req.user.user_id);
  res.json(result);
}

async function tapCounter(req, res) {
  const result = await mealsService.tapCounter(req.body, req.user.user_id);
  res.json(result);
}

async function todayStats(req, res) {
  const data = await mealsService.todayStats();
  res.json({ data });
}

async function registeredList(req, res) {
  const result = await mealsService.registeredList(req.query);
  res.json(result);
}

async function contractorBilling(req, res) {
  const m = req.query.month || new Date().getMonth() + 1;
  const y = req.query.year || new Date().getFullYear();
  const data = await mealsService.contractorBilling();
  res.json({ data, month: m, year: y });
}

module.exports = { scanMeal, tapCounter, todayStats, registeredList, contractorBilling };
