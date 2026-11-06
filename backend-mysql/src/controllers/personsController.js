const personsService = require('../services/personsService');

async function list(req, res) {
  const result = await personsService.list(req.query);
  res.json(result);
}

async function getById(req, res) {
  const person = await personsService.getById(req.params.id);
  res.json({ data: person });
}

async function create(req, res) {
  const person = await personsService.create(req.body, req.user.user_id);
  res.status(201).json({ data: person });
}

async function update(req, res) {
  const person = await personsService.update(req.params.id, req.body);
  res.json({ data: person });
}

module.exports = { list, getById, create, update };
