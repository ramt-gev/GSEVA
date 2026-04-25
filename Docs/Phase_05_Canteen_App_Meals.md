# GEV ICMS — Phase 5 Prompt for Claude Code
## Canteen App + Annakshetra Meal Management

---

## WHAT IS ALREADY DONE

- Database, Auth, Persons API all working
- Gate Tablet App live — QR scan working
- Visitor registration + Razorpay + WhatsApp QR delivery working
- Full visitor loop tested end to end

## WHAT WE ARE BUILDING IN THIS PHASE

The Annakshetra meal management system:
1. Meal scan API — scan QR at breakfast/dinner, record who was served
2. Tap counter API — count free lunch / khichadi walk-ins
3. Today's meal count API — dashboard numbers for canteen app
4. Nightly forecast cron — WhatsApp message at 9 PM to Anandprem P

Then connect the Annakshetra Canteen App HTML to the real API.

---

## STEP 1: MEAL CONTROLLER

Create `src/controllers/mealsController.js`:

```javascript
const pool = require('../db');

// Annakshetra meal slots. The schema enum (meal_type_enum) has 8 values total
// including ashram-only meals; this map covers the 5 the Canteen App handles.
// `billing_relevant` slots (B/D) require an active meal_registrations row;
// the schema CHECK on meal_token_events enforces this.
const MEAL_SLOTS = {
  breakfast:    { label: 'Breakfast',    time: '07:15-08:15', billing_relevant: true  },
  khichadi_am:  { label: 'Khichadi AM',  time: '09:30-12:30', billing_relevant: false },
  free_lunch:   { label: 'Free Lunch',   time: '12:45-14:30', billing_relevant: false },
  khichadi_pm:  { label: 'Khichadi PM',  time: '16:00-19:30', billing_relevant: false },
  dinner:       { label: 'Dinner',       time: '18:30-19:15', billing_relevant: true  },
};

// POST /api/meals/scan — scan QR for any meal where the person is registered.
// For B/D the schema requires reg_id (look it up); for free meals reg_id MUST
// be NULL (CHECK enforces).
async function scanMeal(req, res) {
  const { qr_id, meal_type } = req.body;  // (renamed from meal_slot for column parity)

  if (!qr_id || !meal_type) {
    return res.status(400).json({ error: 'qr_id and meal_type required' });
  }
  if (!MEAL_SLOTS[meal_type]) {
    return res.status(400).json({ error: 'Invalid meal_type' });
  }

  try {
    // Look up QR pass and person
    const result = await pool.query(
      `SELECT
         qp.qr_id, p.person_id, p.full_name, p.person_type,
         p.dept_id, d.dept_name
       FROM qr_passes qp
       JOIN persons p ON qp.person_id = p.person_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       WHERE qp.qr_id = $1 AND qp.is_active = true`,
      [qr_id]
    );

    if (result.rows.length === 0) {
      return res.json({ result: 'deny', reason: 'QR not found or inactive' });
    }
    const person = result.rows[0];

    // For B/D, look up the active meal_registrations row — required by CHECK.
    let reg_id = null;
    if (MEAL_SLOTS[meal_type].billing_relevant) {
      const reg = await pool.query(
        `SELECT reg_id FROM meal_registrations
          WHERE person_id = $1 AND meal_type = $2 AND is_active = TRUE`,
        [person.person_id, meal_type]
      );
      if (reg.rows.length === 0) {
        return res.json({
          result: 'deny',
          person: buildMealPersonResponse(person),
          reason: `${person.full_name} is not registered for ${MEAL_SLOTS[meal_type].label}`
        });
      }
      reg_id = reg.rows[0].reg_id;
    }

    // Check duplicate (same person, same slot, same day) — UNIQUE in schema
    // would reject this anyway, but explicit check gives a friendly message.
    const dup = await pool.query(
      `SELECT token_id FROM meal_token_events
        WHERE person_id = $1 AND meal_type = $2 AND meal_date = CURRENT_DATE`,
      [person.person_id, meal_type]
    );
    if (dup.rows.length > 0) {
      return res.json({
        result:  'already_served',
        person:  buildMealPersonResponse(person),
        message: `${person.full_name} already received ${MEAL_SLOTS[meal_type].label} today`
      });
    }

    // Record meal served. reg_id is NULL for free meals (CHECK enforces).
    await pool.query(
      `INSERT INTO meal_token_events
        (person_id, reg_id, meal_type, meal_date, served_by)
       VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
      [person.person_id, reg_id, meal_type, req.user.user_id]
    );

    res.json({
      result: 'served',
      person: buildMealPersonResponse(person),
      meal:   MEAL_SLOTS[meal_type].label
    });

  } catch (err) {
    console.error('Meal scan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// POST /api/meals/tap — anonymous walk-in counter for free meals.
//
// Anonymous walk-ins go to free_meal_counts (which has no person_id NOT NULL
// constraint), NOT to meal_token_events (which requires a person and would
// fail the CHECK constraint).
async function tapCounter(req, res) {
  const { meal_type, count = 1 } = req.body;

  if (!meal_type || !MEAL_SLOTS[meal_type]) {
    return res.status(400).json({ error: 'Valid meal_type required' });
  }
  if (MEAL_SLOTS[meal_type].billing_relevant) {
    return res.status(400).json({ error: 'Tap counter is for free meals only — use /scan for B/D' });
  }

  try {
    await pool.query(
      `INSERT INTO free_meal_counts
        (meal_date, meal_slot, count, entry_type, recorded_by)
       VALUES (CURRENT_DATE, $1, $2, $3, $4)`,
      [meal_type, count, count > 1 ? 'bulk' : 'single', req.user.user_id]
    );

    // Today's running total = sum of free_meal_counts + named scans for this slot.
    const countResult = await pool.query(
      `SELECT
         COALESCE((SELECT SUM(count) FROM free_meal_counts
                    WHERE meal_date = CURRENT_DATE AND meal_slot = $1), 0)
         + COALESCE((SELECT COUNT(*) FROM meal_token_events
                      WHERE meal_date = CURRENT_DATE AND meal_type = $1), 0)
         AS total`,
      [meal_type]
    );

    res.json({
      success: true,
      meal_type,
      tap_count: count,
      total_today: parseInt(countResult.rows[0].total)
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/meals/today — today's counts for canteen dashboard.
// Combines named scans (meal_token_events) and anonymous taps (free_meal_counts).
async function todayStats(req, res) {
  try {
    const slotCounts = await pool.query(
      `SELECT
         meal_type,
         COUNT(*)                                   AS scanned,
         COUNT(*) FILTER (WHERE reg_id IS NOT NULL) AS bd_scanned,
         COUNT(*) FILTER (WHERE reg_id IS NULL)     AS free_scanned
       FROM meal_token_events
       WHERE meal_date = CURRENT_DATE
       GROUP BY meal_type`
    );

    const tapCounts = await pool.query(
      `SELECT meal_slot AS meal_type, SUM(count) AS tapped
         FROM free_meal_counts
        WHERE meal_date = CURRENT_DATE
        GROUP BY meal_slot`
    );

    // Registered B/D count by person_type (uses status, not is_active)
    const registered = await pool.query(
      `SELECT p.person_type, COUNT(*) AS count
         FROM persons p
        WHERE p.status IN ('on_campus','pre_registered')
          AND p.person_type IN (
            'resident_staff','staff_dependant','brahmachari',
            'varishtha_vaishnava','volunteer_seva',
            'construction_labourer','weekly_labourer_local',
            'weekly_labourer_outstation','course_student'
          )
        GROUP BY p.person_type`
    );

    res.json({
      data: {
        slot_counts:   slotCounts.rows,
        tap_counts:    tapCounts.rows,
        registered_bd: registered.rows,
        date: new Date().toLocaleDateString('en-IN')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/meals/registered — list of people registered for today's B/D.
// Pulls from meal_registrations (which is the actual B/D registration table)
// rather than guessing from person_type.
async function registeredList(req, res) {
  const { meal_type = 'breakfast' } = req.query;
  if (!['breakfast','dinner'].includes(meal_type)) {
    return res.status(400).json({ error: 'meal_type must be breakfast or dinner' });
  }

  try {
    const result = await pool.query(
      `SELECT
         p.full_name, p.person_type, p.mobile, d.dept_name,
         mr.payment_method,
         CASE WHEN mte.token_id IS NOT NULL THEN true ELSE false END AS served_today
       FROM meal_registrations mr
       JOIN persons p ON mr.person_id = p.person_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       LEFT JOIN meal_token_events mte
         ON mte.person_id = p.person_id
        AND mte.meal_type = mr.meal_type
        AND mte.meal_date = CURRENT_DATE
       WHERE mr.is_active = TRUE
         AND mr.meal_type = $1
         AND p.status IN ('on_campus','pre_registered')
       ORDER BY p.person_type, p.full_name`,
      [meal_type]
    );
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

function buildMealPersonResponse(person) {
  return {
    name:        person.full_name,
    type:        person.person_type,
    dept:        person.dept_name || '—',
    person_id:   person.person_id
  };
}

module.exports = { scanMeal, tapCounter, todayStats, registeredList };
```

Create `src/routes/meals.js`:
```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/mealsController');
const { requireAuth } = require('../middleware/auth');

router.post('/scan',        requireAuth, ctrl.scanMeal);
router.post('/tap',         requireAuth, ctrl.tapCounter);
router.get('/today',        requireAuth, ctrl.todayStats);
router.get('/registered',   requireAuth, ctrl.registeredList);

module.exports = router;
```

Add to `src/index.js`:
```javascript
app.use('/api/meals', require('./routes/meals'));
```

---

## STEP 2: NIGHTLY FORECAST CRON JOB

Install node-cron:
```bash
npm install node-cron
```

Create `src/services/forecastService.js`:

```javascript
const cron  = require('node-cron');
const pool  = require('../db');
const { sendNightlyForecast } = require('./whatsappService');

async function buildForecast() {
  // Count tomorrow's B/D registrants by category (from meal_registrations,
  // not just persons — registration is the billing-relevant signal).
  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE p.person_type IN ('resident_staff','staff_dependant')) as staff,
       COUNT(*) FILTER (WHERE p.person_type IN ('volunteer_seva','sustainability_intern')) as volunteers,
       COUNT(*) FILTER (WHERE p.person_type IN (
         'construction_labourer','weekly_labourer_local','weekly_labourer_outstation'
       )) as labourers,
       COUNT(*) FILTER (WHERE p.person_type = 'course_student') as students
     FROM meal_registrations mr
     JOIN persons p ON p.person_id = mr.person_id
     WHERE mr.is_active = TRUE
       AND mr.meal_type = 'breakfast'
       AND p.status IN ('on_campus','pre_registered')`
  );

  const c = counts.rows[0];
  const bd_total = parseInt(c.staff) + parseInt(c.volunteers) +
                   parseInt(c.labourers) + parseInt(c.students);

  // Estimate free lunch from 30-day rolling average (combines named scans
  // and anonymous taps, since both feed the lunch population estimate).
  const avgResult = await pool.query(
    `SELECT ROUND(AVG(daily_count)) as avg_free_lunch
     FROM (
       SELECT
         day,
         SUM(c)::int AS daily_count
       FROM (
         SELECT meal_date AS day, COUNT(*) AS c
           FROM meal_token_events
          WHERE meal_type IN ('free_lunch','khichadi_am','khichadi_pm')
            AND meal_date > CURRENT_DATE - INTERVAL '30 days'
          GROUP BY meal_date
         UNION ALL
         SELECT meal_date AS day, SUM(count)::int AS c
           FROM free_meal_counts
          WHERE meal_slot IN ('free_lunch','khichadi_am','khichadi_pm')
            AND meal_date > CURRENT_DATE - INTERVAL '30 days'
          GROUP BY meal_date
       ) combined
       GROUP BY day
     ) daily`
  );

  const estimated_free = parseInt(avgResult.rows[0]?.avg_free_lunch || 0);

  return {
    breakfast:  bd_total,
    free_lunch: estimated_free,
    dinner:     bd_total,
    staff:      parseInt(c.staff),
    volunteers: parseInt(c.volunteers),
    labourers:  parseInt(c.labourers),
    students:   parseInt(c.students)
  };
}

function startForecastCron() {
  // Run at 9 PM IST every day (IST = UTC+5:30, so 9PM IST = 15:30 UTC)
  cron.schedule('30 15 * * *', async () => {
    console.log('Running nightly forecast...');
    try {
      const forecast = await buildForecast();

      // Get forecast recipients from system_config or fall back to defaults
      const recipients = await pool.query(
        "SELECT config_value FROM system_config WHERE config_key = 'forecast_recipients'"
      );

      const mobiles = recipients.rows[0]?.config_value
        ? JSON.parse(recipients.rows[0].config_value)
        : ['+919999999996', '+919999999995']; // Anandprem P, Hari Guru P

      for (const mobile of mobiles) {
        await sendNightlyForecast(mobile, forecast);
      }

      console.log('Nightly forecast sent successfully');
    } catch (err) {
      console.error('Forecast cron error:', err);
    }
  });

  console.log('Nightly forecast cron scheduled for 9:00 PM IST');
}

module.exports = { startForecastCron, buildForecast };
```

Add to `src/index.js` (start the cron when server starts):
```javascript
const { startForecastCron } = require('./services/forecastService');

// ... after app.listen:
startForecastCron();
```

---

## STEP 3: CONNECT CANTEEN APP TO REAL API

Open `GEV_Annakshetra_Canteen_App.html`.

The canteen app has 3 main interactions — connect each one:

**1. Login** — same as gate app, call `POST /api/auth/login`

**2. Meal scan** — when staff scans a QR code:
```javascript
async function performMealScan(qr_id) {
  const resp = await fetch('http://localhost:3000/api/meals/scan', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + state.token
    },
    body: JSON.stringify({ qr_id, meal_type: state.currentSlot })
  });
  const result = await resp.json();
  showScanResult(result);
}
```

**3. Tap counter** — when staff taps the big button:
```javascript
async function tapMeal() {
  const resp = await fetch('http://localhost:3000/api/meals/tap', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': 'Bearer ' + state.token
    },
    body: JSON.stringify({ meal_type: state.currentSlot, count: 1 })
  });
  const result = await resp.json();
  document.getElementById('tap-count').textContent = result.total_today;
}
```

**4. Dashboard stats** — load on tab open:
```javascript
async function loadDashboard() {
  const resp = await fetch('http://localhost:3000/api/meals/today', {
    headers: { 'Authorization': 'Bearer ' + state.token }
  });
  const data = await resp.json();
  updateDashboard(data.data);
}
```

---

## STEP 4: CONTRACTOR BILLING API

Add to `src/controllers/mealsController.js`:

```javascript
// GET /api/meals/billing — monthly contractor billing summary.
//
// Schema notes:
// - persons.contractor_id does NOT exist — the link is via contractor_labourers.
// - Rate (₹1860) is read from system_config.bd_monthly_rate by the
//   `monthly_billing_summary` view, so we don't hardcode it here.
async function contractorBilling(req, res) {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year  || new Date().getFullYear();

  try {
    // monthly_billing_summary already does the right joins + reads bd_monthly_rate
    // from system_config. Filter to contractor rows only.
    const result = await pool.query(
      `SELECT *
         FROM monthly_billing_summary
        WHERE contractor_id IS NOT NULL
        ORDER BY monthly_amount_to_recover DESC`
    );
    res.json({ data: result.rows, month: m, year: y });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}
```

Add route:
```javascript
router.get('/billing', requireAuth, requireRole('super_admin','management','module_admin'), ctrl.contractorBilling);
```

---

## DONE WHEN

1. `POST /api/meals/scan` records a meal scan in meal_token_events table
2. Scanning same QR twice for same meal returns `already_served`
3. `POST /api/meals/tap` increments tap count
4. `GET /api/meals/today` returns count breakdown by meal slot
5. Canteen App login works with anandprem / gev123
6. Canteen App tap button increments count visible in real time
7. Nightly forecast — trigger manually with a test endpoint and verify WhatsApp message received
8. Contractor billing endpoint returns correct billing amounts

When all 8 confirmed — Phase 5 is complete. Move to Phase 6.

---

## DO NOT DO IN THIS PHASE

- Do not build eZee or Greythr integration yet
- Do not build the admin portal backend yet
- Do not build reports yet
- Do not build Zone 3 upgrade payment yet

---

*Next phase: Phase 6 — Admin Portal backend + RBAC enforcement*
