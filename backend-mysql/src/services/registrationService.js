const crypto = require('crypto');
const Razorpay = require('razorpay');
const { fn, literal } = require('sequelize');
const {
  sequelize, SystemConfig, VfTourSlot, CafeCapacity, Contractor,
  Person, QrPass, GroupMember, VfSlotBooking, ContractorLabourer, AuditLog,
  ZoneUpgradePayment, PersonStay, Department,
} = require('../models');
const qrService = require('./qrService');
const whatsappService = require('./whatsappService');
const { AppError, ValidationError, ConflictError } = require('../errors/AppError');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// GET /api/register/public-config
// NOTE: the Postgres backend queries for 'zone3_upgrade_price' and
// 'paid_programme_price', but the actual seeded system_config keys are
// 'zone3_cafe_price' and 'paid_day_visit_price' (confirmed against
// Docs/GEV_Database_Schema_v3_Final.sql STEP 8) — those two keys were
// silently missing from every publicConfig response on the live backend.
// Fixed here to use the real key names.
async function publicConfig() {
  const keys = [
    'max_group_size', 'zone3_cafe_price', 'paid_day_visit_price',
    'day_pass_valid_until', 'vf_slot_capacity', 'registration_open',
  ];
  const rows = await SystemConfig.findAll({ where: { config_key: keys } });
  const cfg = {};
  rows.forEach((r) => { cfg[r.config_key] = r.config_value; });
  return cfg;
}

// GET /api/register/vf-slots — next 7 days of VF tour slots
async function getVFSlots() {
  return VfTourSlot.findAll({
    attributes: [
      'slot_id', 'tour_date', 'slot_time', 'capacity', 'booked_count',
      [literal('capacity - booked_count'), 'available'], 'tour_type',
    ],
    where: literal('tour_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)'),
    order: [['tour_date', 'ASC'], ['slot_time', 'ASC']],
    raw: true,
  });
}

// GET /api/register/cafe-capacity — Govindas Zone 3 café availability
async function getCafeCapacity({ cafe, meal }) {
  const cafe_code = (cafe || 'GGA').toUpperCase();
  const meal_type = (meal || 'lunch').toLowerCase();

  const row = await CafeCapacity.findOne({
    where: { cafe_code, meal_type, capacity_date: fn('CURDATE') },
  });

  if (!row) {
    const config = await SystemConfig.findByPk('cafe_daily_capacity');
    const cap = parseInt(config?.config_value || '50', 10);
    return { cafe_code, meal_type, capacity: cap, booked_count: 0, available: cap };
  }

  return {
    cafe_code: row.cafe_code,
    capacity_date: row.capacity_date,
    meal_type: row.meal_type,
    capacity: row.threshold,
    booked_count: row.booked_count,
    available: row.threshold - row.booked_count,
  };
}

// POST /api/register/payment/create — create Razorpay order
async function createPayment({ amount, purpose, person_name, mobile }) {
  if (!amount || !purpose) throw new ValidationError('amount and purpose required');

  const isTestMode = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_REPLACE_ME';
  if (isTestMode) {
    return {
      order_id: 'order_test_' + Date.now(),
      amount, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID, test_mode: true,
    };
  }

  try {
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      notes: { purpose, person_name, mobile },
    });
    return { order_id: order.id, amount, currency: 'INR', key_id: process.env.RAZORPAY_KEY_ID };
  } catch (err) {
    console.error('Payment create error:', err);
    throw new AppError('Payment creation failed', 500);
  }
}

// POST /api/register/payment/webhook — Razorpay payment success webhook.
// rawBody is the express.raw() Buffer (needed for HMAC verification).
async function paymentWebhook(rawBody, signature) {
  const body = rawBody.toString();
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expected) {
    console.error('Invalid Razorpay webhook signature');
    throw new ValidationError('Invalid signature');
  }

  const event = JSON.parse(body);

  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const order_id = payment.order_id;

    try {
      // individualHooks: true — required so ZoneUpgradePayment's afterUpdate
      // hook (cafe_capacity recount) actually fires; Sequelize's static/bulk
      // .update() skips per-instance hooks by default.
      const [count] = await ZoneUpgradePayment.update(
        { payment_status: 'paid', razorpay_payment_id: payment.id, paid_at: new Date() },
        { where: { razorpay_order_id: order_id, payment_status: 'pending' }, individualHooks: true }
      );
      if (count > 0) {
        return { received: true, kind: 'zone3_upgrade' };
      }
      console.log(`Razorpay order ${order_id} captured — no matching pending record`);
    } catch (err) {
      console.error('Webhook processing error:', err);
    }
  }

  return { received: true };
}

// Person types allowed to self-register via the staff/volunteer/contractor
// form. These all land in the pending-approval queue rather than getting an
// instant QR pass.
const STAFF_PERSON_TYPES = [
  'volunteer_seva', 'vendor_supplier', 'brahmachari', 'varishtha_vaishnava',
  'construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation',
  'room_guest',
];
const LABOURER_PERSON_TYPES = [
  'construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation',
];

// GET /api/register/contractors — approved contractors, for the labourer
// sub-form's dropdown
async function listContractors() {
  return Contractor.findAll({
    attributes: ['contractor_id', 'company_name', 'contract_type'],
    where: { status: 'approved' },
    order: [['company_name', 'ASC']],
  });
}

// GET /api/register/departments — for the volunteer sub-form's department
// dropdown. Department names/codes aren't sensitive (already public via
// /api/register/contractors' equivalent), so this is unauthenticated like
// the rest of this file.
async function listDepartments() {
  return Department.findAll({
    attributes: ['dept_id', 'dept_name'],
    where: { is_active: true },
    order: [['dept_name', 'ASC']],
  });
}

// POST /api/register/staff
async function registerStaff(body, ip) {
  const {
    full_name, mobile, gender, person_type, dept_id,
    contractor_id, new_contractor_name, camp_location, id_proof_type, id_proof_number, notes,
    host_name, host_mobile, stay_type, check_in_date, check_out_date,
  } = body;

  if (!full_name || !mobile || !person_type) {
    throw new ValidationError('full_name, mobile, person_type required');
  }
  if (!STAFF_PERSON_TYPES.includes(person_type)) {
    throw new ValidationError('Invalid person_type for this registration form');
  }

  const isLabourer = LABOURER_PERSON_TYPES.includes(person_type);
  if (isLabourer && !camp_location) {
    throw new ValidationError('camp_location is required for labourer registration');
  }
  if (isLabourer && !contractor_id && !new_contractor_name?.trim()) {
    throw new ValidationError('contractor_id or new_contractor_name is required for labourer registration');
  }

  // Guest of Residence — a visitor staying with a resident/staff host, not
  // arriving via eZee booking. Short stay needs real dates (checked into
  // person_stays so Overstay Alerts / the police report can see them); long
  // stay is intentionally open-ended — just a check_in_date, no check_out.
  const isGuest = person_type === 'room_guest';
  if (isGuest) {
    if (!host_name?.trim() || !host_mobile?.trim()) {
      throw new ValidationError('host_name and host_mobile are required for guest of residence registration');
    }
    if (!['short', 'long'].includes(stay_type)) {
      throw new ValidationError('stay_type must be short or long');
    }
    if (stay_type === 'short' && (!check_in_date || !check_out_date)) {
      throw new ValidationError('check_in_date and check_out_date are required for a short stay');
    }
    if (stay_type === 'short' && new Date(check_out_date) < new Date(check_in_date)) {
      throw new ValidationError('check_out_date cannot be before check_in_date');
    }
  }

  // Volunteers declare a fixed seva period up front (department + start/end
  // date) — reuses the same check_in_date/check_out_date fields as Guest of
  // Residence's short stay, landing in the same person_stays table so it
  // shows up in the Admin Portal's existing "Check-in / out" column with no
  // further UI changes there.
  const isVolunteer = person_type === 'volunteer_seva';
  if (isVolunteer) {
    if (!dept_id) throw new ValidationError('dept_id is required for volunteer registration');
    if (!check_in_date || !check_out_date) {
      throw new ValidationError('check_in_date and check_out_date are required for volunteer registration');
    }
    if (new Date(check_out_date) < new Date(check_in_date)) {
      throw new ValidationError('check_out_date cannot be before check_in_date');
    }
  }

  try {
    return await sequelize.transaction(async (t) => {
      // Best-effort host match by mobile — the host field is for admin
      // traceability even when no match is found (host_person_id then stays
      // null and the name/number lives in notes instead).
      let resolvedHostId = null;
      let combinedNotes = notes || null;
      if (isGuest) {
        const host = await Person.findOne({ where: { mobile: host_mobile.trim() }, transaction: t });
        resolvedHostId = host?.person_id || null;
        const hostLine = `Guest of: ${host_name.trim()} (${host_mobile.trim()})${host ? '' : ' — host not found in system, admin to verify'}`;
        combinedNotes = [hostLine, notes].filter(Boolean).join(' — ');
      }

      const person = await Person.create(
        {
          full_name, mobile: mobile.trim(), gender: gender || 'not_specified', person_type,
          dept_id: dept_id || null, id_proof_type: id_proof_type || null,
          id_proof_number: id_proof_number || null, notes: combinedNotes,
          host_person_id: resolvedHostId,
          status: 'pre_registered', registration_source: 'staff_registration',
        },
        { transaction: t }
      );

      let resolvedContractorId = contractor_id || null;

      if (isGuest) {
        await PersonStay.create(
          {
            person_id: person.person_id,
            stay_type: stay_type === 'short' ? 'guest_short_stay' : 'guest_long_stay',
            check_in_date: stay_type === 'short' ? check_in_date : new Date().toISOString().slice(0, 10),
            check_out_date: stay_type === 'short' ? check_out_date : null,
            is_overnight: true,
            is_active: true,
            booking_source: 'public_registration',
          },
          { transaction: t }
        );
      }

      if (isVolunteer) {
        await PersonStay.create(
          {
            person_id: person.person_id,
            stay_type: 'volunteer_seva',
            check_in_date, check_out_date,
            is_overnight: true,
            is_active: true,
            booking_source: 'public_registration',
          },
          { transaction: t }
        );
      }

      if (isLabourer) {
        // "Company not listed" path from the registration form: the worker
        // is the only contact info we have at registration time, so they
        // become the placeholder POC until an admin corrects it via the
        // Contractors page (see adminService.approveContractor). Kept as
        // 'pending' — never returned by the public contractors list, which
        // only shows status:'approved' — so it can't be picked by anyone
        // else until an admin reviews it.
        if (!resolvedContractorId) {
          const newContractor = await Contractor.create(
            {
              company_name: new_contractor_name.trim(),
              poc_name: full_name,
              poc_mobile: mobile.trim(),
              contract_type: 'other',
              status: 'pending',
            },
            { transaction: t }
          );
          resolvedContractorId = newContractor.contractor_id;
        }

        await ContractorLabourer.create(
          { person_id: person.person_id, contractor_id: resolvedContractorId, camp_location, approval_status: 'pending' },
          { transaction: t }
        );
      }

      await AuditLog.create(
        {
          user_id: null, action: 'REGISTER_STAFF', module: 'public_registration', table_name: 'persons',
          record_id: person.person_id,
          new_value: {
            person_type, contractor_id: resolvedContractorId, new_contractor_name: new_contractor_name || null,
            ...(isGuest ? { stay_type, host_person_id: resolvedHostId, check_in_date, check_out_date } : {}),
            ...(isVolunteer ? { dept_id, check_in_date, check_out_date } : {}),
          },
          ip_address: ip,
        },
        { transaction: t }
      );

      return { person_id: person.person_id };
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' && err.errors?.[0]?.path?.includes('mobile')) {
      throw new ConflictError('A person with this mobile number is already registered.');
    }
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      throw new ValidationError('Unknown contractor_id');
    }
    console.error('Staff registration error:', err);
    throw new AppError('Registration failed. Please try again.', 500);
  }
}

// POST /api/register/visitor — public visitor registration (no auth)
async function registerVisitor(body, ip) {
  const {
    full_name, mobile, person_type = 'free_day_visitor',
    group_size, members, visit_date, vf_slot_id,
    lunch_indicated, khichadi_indicated, zone3_upgrade, cafe_code,
    razorpay_payment_id, razorpay_order_id,
  } = body;

  if (!full_name || !mobile || !person_type) {
    throw new ValidationError('full_name, mobile, person_type required');
  }

  const visitDay = visit_date ? new Date(visit_date) : new Date();
  const dayEnd = new Date(visitDay);

  let expiryTime = '20:00';
  try {
    const cfg = await SystemConfig.findByPk('day_pass_valid_until');
    expiryTime = cfg?.config_value || '20:00';
  } catch (_) {}
  const [exHour, exMin] = expiryTime.split(':').map(Number);
  dayEnd.setHours(exHour, exMin, 0, 0);

  let person;
  let qrPass;
  try {
    await sequelize.transaction(async (t) => {
      // 1. Person row (leader only)
      person = await Person.create(
        { full_name, person_type, mobile, status: 'pre_registered', registration_source: 'smart_registration' },
        { transaction: t }
      );

      // 2. Zone access — Zone 3 added if paid upgrade or paid programme
      let zones = qrService.getZoneAccess(person_type);
      if (zone3_upgrade || person_type === 'paid_day_visitor') {
        zones = [...new Set([...zones, 'zone3'])];
      }

      // 3. QR pass (must exist before group_members due to FK)
      qrPass = await QrPass.create(
        {
          person_id: person.person_id,
          pass_type: 'day_pass',
          zone_access: zones,
          valid_from: visitDay,
          valid_until: dayEnd,
          group_size: group_size || 1,
          programme_details: {
            lunch_indicated: !!lunch_indicated,
            khichadi_indicated: !!khichadi_indicated,
            // Which Zone 3 café — only meaningful when zone3_upgrade was set;
            // Govinda's (GGA) and Dhanvantari (DHAN) share the one Zone 3 fee.
            cafe_code: zone3_upgrade ? (cafe_code === 'DHAN' ? 'DHAN' : 'GGA') : null,
            razorpay_payment_id: razorpay_payment_id || null,
            razorpay_order_id: razorpay_order_id || null,
          },
          is_active: true,
        },
        { transaction: t }
      );

      // 4. Group members (leader is member 1). Preserves the original's
      // exact post-increment quirk: member_number is 1,2,3...; the
      // *default* relation is 'Leader' only for member_number 1 (n===2
      // check happens right after n was incremented past the first entry).
      if (members && members.length > 0) {
        let n = 1;
        for (const m of members) {
          const member_number = n;
          n++;
          await GroupMember.create(
            {
              leader_qr_id: qrPass.qr_id,
              leader_person_id: person.person_id,
              member_number,
              full_name: m.name || m.full_name,
              age: m.age || null,
              gender: m.gender || null,
              relation_to_leader: m.relation || m.relation_to_leader || (n === 2 ? 'Leader' : 'Group member'),
            },
            { transaction: t }
          );
        }
      }

      // 5. VF slot booking
      if (vf_slot_id) {
        await VfSlotBooking.create(
          { slot_id: vf_slot_id, person_id: person.person_id, status: 'confirmed' },
          { transaction: t }
        );
      }

      // 6. Audit log (public path — user_id = NULL)
      await AuditLog.create(
        {
          user_id: null, action: 'REGISTER_VISITOR', module: 'public_registration', table_name: 'persons',
          record_id: person.person_id,
          new_value: { person_type, group_size, vf_slot_id },
          ip_address: ip,
        },
        { transaction: t }
      );
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError' && err.errors?.[0]?.path?.includes('mobile')) {
      throw new ConflictError(
        'A visitor with this mobile number is already registered for today. Please contact the gate.'
      );
    }
    console.error('Registration error:', err);
    throw new AppError('Registration failed. Please try again.', 500);
  }

  // 7. Send QR via WhatsApp (async — don't block response)
  const qrURL = qrService.getQRPublicURL(qrPass.qr_id);
  const validUntilStr = dayEnd.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  whatsappService.sendQRPass(mobile, qrURL, full_name, validUntilStr)
    .catch((err) => console.error('WhatsApp send failed:', err.message));

  return {
    person_id: person.person_id,
    qr_id: qrPass.qr_id,
    qr_url: qrURL,
    zones: qrPass.zone_access,
    valid_until: dayEnd.toISOString(),
  };
}

module.exports = {
  publicConfig, getVFSlots, getCafeCapacity,
  createPayment, paymentWebhook,
  listContractors, listDepartments, registerStaff, registerVisitor,
};
