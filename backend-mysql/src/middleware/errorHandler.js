'use strict';

const { AppError } = require('../errors/AppError');

// Sequelize's `path` on a unique-constraint error is whatever MySQL reports
// as the offending key — a plain column name for simple `unique: true`
// fields, but the raw index name for composite/partial unique indexes
// defined via addIndex() in migrations (e.g. idx_meal_reg_active_unique).
// Those are meaningless to anyone outside this codebase.
//
// Simple column names read fine inside the standard "A record with this X
// already exists" template. Composite indexes usually don't — forcing them
// through that same template produces redundant phrasing ("...with this
// meal type for this meal type already exists"), so those get a full
// sentence instead.
const FRIENDLY_FIELD_NAMES = {
  username: 'username',
  google_sub: 'Google account',
  portal_username: 'portal username',
  greythr_id: 'Greythr ID',
  essl_id: 'eSSL ID',
  item_name: 'catalog item name',
};

const FRIENDLY_MESSAGES = {
  idx_persons_mobile_unique: 'An active person with this mobile number already exists.',
  idx_person_dependants_unique: 'This person is already registered as a dependant of this staff member.',
  idx_cl_unique: 'This person is already registered as a labourer for this contractor.',
  idx_vf_slots_unique: 'A tour slot already exists for this date, time, and type.',
  idx_group_members_unique: 'This member number is already used in this group.',
  idx_cafe_capacity_unique: 'A café capacity declaration already exists for this date and meal.',
  idx_meal_reg_active_unique: 'This person already has an active meal registration for this meal type.',
  idx_meal_tokens_unique: 'A meal token already exists for this registration and meal date.',
  idx_meal_forecasts_unique: 'A meal forecast already exists for this date and meal type.',
  idx_festival_events_unique: 'A festival event already exists with this name.',
};

function friendlyConflictMessage(raw) {
  if (FRIENDLY_MESSAGES[raw]) return FRIENDLY_MESSAGES[raw];
  const field = FRIENDLY_FIELD_NAMES[raw]
    // Unmapped fallback: still better than a raw `idx_foo_bar_unique` — strip
    // the prefix/suffix and turn underscores into spaces.
    || raw.replace(/^idx_/, '').replace(/_unique$/, '').replace(/_/g, ' ');
  return `A record with this ${field} already exists.`;
}

// Centralized error handling: services throw AppError subclasses (or let
// Sequelize's own errors bubble up), controllers do not try/catch per
// route. Sequelize normalizes DB-layer errors (unique/FK/validation)
// consistently regardless of dialect, so there's no MySQL-vs-Postgres
// error-code branching to maintain here.
function errorHandler(err, req, res, _next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message, ...err.extra });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return res.status(409).json({ error: friendlyConflictMessage(field) });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: 'Referenced record does not exist.' });
  }

  if (err.name === 'SequelizeValidationError') {
    const message = err.errors?.map((e) => e.message).join('; ') || 'Validation failed.';
    return res.status(400).json({ error: message });
  }

  console.error(err);
  res.status(500).json({ error: 'Server error' });
}

module.exports = errorHandler;
