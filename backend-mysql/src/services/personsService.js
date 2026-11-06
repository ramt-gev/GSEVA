const { Op } = require('sequelize');
const { Person } = require('../models');
const { NotFoundError, ValidationError } = require('../errors/AppError');

const ALIVE_STATUSES = ['pre_registered', 'on_campus'];

async function list({ type, page = 1, limit = 50 }) {
  const where = { status: { [Op.in]: ALIVE_STATUSES } };
  if (type) where.person_type = type;

  const rows = await Person.findAll({
    where,
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  return { data: rows, count: rows.length };
}

async function getById(person_id) {
  const person = await Person.findByPk(person_id);
  if (!person) throw new NotFoundError('Person not found');
  return person;
}

const CREATE_FIELDS = [
  'full_name', 'person_type', 'mobile', 'dept_id',
  'id_proof_type', 'id_proof_number', 'date_of_birth', 'gender',
  'perm_address', 'city', 'state', 'pincode',
  'accommodation_block', 'room_number',
];

async function create(body, currentUserId) {
  const { full_name, person_type, mobile } = body;
  if (!full_name || !person_type || !mobile) {
    throw new ValidationError('full_name, person_type, and mobile are required');
  }

  const attrs = {};
  for (const key of CREATE_FIELDS) {
    if (body[key] !== undefined) attrs[key] = body[key];
  }

  return Person.create({
    ...attrs,
    registered_by: currentUserId,
    registration_source: body.registration_source || 'admin_portal',
    status: 'pre_registered',
  });
}

const UPDATE_FIELDS = [
  'full_name', 'mobile', 'dept_id', 'id_proof_type', 'id_proof_number',
  'date_of_birth', 'gender', 'perm_address', 'city', 'state', 'pincode',
  'accommodation_block', 'room_number', 'status',
];

async function update(person_id, body) {
  const keys = Object.keys(body).filter((k) => UPDATE_FIELDS.includes(k));
  if (keys.length === 0) throw new ValidationError('No valid fields to update');

  const person = await Person.findByPk(person_id);
  if (!person) throw new NotFoundError('Person not found');

  const attrs = {};
  for (const key of keys) attrs[key] = body[key];
  await person.update(attrs);

  return person;
}

module.exports = { list, getById, create, update };
