# GEV ICMS — Phase 6 Prompt for Claude Code
## Admin Portal Backend + RBAC Enforcement

---

## WHAT IS ALREADY DONE

- Database, Auth, Persons, Gate App, Registration, Payments, WhatsApp, Canteen App all working
- Five complete flows tested end to end

## WHAT WE ARE BUILDING IN THIS PHASE

The Admin Portal backend — all the API endpoints that power the `GEV_Admin_Portal_v2.html`.
Also enforcing RBAC properly across all existing endpoints.

---

## STEP 1: RBAC AUDIT — REVIEW ALL EXISTING ROUTES

Go through every existing route and verify the correct role check is applied:

| Endpoint | Minimum Role |
|---|---|
| `POST /api/auth/login` | Public |
| `POST /api/register/visitor` | Public |
| `POST /api/payments/webhook` | Public (signature verified) |
| `POST /api/gate/scan` | operator |
| `POST /api/gate/batch` | operator |
| `POST /api/gate/override` | super_admin, module_admin |
| `POST /api/meals/scan` | operator |
| `POST /api/meals/tap` | operator |
| `GET /api/meals/billing` | super_admin, management, module_admin |
| `GET /api/persons` | operator and above |
| `POST /api/persons` | module_admin and above |
| `PUT /api/persons/:id` | module_admin and above |
| `GET /api/audit` | super_admin only |
| `PUT /api/config` | super_admin only |

Fix any routes that are missing role checks.

---

## STEP 2: SYSTEM CONFIG API

Create `src/controllers/configController.js`:

```javascript
const pool = require('../db');

async function getConfig(req, res) {
  try {
    const result = await pool.query(
      'SELECT config_key, config_value, config_type, description FROM system_config ORDER BY config_key'
    );
    // Convert to {key: value} object for easy frontend use
    const config = {};
    result.rows.forEach(row => { config[row.config_key] = row.config_value; });
    res.json({ data: config });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function updateConfig(req, res) {
  const updates = req.body; // { config_key: config_value, ... }

  try {
    for (const [key, value] of Object.entries(updates)) {
      await pool.query(
        `UPDATE system_config
            SET config_value = $1, updated_at = NOW(), updated_by = $2
          WHERE config_key = $3`,
        [String(value), req.user.user_id, key]
      );
    }

    await pool.query(
      `INSERT INTO audit_log
        (user_id, action, module, table_name, new_value, ip_address)
       VALUES ($1, 'UPDATE_SYSTEM_CONFIG', 'admin', 'system_config', $2, $3)`,
      [req.user.user_id, JSON.stringify(updates), req.ip]
    );

    res.json({ success: true, message: 'Configuration updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { getConfig, updateConfig };
```

---

## STEP 3: ADMIN PORTAL API ENDPOINTS

Create `src/controllers/adminController.js`:

```javascript
const pool = require('../db');

// GET /api/admin/dashboard — summary numbers for overview cards
async function dashboardSummary(req, res) {
  try {
    const today = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE person_type = 'room_guest')         as room_guests,
         COUNT(*) FILTER (WHERE person_type IN (
           'free_day_visitor','paid_day_visitor'
         ))                                                          as day_visitors,
         COUNT(*) FILTER (WHERE person_type IN (
           'resident_staff','staff_dependant'
         ))                                                          as staff,
         COUNT(*) FILTER (WHERE person_type IN (
           'construction_labourer','weekly_labourer_local','weekly_labourer_outstation'
         ))                                                          as labourers,
         COUNT(*) FILTER (WHERE person_type IN (
           'volunteer_seva','course_student','sustainability_intern'
         ))                                                          as volunteers_students,
         COUNT(*)                                                     as total
       FROM persons
       WHERE status = 'on_campus'`
    );

    const gateToday = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'allowed') as entries,
         COUNT(*) FILTER (WHERE result = 'denied')  as denials
       FROM gate_events
       WHERE scanned_at::date = CURRENT_DATE`
    );

    const mealsToday = await pool.query(
      `SELECT meal_type, COUNT(*) as served
       FROM meal_token_events
       WHERE meal_date = CURRENT_DATE
       GROUP BY meal_type`
    );

    res.json({
      data: {
        population: today.rows[0],
        gate:       gateToday.rows[0],
        meals:      mealsToday.rows
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/admin/persons?type=room_guest — paginated list per visitor type
async function personsByType(req, res) {
  const { type, page = 1, limit = 50, search } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Active = currently on campus or pre-registered (not departed/archived).
    let conditions = [`p.status IN ('on_campus','pre_registered')`];
    const params   = [];

    if (type) {
      params.push(type);
      conditions.push(`p.person_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(p.full_name ILIKE $${params.length} OR p.mobile ILIKE $${params.length})`);
    }

    const where = conditions.join(' AND ');
    params.push(limit, offset);

    const result = await pool.query(
      `SELECT
         p.*, d.dept_name,
         qp.qr_id, qp.valid_until, qp.zone_access, qp.is_active as qr_active
       FROM persons p
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       LEFT JOIN qr_passes qp ON qp.person_id = p.person_id AND qp.is_active = true
       WHERE ${where}
       ORDER BY p.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ data: result.rows, count: result.rows.length, page, limit });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/admin/pending-approvals — workers waiting for HOD approval.
//
// Approval state lives on contractor_labourers, not persons. The persons row
// is created upfront (status='pre_registered'); contractor_labourers carries
// the approval_status workflow.
async function pendingApprovals(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         p.person_id, p.full_name, p.person_type, p.mobile,
         p.created_at, p.dept_id, d.dept_name,
         cl.cl_id, cl.camp_location, cl.annakshetra_bd_opted,
         con.company_name AS contractor_name
       FROM contractor_labourers cl
       JOIN persons p ON p.person_id = cl.person_id
       JOIN contractors con ON con.contractor_id = cl.contractor_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       WHERE cl.approval_status = 'pending'
       ORDER BY p.created_at ASC`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/admin/approve/:person_id — HOD approves worker, auto-generates QR.
//
// Updates contractor_labourers (approval workflow) and persons.status.
// Validity dates and group_size live on the qr_pass row, not on persons.
async function approvePerson(req, res) {
  const { person_id } = req.params;
  const { valid_from, valid_until, group_size } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find contractor_labourers row for this person (workers go through
    // contractor approval; non-contractor approvals don't pass through here).
    const cl = await client.query(
      `SELECT cl_id FROM contractor_labourers
        WHERE person_id = $1 AND approval_status = 'pending'`,
      [person_id]
    );
    if (cl.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'No pending approval for this person' });
    }

    await client.query(
      `UPDATE contractor_labourers
          SET approval_status = 'approved',
              approved_by = $1, approved_at = NOW()
        WHERE cl_id = $2`,
      [req.user.user_id, cl.rows[0].cl_id]
    );

    await client.query(
      `UPDATE persons SET status = 'on_campus', updated_at = NOW()
        WHERE person_id = $1`,
      [person_id]
    );

    // Get person details for QR + WhatsApp
    const personResult = await client.query(
      'SELECT * FROM persons WHERE person_id = $1', [person_id]
    );
    const person = personResult.rows[0];

    // Create QR pass (validity goes here, not on persons)
    const { createQRPass, getZoneAccess } = require('../services/qrService');
    const zones = getZoneAccess(person.person_type);
    const qrPass = await createQRPass(
      person_id, zones,
      valid_from || new Date(),
      valid_until || null,
      group_size || 1,
      'stay_pass'
    );

    await client.query('COMMIT');

    const { sendQRPass } = require('../services/whatsappService');
    const { getQRPublicURL } = require('../services/qrService');
    sendQRPass(
      person.mobile,
      getQRPublicURL(qrPass.qr_id),
      person.full_name,
      valid_until ? new Date(valid_until).toLocaleDateString('en-IN') : 'Valid until further notice'
    ).catch(err => console.error('WhatsApp failed:', err.message));

    res.json({ success: true, qr_id: qrPass.qr_id, message: 'Approved and QR sent' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approval error:', err);
    res.status(500).json({ error: 'Approval failed' });
  } finally {
    client.release();
  }
}

// GET /api/admin/audit — audit trail (super_admin only)
async function auditTrail(req, res) {
  const { page = 1, limit = 100, user_id, module } = req.query;
  const offset = (page - 1) * limit;

  try {
    let conditions = [];
    const params   = [];

    if (user_id) { params.push(user_id); conditions.push(`al.user_id = $${params.length}`); }
    if (module)  { params.push(module);  conditions.push(`al.module = $${params.length}`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    params.push(limit, offset);

    // Identity fields (full_name, mobile) live on persons; username/role on
    // system_users. Audit rows can also have user_id = NULL (public paths).
    const result = await pool.query(
      `SELECT al.*, su.username, p.full_name
         FROM audit_log al
         LEFT JOIN system_users su ON al.user_id = su.user_id
         LEFT JOIN persons p       ON su.person_id = p.person_id
       ${where}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/admin/users — user management
async function listUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         su.user_id, su.username, su.role, su.module_access, su.dept_id,
         su.is_active, su.is_locked, su.last_login,
         p.full_name, p.mobile
       FROM system_users su
       JOIN persons p ON su.person_id = p.person_id
       ORDER BY su.role, p.full_name`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/admin/users — create new user.
//
// system_users requires a person_id (FK NOT NULL). The caller supplies an
// existing person_id (from the persons table). If you need to create both
// person + user in one call, do that explicitly in two INSERTs inside a tx.
async function createUser(req, res) {
  const bcrypt = require('bcrypt');
  const { person_id, username, password, role, module_access, dept_id } = req.body;

  if (!person_id || !username || !password || !role) {
    return res.status(400).json({ error: 'person_id, username, password, role required' });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO system_users
        (person_id, username, password_hash, role, module_access, dept_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, username, role, module_access`,
      [person_id, username, hash, role, module_access || [], dept_id || null, req.user.user_id]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Username already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'person_id does not exist' });
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  dashboardSummary, personsByType, pendingApprovals,
  approvePerson, auditTrail, listUsers, createUser
};
```

Create `src/routes/admin.js`:
```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/adminController');
const cfgCtrl = require('../controllers/configController');
const { requireAuth, requireRole } = require('../middleware/auth');

const SA  = ['super_admin'];
const MGT = ['super_admin','management'];
const ADM = ['super_admin','management','module_admin'];

router.get('/dashboard',          requireAuth, ctrl.dashboardSummary);
router.get('/persons',            requireAuth, ctrl.personsByType);
router.get('/pending-approvals',  requireAuth, requireRole(...ADM), ctrl.pendingApprovals);
router.post('/approve/:person_id',requireAuth, requireRole(...ADM), ctrl.approvePerson);
router.get('/audit',              requireAuth, requireRole(...SA), ctrl.auditTrail);
router.get('/users',              requireAuth, requireRole(...SA), ctrl.listUsers);
router.post('/users',             requireAuth, requireRole(...SA), ctrl.createUser);
router.get('/config',             requireAuth, cfgCtrl.getConfig);
router.put('/config',             requireAuth, requireRole(...SA), cfgCtrl.updateConfig);

module.exports = router;
```

Add to `src/index.js`:
```javascript
app.use('/api/admin', require('./routes/admin'));
```

---

## STEP 4: CONNECT ADMIN PORTAL TO REAL API

Open `GEV_Admin_Portal_v2.html`.

1. Replace login with `POST /api/auth/login`
2. Dashboard cards → `GET /api/admin/dashboard`
3. Each visitor type tab → `GET /api/admin/persons?type=room_guest` etc.
4. Pending approvals → `GET /api/admin/pending-approvals`
5. Approve button → `POST /api/admin/approve/:person_id`
6. System Settings → `GET /api/admin/config` and `PUT /api/admin/config`
7. Audit trail → `GET /api/admin/audit`

---

## DONE WHEN

1. Ram Prabhu can log into Admin Portal and see real dashboard numbers
2. Each visitor tab shows real persons from database
3. Pending approval list shows workers awaiting approval
4. Approving a worker sends them a real WhatsApp QR pass
5. System Settings saves to system_config table
6. Audit trail shows all recent actions
7. A new user can be created and can login

When all 7 confirmed — Phase 6 is complete. Move to Phase 7.

---

*Next phase: Phase 7 — eZee + Greythr integrations*

---
---
---

# GEV ICMS — Phase 7 Prompt for Claude Code
## eZee Hotel + Greythr HRMS Integrations

---

## WHAT IS ALREADY DONE

All 5 apps working end to end with real data. Admin portal fully connected.

## WHAT WE ARE BUILDING IN THIS PHASE

Automated data sync from the two systems GEV already uses:
- **eZee Centrix** — hotel booking engine. New bookings auto-create guest QR passes.
- **Greythr HRMS** — HR system for 118 payroll staff. Staff records stay in sync.

---

## eZee INTEGRATION

### How it works
1. When a guest books a room in eZee, eZee sends a webhook to our API
2. We create a person record + QR pass automatically
3. We send the guest their QR pass via WhatsApp

### Step 1: Create the webhook handler

Create `src/controllers/ezeeController.js`:

```javascript
const pool = require('../db');
const { createQRPass, getZoneAccess, getQRPublicURL } = require('../services/qrService');
const { sendQRPass } = require('../services/whatsappService');

async function handleBooking(req, res) {
  const secret = req.headers['x-ezee-secret'];
  if (secret !== process.env.EZEE_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const booking = req.body;

  try {
    // eZee booking fields — adjust field names to match actual eZee payload
    const {
      GuestName,
      GuestMobile,
      GuestEmail,           // not stored on persons in v4 — kept for log/QR caption only
      CheckIn,
      CheckOut,
      BookingID,
      Adults
    } = booking;

    // Schema notes:
    // - persons has no email column (v4). Email is logged via WhatsApp delivery only.
    // - Validity dates and group_size live on qr_passes, not persons.
    // - eZee booking ID is stored in persons.ezee_guest_id.
    // - "Active" guest = persons.status='on_campus' (no is_active column).

    // Match by mobile (partial unique excludes dependants, so room_guest matches are stable)
    const existing = await pool.query(
      `SELECT person_id FROM persons WHERE mobile = $1 AND person_type = 'room_guest'`,
      [GuestMobile]
    );

    let person_id;
    if (existing.rows.length > 0) {
      person_id = existing.rows[0].person_id;
      await pool.query(
        `UPDATE persons
            SET full_name = $1, ezee_guest_id = $2, status = 'on_campus',
                updated_at = NOW()
          WHERE person_id = $3`,
        [GuestName, BookingID, person_id]
      );
      // Deactivate prior QR passes for this guest
      await pool.query(
        `UPDATE qr_passes SET is_active = false WHERE person_id = $1`, [person_id]
      );
    } else {
      const personResult = await pool.query(
        `INSERT INTO persons
          (full_name, person_type, mobile, ezee_guest_id, status, registration_source)
         VALUES ($1, 'room_guest', $2, $3, 'on_campus', 'ezee_sync')
         RETURNING person_id`,
        [GuestName, GuestMobile, BookingID]
      );
      person_id = personResult.rows[0].person_id;
    }

    // Optional: record this stay in person_stays for police-report joins
    await pool.query(
      `INSERT INTO person_stays
        (person_id, stay_type, check_in_date, check_out_date,
         is_overnight, is_active, ezee_reservation_id, booking_source)
       VALUES ($1, 'overnight', $2, $3, true, true, $4, 'ezee')`,
      [person_id, CheckIn, CheckOut, BookingID]
    );

    // Create QR pass — validity + group_size live here
    const qrPass = await createQRPass(
      person_id,
      getZoneAccess('room_guest'),
      CheckIn,
      CheckOut,
      Adults || 1,
      'stay_pass'
    );

    if (GuestMobile) {
      sendQRPass(
        GuestMobile,
        getQRPublicURL(qrPass.qr_id),
        GuestName,
        new Date(CheckOut).toLocaleDateString('en-IN')
      ).catch(err => console.error('WhatsApp failed:', err.message));
    }

    res.json({ success: true, person_id, qr_id: qrPass.qr_id });

  } catch (err) {
    console.error('eZee webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

async function handleCheckout(req, res) {
  const { BookingID, GuestMobile } = req.body;

  try {
    // On checkout: mark stay closed, set persons.status = 'departed',
    // deactivate QR passes.
    await pool.query(
      `UPDATE person_stays
          SET is_active = false, actual_check_out = NOW()
        WHERE ezee_reservation_id = $1`,
      [BookingID]
    );
    await pool.query(
      `UPDATE persons SET status = 'departed', updated_at = NOW()
        WHERE mobile = $1 AND person_type = 'room_guest'`,
      [GuestMobile]
    );
    await pool.query(
      `UPDATE qr_passes qp
          SET is_active = false
         FROM persons p
        WHERE qp.person_id = p.person_id
          AND p.mobile = $1
          AND p.person_type = 'room_guest'`,
      [GuestMobile]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { handleBooking, handleCheckout };
```

Create `src/routes/ezee.js`:
```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/ezeeController');

router.post('/booking',  ctrl.handleBooking);
router.post('/checkout', ctrl.handleCheckout);

module.exports = router;
```

Add to `src/index.js`:
```javascript
app.use('/api/ezee', require('./routes/ezee'));
```

Configure in eZee dashboard:
- Booking webhook URL: `https://gev-icms.com/api/ezee/booking`
- Checkout webhook URL: `https://gev-icms.com/api/ezee/checkout`

---

## GREYTHR INTEGRATION

### How it works
- Daily sync at 6 AM: pull staff list from Greythr API
- New employees → create persons record
- Employee exits → deactivate person + QR

Create `src/services/greythrService.js`:

```javascript
const axios = require('axios');
const cron  = require('node-cron');
const pool  = require('../db');
const { createQRPass, getZoneAccess } = require('./qrService');

async function syncStaff() {
  console.log('Starting Greythr staff sync...');

  try {
    // Fetch active employees from Greythr API
    const response = await axios.get(
      `${process.env.GREYTHR_BASE_URL}/employees`,
      { headers: { Authorization: `Bearer ${process.env.GREYTHR_API_KEY}` } }
    );

    const employees = response.data.employees || [];
    let created = 0, updated = 0, deactivated = 0;

    // Schema notes:
    // - Greythr ID is stored directly in persons.greythr_id (UNIQUE).
    // - persons has no `email` and no `is_active` column. Use `status` enum.
    // - Source attribution goes in registration_source = 'greythr_sync'.

    for (const emp of employees) {
      const existing = await pool.query(
        'SELECT person_id FROM persons WHERE greythr_id = $1',
        [emp.employeeId]
      );

      if (existing.rows.length === 0) {
        const result = await pool.query(
          `INSERT INTO persons
            (full_name, person_type, mobile, dept_id,
             greythr_id, status, registration_source)
           SELECT $1, 'resident_staff', $2, d.dept_id, $3, 'on_campus', 'greythr_sync'
             FROM departments d
            WHERE d.dept_name ILIKE $4
            LIMIT 1
           RETURNING person_id`,
          [emp.name, emp.mobile, emp.employeeId, emp.department]
        );

        if (result.rows.length > 0) {
          await createQRPass(
            result.rows[0].person_id,
            getZoneAccess('resident_staff'),
            new Date(),
            null,        // permanent
            1,
            'permanent'
          );
          created++;
        }

      } else {
        await pool.query(
          `UPDATE persons SET full_name = $1, mobile = $2, updated_at = NOW()
            WHERE person_id = $3`,
          [emp.name, emp.mobile, existing.rows[0].person_id]
        );
        updated++;
      }
    }

    // Archive employees no longer in Greythr (set status, don't hard-delete).
    const activeIds = employees.map(e => e.employeeId);
    if (activeIds.length > 0) {
      const archiveResult = await pool.query(
        `UPDATE persons
            SET status = 'archived', updated_at = NOW()
          WHERE greythr_id IS NOT NULL
            AND greythr_id != ALL($1)
            AND status NOT IN ('archived','departed')
          RETURNING person_id`,
        [activeIds]
      );

      for (const row of archiveResult.rows) {
        await pool.query(
          'UPDATE qr_passes SET is_active = false WHERE person_id = $1',
          [row.person_id]
        );
        deactivated++;
      }
    }

    console.log(`Greythr sync done: ${created} created, ${updated} updated, ${deactivated} deactivated`);

  } catch (err) {
    console.error('Greythr sync error:', err.message);
  }
}

function startGreythrSync() {
  // Run at 6 AM IST (00:30 UTC) every day
  cron.schedule('30 0 * * *', syncStaff);
  console.log('Greythr sync scheduled for 6:00 AM IST daily');
}

module.exports = { startGreythrSync, syncStaff };
```

Add to `src/index.js`:
```javascript
const { startGreythrSync } = require('./services/greythrService');
startGreythrSync();
```

---

## DONE WHEN

1. New hotel booking in eZee → person appears in ICMS database within 30 seconds
2. Guest receives WhatsApp with QR pass automatically
3. Guest QR works at gate — ALLOW with correct room guest details
4. Guest QR deactivated on eZee checkout
5. Greythr sync runs and creates/updates staff records
6. New Greythr employee gets a QR pass automatically
7. Greythr exit → person deactivated in ICMS

When all 7 confirmed — Phase 7 is complete. Move to Phase 8.

---

*Next phase: Phase 8 — Dashboard live data + Reports + Police Report PDF*

---
---
---

# GEV ICMS — Phase 8 Prompt for Claude Code
## Dashboard Live Data + Reports + Police Report PDF

---

## WHAT IS ALREADY DONE

All apps live. All integrations working. System is functionally complete.

## WHAT WE ARE BUILDING IN THIS PHASE

Connect the Dashboard HTML to real live data, and build all 17 reports including
the monthly police report as a downloadable PDF.

---

## STEP 1: REPORTS CONTROLLER

Install PDF generation library:
```bash
npm install pdfkit
```

Create `src/controllers/reportsController.js`:

```javascript
const pool   = require('../db');
const PDFDoc = require('pdfkit');

const REPORT_TYPES = [
  'daily_occupancy', 'gate_activity', 'vf_slot_utilisation',
  'contractor_camp_strength', 'annakshetra_bd_consumption', 'free_meals_served',
  'meal_forecast_vs_actual', 'cafe_revenue', 'ezee_guest_occupancy',
  'volunteer_intern_status', 'monthly_visitor_statistics', 'monthly_prasadam_report',
  'monthly_police_report', 'audit_trail_report', 'festival_post_event',
  'annual_community_report', 'overstay_alerts'
];

// GET /api/reports/:type — generate report data
async function generateReport(req, res) {
  const { type } = req.params;
  const { format = 'json', date, month, year } = req.query;

  if (!REPORT_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Unknown report type' });
  }

  try {
    let data;

    switch (type) {
      case 'daily_occupancy':
        data = await getDailyOccupancy(date);
        break;
      case 'gate_activity':
        data = await getGateActivity(date);
        break;
      case 'monthly_police_report':
        data = await getPoliceReportData(month, year);
        if (format === 'pdf') return generatePolicePDF(res, data, month, year);
        break;
      case 'contractor_camp_strength':
        data = await getContractorStrength();
        break;
      case 'overstay_alerts':
        data = await getOverstayAlerts();
        break;
      default:
        data = await getGenericReport(type, date, month, year);
    }

    res.json({ report_type: type, data, generated_at: new Date() });

  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ error: 'Report generation failed' });
  }
}

async function getDailyOccupancy(date) {
  // Uses status enum (no is_active on persons in v4).
  const result = await pool.query(
    `SELECT person_type, COUNT(*) as count
       FROM persons
      WHERE status = 'on_campus'
      GROUP BY person_type
      ORDER BY count DESC`
  );
  return result.rows;
}

async function getGateActivity(date) {
  const result = await pool.query(
    `SELECT
       gate,
       result,
       COUNT(*) as count,
       MAX(scanned_at) as last_event
     FROM gate_events
     WHERE scanned_at::date = COALESCE($1::date, CURRENT_DATE)
     GROUP BY gate, result
     ORDER BY gate, result`,
    [date || null]
  );
  return result.rows;
}

async function getPoliceReportData(month, year) {
  // The schema already exposes the right columns via the monthly_police_report
  // view (joins persons + person_stays + departments + contractor_labourers).
  const result = await pool.query(`SELECT * FROM monthly_police_report`);
  return result.rows;
}

async function getContractorStrength() {
  // persons.contractor_id doesn't exist — link via contractor_labourers.
  // contractors uses poc_name/poc_mobile, not hod_contact.
  const result = await pool.query(
    `SELECT
       con.company_name, con.poc_name, con.poc_mobile,
       COUNT(cl.person_id)                                                  AS registered,
       COUNT(cl.person_id) FILTER (WHERE p.status = 'on_campus')            AS active
     FROM contractors con
     LEFT JOIN contractor_labourers cl ON cl.contractor_id = con.contractor_id
     LEFT JOIN persons p               ON p.person_id = cl.person_id
     GROUP BY con.contractor_id, con.company_name, con.poc_name, con.poc_mobile
     ORDER BY active DESC NULLS LAST`
  );
  return result.rows;
}

async function getOverstayAlerts() {
  // Validity dates live on qr_passes, not persons. A person is "overdue" when
  // their active QR pass has expired but their status is still 'on_campus'.
  const result = await pool.query(
    `SELECT
       p.full_name, p.person_type, p.mobile,
       qp.valid_until, d.dept_name,
       EXTRACT(DAY FROM NOW() - qp.valid_until) AS days_overdue
     FROM persons p
     JOIN qr_passes qp ON qp.person_id = p.person_id AND qp.is_active = TRUE
     LEFT JOIN departments d ON p.dept_id = d.dept_id
     WHERE qp.valid_until IS NOT NULL
       AND qp.valid_until < NOW()
       AND p.status = 'on_campus'
       AND p.person_type IN ('room_guest','paid_day_visitor','free_day_visitor','course_student')
     ORDER BY qp.valid_until ASC`
  );
  return result.rows;
}

async function getGenericReport(type, date, month, year) {
  return { type, message: 'Report data placeholder — implement specific query' };
}

// Generate Police Report as PDF
function generatePolicePDF(res, persons, month, year) {
  const m = month || new Date().getMonth() + 1;
  const y = year  || new Date().getFullYear();
  const monthName = new Date(y, m - 1).toLocaleString('en-IN', { month: 'long' });

  const doc = new PDFDoc({ margin: 40, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition',
    `attachment; filename=GEV_Police_Report_${monthName}_${y}.pdf`);

  doc.pipe(res);

  // Header
  doc.fontSize(16).font('Helvetica-Bold')
     .text('Govardhan EcoVillage — ISKCON GEV', { align: 'center' });
  doc.fontSize(13).font('Helvetica')
     .text(`Monthly Campus Resident Register — ${monthName} ${y}`, { align: 'center' });
  doc.fontSize(10)
     .text('Galtare, Hamrapur, Wada, Palghar — 421303, Maharashtra', { align: 'center' });
  doc.moveDown(0.5);
  doc.text(`Total Records: ${persons.length}   |   Prepared by: Premanjan P (Security HOD)`,
           { align: 'center' });
  doc.moveDown(1);

  // Table header
  const cols = { sno:30, name:120, type:80, dept:100, id:90, arrived:60, block:70 };
  const startX = 40;
  let y_pos = doc.y;

  doc.fontSize(8).font('Helvetica-Bold');
  doc.rect(startX, y_pos, 550, 16).fill('#333333');
  doc.fillColor('white');
  let x = startX + 4;
  doc.text('#',         x, y_pos + 4, { width: cols.sno });  x += cols.sno;
  doc.text('Full Name', x, y_pos + 4, { width: cols.name }); x += cols.name;
  doc.text('Type',      x, y_pos + 4, { width: cols.type }); x += cols.type;
  doc.text('Dept/Role', x, y_pos + 4, { width: cols.dept }); x += cols.dept;
  doc.text('ID Proof',  x, y_pos + 4, { width: cols.id   }); x += cols.id;
  doc.text('Arrived',   x, y_pos + 4, { width: cols.arrived }); x += cols.arrived;
  doc.text('Location',  x, y_pos + 4, { width: cols.block });
  doc.fillColor('black');

  // Table rows
  persons.forEach((person, i) => {
    y_pos = doc.y + 16;

    if (y_pos > 780) {
      doc.addPage();
      y_pos = 40;
    }

    const bg = i % 2 === 0 ? '#FFFFFF' : '#F9F9F9';
    doc.rect(startX, y_pos, 550, 16).fill(bg);
    doc.font('Helvetica').fontSize(7).fillColor('#111111');

    // Field names come from the monthly_police_report VIEW:
    //   full_name, person_type, dept_name, contractor_company,
    //   id_proof_type, id_proof_number, arrival_date, accommodation_block
    x = startX + 4;
    doc.text(String(i + 1),                                   x, y_pos + 4, { width: cols.sno }); x += cols.sno;
    doc.text(person.full_name || '—',                         x, y_pos + 4, { width: cols.name }); x += cols.name;
    doc.text(person.person_type || '—',                       x, y_pos + 4, { width: cols.type }); x += cols.type;
    doc.text(person.dept_name || person.contractor_company || '—', x, y_pos + 4, { width: cols.dept }); x += cols.dept;
    doc.text(
      person.id_proof_type ? `${person.id_proof_type} ${(person.id_proof_number || '').slice(-4).padStart(8,'X')}` : '—',
      x, y_pos + 4, { width: cols.id }
    ); x += cols.id;
    doc.text(
      person.arrival_date ? new Date(person.arrival_date).toLocaleDateString('en-IN') : '—',
      x, y_pos + 4, { width: cols.arrived }
    ); x += cols.arrived;
    doc.text(person.accommodation_block || 'On campus', x, y_pos + 4, { width: cols.block });

    doc.moveTo(startX, y_pos + 16).lineTo(startX + 550, y_pos + 16).stroke('#DDDDDD');
    doc.y = y_pos;
  });

  // Footer
  doc.moveDown(2);
  doc.fontSize(9).font('Helvetica');
  doc.text('Premanjan P — Security HOD', 40, doc.y);
  doc.text('Signature: ______________________', 40, doc.y + 16);
  doc.text('Vasudev Prabhuji — Final Authority', 350, doc.y - 16);
  doc.text('Signature: ______________________', 350, doc.y);

  doc.end();
}

module.exports = { generateReport };
```

Create `src/routes/reports.js`:
```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/reportsController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/:type', requireAuth, ctrl.generateReport);

module.exports = router;
```

Add to `src/index.js`:
```javascript
app.use('/api/reports', require('./routes/reports'));
```

---

## STEP 2: CONNECT DASHBOARD TO LIVE DATA

Open `GEV_Dashboard_Reports.html`.

Replace all hardcoded numbers with fetch calls:

```javascript
// On dashboard load
async function loadDashboard() {
  const resp = await fetch('/api/admin/dashboard', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('gev_token') }
  });
  const data = await resp.json();
  updateDashboardCards(data.data);
}

// For the hourly chart
async function loadHourlyChart() {
  const resp = await fetch('/api/gate/stats', {
    headers: { 'Authorization': 'Bearer ' + localStorage.getItem('gev_token') }
  });
  const data = await resp.json();
  buildChart('hourly-chart', data.data.map(d => d.allowed), 'var(--saffron)');
}
```

Report download buttons:
```javascript
function downloadPoliceReport(month, year) {
  const url = `/api/reports/monthly_police_report?format=pdf&month=${month}&year=${year}`;
  window.open(url, '_blank');
}
```

---

## DONE WHEN

1. Dashboard shows real live numbers — total on campus, gate counts, meal counts
2. `GET /api/reports/daily_occupancy` returns correct data
3. `GET /api/reports/monthly_police_report?format=pdf` downloads a real PDF
4. PDF has correct formatting with GEV header, table of residents, signature lines
5. Overstay alerts report shows anyone past their valid_until date
6. All 17 report types return data (even if some are placeholder implementations)

When all confirmed — Phase 8 is complete. Move to Phase 9.

---

*Next phase: Phase 9 — Pilot at Main Gate then full go-live*

---
---
---

# GEV ICMS — Phase 9 Prompt for Claude Code
## Pilot + Go-Live Checklist

---

## WHAT IS ALREADY DONE

All apps built and connected. All integrations working. Reports generating.
The system is complete. Now we make it production-ready and go live.

---

## PRE-GO-LIVE CHECKLIST

Work through every item before switching on for real.

### Security
- [ ] All passwords changed from test values (gev123 → strong passwords)
- [ ] JWT_SECRET is a long random string (not the test value)
- [ ] RAZORPAY_KEY_ID and KEY_SECRET are live keys (not test keys)
- [ ] HTTPS working on gev-icms.com (SSL cert installed via certbot)
- [ ] Nginx config redirects HTTP → HTTPS
- [ ] Database not exposed to public internet (localhost only)
- [ ] `.env` file not in git repository (.gitignore)

### Data
- [ ] All 118 payroll staff imported (from Greythr or manual CSV)
- [ ] All brahmacharis registered (55 persons)
- [ ] All contractor companies created in contractors table
- [ ] Current labourers registered under their contractors
- [ ] eZee webhook configured in eZee dashboard and tested
- [ ] system_config values reviewed and confirmed with Ram Prabhu

### Devices
- [ ] Gate tablet at Main Gate — Gate Tablet App loaded, gate.staff login works
- [ ] Gate tablet at Gate 7 — same
- [ ] Gate tablet at SBT Gate — Razorpay terminal connected
- [ ] Gate tablet at Exit Gate — same
- [ ] Canteen tablet at Annakshetra — Canteen App loaded, anandprem login works
- [ ] Admin portal accessible on Ram Prabhu's PC

### WhatsApp
- [ ] Interakt account active and verified
- [ ] Phone number connected to Interakt
- [ ] All message templates approved in Interakt dashboard
- [ ] Test WhatsApp sent and received successfully

---

## WEEK 1 PILOT — MAIN GATE ONLY

Run ICMS side by side with the current manual process for 1 week at Main Gate only.

**What to watch for:**
- Any QR scan that should allow but denies — fix the zone access logic
- Any performance issues — API response should be under 500ms
- Any tablet connectivity issues
- Any WhatsApp delivery failures

**Daily review:** Every evening, Ram Prabhu reviews:
```sql
-- Today's denial rate (uses gate_result_enum values 'allowed'/'denied'/'manual_override')
SELECT
  COUNT(*) FILTER (WHERE result = 'allowed') as allowed,
  COUNT(*) FILTER (WHERE result = 'denied')  as denied,
  ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'denied') / COUNT(*), 1) as denial_pct
FROM gate_events
WHERE scanned_at::date = CURRENT_DATE;

-- Any unexpected denials
SELECT p.full_name, p.person_type, ge.deny_reason, ge.scanned_at
FROM gate_events ge
LEFT JOIN persons p ON ge.person_id = p.person_id
WHERE ge.result = 'denied' AND ge.scanned_at::date = CURRENT_DATE
ORDER BY ge.scanned_at DESC;
```

---

## WEEK 2 — ALL GATES + CANTEEN

After Main Gate pilot is stable, extend to all 4 gates and activate Canteen App.

**Activate WhatsApp flows** in this order:
1. Walk-in visitor registration (Flow 1) — most used
2. Pre-arrival guest onboarding (Flow 2) — eZee triggered
3. Paid day visit booking (Flow 3)
4. Zone 3 confirmation (Flow 5) — after SBT Gate upgrade
5. Nightly meal forecast (Flow 9) — verify Anandprem P receives at 9 PM
6. All remaining flows

---

## PRODUCTION DEPLOYMENT

```bash
# On your Ubuntu VPS

# Install Nginx
sudo apt install -y nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/gev-icms

# Nginx config content:
server {
    listen 80;
    server_name gev-icms.com www.gev-icms.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /var/www/gev-icms/frontend;
        try_files $uri $uri/ /index.html;
    }
}

# Enable the site
sudo ln -s /etc/nginx/sites-available/gev-icms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL via certbot
sudo certbot --nginx -d gev-icms.com -d www.gev-icms.com

# Start backend with PM2
npm install -g pm2
cd gev-icms-backend
pm2 start src/index.js --name gev-icms --env production
pm2 save
pm2 startup  # run the command it shows you
```

---

## MONITORING

```bash
# Check app is running
pm2 status

# View live logs
pm2 logs gev-icms

# Monitor CPU and memory
pm2 monit

# Restart if needed
pm2 restart gev-icms
```

Add a simple health check cron — if API is down, send alert to Ram Prabhu:
```javascript
// Add to forecastService.js or a new healthService.js
cron.schedule('*/5 * * * *', async () => {
  // Every 5 minutes check if DB is reachable
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    // Send WhatsApp alert to Ram Prabhu
    await sendMessage(process.env.ADMIN_MOBILE, 'ALERT: GEV ICMS database connection failed. Check server immediately.');
  }
});
```

---

## DONE WHEN — FULL GO-LIVE CONFIRMED

- [ ] Visitors are registering via WhatsApp + Smart Registration Page
- [ ] QR passes arriving on visitor WhatsApp
- [ ] All 4 gates scanning QR codes from real database
- [ ] Canteen App scanning breakfast and dinner
- [ ] Nightly forecast arriving on Anandprem P's WhatsApp at 9 PM
- [ ] eZee hotel bookings auto-creating guest QR passes
- [ ] Ram Prabhu can see live dashboard numbers
- [ ] Police report PDF generating correctly
- [ ] No errors in PM2 logs for 48 hours

**Jai Govardhan! 🙏**

The GEV Integrated Campus Management System is live.

---

*All 9 phases complete. System fully deployed.*
