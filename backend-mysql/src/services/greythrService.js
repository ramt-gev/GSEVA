const axios = require('axios');
const cron = require('node-cron');
const { Op } = require('sequelize');
const { Person, Department, QrPass, AuditLog } = require('../models');
const qrService = require('./qrService');

// Rebuilt against greytHR's real, published API (api-docs.greythr.com) and
// corrected against a real integration field-mapping sheet supplied
// separately (confirmed pagination is 0-indexed with size up to 2000, and
// the categories endpoint accepts descRequired=true for human-readable
// names instead of needing a separate LOV lookup for every case).
//
// Two hosts are involved: DOMAIN (your tenant, e.g. yourorg.greythr.com)
// issues OAuth2 tokens; the shared api.greythr.com host serves every data
// endpoint behind a custom ACCESS-TOKEN header (not `Authorization: Bearer`)
// plus an x-greythr-domain header naming the tenant.
//
// Accommodation *is* synced (category 26, "Accommodation" — a tenant-
// specific custom category confirmed against this org's real data, not
// part of Greythr's generic public API, which is why an earlier full-text
// search of their published spec found nothing). Annakshetra meal
// enrollment still isn't — there's no per-meal-type equivalent, only a
// coarse yes/no "eligible for meal coupon" category — so that stays
// tracked locally in GSEVA. Emergency contact isn't a real field anywhere
// either (checked both /employees/personal and /employees/families).
const DOMAIN = process.env.GREYTHR_DOMAIN; // e.g. yourorg.greythr.com
const API_USER = process.env.GREYTHR_API_USER;
const API_PASSWORD = process.env.GREYTHR_API_PASSWORD;
const DATA_HOST = 'https://api.greythr.com';

function isConfigured() {
  return [DOMAIN, API_USER, API_PASSWORD].every((v) => v && v !== 'REPLACE_ME');
}

let cachedToken = null;
let tokenExpiresAt = 0;

// Tokens expire in ~1 hour per greytHR's own docs (expires_in: 3599) —
// cached in memory and refreshed a minute early rather than re-fetched on
// every single API call.
async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const response = await axios.post(`https://${DOMAIN}/uas/v1/oauth2/client-token`, null, {
    auth: { username: API_USER, password: API_PASSWORD },
  });
  cachedToken = response.data.access_token;
  tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
  return cachedToken;
}

async function dataHeaders() {
  return { 'ACCESS-TOKEN': await getAccessToken(), 'x-greythr-domain': DOMAIN };
}

// Generic paginated GET — greytHR's list endpoints return
// { data: [...], pages: { hasNext, ... } }, 0-indexed pages, size up to
// 2000. Loops until hasNext is false, or stops after one page if the
// endpoint returns no `pages` object at all (i.e. isn't paginated).
async function fetchAllPages(path, extraParams = {}) {
  const headers = await dataHeaders();
  const results = [];
  let page = 0;
  const size = 2000;
  for (;;) {
    const response = await axios.get(`${DATA_HOST}${path}`, { headers, params: { page, size, ...extraParams } });
    results.push(...(response.data.data || []));
    if (!response.data.pages || !response.data.pages.hasNext) break;
    page++;
  }
  return results;
}

async function fetchLov(headers, key) {
  try {
    const response = await axios.post(`${DATA_HOST}/hr/v2/lov`, [key], { headers });
    return new Map(response.data[key] || []);
  } catch (err) {
    console.error(`Greythr LOV lookup failed for ${key}:`, err.message);
    return new Map();
  }
}

// Confirmed against a real tenant: descRequired=true adds both `categoryDesc`
// (the category's own name, e.g. "Department") and `valueDesc` (the actual
// value we want, e.g. "Goshala") — it's `valueDesc` that's the readable
// label, not `categoryDesc`. lov::department/lov::designation came back
// empty (0 entries) on the same tenant, so valueDesc alone is relied on here
// with no LOV fallback for these two.
function categoryLabel(entry) {
  return entry.valueDesc || null;
}

// Built-in category IDs, confirmed against a real tenant's categories
// response (1=Location, 2=Department, 3=Division, 4=Grade, 5=Cost Center,
// 6=Designation, 7=Company, 8=Branch, 9=Category). Category 26
// ("Accommodation") is a tenant-specific custom category — not part of
// GreytHR's generic API, configured per-org in their admin panel, so this ID
// is only valid for this tenant and would need re-confirming for any other.
const CATEGORY_DEPARTMENT = 2;
const CATEGORY_DESIGNATION = 6;
const CATEGORY_ACCOMMODATION = 26;

// Department, Designation, and Accommodation aren't on the employee record
// itself — all resolved via the bulk "categories" endpoint with
// descRequired=true for names directly.
async function fetchCategoriesByEmployeeId() {
  const categoryRows = await fetchAllPages('/employee/v2/employees/categories', { descRequired: true });

  const result = new Map();
  for (const row of categoryRows) {
    const list = row.categoryList || [];
    const dept = list.find((c) => c.category === CATEGORY_DEPARTMENT);
    const designation = list.find((c) => c.category === CATEGORY_DESIGNATION);
    const accommodation = list.find((c) => c.category === CATEGORY_ACCOMMODATION);
    result.set(row.employeeId, {
      department: dept ? categoryLabel(dept) : null,
      designation: designation ? categoryLabel(designation) : null,
      accommodation_block: accommodation ? categoryLabel(accommodation) : null,
    });
  }
  return result;
}

// Blood group / marital status are numeric codes on /employees/personal —
// 'lov::bloodgroup'/'lov::maritalstatus' are best-guess LOV keys (not shown
// in greytHR's public spec examples); falls back to the raw code as a
// string if the LOV lookup doesn't resolve it, rather than losing the data.
async function fetchPersonalByEmployeeId() {
  const headers = await dataHeaders();
  const rows = await fetchAllPages('/employee/v2/employees/personal');
  const [bloodGroupLov, maritalStatusLov] = await Promise.all([
    fetchLov(headers, 'lov::bloodgroup'),
    fetchLov(headers, 'lov::maritalstatus'),
  ]);

  const result = new Map();
  for (const row of rows) {
    result.set(row.employeeId, {
      blood_group: row.bloodGroup != null ? bloodGroupLov.get(row.bloodGroup) || String(row.bloodGroup) : null,
      marital_status: row.maritalStatus != null ? maritalStatusLov.get(row.maritalStatus) || String(row.maritalStatus) : null,
      anniversary_date: row.marriageDate || null,
    });
  }
  return result;
}

// Present vs permanent address are two separate calls (addressType is a
// path param, not a field on one combined response).
async function fetchAddressByEmployeeId(addressType) {
  const rows = await fetchAllPages(`/employee/v2/employees/addresses/${addressType}`);
  const result = new Map();
  for (const row of rows) {
    const parts = [row.address1, row.address2, row.address3].filter(Boolean).join(', ');
    result.set(row.employeeId, { text: parts || null, city: row.city || null, pin: row.pin || null });
  }
  return result;
}

const GENDER_MAP = { M: 'male', F: 'female' };

// Greythr's real department names for this org (93 distinct, things like
// "GSNB", "IGA HOUSEKEEPING", "BNPL - Store") mostly don't match GSEVA's own
// hand-curated department list (50 entries, e.g. "Kitchen (Festival & Daily
// Cooking)") — confirmed against live data that only a handful match
// exactly. Rather than drop every unmatched employee, missing departments
// get auto-created here with a GHR_ prefixed code so they're easy to spot
// and re-organize (merge into an existing GSEVA department, rename, etc.)
// later without losing anyone in the meantime.
function deptCodeFor(name) {
  const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `GHR_${base}`.slice(0, 30);
}

async function findOrCreateDepartment(deptName) {
  const existing = await Department.findOne({ where: { dept_name: { [Op.like]: deptName } } });
  if (existing) return { dept: existing, created: false };

  const dept_code = deptCodeFor(deptName);
  const [dept, created] = await Department.findOrCreate({ where: { dept_code }, defaults: { dept_name: deptName, dept_code } });
  return { dept, created };
}

async function syncStaff() {
  console.log('Starting Greythr staff sync...');
  if (!isConfigured()) {
    return { success: false, error: 'GREYTHR_DOMAIN / GREYTHR_API_USER / GREYTHR_API_PASSWORD not configured' };
  }

  try {
    const [employees, categoriesByEmployeeId, personalByEmployeeId, presentAddressByEmployeeId, permAddressByEmployeeId] =
      await Promise.all([
        fetchAllPages('/employee/v2/employees'),
        fetchCategoriesByEmployeeId(),
        fetchPersonalByEmployeeId(),
        fetchAddressByEmployeeId('presentaddress'),
        fetchAddressByEmployeeId('permanentaddress'),
      ]);

    let created = 0;
    let departmentsCreated = 0;
    let updated = 0;
    let deactivated = 0;
    let skippedNoMobile = 0;
    let skippedNoDept = 0;
    let skippedError = 0;

    for (const emp of employees) {
      const greythrId = String(emp.employeeId);
      const existing = await Person.findOne({ where: { greythr_id: greythrId } });

      // greytHR reports this explicitly per-employee (`leftorg`), unlike the
      // original version of this file which had to infer it by diffing the
      // full employeeId set against what we already had.
      if (emp.leftorg) {
        if (existing && !['archived', 'departed'].includes(existing.status)) {
          await existing.update({ status: 'archived' });
          await QrPass.update({ is_active: false }, { where: { person_id: existing.person_id } });
          await AuditLog.create({
            user_id: null, action: 'GREYTHR_ARCHIVE', module: 'cron_greythr', table_name: 'persons',
            record_id: existing.person_id,
          });
          deactivated++;
        }
        continue;
      }

      // Person.mobile is required in our schema; greytHR's sample data shows
      // this frequently null. Skip rather than fail the whole sync.
      if (!emp.mobile) { skippedNoMobile++; continue; }

      const personal = personalByEmployeeId.get(emp.employeeId) || {};
      const categories = categoriesByEmployeeId.get(emp.employeeId) || {};
      const presentAddr = presentAddressByEmployeeId.get(emp.employeeId);
      const permAddr = permAddressByEmployeeId.get(emp.employeeId);
      const sharedFields = {
        full_name: emp.name,
        mobile: emp.mobile,
        gender: GENDER_MAP[emp.gender] || 'not_specified',
        date_of_birth: emp.dateOfBirth || null,
        // Confirmed against a real tenant: /employees returns personalEmail,
        // personalEmail2, and personalEmail3 — `email` itself is the work/
        // login email, not this. Takes whichever of the three is populated.
        personal_email: emp.personalEmail || emp.personalEmail2 || emp.personalEmail3 || null,
        blood_group: personal.blood_group || null,
        marital_status: personal.marital_status || null,
        anniversary_date: personal.anniversary_date || null,
        present_address: presentAddr?.text || null,
        perm_address: permAddr?.text || null,
        city: permAddr?.city || null,
        pincode: permAddr?.pin || null,
        // Category 26 ("Accommodation") — confirmed real for this tenant.
        // Overwrites any manually-entered value on every sync, same as
        // full_name/mobile already do; Greythr is now the source of truth
        // for this field for Greythr-linked staff.
        accommodation_block: categories.accommodation_block || null,
      };

      // Per-employee try/catch — a single bad record (e.g. two employees
      // sharing a family mobile number, which collides with GSEVA's
      // one-active-person-per-mobile constraint) must not abort the entire
      // remaining batch. Confirmed this was a real failure mode against
      // live data: one mobile collision silently killed sync for everyone
      // after it in iteration order.
      try {
        if (!existing) {
          const deptName = categories.department;
          if (!deptName) { skippedNoDept++; continue; }
          const { dept, created: deptWasCreated } = await findOrCreateDepartment(deptName);
          if (deptWasCreated) departmentsCreated++;

          const person = await Person.create({
            ...sharedFields, person_type: 'resident_staff', dept_id: dept.dept_id,
            greythr_id: greythrId, status: 'on_campus', registration_source: 'greythr_sync',
          });
          await qrService.createQRPass(person.person_id, qrService.getZoneAccess('resident_staff'), new Date(), null, 1, 'permanent');
          await AuditLog.create({
            user_id: null, action: 'GREYTHR_CREATE', module: 'cron_greythr', table_name: 'persons',
            record_id: person.person_id, new_value: { greythr_id: greythrId, name: emp.name },
          });
          created++;
        } else {
          await existing.update(sharedFields);
          updated++;
        }
      } catch (err) {
        skippedError++;
        console.error(`Greythr sync: skipped employeeId ${greythrId} (${emp.name}) — ${err.message}`);
      }
    }

    console.log(
      `Greythr sync done: ${created} created, ${updated} updated, ${deactivated} archived, ` +
      `${departmentsCreated} new departments auto-created, ${skippedNoMobile} skipped (no mobile), ` +
      `${skippedNoDept} skipped (no department at all), ${skippedError} skipped (error — see logs)`
    );
    return { success: true, created, updated, deactivated, departmentsCreated, skippedNoMobile, skippedNoDept, skippedError };
  } catch (err) {
    console.error('Greythr sync error:', err.message);
    // Swallowed here (not rethrown) so the 6 AM cron job never crashes the
    // process over a transient GreytHR API hiccup — but the caller (e.g. a
    // manual-trigger admin endpoint) still gets an outcome to show, instead
    // of the request just hanging until GreytHR times out.
    return { success: false, error: err.message };
  }
}

// Attendance changes through the day (people clock in/out), unlike the
// employee master data above which is stable enough for a once-daily sync.
// greytHR's muster endpoint has no simple present/absent boolean — it
// returns raw per-day punch data (firstInTime, onLeave, holidayAbsent) that
// this derives presence from: they're "present" if they actually clocked in
// today and aren't marked on leave or holiday-absent.
async function syncAttendance() {
  console.log('Starting Greythr attendance sync...');
  if (!isConfigured()) {
    return { success: false, error: 'GREYTHR_DOMAIN / GREYTHR_API_USER / GREYTHR_API_PASSWORD not configured' };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const musterRows = await fetchAllPages('/attendance/v2/employee/muster', { start: today, end: today });

    const presentIds = new Set();
    for (const row of musterRows) {
      const summary = row.records?.[0]?.summary;
      if (summary?.firstInTime && !summary.onLeave && !summary.holidayAbsent) {
        presentIds.add(String(row.employeeId));
      }
    }

    const linkedPeople = await Person.findAll({
      where: { greythr_id: { [Op.ne]: null } },
      attributes: ['person_id', 'greythr_id'],
    });

    for (const person of linkedPeople) {
      await person.update({ greythr_present_today: presentIds.has(person.greythr_id) });
    }

    console.log(`Greythr attendance sync done: ${presentIds.size} present of ${linkedPeople.length}`);
    return { success: true, present: presentIds.size, total: linkedPeople.length };
  } catch (err) {
    console.error('Greythr attendance sync error:', err.message);
    return { success: false, error: err.message };
  }
}

function startGreythrSync() {
  if (!isConfigured()) {
    console.log('Greythr sync skipped — GREYTHR_DOMAIN / GREYTHR_API_USER / GREYTHR_API_PASSWORD not configured');
    return;
  }
  // 6 AM IST = 00:30 UTC
  cron.schedule('30 0 * * *', syncStaff);
  console.log('Greythr staff sync scheduled for 6:00 AM IST daily');

  // Hourly, so "present today" reflects check-ins/outs through the day
  // rather than only whatever was true at 6 AM.
  cron.schedule('0 * * * *', syncAttendance);
  console.log('Greythr attendance sync scheduled hourly');
}

module.exports = { startGreythrSync, syncStaff, syncAttendance };
