const ezeeService = require('../services/ezeeService');

async function handleBooking(req, res) {
  const result = await ezeeService.handleBooking(req.headers['x-ezee-secret'], req.body);
  res.json({ success: true, ...result });
}

async function handleCheckout(req, res) {
  const result = await ezeeService.handleCheckout(req.headers['x-ezee-secret'], req.body);
  res.json(result);
}

module.exports = { handleBooking, handleCheckout };
