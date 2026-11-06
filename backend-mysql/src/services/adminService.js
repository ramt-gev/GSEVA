const bcrypt = require('bcrypt');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const {
  sequelize, Person, Department, QrPass, GateEvent, MealTokenEvent,
  ContractorLabourer, Contractor, SystemUser, AuditLog, MealRegistration,
  PersonStay, FestivalEvent, GacMember, DeptHod, CafeCapacity, ZoneUpgradePayment,
  GroupMember, VfTourSlot,
} = require('../models');
const qrService = require('./qrService');
const whatsappService = require('./whatsappService');
const { ValidationError, ConflictError, NotFoundError, ForbiddenError } = require('../errors/AppError');

const LABOURER_TYPES = ['construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation'];

async function dashboardSummary() {
  // Raw join, not Person.findAll: a day-visitor group leader is one `persons`
  // row but represents qr_passes.group_size people (the other members only
  // exist as group_members rows, never their own Person) — counting person_id
  // rows undercounts every group down to just its leader. Sum group_size
  // (defaulting to 1 for every non-grouped category) instead.
  const [population] = await sequelize.query(
    `SELECT
       SUM(CASE WHEN p.person_type = 'room_guest' THEN COALESCE(qp.group_size,1) ELSE 0 END) AS room_guests,
       SUM(CASE WHEN p.person_type IN ('free_day_visitor','paid_day_visitor') THEN COALESCE(qp.group_size,1) ELSE 0 END) AS day_visitors,
       SUM(CASE WHEN p.person_type IN ('resident_staff','staff_dependant') THEN COALESCE(qp.group_size,1) ELSE 0 END) AS staff,
       SUM(CASE WHEN p.person_type IN ('volunteer_seva','sustainability_intern') THEN COALESCE(qp.group_size,1) ELSE 0 END) AS volunteers_students,
       SUM(CASE WHEN p.person_type IN ('construction_labourer','weekly_labourer_local','weekly_labourer_outstation') THEN COALESCE(qp.group_size,1) ELSE 0 END) AS labourers,
       SUM(CASE WHEN p.person_type IN ('brahmachari','varishtha_vaishnava') THEN COALESCE(qp.group_size,1) ELSE 0 END) AS ashram,
       SUM(COALESCE(qp.group_size,1)) AS total
     FROM persons p
     LEFT JOIN qr_passes qp ON qp.person_id = p.person_id AND qp.is_active = 1
     WHERE p.status = 'on_campus'`,
    { type: QueryTypes.SELECT }
  );

  const gateRows = await GateEvent.findAll({
    attributes: [
      [fn('SUM', literal(`CASE WHEN result = 'allowed' THEN 1 ELSE 0 END`)), 'entries'],
      [fn('SUM', literal(`CASE WHEN result = 'denied' THEN 1 ELSE 0 END`)), 'denials'],
    ],
    where: literal('DATE(scanned_at) = CURDATE()'),
    raw: true,
  });

  const mealsToday = await MealTokenEvent.findAll({
    attributes: ['meal_type', [fn('SUM', col('group_size')), 'served']],
    where: literal('meal_date = CURDATE()'),
    group: ['meal_type'],
    raw: true,
  });

  const pendingLabourers = await ContractorLabourer.count({ where: { approval_status: 'pending' } });
  const pendingGeneric = await Person.count({
    where: {
      status: 'pre_registered',
      registration_source: 'staff_registration',
      person_type: { [Op.notIn]: LABOURER_TYPES },
    },
  });

  return {
    population: {
      room_guests: Number(population.room_guests),
      day_visitors: Number(population.day_visitors),
      staff: Number(population.staff),
      volunteers_students: Number(population.volunteers_students),
      labourers: Number(population.labourers),
      ashram: Number(population.ashram),
      total: Number(population.total),
    },
    gate: { entries: Number(gateRows[0].entries), denials: Number(gateRows[0].denials) },
    meals: mealsToday.map((r) => ({ meal_type: r.meal_type, served: Number(r.served) })),
    pending_approvals: pendingLabourers + pendingGeneric,
  };
}

// `type` and `status` both accept comma-separated lists (Op.in) so one call
// can back a whole category page (e.g. Guests = room_guest,free_day_visitor,
// paid_day_visitor,corporate_tour_group,vip_dignitary) instead of requiring
// one request per person_type. `status` defaults to the original hardcoded
// pair for backward compatibility with existing callers that don't pass it.
async function personsByType({ type, status, page = 1, limit = 50, search }) {
  const where = {
    status: status
      ? { [Op.in]: status.split(',').map((s) => s.trim()) }
      : { [Op.in]: ['on_campus', 'pre_registered'] },
  };
  if (type) where.person_type = { [Op.in]: type.split(',').map((t) => t.trim()) };
  if (search) {
    where[Op.or] = [
      { full_name: { [Op.like]: `%${search}%` } },
      { mobile: { [Op.like]: `%${search}%` } },
    ];
  }

  const rows = await Person.findAll({
    where,
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      {
        model: QrPass, as: 'qr_passes', required: false, where: { is_active: true },
        attributes: ['qr_id', 'valid_until', 'zone_access', 'is_active', 'group_size'],
        // Populated once, at registration time, by registrationService's
        // registerVisitor — never read back anywhere until now, so a group
        // leader's admin-table row always looked identical to a solo visitor.
        include: [{
          model: GroupMember, as: 'group_members', required: false,
          attributes: ['member_id', 'member_number', 'full_name', 'age', 'gender', 'relation_to_leader'],
        }],
      },
      {
        model: PersonStay, as: 'stays', required: false, where: { is_active: true },
        attributes: ['check_in_date', 'check_out_date', 'booking_source', 'accommodation_block', 'room_number'],
      },
      {
        model: MealRegistration, as: 'meal_registrations', required: false, where: { is_active: true },
        attributes: ['meal_type', 'payment_method'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  // `count` kept as page-size for existing callers; `total` added alongside
  // (mirrors listSevaks' already-correct pattern) for real pagination UI.
  const total = await Person.count({ where });

  // Present/absent is a daily thing (did they scan in today), distinct from
  // `status` (their overall on-campus/departed lifecycle) — a resident staff
  // member stays `on_campus` for their whole employment, so `status` alone
  // can't answer "did they come in today". One query for the whole page
  // instead of one per row. GreytHR-linked people (greythr_id set) get their
  // attendance from the hourly greythrService.syncAttendance sync instead —
  // that's now the source of truth for staff, not our own gate scans —
  // falling back to gate events for everyone else (guests, volunteers, etc.
  // have no GreytHR record at all).
  const gatePersonIds = rows.filter((r) => !r.greythr_id).map((r) => r.person_id);
  const presentToday = gatePersonIds.length
    ? await GateEvent.findAll({
        attributes: ['person_id'],
        where: {
          [Op.and]: [
            { person_id: { [Op.in]: gatePersonIds } },
            { result: 'allowed' },
            literal('DATE(scanned_at) = CURDATE()'),
          ],
        },
        raw: true,
      })
    : [];
  const presentSet = new Set(presentToday.map((r) => r.person_id));
  const data = rows.map((r) => ({
    ...r.toJSON(),
    present_today: r.greythr_id ? Boolean(r.greythr_present_today) : presentSet.has(r.person_id),
  }));

  return { data, count: data.length, total, page: Number(page), limit: Number(limit) };
}

// Two sources, merged: contractor labourers (linked to a company, via
// contractor_labourers) and generic staff/volunteer self-registrations
// (plain persons row, no linking table). `source` tells the Admin Portal
// which shape it's looking at — mirrors the Postgres backend's UNION ALL,
// done here as two queries merged in JS (sidesteps needing NULL::type casts
// to align branch columns, which Postgres needed but this approach doesn't).
async function pendingApprovals() {
  const labourerRows = await ContractorLabourer.findAll({
    where: { approval_status: 'pending' },
    include: [
      { model: Person, as: 'person', include: [{ model: Department, as: 'department', attributes: ['dept_name'] }] },
      { model: Contractor, as: 'contractor', attributes: ['company_name'] },
    ],
  });

  const genericRows = await Person.findAll({
    where: {
      status: 'pre_registered',
      registration_source: 'staff_registration',
      person_type: { [Op.notIn]: LABOURER_TYPES },
    },
    include: [{ model: Department, as: 'department', attributes: ['dept_name'] }],
  });

  const fromLabourers = labourerRows.map((cl) => ({
    person_id: cl.person.person_id,
    full_name: cl.person.full_name,
    person_type: cl.person.person_type,
    mobile: cl.person.mobile,
    created_at: cl.person.created_at,
    dept_id: cl.person.dept_id,
    dept_name: cl.person.department?.dept_name || null,
    cl_id: cl.cl_id,
    camp_location: cl.camp_location,
    annakshetra_bd_opted: cl.annakshetra_bd_opted,
    contractor_name: cl.contractor?.company_name || null,
    source: 'contractor_labourer',
  }));

  const fromGeneric = genericRows.map((p) => ({
    person_id: p.person_id,
    full_name: p.full_name,
    person_type: p.person_type,
    mobile: p.mobile,
    created_at: p.created_at,
    dept_id: p.dept_id,
    dept_name: p.department?.dept_name || null,
    cl_id: null,
    camp_location: null,
    annakshetra_bd_opted: null,
    contractor_name: null,
    source: 'staff_registration',
  }));

  return [...fromLabourers, ...fromGeneric].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

// Some person types are approved only by a narrower group than the route's
// general MGT gate (super_admin/management/module_admin/dept_manager) — a
// Seva volunteer's approval belongs to super_admin or a dept_manager
// specifically scoped to the 'seva' module (the Seva HOD), not any
// dept_manager or module_admin who happens to have vms access.
const SCOPED_APPROVAL_TYPES = {
  volunteer_seva: 'seva',
  sustainability_intern: 'seva',
};

function canApprovePersonType(personType, currentUser) {
  const requiredModule = SCOPED_APPROVAL_TYPES[personType];
  if (!requiredModule) return true;
  if (currentUser.role === 'super_admin') return true;
  return currentUser.role === 'dept_manager' && (currentUser.module_access || []).includes(requiredModule);
}

async function approvePerson(person_id, { valid_from, valid_until, group_size }, currentUser, ip) {
  let person;
  let qrPass;

  await sequelize.transaction(async (t) => {
    person = await Person.findByPk(person_id, { transaction: t });
    if (!person) throw new NotFoundError('Person not found');

    if (!canApprovePersonType(person.person_type, currentUser)) {
      throw new ForbiddenError('You are not authorized to approve this visitor type');
    }

    const pendingLabourer = await ContractorLabourer.findOne({
      where: { person_id, approval_status: 'pending' },
      transaction: t,
    });

    if (pendingLabourer) {
      await pendingLabourer.update(
        { approval_status: 'approved', approved_by: currentUser.user_id, approved_at: new Date() },
        { transaction: t }
      );
    } else {
      const genericPending = await Person.findOne({
        where: { person_id, status: 'pre_registered', registration_source: 'staff_registration' },
        transaction: t,
      });
      if (!genericPending) throw new NotFoundError('No pending approval for this person');
    }

    await person.update({ status: 'on_campus' }, { transaction: t });

    const zones = qrService.getZoneAccess(person.person_type);
    qrPass = await QrPass.create(
      {
        person_id,
        pass_type: 'stay_pass',
        zone_access: zones,
        valid_from: valid_from || new Date(),
        valid_until: valid_until || null,
        group_size: group_size || 1,
        is_active: true,
      },
      { transaction: t }
    );

    await AuditLog.create(
      {
        user_id: currentUser.user_id, person_id, action: 'APPROVE_PERSON', module: 'vms', table_name: 'persons',
        record_id: person_id, new_value: { qr_id: qrPass.qr_id, zones }, ip_address: ip || null,
      },
      { transaction: t }
    );
  });

  whatsappService
    .sendQRPass(
      person.mobile,
      qrService.getQRPublicURL(qrPass.qr_id),
      person.full_name,
      valid_until ? new Date(valid_until).toLocaleDateString('en-IN') : 'Valid until further notice'
    )
    .catch((err) => console.error('WhatsApp failed:', err.message));

  return { qr_id: qrPass.qr_id };
}

const VOLUNTEER_TYPES = ['volunteer_seva', 'sustainability_intern'];

// Changes a volunteer's seva period, either direction — same authorization
// boundary as approving them (super_admin, or a dept_manager scoped to
// 'seva'). 'extend' pushes person_stays.check_out_date later and leaves the
// stay/pass/person untouched otherwise (still on_campus, still active);
// 'close' pulls it earlier (or to today), deactivates the stay, shortens or
// revokes the QR pass, and marks the person departed — the two share almost
// everything, so one function with an action switch instead of two.
async function updateVolunteerSevaPeriod(person_id, { new_end_date, action, remarks }, currentUser, ip) {
  if (!new_end_date) throw new ValidationError('new_end_date is required');
  if (!['extend', 'close'].includes(action)) throw new ValidationError('action must be extend or close');

  return sequelize.transaction(async (t) => {
    const person = await Person.findByPk(person_id, { transaction: t });
    if (!person) throw new NotFoundError('Person not found');
    if (!VOLUNTEER_TYPES.includes(person.person_type)) {
      throw new ValidationError('This action is only available for volunteers and sustainability interns');
    }
    if (!canApprovePersonType(person.person_type, currentUser)) {
      throw new ForbiddenError(`You are not authorized to ${action === 'extend' ? 'extend' : 'close out'} this person’s seva`);
    }

    const stay = await PersonStay.findOne({ where: { person_id, is_active: true }, transaction: t });
    if (!stay) throw new ConflictError('No active seva period found for this person');

    if (stay.check_in_date && new Date(new_end_date) < new Date(stay.check_in_date)) {
      throw new ValidationError('New end date cannot be before the seva start date');
    }
    if (action === 'extend' && stay.check_out_date && new Date(new_end_date) <= new Date(stay.check_out_date)) {
      throw new ValidationError('Extended end date must be after the current end date');
    }
    if (action === 'close' && stay.check_out_date && new Date(new_end_date) > new Date(stay.check_out_date)) {
      throw new ValidationError('Use Extend Seva to move the end date later, not Reduce & Close');
    }

    await stay.update(
      {
        check_out_date: new_end_date,
        is_active: action === 'extend',
        actual_check_out: action === 'close' ? new Date() : stay.actual_check_out,
        notes: action === 'close' && remarks?.trim() ? remarks.trim() : stay.notes,
      },
      { transaction: t }
    );

    const qrPass = await QrPass.findOne({ where: { person_id, is_active: true }, transaction: t });
    if (qrPass) {
      const stillFuture = new Date(new_end_date) > new Date();
      await qrPass.update(
        { valid_until: new_end_date, is_active: action === 'extend' ? true : stillFuture },
        { transaction: t }
      );
    }

    if (action === 'close') {
      await person.update({ status: 'departed' }, { transaction: t });
    }

    await AuditLog.create(
      {
        user_id: currentUser.user_id, person_id,
        action: action === 'extend' ? 'EXTEND_VOLUNTEER_SEVA' : 'REDUCE_CLOSE_VOLUNTEER',
        module: 'vms', table_name: 'persons',
        record_id: person_id, new_value: { new_end_date, action, remarks: action === 'close' ? remarks || null : undefined }, ip_address: ip || null,
      },
      { transaction: t }
    );

    return { person_id, new_end_date, action };
  });
}

const EDITABLE_MEAL_TYPES = ['breakfast', 'dinner'];

// Manual admin path for accommodation/meals. Meal enrollment is always
// manual — Greythr has no per-meal-type field, only a coarse yes/no meal-
// coupon-eligibility category. Accommodation is manual only for people
// *without* a greythr_id (guests, volunteers, etc.) — for Greythr-linked
// staff, accommodation_block gets overwritten by the next sync (category 26
// on their end), same as full_name/mobile already do; room_number stays
// manual for everyone since Greythr has no room-level field at all.
async function updatePersonAccommodationMeals(person_id, { accommodation_block, room_number, meals }, currentUser, ip) {
  if (meals !== undefined) {
    if (!Array.isArray(meals) || meals.some((m) => !EDITABLE_MEAL_TYPES.includes(m))) {
      throw new ValidationError(`meals must be an array containing only: ${EDITABLE_MEAL_TYPES.join(', ')}`);
    }
  }

  return sequelize.transaction(async (t) => {
    const person = await Person.findByPk(person_id, { transaction: t });
    if (!person) throw new NotFoundError('Person not found');

    await person.update(
      {
        accommodation_block: accommodation_block?.trim() || null,
        room_number: room_number?.trim() || null,
      },
      { transaction: t }
    );

    if (meals !== undefined) {
      const enrolled = new Set(meals);
      for (const mealType of EDITABLE_MEAL_TYPES) {
        const shouldBeActive = enrolled.has(mealType);
        const existingReg = await MealRegistration.findOne({
          where: { person_id, meal_type: mealType, is_active: true }, transaction: t,
        });
        if (shouldBeActive && !existingReg) {
          await MealRegistration.create(
            {
              person_id, meal_type: mealType, payment_method: 'salary_deduction',
              valid_from: new Date(), is_active: true, registered_by: currentUser.user_id,
            },
            { transaction: t }
          );
        } else if (!shouldBeActive && existingReg) {
          await existingReg.update({ is_active: false, valid_until: new Date() }, { transaction: t });
        }
      }
    }

    await AuditLog.create(
      {
        user_id: currentUser.user_id, person_id, action: 'UPDATE_ACCOMMODATION_MEALS',
        module: 'admin', table_name: 'persons', record_id: person_id,
        new_value: { accommodation_block, room_number, meals }, ip_address: ip || null,
      },
      { transaction: t }
    );

    return { person_id };
  });
}

async function auditTrail({ page = 1, limit = 100, user_id, module }) {
  const where = {};
  if (user_id) where.user_id = user_id;
  if (module) where.module = module;

  const rows = await AuditLog.findAll({
    where,
    include: [{
      model: SystemUser, as: 'user', required: false, attributes: ['username'],
      include: [{ model: Person, as: 'person', required: false, attributes: ['full_name'] }],
    }],
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  return rows;
}

async function listUsers() {
  return SystemUser.findAll({
    attributes: ['user_id', 'username', 'role', 'module_access', 'dept_id', 'is_active', 'is_locked', 'last_login'],
    include: [{ model: Person, as: 'person', attributes: ['full_name', 'mobile'] }],
    order: [['role', 'ASC']],
  });
}

async function createUser({ person_id, username, password, role, module_access, dept_id }, currentUserId) {
  if (!person_id || !username || !password || !role) {
    throw new ValidationError('person_id, username, password, role required');
  }

  const hash = await bcrypt.hash(password, 12);
  try {
    const user = await SystemUser.create({
      person_id, username, password_hash: hash, role,
      module_access: module_access || [], dept_id: dept_id || null, created_by: currentUserId,
    });
    return { user_id: user.user_id, username: user.username, role: user.role, module_access: user.module_access };
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') throw new ValidationError('Username already exists');
    if (err.name === 'SequelizeForeignKeyConstraintError') throw new ValidationError('person_id does not exist');
    throw err;
  }
}

async function listDepartments() {
  return Department.findAll({ attributes: ['dept_id', 'dept_name'], order: [['dept_name', 'ASC']] });
}

async function createSevak(body, currentUserId, ip) {
  const {
    full_name, mobile, gender = 'not_specified', dept_id,
    zone_access = ['zone1', 'zone2', 'zone3'], meal_access = false, meal_payment = 'dept_sponsored',
    valid_days, create_login = false, username, password, login_role = 'operator', module_access = [],
  } = body;

  if (!full_name || !mobile) throw new ValidationError('full_name and mobile are required');
  if (create_login && (!username || !password)) {
    throw new ValidationError('username and password required when create_login is true');
  }

  let result;
  try {
    result = await sequelize.transaction(async (t) => {
      const person = await Person.create(
        {
          full_name, mobile: mobile.trim(), gender, person_type: 'volunteer_seva', dept_id: dept_id || null,
          status: 'on_campus', registered_by: currentUserId, registration_source: 'admin_portal',
        },
        { transaction: t }
      );

      const valid_until = valid_days ? new Date(Date.now() + parseInt(valid_days, 10) * 86400000) : null;

      const qrPass = await QrPass.create(
        {
          // 'seva_pass' is not a legal QrPass.pass_type value (see QrPass.js's
          // ENUM) — every call used to throw a SequelizeValidationError.
          // 'stay_pass' is the closest legal fit; pass_type doesn't drive
          // zone access (zone_access is a separate JSON field), so nothing
          // behavioral changes.
          person_id: person.person_id, pass_type: 'stay_pass', zone_access,
          valid_from: new Date(), valid_until, group_size: 1, is_active: true,
        },
        { transaction: t }
      );

      if (meal_access) {
        for (const meal_type of ['breakfast', 'dinner']) {
          await MealRegistration.create(
            {
              person_id: person.person_id, meal_type, payment_method: meal_payment,
              dept_sponsor_id: dept_id || null, valid_from: new Date(), valid_until, is_active: true,
              registered_by: currentUserId,
            },
            { transaction: t }
          );
        }
      }

      let user_data = null;
      if (create_login) {
        const hash = await bcrypt.hash(password, 12);
        const user = await SystemUser.create(
          {
            person_id: person.person_id, username: username.toLowerCase().trim(), password_hash: hash,
            role: login_role, module_access, dept_id: dept_id || null, created_by: currentUserId,
          },
          { transaction: t }
        );
        user_data = { user_id: user.user_id, username: user.username, role: user.role };
      }

      await AuditLog.create(
        {
          user_id: currentUserId, person_id: person.person_id, action: 'CREATE_SEVAK', module: 'vms',
          table_name: 'persons', record_id: person.person_id,
          notes: `Sevak: ${full_name}${create_login ? ' + login: ' + username : ''}`,
          ip_address: ip || null,
        },
        { transaction: t }
      );

      return { person_id: person.person_id, qr_id: qrPass.qr_id, user: user_data };
    });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      throw new ValidationError('Mobile number or username already exists');
    }
    console.error('createSevak:', err);
    throw err;
  }

  return result;
}

async function listSevaks({ dept_id, page = 1, limit = 50 }, currentUser) {
  const where = { person_type: 'volunteer_seva', status: { [Op.ne]: 'archived' } };
  const effectiveDeptId = currentUser.role === 'dept_manager' ? currentUser.dept_id : dept_id;
  if (effectiveDeptId) where.dept_id = effectiveDeptId;

  const rows = await Person.findAll({
    where,
    attributes: ['person_id', 'full_name', 'mobile', 'status', 'created_at', 'dept_id'],
    include: [
      { model: Department, as: 'department', attributes: ['dept_name'] },
      { model: QrPass, as: 'qr_passes', required: false, where: { is_active: true }, attributes: ['qr_id', 'zone_access', 'valid_until', 'is_active'] },
      { model: SystemUser, as: 'system_user', required: false, where: { is_active: true }, attributes: ['username', 'is_active'] },
    ],
    order: [['created_at', 'DESC']],
    limit: Number(limit),
    offset: (Number(page) - 1) * Number(limit),
  });

  const total = await Person.count({ where });

  return { data: rows, total };
}

async function festivalsList() {
  return FestivalEvent.findAll({ order: [['festival_date', 'ASC']] });
}

async function toggleFestivalMode(festival_id, festival_mode_on, currentUserId, ip) {
  const festival = await FestivalEvent.findByPk(festival_id);
  if (!festival) throw new NotFoundError('Festival not found');

  await festival.update({ festival_mode_on: Boolean(festival_mode_on) });

  await AuditLog.create({
    user_id: currentUserId, action: 'TOGGLE_FESTIVAL_MODE', module: 'admin',
    table_name: 'festival_events', record_id: festival_id,
    new_value: { festival_mode_on: Boolean(festival_mode_on) }, ip_address: ip || null,
  });

  return festival;
}

async function gacMembersList() {
  return GacMember.findAll({ where: { is_active: true }, order: [['gac_position', 'ASC']] });
}

async function deptHodsList() {
  return DeptHod.findAll({
    include: [{ model: Department, as: 'department', attributes: ['dept_id', 'dept_name'], required: false }],
    order: [['hod_name', 'ASC']],
  });
}

async function cafeCapacityList({ date }) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  return CafeCapacity.findAll({
    where: { capacity_date: targetDate },
    order: [['cafe_code', 'ASC'], ['meal_type', 'ASC']],
  });
}

async function declareCafeCapacity(body, declaredByName, currentUserId, ip) {
  const { cafe_code, capacity_date, meal_type, threshold, notes } = body;
  if (!cafe_code || !capacity_date || !meal_type || threshold == null) {
    throw new ValidationError('cafe_code, capacity_date, meal_type, threshold are required');
  }

  const [row, created] = await CafeCapacity.findOrCreate({
    where: { cafe_code, capacity_date, meal_type },
    defaults: { threshold, declared_by: declaredByName, notes: notes || null },
  });

  if (!created) {
    await row.update({ threshold, declared_by: declaredByName, declared_at: new Date(), notes: notes || null });
  }

  await AuditLog.create({
    user_id: currentUserId, action: 'DECLARE_CAFE_CAPACITY', module: 'admin',
    table_name: 'cafe_capacity', record_id: row.capacity_id,
    new_value: { cafe_code, capacity_date, meal_type, threshold }, ip_address: ip || null,
  });

  return row;
}

// Nothing ever wrote to vf_tour_slots before this — the public registration
// wizard's VF Tour step silently fell back to a fake, non-bookable static
// slot list (slotId: null) whenever no real row existed for today. This is
// the first admin-side way to actually populate the table.
async function vfSlotsListAdmin({ date } = {}) {
  const where = date
    ? { tour_date: date }
    : { tour_date: { [Op.between]: [literal('CURDATE()'), literal('DATE_ADD(CURDATE(), INTERVAL 7 DAY)')] } };

  return VfTourSlot.findAll({
    attributes: [
      'slot_id', 'tour_date', 'slot_time', 'capacity', 'booked_count', 'tour_type',
      [literal('capacity - booked_count'), 'available'],
    ],
    where,
    order: [['tour_date', 'ASC'], ['slot_time', 'ASC']],
    raw: true,
  });
}

async function upsertVfSlot(body, currentUserId, ip) {
  const { tour_date, slot_time, capacity, tour_type = 'free' } = body;
  if (!tour_date || !slot_time || capacity == null) {
    throw new ValidationError('tour_date, slot_time, capacity are required');
  }

  const [row, created] = await VfTourSlot.findOrCreate({
    where: { tour_date, slot_time, tour_type },
    defaults: { capacity },
  });

  if (!created) {
    if (capacity < row.booked_count) {
      throw new ValidationError(`Capacity can't be less than ${row.booked_count} already booked`);
    }
    await row.update({ capacity });
  }

  await AuditLog.create({
    user_id: currentUserId, action: created ? 'CREATE_VF_SLOT' : 'UPDATE_VF_SLOT', module: 'vms',
    table_name: 'vf_tour_slots', record_id: row.slot_id,
    new_value: { tour_date, slot_time, capacity, tour_type }, ip_address: ip || null,
  });

  return row;
}

async function deleteVfSlot(slot_id, currentUserId, ip) {
  const row = await VfTourSlot.findByPk(slot_id);
  if (!row) throw new NotFoundError('VF tour slot not found');
  if (row.booked_count > 0) {
    throw new ValidationError(`Can't delete — ${row.booked_count} visitor(s) already booked into this slot`);
  }

  await row.destroy();

  await AuditLog.create({
    user_id: currentUserId, action: 'DELETE_VF_SLOT', module: 'vms',
    table_name: 'vf_tour_slots', record_id: slot_id,
    old_value: { tour_date: row.tour_date, slot_time: row.slot_time }, ip_address: ip || null,
  });

  return { success: true };
}

async function zone3UpgradesToday({ date }) {
  const targetDate = date || new Date().toISOString().slice(0, 10);
  const rows = await ZoneUpgradePayment.findAll({
    where: { meal_date: targetDate, payment_status: 'paid' },
    include: [{
      model: QrPass, as: 'qr_pass', required: false,
      include: [{ model: Person, as: 'person', attributes: ['full_name', 'mobile'], required: false }],
    }],
    order: [['paid_at', 'DESC']],
  });

  return {
    date: targetDate,
    count: rows.length,
    total_revenue: rows.reduce((sum, r) => sum + Number(r.total_amount), 0),
    total_persons: rows.reduce((sum, r) => sum + r.persons_count, 0),
    payments: rows.map((r) => ({
      upgrade_id: r.upgrade_id,
      full_name: r.qr_pass?.person?.full_name || null,
      mobile: r.qr_pass?.person?.mobile || null,
      gate_name: r.gate_name,
      persons_count: r.persons_count,
      total_amount: Number(r.total_amount),
      cafe_code: r.cafe_code,
      meal_type: r.meal_type,
      paid_at: r.paid_at,
    })),
  };
}

// Admin-facing contractor list — richer than the public GET
// /api/register/contractors (which only needs company_name/contract_type for
// a form dropdown): adds POC contact, dept, contract dates, and a real
// approved-worker count per contractor.
async function contractorsListAdmin() {
  const rows = await Contractor.findAll({
    where: { status: 'approved' },
    attributes: ['contractor_id', 'company_name', 'poc_name', 'poc_mobile', 'contract_type', 'start_date', 'end_date', 'status'],
    include: [{ model: Department, as: 'department', attributes: ['dept_name'], required: false }],
    order: [['company_name', 'ASC']],
  });

  const counts = await ContractorLabourer.findAll({
    attributes: ['contractor_id', [fn('COUNT', col('cl_id')), 'worker_count']],
    where: { approval_status: 'approved' },
    group: ['contractor_id'],
    raw: true,
  });
  const countByContractor = Object.fromEntries(counts.map((c) => [c.contractor_id, Number(c.worker_count)]));

  return rows.map((r) => ({
    contractor_id: r.contractor_id,
    company_name: r.company_name,
    poc_name: r.poc_name,
    poc_mobile: r.poc_mobile,
    contract_type: r.contract_type,
    dept_name: r.department?.dept_name || null,
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    worker_count: countByContractor[r.contractor_id] || 0,
  }));
}

// Companies auto-created by the "company not listed" path in the public
// staff-registration form (see registrationService.registerStaff) — the
// worker who typed the name becomes the placeholder POC until an admin
// reviews it here.
async function pendingContractors() {
  const rows = await Contractor.findAll({
    where: { status: 'pending' },
    attributes: ['contractor_id', 'company_name', 'poc_name', 'poc_mobile', 'contract_type', 'created_at'],
    order: [['created_at', 'DESC']],
  });

  const counts = await ContractorLabourer.findAll({
    attributes: ['contractor_id', [fn('COUNT', col('cl_id')), 'worker_count']],
    where: { contractor_id: rows.map((r) => r.contractor_id) },
    group: ['contractor_id'],
    raw: true,
  });
  const countByContractor = Object.fromEntries(counts.map((c) => [c.contractor_id, Number(c.worker_count)]));

  return rows.map((r) => ({
    contractor_id: r.contractor_id,
    company_name: r.company_name,
    poc_name: r.poc_name,
    poc_mobile: r.poc_mobile,
    contract_type: r.contract_type,
    created_at: r.created_at,
    worker_count: countByContractor[r.contractor_id] || 0,
  }));
}

async function approveContractor(contractor_id, currentUserId, ip) {
  const contractor = await Contractor.findByPk(contractor_id);
  if (!contractor) throw new NotFoundError('Contractor not found');

  await contractor.update({ status: 'approved', approved_by: currentUserId, approved_at: new Date() });

  await AuditLog.create({
    user_id: currentUserId, action: 'APPROVE_CONTRACTOR', module: 'vms',
    table_name: 'contractors', record_id: contractor.contractor_id,
    new_value: { company_name: contractor.company_name }, ip_address: ip || null,
  });

  return { contractor_id: contractor.contractor_id, company_name: contractor.company_name };
}

// Generalizes createSevak's "person + QR + optional meal registration, one
// transaction" pattern across any person_type — backs the Admin Portal's
// "Register New Person" form (its own copy already promises "Register &
// Send QR Pass" plus an Annakshetra B/D sub-section, so this fulfills what
// the page already depicts rather than adding new scope). Uses 'stay_pass'
// (not 'day_pass') to match approvePerson's precedent for admin-issued
// passes of unspecified/variable duration.
async function registerPerson(body, currentUserId, ip) {
  const {
    full_name, mobile, person_type, gender = 'not_specified', dept_id,
    id_proof_type, id_proof_number, date_of_birth, perm_address, city, state, pincode,
    campus_location, check_in_date, check_out_date,
    zone_access, valid_days,
    register_bd = false, bd_payment_method = 'dept_sponsored',
  } = body;

  if (!full_name || !mobile || !person_type) {
    throw new ValidationError('full_name, mobile and person_type are required');
  }

  const result = await sequelize.transaction(async (t) => {
    const person = await Person.create(
      {
        full_name, mobile: mobile.trim(), person_type, gender, dept_id: dept_id || null,
        id_proof_type: id_proof_type || null, id_proof_number: id_proof_number || null,
        date_of_birth: date_of_birth || null, perm_address: perm_address || null,
        city: city || null, state: state || null, pincode: pincode || null,
        campus_location: campus_location || null,
        status: 'on_campus', registered_by: currentUserId, registration_source: 'admin_portal',
      },
      { transaction: t }
    );

    if (check_in_date || check_out_date) {
      await PersonStay.create(
        {
          person_id: person.person_id, check_in_date: check_in_date || null, check_out_date: check_out_date || null,
          is_active: true, stay_type: 'admin_registered',
        },
        { transaction: t }
      );
    }

    const zones = Array.isArray(zone_access) && zone_access.length ? zone_access : qrService.getZoneAccess(person_type);
    const valid_until = valid_days ? new Date(Date.now() + parseInt(valid_days, 10) * 86400000) : (check_out_date || null);

    const qrPass = await QrPass.create(
      {
        person_id: person.person_id, pass_type: 'stay_pass', zone_access: zones,
        valid_from: new Date(), valid_until, group_size: 1, is_active: true,
      },
      { transaction: t }
    );

    if (register_bd) {
      for (const meal_type of ['breakfast', 'dinner']) {
        await MealRegistration.create(
          {
            person_id: person.person_id, meal_type, payment_method: bd_payment_method,
            dept_sponsor_id: dept_id || null, valid_from: new Date(), valid_until, is_active: true,
            registered_by: currentUserId,
          },
          { transaction: t }
        );
      }
    }

    await AuditLog.create(
      {
        user_id: currentUserId, person_id: person.person_id, action: 'REGISTER_PERSON', module: 'vms',
        table_name: 'persons', record_id: person.person_id,
        notes: `Admin-registered: ${full_name} (${person_type})`, ip_address: ip || null,
      },
      { transaction: t }
    );

    return { person_id: person.person_id, qr_id: qrPass.qr_id };
  });

  const person = await Person.findByPk(result.person_id);
  whatsappService
    .sendQRPass(person.mobile, qrService.getQRPublicURL(result.qr_id), person.full_name, 'Valid until further notice')
    .catch((err) => console.error('WhatsApp failed:', err.message));

  return result;
}

const ASHRAM_TYPES = ['brahmachari', 'varishtha_vaishnava'];

// Bulk create/update Brahmacharis or Varishtha Vaishnavas from an admin-
// uploaded roster (parsed to plain rows client-side — see
// frontend/src/apps/admin/components/UploadRosterModal.tsx). Upserts by
// mobile: an existing person with that mobile gets their fields refreshed;
// a new mobile gets a full Person + permanent QrPass, mirroring
// registerPerson's shape. Each row is its own transaction so one bad row
// (missing name/mobile, duplicate, etc.) doesn't abort the whole batch —
// callers get a per-row success/failure summary back.
async function ashramBulkImport({ person_type, rows }, currentUserId, ip) {
  if (!ASHRAM_TYPES.includes(person_type)) {
    throw new ValidationError('person_type must be brahmachari or varishtha_vaishnava');
  }
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new ValidationError('rows must be a non-empty array');
  }

  const summary = { created: 0, updated: 0, failed: 0, errors: [] };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || {};
    const full_name = String(row.full_name || '').trim();
    const mobile = String(row.mobile || '').trim();
    const rowLabel = full_name || `row ${i + 1}`;

    if (!full_name || !mobile) {
      summary.failed++;
      summary.errors.push({ row: i + 1, name: rowLabel, reason: 'Full name and mobile are required' });
      continue;
    }

    try {
      await sequelize.transaction(async (t) => {
        const existing = await Person.findOne({ where: { mobile }, transaction: t });

        if (existing) {
          await existing.update(
            {
              full_name,
              person_type,
              gender: row.gender || existing.gender,
              date_of_birth: row.date_of_birth || existing.date_of_birth,
              campus_location: row.campus_location || existing.campus_location,
              status: 'on_campus',
            },
            { transaction: t }
          );
          summary.updated++;

          await AuditLog.create(
            {
              user_id: currentUserId, person_id: existing.person_id, action: 'ASHRAM_ROSTER_UPDATE', module: 'vms',
              table_name: 'persons', record_id: existing.person_id,
              notes: `Roster import updated: ${full_name}`, ip_address: ip || null,
            },
            { transaction: t }
          );
        } else {
          const person = await Person.create(
            {
              full_name, mobile, person_type,
              gender: row.gender || 'not_specified',
              date_of_birth: row.date_of_birth || null,
              campus_location: row.campus_location || null,
              status: 'on_campus', registered_by: currentUserId, registration_source: 'excel_import',
            },
            { transaction: t }
          );

          const zones = qrService.getZoneAccess(person_type);
          await QrPass.create(
            {
              person_id: person.person_id, pass_type: 'permanent', zone_access: zones,
              valid_from: new Date(), valid_until: null, group_size: 1, is_active: true,
            },
            { transaction: t }
          );
          summary.created++;

          await AuditLog.create(
            {
              user_id: currentUserId, person_id: person.person_id, action: 'ASHRAM_ROSTER_CREATE', module: 'vms',
              table_name: 'persons', record_id: person.person_id,
              notes: `Roster import created: ${full_name}`, ip_address: ip || null,
            },
            { transaction: t }
          );
        }
      });
    } catch (err) {
      summary.failed++;
      const reason = err.name === 'SequelizeUniqueConstraintError' ? 'Duplicate mobile number' : err.message;
      summary.errors.push({ row: i + 1, name: rowLabel, reason });
    }
  }

  return summary;
}

module.exports = {
  dashboardSummary, personsByType, pendingApprovals, approvePerson, updateVolunteerSevaPeriod,
  updatePersonAccommodationMeals,
  auditTrail, listUsers, createUser, listDepartments, createSevak, listSevaks,
  festivalsList, toggleFestivalMode, gacMembersList, deptHodsList,
  cafeCapacityList, declareCafeCapacity, zone3UpgradesToday,
  contractorsListAdmin, registerPerson, ashramBulkImport,
  pendingContractors, approveContractor,
  vfSlotsListAdmin, upsertVfSlot, deleteVfSlot,
};
