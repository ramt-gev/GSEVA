const { fn, col, literal } = require('sequelize');
const { QrPass, Person, Department, GateEvent, AuditLog, SystemConfig, ZoneUpgradePayment } = require('../models');
const { ValidationError, NotFoundError } = require('../errors/AppError');

const GATE_ZONE_MAP = {
  main_gate: 'zone1',
  gate_7: 'zone2',
  sbt_gate: 'zone3',
  exit_gate: null, // exit gate always allows out
};

const UPGRADE_ELIGIBLE_TYPES = ['free_day_visitor', 'paid_day_visitor', 'corporate_tour_group'];

function buildPersonResponse(pass) {
  return {
    qr_id: pass.qr_id,
    name: pass.full_name,
    type: pass.person_type,
    dept: pass.dept_name || '—',
    stay: pass.valid_until ? new Date(pass.valid_until).toLocaleDateString('en-IN') : 'Permanent',
    pass_type: pass.pass_type,
    mobile: pass.mobile,
    zones: pass.zone_access,
    group_size: pass.group_size || 1,
  };
}

// A day visitor's status is set to 'pre_registered' at Smart Registration
// and nothing else ever moves it — an allowed entry scan is the actual
// "arrived on campus" moment, so it's the one place that transition belongs.
// Same fire-and-forget resilience as logGateEvent: a status-write failure
// must not block the tablet's allow response.
async function markOnCampus(person_id) {
  try {
    await Person.update({ status: 'on_campus' }, { where: { person_id } });
  } catch (err) {
    console.error('Person status update error:', err.message);
  }
}

// Gate event logging must never block the tablet's allow/deny response —
// mirrors the Postgres backend's logAndRespond exactly (try/catch around
// the insert only, console.error on failure).
async function logGateEvent({ person_id, qr_id, gate, result, deny_reason, scannedByUserId }) {
  try {
    await GateEvent.create({
      person_id: person_id || null,
      qr_id: qr_id || null,
      gate,
      event_type: 'entry',
      result,
      deny_reason,
      scanned_by: scannedByUserId || null,
    });
  } catch (err) {
    console.error('Gate event log error:', err.message);
  }
}

async function respond({ pass, result, deny_reason, action, gate, scannedByUserId }) {
  await logGateEvent({
    person_id: pass?.person_id,
    qr_id: pass?.qr_id,
    gate,
    result,
    deny_reason,
    scannedByUserId,
  });

  if (result === 'denied' || !pass) {
    return {
      result: 'deny',
      person: pass ? buildPersonResponse(pass) : null,
      deny_reason: deny_reason || 'Unknown QR code',
      action,
    };
  }

  if (gate !== 'exit_gate' && pass.status !== 'on_campus') {
    await markOnCampus(pass.person_id);
  }

  return { result: 'allow', person: buildPersonResponse(pass), deny_reason: null, action: null };
}

// Backs the gate tablet's manual-search box: accepts a mobile number in
// place of qr_id (looks up that person's most recently issued active pass),
// then runs the exact same eligibility logic as a real QR scan below.
async function scanQR({ qr_id, mobile, gate }, scannedByUserId) {
  if (!gate || (!qr_id && !mobile)) {
    throw new ValidationError('gate and either qr_id or mobile are required');
  }

  const record = qr_id
    ? await QrPass.findOne({
        where: { qr_id },
        include: [{ model: Person, as: 'person', include: [{ model: Department, as: 'department' }] }],
      })
    : await QrPass.findOne({
        where: { is_active: true },
        include: [{
          model: Person, as: 'person', required: true, where: { mobile },
          include: [{ model: Department, as: 'department' }],
        }],
        order: [['issued_at', 'DESC']],
      });

  if (!record) {
    return respond({
      pass: null,
      result: 'denied',
      deny_reason: qr_id ? 'QR code not found in system' : 'No active pass found for this mobile number',
      action: null,
      gate,
      scannedByUserId,
    });
  }

  const pass = {
    qr_id: record.qr_id,
    zone_access: record.zone_access,
    valid_from: record.valid_from,
    valid_until: record.valid_until,
    group_size: record.group_size,
    is_active: record.is_active,
    pass_type: record.pass_type,
    person_id: record.person.person_id,
    full_name: record.person.full_name,
    person_type: record.person.person_type,
    mobile: record.person.mobile,
    dept_id: record.person.dept_id,
    status: record.person.status,
    dept_name: record.person.department?.dept_name || null,
  };

  if (!pass.is_active) {
    return respond({ pass, result: 'denied', deny_reason: 'QR pass has been deactivated', action: null, gate, scannedByUserId });
  }

  const now = new Date();
  if (pass.valid_from && new Date(pass.valid_from) > now) {
    return respond({ pass, result: 'denied', deny_reason: 'QR pass is not yet valid', action: null, gate, scannedByUserId });
  }
  if (pass.valid_until && new Date(pass.valid_until) < now) {
    return respond({ pass, result: 'denied', deny_reason: 'QR pass has expired', action: null, gate, scannedByUserId });
  }

  // Zone enforcement per gate
  const requiredZone = GATE_ZONE_MAP[gate];
  if (requiredZone && !pass.zone_access.includes(requiredZone)) {
    const upgradeEligible = gate === 'sbt_gate' && UPGRADE_ELIGIBLE_TYPES.includes(pass.person_type);
    return respond({
      pass,
      result: 'denied',
      deny_reason: `${requiredZone.replace('zone', 'Zone ')} access not permitted for this pass`,
      action: upgradeEligible ? 'Offer Zone 3 café upgrade — Rs.350 per person' : 'Contact admin for access',
      gate,
      scannedByUserId,
    });
  }

  return respond({ pass, result: 'allowed', deny_reason: null, action: null, gate, scannedByUserId });
}

async function gateStats() {
  const rows = await GateEvent.findAll({
    attributes: [
      'gate',
      [fn('SUM', literal(`CASE WHEN result = 'allowed' THEN 1 ELSE 0 END`)), 'allowed'],
      [fn('SUM', literal(`CASE WHEN result = 'denied' THEN 1 ELSE 0 END`)), 'denied'],
      [fn('MAX', col('scanned_at')), 'last_scan'],
    ],
    where: literal('DATE(scanned_at) = CURDATE()'),
    group: ['gate'],
    raw: true,
  });

  return rows.map((r) => ({ ...r, allowed: Number(r.allowed), denied: Number(r.denied) }));
}

async function batchEntry({ gate, count, note }, scannedByUserId) {
  if (!gate || !count) throw new ValidationError('gate and count required');

  await GateEvent.create({
    gate,
    event_type: 'entry',
    result: 'allowed',
    is_batch_count: true,
    batch_count: count,
    deny_reason: note || 'Festival batch entry',
    scanned_by: scannedByUserId,
  });

  return { success: true, message: `Batch entry of ${count} recorded at ${gate}` };
}

async function override({ gate, person_id, reason }, currentUserId, ip) {
  if (!gate || !reason) throw new ValidationError('gate and reason required');

  await GateEvent.create({
    person_id: person_id || null,
    gate,
    event_type: 'entry',
    result: 'manual_override',
    deny_reason: `MANUAL OVERRIDE: ${reason}`,
    scanned_by: currentUserId,
  });

  await AuditLog.create({
    user_id: currentUserId,
    action: 'MANUAL_GATE_OVERRIDE',
    module: 'gate',
    table_name: 'gate_events',
    record_id: person_id || null,
    new_value: { gate, reason, person_id },
    ip_address: ip,
  });

  return { success: true, message: 'Override logged.' };
}

async function getPassDetails(qr_id) {
  const record = await QrPass.findOne({
    where: { qr_id, is_active: true },
    include: [{ model: Person, as: 'person', include: [{ model: Department, as: 'department' }] }],
  });
  if (!record) return null;

  return {
    qr_id: record.qr_id,
    pass_type: record.pass_type,
    zone_access: record.zone_access,
    valid_from: record.valid_from,
    valid_until: record.valid_until,
    group_size: record.group_size,
    full_name: record.person.full_name,
    person_type: record.person.person_type,
    mobile: record.person.mobile,
    dept_name: record.person.department?.dept_name || null,
  };
}

// Grants Zone 3 on an already-issued pass after an at-gate Zone 3 café
// upgrade payment. Nothing in the rest of the system extends an existing
// QR pass's zone_access post-issuance (registerVisitor only ever grants
// zone3 as part of a brand-new pass) — this is the one real call site for
// "upgrade at the gate," so it has to both record the payment and mutate
// the pass. Mirrors registerVisitor's existing, already-accepted trust
// model (marks paid directly rather than round-tripping through the
// webhook) rather than inventing a stricter verification path nothing
// else in the system has either.
async function zone3Upgrade({ qr_id, persons_count = 1, razorpay_payment_id, razorpay_order_id }, currentUserId, ip) {
  if (!qr_id) throw new ValidationError('qr_id is required');

  const pass = await QrPass.findOne({ where: { qr_id, is_active: true } });
  if (!pass) throw new NotFoundError('QR pass not found');

  const priceRow = await SystemConfig.findOne({ where: { config_key: 'zone3_cafe_price' } });
  const pricePerPerson = priceRow ? parseFloat(priceRow.config_value) : 350;
  const totalAmount = pricePerPerson * persons_count;

  await ZoneUpgradePayment.create({
    qr_id,
    gate_name: 'sbt_gate',
    persons_count,
    price_per_person: pricePerPerson,
    total_amount: totalAmount,
    razorpay_payment_id: razorpay_payment_id || null,
    razorpay_order_id: razorpay_order_id || null,
    payment_status: 'paid',
    cafe_code: 'GGA',
    meal_type: 'lunch',
    meal_date: new Date(),
    cafe_booking_confirmed: true,
    paid_at: new Date(),
  });

  const zones = Array.isArray(pass.zone_access) ? pass.zone_access.slice() : [];
  if (!zones.includes('zone3')) zones.push('zone3');
  await pass.update({ zone_access: zones });

  await AuditLog.create({
    user_id: currentUserId,
    person_id: null,
    action: 'ZONE3_UPGRADE',
    module: 'gate',
    table_name: 'qr_passes',
    record_id: pass.qr_id,
    new_value: { persons_count, total_amount: totalAmount, zones },
    ip_address: ip || null,
  });

  return { qr_id: pass.qr_id, zones, total_amount: totalAmount, persons_count };
}

module.exports = { scanQR, gateStats, batchEntry, override, getPassDetails, zone3Upgrade };
