# GEV ICMS — Phase 3 Prompt for Claude Code
## Gate Tablet App Goes Live

---

## WHAT IS ALREADY DONE

- PostgreSQL running with all tables
- Auth API working — login returns JWT
- Persons CRUD API working
- Audit log middleware in place

## WHAT WE ARE BUILDING IN THIS PHASE

The QR scan API and gate events API — the two endpoints the Gate Tablet App needs.
Then we connect the Gate Tablet App HTML file to the real backend.

By the end: a gate staff member can log in on a tablet, scan a QR code,
and get a real allow or deny response from the actual database.

---

## STEP 1: ADD QR GENERATION TO PERSONS

When a person is registered, they need a QR pass.
Add this to your persons creation flow.

Install qrcode library:
```bash
npm install qrcode
```

Create `src/services/qrService.js`:
```javascript
const QRCode = require('qrcode');
const pool   = require('../db');

// Create a QR pass for a person.
// pass_type is required (NOT NULL in schema). zone_access goes in as JSONB —
// MUST be JSON-stringified so node-pg sends it as JSONB, not TEXT[].
async function createQRPass(
  person_id, zone_access, valid_from, valid_until, group_size,
  pass_type = 'day_pass'
) {
  const result = await pool.query(
    `INSERT INTO qr_passes
      (person_id, pass_type, zone_access, valid_from, valid_until, group_size, is_active)
     VALUES ($1, $2, $3::jsonb, $4, $5, $6, true)
     RETURNING *`,
    [
      person_id,
      pass_type,
      JSON.stringify(zone_access),
      valid_from,
      valid_until,
      group_size || 1
    ]
  );
  return result.rows[0];
}

// Generate QR code image (base64 PNG) from a qr_id UUID
async function generateQRImage(qr_id) {
  const dataURL = await QRCode.toDataURL(qr_id, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' }
  });
  return dataURL; // base64 PNG — send to WhatsApp or display in browser
}

// Determine zone access based on person_type
function getZoneAccess(person_type) {
  const zoneMap = {
    room_guest:              ['zone1','zone2','zone3'],
    paid_day_visitor:        ['zone1','zone2'],
    free_day_visitor:        ['zone1','zone2'],
    course_student:          ['zone1','zone2','zone3'],
    volunteer_seva:          ['zone1','zone2','zone3'],
    sustainability_intern:   ['zone1','zone2','zone3'],
    resident_staff:          ['zone1','zone2','zone3','zone4'],
    staff_dependant:         ['zone1','zone2','zone3'],
    brahmachari:             ['zone1','zone2','zone3','zone4'],
    varishtha_vaishnava:     ['zone1','zone2','zone3','zone4'],
    weekly_labourer_local:   ['zone1','zone2','zone3'],
    weekly_labourer_outstation: ['zone1','zone2','zone3'],
    construction_labourer:   ['zone1','zone2','zone3'],
    vendor_supplier:         ['zone1'],
    corporate_tour_group:    ['zone1','zone2'],
    vip_dignitary:           ['zone1','zone2','zone3','zone4'],
  };
  return zoneMap[person_type] || ['zone1'];
}

module.exports = { createQRPass, generateQRImage, getZoneAccess };
```

---

## STEP 2: ADD QR SCAN API

Create `src/controllers/gateController.js`:

```javascript
const pool = require('../db');
const { getZoneAccess } = require('../services/qrService');

// Main scan endpoint — called by Gate Tablet App
async function scanQR(req, res) {
  const { qr_id, gate } = req.body;

  if (!qr_id || !gate) {
    return res.status(400).json({ error: 'qr_id and gate are required' });
  }

  try {
    // Look up QR pass with person details.
    // zone_access is JSONB array — node-pg parses it to a JS array.
    const result = await pool.query(
      `SELECT
         qp.qr_id, qp.zone_access, qp.valid_from, qp.valid_until,
         qp.group_size, qp.is_active, qp.pass_type,
         p.person_id, p.full_name, p.person_type, p.mobile,
         p.dept_id, p.status,
         d.dept_name
       FROM qr_passes qp
       JOIN persons p  ON qp.person_id = p.person_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       WHERE qp.qr_id = $1`,
      [qr_id]
    );

    if (result.rows.length === 0) {
      return await logAndRespond(req, res, gate, null, 'denied', 'QR code not found in system', null);
    }

    const pass = result.rows[0];

    // Check QR is active
    if (!pass.is_active) {
      return await logAndRespond(req, res, gate, pass, 'denied', 'QR pass has been deactivated', null);
    }

    // Check validity dates
    const now = new Date();
    if (pass.valid_from && new Date(pass.valid_from) > now) {
      return await logAndRespond(req, res, gate, pass, 'denied', 'QR pass is not yet valid', null);
    }
    if (pass.valid_until && new Date(pass.valid_until) < now) {
      return await logAndRespond(req, res, gate, pass, 'denied', 'QR pass has expired', null);
    }

    // Check zone access based on gate
    const gateZoneMap = {
      main_gate:  'zone1',
      gate_7:     'zone2',
      sbt_gate:   'zone3',
      exit_gate:  null // exit gate always allows out
    };

    const requiredZone = gateZoneMap[gate];

    if (requiredZone && !pass.zone_access.includes(requiredZone)) {
      // Check if eligible for Zone 3 upgrade (SBT Gate, day visitors)
      const upgradeEligible = gate === 'sbt_gate' &&
        ['free_day_visitor','paid_day_visitor','corporate_tour_group'].includes(pass.person_type);

      return await logAndRespond(
        req, res, gate, pass, 'denied',
        `${requiredZone.replace('zone','Zone ')} access not permitted for this pass`,
        upgradeEligible ? 'Offer Zone 3 café upgrade — Rs.350 per person' : 'Contact admin for access'
      );
    }

    // All checks passed — allow entry
    return await logAndRespond(req, res, gate, pass, 'allowed', null, null);

  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Server error during scan' });
  }
}

// Helper: log gate event and return response
async function logAndRespond(req, res, gate, pass, result, deny_reason, action) {
  // Log to gate_events table
  try {
    await pool.query(
      `INSERT INTO gate_events
        (person_id, qr_id, gate, event_type, result, deny_reason, scanned_by)
       VALUES ($1, $2, $3, 'entry', $4, $5, $6)`,
      [
        pass?.person_id || null,
        pass?.qr_id || null,
        gate,
        result,
        deny_reason,
        req.user?.user_id || null
      ]
    );
  } catch (err) {
    console.error('Gate event log error:', err.message);
  }

  // The Gate Tablet App contract still expects the strings 'allow' / 'deny'
  // in the JSON body. The schema enum ('allowed' / 'denied') is separate.
  if (result === 'denied' || !pass) {
    return res.json({
      result: 'deny',
      person: pass ? buildPersonResponse(pass) : null,
      deny_reason: deny_reason || 'Unknown QR code',
      action: action
    });
  }

  return res.json({
    result: 'allow',
    person: buildPersonResponse(pass),
    deny_reason: null,
    action: null
  });
}

function buildPersonResponse(pass) {
  return {
    name:       pass.full_name,
    type:       pass.person_type,
    dept:       pass.dept_name || '—',
    stay:       pass.valid_until
                  ? new Date(pass.valid_until).toLocaleDateString('en-IN')
                  : 'Permanent',
    pass_type:  pass.pass_type,
    mobile:     pass.mobile,
    zones:      pass.zone_access,
    group_size: pass.group_size || 1
  };
}

// Get today's gate stats
async function gateStats(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         gate,
         COUNT(*) FILTER (WHERE result = 'allowed') as allowed,
         COUNT(*) FILTER (WHERE result = 'denied')  as denied,
         MAX(scanned_at) as last_scan
       FROM gate_events
       WHERE scanned_at::date = CURRENT_DATE
       GROUP BY gate`
    );
    res.json({ data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Log batch entry (festival mode)
async function batchEntry(req, res) {
  const { gate, count, note } = req.body;
  if (!gate || !count) {
    return res.status(400).json({ error: 'gate and count required' });
  }
  try {
    await pool.query(
      `INSERT INTO gate_events
        (gate, event_type, result, is_batch_count, batch_count, deny_reason, scanned_by)
       VALUES ($1, 'entry', 'allowed', true, $2, $3, $4)`,
      [gate, count, note || 'Festival batch entry', req.user.user_id]
    );
    res.json({ success: true, message: `Batch entry of ${count} recorded at ${gate}` });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Manual override (admin only — always logged).
// Uses the gate_result_enum value 'manual_override' so reports can distinguish
// these from regular allows/denies.
async function override(req, res) {
  const { gate, person_id, reason } = req.body;
  if (!gate || !reason) {
    return res.status(400).json({ error: 'gate and reason required' });
  }
  try {
    await pool.query(
      `INSERT INTO gate_events
        (person_id, gate, event_type, result, deny_reason, scanned_by)
       VALUES ($1, $2, 'entry', 'manual_override', $3, $4)`,
      [person_id || null, gate, `MANUAL OVERRIDE: ${reason}`, req.user.user_id]
    );
    // Audit_log uses the canonical column names: table_name, record_id (not target_id/target_type)
    await pool.query(
      `INSERT INTO audit_log
        (user_id, action, module, table_name, record_id, new_value, ip_address)
       VALUES ($1, 'MANUAL_GATE_OVERRIDE', 'gate', 'gate_events', $2, $3, $4)`,
      [
        req.user.user_id,
        person_id || null,
        JSON.stringify({ gate, reason, person_id }),
        req.ip
      ]
    );
    res.json({ success: true, message: 'Override logged. Ram Prabhu notified.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { scanQR, gateStats, batchEntry, override };
```

Create `src/routes/gate.js`:
```javascript
const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/gateController');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/scan',      requireAuth, ctrl.scanQR);
router.get('/stats',      requireAuth, ctrl.gateStats);
router.post('/batch',     requireAuth, ctrl.batchEntry);
router.post('/override',  requireAuth, requireRole('super_admin','module_admin'), ctrl.override);

module.exports = router;
```

Add to `src/index.js`:
```javascript
app.use('/api/gate', require('./routes/gate'));
```

---

## STEP 3: INSERT TEST DATA INTO DATABASE

Before testing the gate app, we need a real person with a real QR pass in the database.

Run this SQL directly in psql. Note that v4 has no `persons.group_size` (group size lives on `qr_passes`), `zone_access` is JSONB array (not Postgres `ARRAY[...]`), and `pass_type` is required.

```sql
-- Insert a test person
INSERT INTO persons (full_name, person_type, mobile, status)
VALUES ('Arun Mehta', 'room_guest', '+919820112345', 'on_campus')
RETURNING person_id;

-- Note the person_id returned above, use it below
-- Insert a QR pass for that person.
-- zone_access is JSONB (note the ::jsonb cast); pass_type is required.
INSERT INTO qr_passes (person_id, pass_type, zone_access, valid_from, valid_until, group_size, is_active)
VALUES (
  'PASTE_PERSON_ID_HERE',
  'stay_pass',
  '["zone1","zone2","zone3"]'::jsonb,
  NOW(),
  NOW() + INTERVAL '3 days',
  2,
  true
)
RETURNING qr_id;

-- Note the qr_id returned — this UUID is the literal QR code payload
```

---

## STEP 4: CONNECT GATE TABLET APP TO REAL API

Open `GEV_Gate_Tablet_App_v2.html`.

Find the `doLogin()` function. Replace the mock login with a real API call:

```javascript
async function doLogin() {
  var userEl = document.getElementById('inp-user');
  var passEl = document.getElementById('inp-pass');
  var errEl  = document.getElementById('login-err');
  var user   = userEl.value.trim().toLowerCase();
  var pass   = passEl.value;

  errEl.style.display = 'none';

  if (!user || !pass) {
    errEl.textContent   = 'Please enter both username and password.';
    errEl.style.display = 'block';
    return;
  }

  try {
    var response = await fetch('http://localhost:3000/api/auth/login', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: user, password: pass })
    });

    var data = await response.json();

    if (!response.ok) {
      errEl.textContent   = data.error || 'Invalid credentials';
      errEl.style.display = 'block';
      return;
    }

    // Store JWT for all future API calls
    state.token    = data.token;
    state.loggedIn = true;
    state.user     = data.user;

    var lbl = document.getElementById('gate-label-txt');
    if (lbl) lbl.textContent = state.gate.name;

    startClock();
    goScreen('s-scanner');

  } catch (err) {
    errEl.textContent   = 'Cannot connect to server. Check your network.';
    errEl.style.display = 'block';
  }
}
```

Find the `demoScan()` function. Replace with a real QR scan:

```javascript
// For demo purposes on desktop — in production this comes from camera
async function demoScan() {
  // Use the real qr_id you got from the database above
  var testQRId = 'PASTE_YOUR_QR_ID_FROM_DATABASE_HERE';
  await performScan(testQRId);
}

async function performScan(qr_id) {
  if (!state.token) { alert('Not logged in'); return; }

  try {
    var response = await fetch('http://localhost:3000/api/gate/scan', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + state.token
      },
      body: JSON.stringify({ qr_id: qr_id, gate: state.gate.id })
    });

    var result = await response.json();
    processScan(result);

  } catch (err) {
    alert('Scan failed — cannot reach server');
  }
}
```

---

## STEP 5: TEST THE COMPLETE GATE FLOW

```bash
# 1. Start backend
cd gev-icms-backend && npm run dev

# 2. Open Gate Tablet App in browser
# open GEV_Gate_Tablet_App_v2.html

# 3. Log in with gate.staff / gev123
# 4. Click Demo Scan
# 5. Should see ALLOW with real person data from database

# Also test denial — insert a day visitor QR and try at SBT Gate
```

```bash
# Test scan API directly with curl
curl -X POST http://localhost:3000/api/gate/scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"qr_id":"PASTE_QR_ID_HERE","gate":"main_gate"}'
```

---

## DONE WHEN

1. `POST /api/gate/scan` with a valid qr_id returns allow with real person data
2. `POST /api/gate/scan` with expired/wrong qr_id returns deny with reason
3. `POST /api/gate/scan` for day visitor at sbt_gate returns deny with upgrade action
4. Gate Tablet App login calls real API — gate.staff / gev123 works
5. Demo Scan in Gate Tablet App shows real person name from database
6. Every scan creates a row in gate_events table
7. `GET /api/gate/stats` returns today's allow/deny counts

When all 7 are confirmed — Phase 3 is complete. Move to Phase 4.

---

## DO NOT DO IN THIS PHASE

- Do not build WhatsApp yet
- Do not build Razorpay yet
- Do not build Zone 3 upgrade payment yet (just return the deny with upgrade action text)
- Do not build the registration page yet
- Do not build the canteen app yet

---

*Next phase: Phase 4 — Visitor registration page + payments + WhatsApp QR delivery*
