const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { SystemUser, Person, sequelize } = require('../models');
const { AppError, ValidationError, UnauthorizedError, ConflictError } = require('../errors/AppError');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function issueToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
      module_access: user.module_access,
      dept_id: user.dept_id,
      name: user.person.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  );
}

function shapeUser(user) {
  return {
    user_id: user.user_id,
    username: user.username,
    name: user.person.full_name,
    role: user.role,
    module_access: user.module_access,
  };
}

async function findActiveUser(where) {
  return SystemUser.findOne({
    where: { ...where, is_active: true, is_locked: false },
    include: [{ model: Person, as: 'person' }],
  });
}

async function touchLogin(user) {
  await user.update({ last_login: new Date(), failed_login_count: 0 });
}

async function login({ username, password }) {
  if (!username || !password) throw new ValidationError('Username and password required');

  const user = await findActiveUser({ username: username.toLowerCase().trim() });
  if (!user) throw new UnauthorizedError('Invalid credentials');

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    // Atomic single-statement update (mirrors the Postgres backend exactly)
    // so concurrent failed attempts on the same account can't race and
    // undercount — the DB computes +1 and the lockout threshold from
    // whatever the current row value is at UPDATE time, not a JS-side read.
    await SystemUser.update(
      {
        failed_login_count: sequelize.literal('failed_login_count + 1'),
        is_locked: sequelize.literal('(failed_login_count + 1) >= 5'),
      },
      { where: { user_id: user.user_id } }
    );
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = issueToken(user);
  await touchLogin(user);

  return { token, user: shapeUser(user) };
}

async function googleLogin({ credential }) {
  if (!credential) throw new ValidationError('Google credential required');
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'REPLACE_ME') {
    throw new AppError('Google Sign-In not configured on this server', 503);
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new UnauthorizedError('Google token verification failed');
  }

  const user = await findActiveUser({ google_sub: payload.sub });
  if (!user) {
    throw new UnauthorizedError(
      'Google account not linked to any system user. Sign in with username/password first, then link your Google account from the portal.',
      { google_name: payload.name, google_email: payload.email }
    );
  }

  const token = issueToken(user);
  await touchLogin(user);

  return { token, user: shapeUser(user) };
}

async function linkGoogle(currentUserId, { credential }) {
  if (!credential) throw new ValidationError('Google credential required');
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'REPLACE_ME') {
    throw new AppError('Google Sign-In not configured on this server', 503);
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    throw new UnauthorizedError('Google token verification failed');
  }

  const existing = await SystemUser.findOne({
    where: { google_sub: payload.sub },
  });
  if (existing && existing.user_id !== currentUserId) {
    throw new ConflictError('This Google account is already linked to another user');
  }

  const user = await SystemUser.findByPk(currentUserId);
  await user.update({ google_sub: payload.sub });

  return { ok: true, google_email: payload.email, google_name: payload.name };
}

async function unlinkGoogle(currentUserId) {
  const user = await SystemUser.findByPk(currentUserId);
  await user.update({ google_sub: null });
  return { ok: true };
}

async function me(currentUserId) {
  const user = await SystemUser.findOne({
    where: { user_id: currentUserId },
    include: [{ model: Person, as: 'person' }],
  });

  return {
    user_id: user.user_id,
    username: user.username,
    role: user.role,
    module_access: user.module_access,
    dept_id: user.dept_id,
    full_name: user.person.full_name,
    mobile: user.person.mobile,
    google_linked: user.google_sub !== null,
  };
}

module.exports = { login, googleLogin, linkGoogle, unlinkGoogle, me };
