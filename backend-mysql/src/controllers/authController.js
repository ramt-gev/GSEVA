const authService = require('../services/authService');

// Controllers stay thin: parse request -> call service -> shape response.
// Thrown errors (AppError subclasses, or Sequelize's own) are not caught
// here — Express 5 forwards rejected async handlers to errorHandler
// automatically, which maps them to the right HTTP status in one place.

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

async function googleLogin(req, res) {
  const result = await authService.googleLogin(req.body);
  res.json(result);
}

async function linkGoogle(req, res) {
  const result = await authService.linkGoogle(req.user.user_id, req.body);
  res.json(result);
}

async function unlinkGoogle(req, res) {
  const result = await authService.unlinkGoogle(req.user.user_id);
  res.json(result);
}

async function me(req, res) {
  const data = await authService.me(req.user.user_id);
  res.json({ data });
}

module.exports = { login, googleLogin, linkGoogle, unlinkGoogle, me };
