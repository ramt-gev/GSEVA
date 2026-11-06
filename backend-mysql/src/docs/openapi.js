'use strict';

// Hand-authored OpenAPI 3.0 spec covering every route in src/routes/*.js.
// Not generated from JSDoc comments scattered through the route files —
// keeping it as one file makes it easy to see the whole API surface at a
// glance, at the cost of needing a manual update alongside route changes.

const BEARER = [{ bearerAuth: [] }];

function obj(description, props) {
  return { type: 'object', description, properties: props || {} };
}
function ref(schema) {
  return { $ref: `#/components/schemas/${schema}` };
}
function jsonBody(schema, example) {
  return { required: true, content: { 'application/json': { schema, example } } };
}
function okData(schema) {
  return { 200: { description: 'OK', content: { 'application/json': { schema: obj(null, { data: schema }) } } } };
}
function ok(schema) {
  return { 200: { description: 'OK', content: { 'application/json': { schema } } } };
}
function errorResponses(...codes) {
  const map = { 400: 'Validation error', 401: 'Missing/invalid token', 403: 'Insufficient role', 404: 'Not found', 409: 'Conflict' };
  const out = {};
  for (const c of codes) out[c] = { description: map[c], content: { 'application/json': { schema: obj(null, { error: { type: 'string' } }) } } };
  return out;
}
function pathParam(name, description, schema = { type: 'string' }) {
  return { name, in: 'path', required: true, description, schema };
}
function queryParam(name, description, schema = { type: 'string' }, required = false) {
  return { name, in: 'query', required, description, schema };
}
function op({ summary, tags, security, parameters, requestBody, responses }) {
  return { summary, tags, security, parameters, requestBody, responses: { ...responses, ...(security ? errorResponses(401, 403) : {}) } };
}
function paths(entries) {
  const out = {};
  for (const [method, path, definition] of entries) {
    out[path] = out[path] || {};
    out[path][method] = definition;
  }
  return out;
}

const PersonType = {
  type: 'string',
  enum: [
    'room_guest', 'free_day_visitor', 'paid_day_visitor', 'course_student', 'volunteer_seva',
    'sustainability_intern', 'resident_staff', 'staff_dependant', 'brahmachari', 'varishtha_vaishnava',
    'weekly_labourer_local', 'weekly_labourer_outstation', 'construction_labourer', 'vendor_supplier',
    'corporate_tour_group', 'vip_dignitary',
  ],
};

// ---------- Auth ----------
const auth = paths([
  ['post', '/api/auth/login', op({
    summary: 'Username/password login', tags: ['Auth'],
    requestBody: jsonBody(obj(null, { username: { type: 'string' }, password: { type: 'string' } }), { username: 'ram.prabhu', password: 'admin123' }),
    responses: { ...ok(obj(null, { token: { type: 'string' }, user: ref('CurrentUser') })), ...errorResponses(401) },
  })],
  ['post', '/api/auth/google', op({
    summary: 'Google Sign-In login', tags: ['Auth'],
    requestBody: jsonBody(obj(null, { credential: { type: 'string', description: 'Google ID token' } })),
    responses: { ...ok(obj(null, { token: { type: 'string' }, user: ref('CurrentUser') })), ...errorResponses(401, 400) },
  })],
  ['post', '/api/auth/google/link', op({
    summary: 'Link the signed-in account to a Google identity', tags: ['Auth'], security: BEARER,
    requestBody: jsonBody(obj(null, { credential: { type: 'string' } })),
    responses: ok(obj(null, { ok: { type: 'boolean' }, google_email: { type: 'string' }, google_name: { type: 'string' } })),
  })],
  ['post', '/api/auth/google/unlink', op({
    summary: 'Unlink Google from the signed-in account', tags: ['Auth'], security: BEARER,
    responses: ok(obj(null, { ok: { type: 'boolean' } })),
  })],
  ['get', '/api/auth/me', op({
    summary: 'Current user profile', tags: ['Auth'], security: BEARER,
    responses: okData(ref('CurrentUser')),
  })],
]);

// ---------- Public Registration ----------
const registration = paths([
  ['get', '/api/register/public-config', op({ summary: 'System config for the public wizard (group size, prices, VF capacity)', tags: ['Public Registration'], responses: okData(obj()) })],
  ['get', '/api/register/vf-slots', op({ summary: 'Next 7 days of Vrindavan Forest Tour slots', tags: ['Public Registration'], responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/register/cafe-capacity', op({
    summary: "Today's Zone 3 café capacity", tags: ['Public Registration'],
    parameters: [queryParam('cafe', 'Café code', { type: 'string', enum: ['GGA', 'DHAN'] }), queryParam('meal', 'Meal slot', { type: 'string', default: 'lunch' })],
    responses: okData(obj()),
  })],
  ['get', '/api/register/contractors', op({ summary: 'Approved contractor companies (labourer sub-form dropdown)', tags: ['Public Registration'], responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/register/departments', op({ summary: 'Active departments (volunteer registration dropdown)', tags: ['Public Registration'], responses: okData({ type: 'array', items: obj(null, { dept_id: { type: 'string' }, dept_name: { type: 'string' } }) }) })],
  ['post', '/api/register/visitor', op({
    summary: 'Smart Registration — free/paid day visitor, gets an instant QR pass', tags: ['Public Registration'],
    requestBody: jsonBody(obj(null, {
      full_name: { type: 'string' }, mobile: { type: 'string' }, person_type: { type: 'string', enum: ['free_day_visitor', 'paid_day_visitor'] },
      group_size: { type: 'integer' }, members: { type: 'array', items: obj() }, vf_slot_id: { type: 'string' },
      lunch_indicated: { type: 'boolean' }, khichadi_indicated: { type: 'boolean' }, zone3_upgrade: { type: 'boolean' }, cafe_code: { type: 'string', enum: ['GGA', 'DHAN'] },
      razorpay_payment_id: { type: 'string' }, razorpay_order_id: { type: 'string' },
    })),
    responses: { 201: { description: 'Registered', content: { 'application/json': { schema: obj(null, { success: { type: 'boolean' }, message: { type: 'string' }, data: obj(null, { person_id: { type: 'string' }, qr_id: { type: 'string' }, qr_url: { type: 'string' }, zones: { type: 'array', items: { type: 'string' } }, valid_until: { type: 'string' } }) }) } } }, ...errorResponses(400, 409) },
  })],
  ['post', '/api/register/staff', op({
    summary: 'Volunteer / Contractor / Vendor / Ashram / Guest of Residence registration — pending approval', tags: ['Public Registration'],
    requestBody: jsonBody(obj(null, {
      full_name: { type: 'string' }, mobile: { type: 'string' }, gender: { type: 'string' },
      person_type: { type: 'string', enum: ['volunteer_seva', 'vendor_supplier', 'brahmachari', 'varishtha_vaishnava', 'construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation', 'room_guest'] },
      dept_id: { type: 'string', description: 'Required for volunteer_seva' },
      contractor_id: { type: 'string' }, new_contractor_name: { type: 'string' }, camp_location: { type: 'string' },
      id_proof_type: { type: 'string' }, id_proof_number: { type: 'string' }, notes: { type: 'string' },
      host_name: { type: 'string', description: 'Guest of Residence only' }, host_mobile: { type: 'string', description: 'Guest of Residence only' },
      stay_type: { type: 'string', enum: ['short', 'long'], description: 'Guest of Residence only' },
      check_in_date: { type: 'string', format: 'date', description: 'Guest short stay or volunteer seva start' },
      check_out_date: { type: 'string', format: 'date', description: 'Guest short stay or volunteer seva end' },
    })),
    responses: { 201: { description: 'Submitted for approval', content: { 'application/json': { schema: obj(null, { success: { type: 'boolean' }, message: { type: 'string' }, data: obj(null, { person_id: { type: 'string' } }) }) } } }, ...errorResponses(400, 409) },
  })],
  ['post', '/api/register/payment/create', op({
    summary: 'Create a Razorpay order', tags: ['Public Registration'],
    requestBody: jsonBody(obj(null, { amount: { type: 'number', description: 'Rupees' }, purpose: { type: 'string' }, person_name: { type: 'string' }, mobile: { type: 'string' } })),
    responses: okData(obj(null, { order_id: { type: 'string' }, amount: { type: 'number' }, currency: { type: 'string' }, key_id: { type: 'string' }, test_mode: { type: 'boolean' } })),
  })],
  ['post', '/api/register/payment/webhook', op({
    summary: 'Razorpay payment webhook (raw body, HMAC-verified via X-Razorpay-Signature)', tags: ['Public Registration'],
    responses: { ...ok(obj(null, { received: { type: 'boolean' } })), ...errorResponses(400) },
  })],
]);

// ---------- Persons ----------
const CAN_WRITE_NOTE = 'Requires super_admin, management, or module_admin.';
const persons = paths([
  ['get', '/api/persons', op({
    summary: 'List/search persons', tags: ['Persons'], security: BEARER,
    parameters: [queryParam('search', 'Name/mobile substring'), queryParam('person_type', 'Filter by type'), queryParam('status', 'Filter by status')],
    responses: okData({ type: 'array', items: obj() }),
  })],
  ['get', '/api/persons/{id}', op({
    summary: 'Get one person by ID', tags: ['Persons'], security: BEARER,
    parameters: [pathParam('id', 'person_id')],
    responses: { ...okData(obj()), ...errorResponses(404) },
  })],
  ['post', '/api/persons', op({
    summary: `Create a person. ${CAN_WRITE_NOTE}`, tags: ['Persons'], security: BEARER,
    requestBody: jsonBody(obj(null, { full_name: { type: 'string' }, mobile: { type: 'string' }, person_type: PersonType })),
    responses: { 201: { description: 'Created', content: { 'application/json': { schema: obj() } } }, ...errorResponses(400) },
  })],
  ['put', '/api/persons/{id}', op({
    summary: `Update a person. ${CAN_WRITE_NOTE}`, tags: ['Persons'], security: BEARER,
    parameters: [pathParam('id', 'person_id')],
    requestBody: jsonBody(obj()),
    responses: { ...ok(obj()), ...errorResponses(400, 404) },
  })],
]);

// ---------- Gate ----------
const gate = paths([
  ['post', '/api/gate/scan', op({
    summary: 'Scan a QR code or mobile number at a gate', tags: ['Gate'], security: BEARER,
    requestBody: jsonBody(obj(null, { qr_id: { type: 'string' }, mobile: { type: 'string' }, gate: { type: 'string', enum: ['main_gate', 'gate_7', 'sbt_gate', 'exit_gate'] } })),
    responses: ok(obj(null, { result: { type: 'string', enum: ['allow', 'deny'] } })),
  })],
  ['get', '/api/gate/stats', op({ summary: "Today's per-gate allow/deny counts", tags: ['Gate'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/gate/batch', op({
    summary: 'Batch entry (group scan, one QR for N people)', tags: ['Gate'], security: BEARER,
    requestBody: jsonBody(obj(null, { qr_id: { type: 'string' }, batch_count: { type: 'integer' }, gate: { type: 'string' } })),
    responses: ok(obj()),
  })],
  ['post', '/api/gate/override', op({
    summary: 'Manual override entry (super_admin/module_admin only)', tags: ['Gate'], security: BEARER,
    requestBody: jsonBody(obj(null, { person_id: { type: 'string' }, gate: { type: 'string' }, reason: { type: 'string' } })),
    responses: ok(obj()),
  })],
  ['post', '/api/gate/zone3-upgrade', op({
    summary: 'Confirm a Zone 3 café upgrade payment at the gate', tags: ['Gate'], security: BEARER,
    requestBody: jsonBody(obj(null, { qr_id: { type: 'string' }, cafe_code: { type: 'string' }, persons_count: { type: 'integer' } })),
    responses: ok(obj()),
  })],
  ['get', '/api/gate/image/{qr_id}', op({ summary: 'QR code PNG image', tags: ['Gate'], parameters: [pathParam('qr_id', 'qr_id')], responses: { 200: { description: 'image/png' } } })],
  ['get', '/api/gate/pass/{qr_id}', op({ summary: 'Printable pass PDF', tags: ['Gate'], parameters: [pathParam('qr_id', 'qr_id')], responses: { 200: { description: 'application/pdf' } } })],
]);

// ---------- Meals (Annakshetra) ----------
const meals = paths([
  ['post', '/api/meals/scan', op({
    summary: 'Scan a diner for a registered (billing) meal', tags: ['Meals'], security: BEARER,
    requestBody: jsonBody(obj(null, { qr_id: { type: 'string' }, meal_type: { type: 'string', enum: ['breakfast', 'dinner', 'khichadi_am', 'free_lunch', 'khichadi_pm'] } })),
    responses: ok(obj(null, { result: { type: 'string', enum: ['served', 'already_served', 'deny'] } })),
  })],
  ['post', '/api/meals/tap', op({
    summary: 'Tap counter for a free meal (no QR)', tags: ['Meals'], security: BEARER,
    requestBody: jsonBody(obj(null, { meal_type: { type: 'string', enum: ['khichadi_am', 'free_lunch', 'khichadi_pm'] }, count: { type: 'integer', default: 1 } })),
    responses: ok(obj(null, { success: { type: 'boolean' }, total_today: { type: 'integer' } })),
  })],
  ['get', '/api/meals/today', op({ summary: "Today's meal stats (scanned + tapped, by slot)", tags: ['Meals'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/meals/registered', op({
    summary: 'Registered diners for a billing meal slot', tags: ['Meals'], security: BEARER,
    parameters: [queryParam('meal_type', 'breakfast or dinner', { type: 'string' }, true)],
    responses: okData({ type: 'array', items: obj() }),
  })],
  ['get', '/api/meals/billing', op({ summary: 'Contractor B+D billing recovery report (super_admin/management/module_admin)', tags: ['Meals'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
]);

// ---------- Admin ----------
const MGT_NOTE = 'Requires super_admin, management, module_admin, or dept_manager.';
const SA_NOTE = 'Requires super_admin.';
const ADM_NOTE = 'Requires super_admin, management, or module_admin.';
const admin = paths([
  ['get', '/api/admin/dashboard', op({ summary: 'Campus population + gate + meals summary', tags: ['Admin'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/admin/persons', op({
    summary: 'Persons by type (paginated, powers every "By Visitor Type" admin page)', tags: ['Admin'], security: BEARER,
    parameters: [queryParam('type', 'Comma-separated person_type list'), queryParam('status', 'Comma-separated status list'), queryParam('page', '', { type: 'integer' }), queryParam('limit', '', { type: 'integer' }), queryParam('search', '')],
    responses: okData(obj()),
  })],
  ['get', '/api/admin/pending-approvals', op({ summary: `Everyone awaiting approval (labourers + generic staff registrations). ${MGT_NOTE}`, tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/admin/approve/{person_id}', op({
    summary: `Approve a pending person and issue their QR pass. ${MGT_NOTE} (volunteer_seva/sustainability_intern additionally require super_admin or a dept_manager scoped to 'seva').`,
    tags: ['Admin'], security: BEARER, parameters: [pathParam('person_id', 'person_id')],
    requestBody: jsonBody(obj(null, { valid_from: { type: 'string', format: 'date' }, valid_until: { type: 'string', format: 'date' }, group_size: { type: 'integer' } }), {}),
    responses: { ...ok(obj(null, { success: { type: 'boolean' }, qr_id: { type: 'string' }, message: { type: 'string' } })), ...errorResponses(404, 409) },
  })],
  ['post', '/api/admin/seva-period/{person_id}', op({
    summary: `Extend or end a volunteer/intern's seva early. ${MGT_NOTE} (super_admin or a dept_manager scoped to 'seva' only).`,
    tags: ['Admin'], security: BEARER, parameters: [pathParam('person_id', 'person_id')],
    requestBody: jsonBody(obj(null, { new_end_date: { type: 'string', format: 'date' }, action: { type: 'string', enum: ['extend', 'close'] }, remarks: { type: 'string', description: "close only" } }), { new_end_date: '2026-09-15', action: 'extend' }),
    responses: { ...ok(obj(null, { success: { type: 'boolean' }, person_id: { type: 'string' }, new_end_date: { type: 'string' }, action: { type: 'string' } })), ...errorResponses(400, 404, 409) },
  })],
  ['put', '/api/admin/persons/{person_id}/accommodation-meals', op({
    summary: `Manually set a person's accommodation and Annakshetra meal enrollment. Not sourced from Greythr (its API has no such fields). ${MGT_NOTE}`,
    tags: ['Admin'], security: BEARER, parameters: [pathParam('person_id', 'person_id')],
    requestBody: jsonBody(obj(null, { accommodation_block: { type: 'string' }, room_number: { type: 'string' }, meals: { type: 'array', items: { type: 'string', enum: ['breakfast', 'dinner'] }, description: 'Omit to leave meal enrollment unchanged' } }), { accommodation_block: 'Block C', room_number: 'C-204', meals: ['breakfast', 'dinner'] }),
    responses: { ...ok(obj(null, { success: { type: 'boolean' }, person_id: { type: 'string' } })), ...errorResponses(400, 404) },
  })],
  ['get', '/api/admin/audit', op({ summary: `Immutable audit trail. ${SA_NOTE}`, tags: ['Admin'], security: BEARER, parameters: [queryParam('page', '', { type: 'integer' }), queryParam('limit', '', { type: 'integer' }), queryParam('user_id', ''), queryParam('module', '')], responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/admin/users', op({ summary: `List system users. ${SA_NOTE}`, tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/admin/users', op({
    summary: `Create a system user login. ${SA_NOTE}`, tags: ['Admin'], security: BEARER,
    requestBody: jsonBody(obj(null, { person_id: { type: 'string' }, username: { type: 'string' }, password: { type: 'string' }, role: { type: 'string' }, module_access: { type: 'array', items: { type: 'string' } }, dept_id: { type: 'string' } })),
    responses: { 201: { description: 'Created' }, ...errorResponses(400, 409) },
  })],
  ['get', '/api/admin/config', op({ summary: 'System config key/values', tags: ['Admin'], security: BEARER, responses: okData(obj()) })],
  ['put', '/api/admin/config', op({ summary: `Update system config. ${SA_NOTE}`, tags: ['Admin'], security: BEARER, requestBody: jsonBody(obj()), responses: ok(obj()) })],
  ['get', '/api/admin/departments', op({ summary: 'List departments', tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/admin/sevaks', op({ summary: `List registered sevaks (volunteer_seva). ${MGT_NOTE}`, tags: ['Admin'], security: BEARER, parameters: [queryParam('dept_id', ''), queryParam('page', '', { type: 'integer' }), queryParam('limit', '', { type: 'integer' })], responses: okData(obj()) })],
  ['post', '/api/admin/sevak', op({
    summary: `Register + optionally create a login for a sevak. ${MGT_NOTE}`, tags: ['Admin'], security: BEARER,
    requestBody: jsonBody(obj(null, { full_name: { type: 'string' }, mobile: { type: 'string' }, dept_id: { type: 'string' }, create_login: { type: 'boolean' }, username: { type: 'string' }, password: { type: 'string' } })),
    responses: { 201: { description: 'Created' }, ...errorResponses(400, 409) },
  })],
  ['get', '/api/admin/festivals', op({ summary: 'List festival events', tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['put', '/api/admin/festivals/{festival_id}', op({
    summary: `Toggle festival mode. ${ADM_NOTE}`, tags: ['Admin'], security: BEARER, parameters: [pathParam('festival_id', 'festival_id')],
    requestBody: jsonBody(obj(null, { festival_mode_on: { type: 'boolean' } })),
    responses: { ...ok(obj()), ...errorResponses(404) },
  })],
  ['get', '/api/admin/gac-members', op({ summary: 'GAC members list', tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/admin/dept-hods', op({ summary: 'Department HODs list', tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/admin/cafe-capacity', op({ summary: 'Café capacity for a date', tags: ['Admin'], security: BEARER, parameters: [queryParam('date', '', { type: 'string', format: 'date' })], responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/admin/cafe-capacity', op({
    summary: `Declare café capacity threshold. ${ADM_NOTE}`, tags: ['Admin'], security: BEARER,
    requestBody: jsonBody(obj(null, { cafe_code: { type: 'string' }, capacity_date: { type: 'string', format: 'date' }, meal_type: { type: 'string' }, threshold: { type: 'integer' }, notes: { type: 'string' } })),
    responses: { ...ok(obj()), ...errorResponses(400) },
  })],
  ['get', '/api/admin/zone3-upgrades', op({ summary: "Today's Zone 3 upgrade payments", tags: ['Admin'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/admin/contractors', op({ summary: 'Approved contractors (admin view, with worker counts)', tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/admin/contractors/pending', op({ summary: `Pending contractor companies. ${MGT_NOTE}`, tags: ['Admin'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/admin/contractors/{contractor_id}/approve', op({
    summary: `Approve a pending contractor company. ${MGT_NOTE}`, tags: ['Admin'], security: BEARER, parameters: [pathParam('contractor_id', 'contractor_id')],
    responses: { ...ok(obj()), ...errorResponses(404) },
  })],
  ['post', '/api/admin/register-person', op({
    summary: `Register any visitor type directly from the Admin Portal. ${ADM_NOTE}`, tags: ['Admin'], security: BEARER,
    requestBody: jsonBody(obj(null, { full_name: { type: 'string' }, mobile: { type: 'string' }, person_type: PersonType, dept_id: { type: 'string' }, check_in_date: { type: 'string', format: 'date' }, check_out_date: { type: 'string', format: 'date' } })),
    responses: { 201: { description: 'Registered' }, ...errorResponses(400) },
  })],
  ['post', '/api/admin/ashram/bulk-import', op({
    summary: `Bulk-import Brahmacharis / Varishtha Vaishnavas from an uploaded roster. ${ADM_NOTE}`, tags: ['Admin'], security: BEARER,
    requestBody: jsonBody(obj(null, { person_type: { type: 'string', enum: ['brahmachari', 'varishtha_vaishnava'] }, rows: { type: 'array', items: obj() } })),
    responses: { ...ok(obj(null, { created: { type: 'integer' }, updated: { type: 'integer' }, failed: { type: 'integer' }, errors: { type: 'array', items: obj() } })), ...errorResponses(400) },
  })],
  ['get', '/api/admin/vf-slots', op({ summary: 'VF tour slots, next 7 days (admin view)', tags: ['Admin'], security: BEARER, parameters: [queryParam('date', '', { type: 'string', format: 'date' })], responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/admin/vf-slots', op({
    summary: `Create/update a VF tour slot. ${MGT_NOTE}`, tags: ['Admin'], security: BEARER,
    requestBody: jsonBody(obj(null, { tour_date: { type: 'string', format: 'date' }, slot_time: { type: 'string' }, capacity: { type: 'integer' }, tour_type: { type: 'string', enum: ['free', 'paid'] } })),
    responses: { ...ok(obj()), ...errorResponses(400) },
  })],
  ['delete', '/api/admin/vf-slots/{slot_id}', op({
    summary: `Delete a VF tour slot (fails if anyone's already booked into it). ${MGT_NOTE}`, tags: ['Admin'], security: BEARER, parameters: [pathParam('slot_id', 'slot_id')],
    responses: { ...ok(obj(null, { success: { type: 'boolean' } })), ...errorResponses(400, 404) },
  })],
  ['post', '/api/admin/greythr/sync-staff', op({
    summary: `Manually trigger the Greythr staff sync (normally runs 6 AM IST daily) — pulls employee master data via Greythr's real OAuth2 API. Accommodation/meal enrollment are NOT included (Greythr has no such fields; those stay GSEVA-local). ${SA_NOTE}`,
    tags: ['Admin'], security: BEARER,
    responses: {
      ...ok(obj(null, { success: { type: 'boolean' }, created: { type: 'integer' }, updated: { type: 'integer' }, deactivated: { type: 'integer' }, departmentsCreated: { type: 'integer' }, skippedNoMobile: { type: 'integer' }, skippedNoDept: { type: 'integer' }, skippedError: { type: 'integer' } })),
      502: { description: 'Greythr API unreachable, or GREYTHR_DOMAIN/GREYTHR_API_USER/GREYTHR_API_PASSWORD not configured', content: { 'application/json': { schema: obj(null, { success: { type: 'boolean' }, error: { type: 'string' } }) } } },
    },
  })],
  ['post', '/api/admin/greythr/sync-attendance', op({
    summary: `Manually trigger the Greythr attendance sync (normally runs hourly) — updates today's present/absent for every Greythr-linked person. ${SA_NOTE}`,
    tags: ['Admin'], security: BEARER,
    responses: {
      ...ok(obj(null, { success: { type: 'boolean' }, present: { type: 'integer' }, total: { type: 'integer' } })),
      502: { description: 'Greythr API unreachable, or GREYTHR_DOMAIN/GREYTHR_API_USER/GREYTHR_API_PASSWORD not configured', content: { 'application/json': { schema: obj(null, { success: { type: 'boolean' }, error: { type: 'string' } }) } } },
    },
  })],
]);

// ---------- Kitchen ----------
const SUP_NOTE = 'Requires kitchen_supervisor (or super_admin).';
const HOD_NOTE = 'Requires kitchen_hod (or super_admin).';
const SUP_HOD_NOTE = 'Requires kitchen_supervisor or kitchen_hod (or super_admin).';
const COLL_NOTE = 'Requires kitchen_collection_distribution (or super_admin).';
const kitchen = paths([
  ['get', '/api/kitchen/overview', op({ summary: 'Prasadam count / weather / event overview bar', tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/kitchen/historical', op({ summary: 'Historical prasadam total for one date', tags: ['Kitchen'], security: BEARER, parameters: [queryParam('date', '', { type: 'string', format: 'date' }, true)], responses: okData(obj()) })],
  ['get', '/api/kitchen/departments', op({ summary: 'Kitchen-relevant departments', tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/kitchen/catalog-items', op({ summary: 'Prasadam item catalog', tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/kitchen/meeting', op({ summary: `Today's kitchen meeting. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['post', '/api/kitchen/meeting', op({
    summary: `Convene/update today's meeting inputs. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { prasadam_taker_estimate: { type: 'integer' }, quantity_notes: { type: 'string' }, machinery_status_note: { type: 'string' } })),
    responses: { ...okData(obj()), ...errorResponses(409) },
  })],
  ['post', '/api/kitchen/meeting/finalize', op({ summary: `Approve & finalize the day's plan. ${HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: { ...okData(obj()), ...errorResponses(404, 409) } })],
  ['get', '/api/kitchen/meeting/summary', op({ summary: `Pending-approvals summary card. ${HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/kitchen/menu/cycle', op({ summary: `Current 15-day menu cycle lock state. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/kitchen/menu', op({ summary: `Full rolling menu window, filterable. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, parameters: [queryParam('dept_id', ''), queryParam('meal_type', '')], responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/kitchen/menu/sections', op({ summary: `Upcoming Dinner/Lunch/Breakfast menu sections. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/menu', op({
    summary: `Add a menu row to the current cycle. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { for_date: { type: 'string', format: 'date' }, dept_id: { type: 'string' }, meal_type: { type: 'string' }, catalog_item_id: { type: 'string' } })),
    responses: { 201: { description: 'Added' }, ...errorResponses(400, 409) },
  })],
  ['post', '/api/kitchen/menu/lock', op({ summary: `Lock the current menu cycle. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: { ...okData(obj()), ...errorResponses(409) } })],
  ['get', '/api/kitchen/bld/sections', op({ summary: `BLD sections with auto-lock status. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/kitchen/bld/dept-summary', op({ summary: `Department-wise BLD people counts. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['post', '/api/kitchen/bld', op({
    summary: `Enter a BLD data row. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { for_date: { type: 'string', format: 'date' }, dept_id: { type: 'string' }, meal_type: { type: 'string' }, catalog_item_id: { type: 'string' }, people_count: { type: 'integer' }, total_item_amount: { type: 'number' }, unit: { type: 'string' }, source: { type: 'string' } })),
    responses: { 201: { description: 'Added' }, ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/storage', op({ summary: `Storage log. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/storage', op({
    summary: `Add a storage entry. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { catalog_item_id: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, status: { type: 'string', enum: ['HELD', 'PARTIALLY_RESOLVED', 'CLOSED'] }, remarks: { type: 'string' } })),
    responses: { 201: { description: 'Added' }, ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/wastage', op({ summary: `Wastage log. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/wastage', op({
    summary: `Add a wastage entry. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { catalog_item_id: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, reason: { type: 'string' } })),
    responses: { 201: { description: 'Added' }, ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/special-requests', op({ summary: `Special requests list. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/special-requests/{id}/decide', op({
    summary: `Approve/reject a special request. ${HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, parameters: [pathParam('id', 'request_id')],
    requestBody: jsonBody(obj(null, { decision: { type: 'string', enum: ['APPROVED', 'REJECTED'] } })),
    responses: { ...okData(obj()), ...errorResponses(400, 404, 409) },
  })],
  ['get', '/api/kitchen/preaching', op({ summary: `Preaching programs list. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/preaching', op({
    summary: `Add a preaching program entry. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { for_date: { type: 'string', format: 'date' }, preacher_name: { type: 'string' }, people_count: { type: 'integer' }, catalog_item_id: { type: 'string' } })),
    responses: { 201: { description: 'Added' }, ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/khichdi', op({ summary: `Khichdi log. ${SUP_HOD_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/khichdi', op({
    summary: `Upsert today's khichdi entry (by date). ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { for_date: { type: 'string', format: 'date' }, morning_amount: { type: 'number' }, evening_amount: { type: 'number' }, unit: { type: 'string' } })),
    responses: { ...okData(obj()), ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/procurement', op({ summary: `Procurement requests sent to CPD. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/procurement', op({
    summary: `Send an ad-hoc/other item request to CPD. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { catalog_item_id: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, is_supplementary: { type: 'boolean' }, is_adhoc: { type: 'boolean' } })),
    responses: { 201: { description: 'Sent' }, ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/procurement/cpd-candidates', op({ summary: `Suggested items to send to CPD (from menu + storage). ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['post', '/api/kitchen/procurement/cpd-send', op({
    summary: `Send a batch of selected candidate items to CPD. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER,
    requestBody: jsonBody(obj(null, { selections: { type: 'array', items: obj() } })),
    responses: { ...okData(obj(null, { created: { type: 'integer' } })), ...errorResponses(400) },
  })],
  ['get', '/api/kitchen/distribution/board', op({ summary: `Today's finalized distribution board. ${COLL_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData(obj()) })],
  ['get', '/api/kitchen/distribution/collection-status', op({ summary: `Collection/delivery status per item. ${COLL_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/distribution/{bldId}/stage', op({
    summary: `Mark an item COLLECTED or DELIVERED. ${COLL_NOTE}`, tags: ['Kitchen'], security: BEARER, parameters: [pathParam('bldId', 'bld_id')],
    requestBody: jsonBody(obj(null, { stage: { type: 'string', enum: ['COLLECTED', 'DELIVERED'] } })),
    responses: { ...okData(obj()), ...errorResponses(400, 404, 409) },
  })],
  ['get', '/api/kitchen/final-counts', op({ summary: `Final distribution count vs. expected (today's dinner). ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['post', '/api/kitchen/final-counts/{bldId}', op({
    summary: `Submit the actual distributed amount for an item. ${SUP_NOTE}`, tags: ['Kitchen'], security: BEARER, parameters: [pathParam('bldId', 'bld_id')],
    requestBody: jsonBody(obj(null, { actual_amount: { type: 'number' } })),
    responses: { ...okData(obj()), ...errorResponses(404, 409) },
  })],
]);

// ---------- Reports ----------
const reports = paths([
  ['get', '/api/reports/hourly', op({ summary: "Today's hourly gate entries/denials (24 slots)", tags: ['Reports'], security: BEARER, responses: okData({ type: 'array', items: obj() }) })],
  ['get', '/api/reports/occupancy', op({ summary: 'Daily campus occupancy by type', tags: ['Reports'], security: BEARER, parameters: [queryParam('date', '', { type: 'string', format: 'date' })], responses: ok(obj()) })],
  ['get', '/api/reports/gate', op({ summary: 'Gate activity log', tags: ['Reports'], security: BEARER, parameters: [queryParam('date', '', { type: 'string', format: 'date' }), queryParam('gate', ''), queryParam('limit', '', { type: 'integer' }), queryParam('offset', '', { type: 'integer' })], responses: ok(obj()) })],
  ['get', '/api/reports/meals', op({ summary: 'Meal consumption report', tags: ['Reports'], security: BEARER, parameters: [queryParam('date', '', { type: 'string', format: 'date' })], responses: ok(obj()) })],
  ['get', '/api/reports/cafe-revenue', op({ summary: 'Monthly café revenue summary', tags: ['Reports'], security: BEARER, parameters: [queryParam('month', '', { type: 'integer' }), queryParam('year', '', { type: 'integer' })], responses: okData(obj()) })],
  ['get', '/api/reports/registrations', op({
    summary: 'Registration trend + roster, by category and date range', tags: ['Reports'], security: BEARER,
    parameters: [queryParam('from', '', { type: 'string', format: 'date' }), queryParam('to', '', { type: 'string', format: 'date' }), queryParam('category', 'Comma-separated category names'), queryParam('search', ''), queryParam('page', '', { type: 'integer' }), queryParam('limit', '', { type: 'integer' })],
    responses: ok(obj()),
  })],
  ['get', '/api/reports/police', op({
    summary: 'Monthly police resident register (management+ only; ?format=pdf for the PDF)', tags: ['Reports'], security: BEARER,
    parameters: [queryParam('year', '', { type: 'integer' }), queryParam('month', '', { type: 'integer' }), queryParam('format', '"pdf" for a download', { type: 'string', enum: ['pdf'] }), queryParam('token', 'Bearer token as a query param, for window.open() PDF downloads')],
    responses: { 200: { description: 'JSON or application/pdf depending on ?format' } },
  })],
]);

// ---------- WhatsApp / eZee ----------
const whatsapp = paths([
  ['post', '/api/whatsapp/webhook', op({ summary: 'Interakt WhatsApp inbound webhook', tags: ['WhatsApp'], responses: ok(obj()) })],
]);
const ezee = paths([
  ['post', '/api/ezee/booking', op({ summary: 'eZee Centrix booking webhook', tags: ['eZee'], responses: ok(obj()) })],
  ['post', '/api/ezee/checkout', op({ summary: 'eZee Centrix checkout webhook', tags: ['eZee'], responses: ok(obj()) })],
]);

const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'GSEVA API',
    version: '1.0.0',
    description:
      'Govardhan Smart EcoVillage Administration — visitor registration, gate access, Annakshetra meals, ' +
      'the Kitchen back-of-house subsystem, and campus reporting. Every route in src/routes/*.js is listed here.\n\n' +
      "Most endpoints require `Authorization: Bearer <token>` from `POST /api/auth/login`. Click **Authorize** " +
      'above and paste a token to try protected routes from this page.',
  },
  servers: [{ url: 'http://localhost:3001', description: 'Local dev' }],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      CurrentUser: obj(null, {
        user_id: { type: 'string' }, username: { type: 'string' },
        role: { type: 'string', enum: ['super_admin', 'management', 'module_admin', 'dept_manager', 'operator', 'kitchen_supervisor', 'kitchen_hod', 'kitchen_collection_distribution'] },
        module_access: { type: 'array', items: { type: 'string' } }, dept_id: { type: 'string', nullable: true },
        full_name: { type: 'string' }, mobile: { type: 'string', nullable: true }, google_linked: { type: 'boolean' },
      }),
    },
  },
  tags: [
    { name: 'Auth' }, { name: 'Public Registration' }, { name: 'Persons' }, { name: 'Gate' },
    { name: 'Meals' }, { name: 'Admin' }, { name: 'Kitchen' }, { name: 'Reports' }, { name: 'WhatsApp' }, { name: 'eZee' },
  ],
  paths: { ...auth, ...registration, ...persons, ...gate, ...meals, ...admin, ...kitchen, ...reports, ...whatsapp, ...ezee },
};

module.exports = openapi;
