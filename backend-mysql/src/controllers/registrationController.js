const registrationService = require('../services/registrationService');

async function publicConfig(req, res) {
  const data = await registrationService.publicConfig();
  res.json({ data });
}

async function getVFSlots(req, res) {
  const data = await registrationService.getVFSlots();
  res.json({ data });
}

async function getCafeCapacity(req, res) {
  const data = await registrationService.getCafeCapacity(req.query);
  res.json({ data });
}

async function createPayment(req, res) {
  const data = await registrationService.createPayment(req.body);
  res.json({ data });
}

async function paymentWebhook(req, res) {
  const signature = req.headers['x-razorpay-signature'];
  const result = await registrationService.paymentWebhook(req.body, signature);
  res.json(result);
}

async function listContractors(req, res) {
  const data = await registrationService.listContractors();
  res.json({ data });
}

async function listDepartments(req, res) {
  const data = await registrationService.listDepartments();
  res.json({ data });
}

async function registerStaff(req, res) {
  const data = await registrationService.registerStaff(req.body, req.ip);
  res.status(201).json({
    success: true,
    message: 'Registration submitted. You will be notified once approved.',
    data,
  });
}

async function registerVisitor(req, res) {
  const data = await registrationService.registerVisitor(req.body, req.ip);
  res.status(201).json({
    success: true,
    message: 'Registration complete. QR pass sent to your WhatsApp.',
    data,
  });
}

module.exports = {
  publicConfig, getVFSlots, getCafeCapacity,
  createPayment, paymentWebhook,
  listContractors, listDepartments, registerStaff, registerVisitor,
};
