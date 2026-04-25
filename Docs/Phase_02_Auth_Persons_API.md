# GEV ICMS — Phase 2 Prompt for Claude Code
## Backend Auth + Persons API

---

## WHAT IS ALREADY DONE

- PostgreSQL database is running
- All tables exist from Phase 1
- system_config has 10 rows
- 3 users exist in users table (with placeholder password hashes)

## WHAT WE ARE BUILDING IN THIS PHASE

A Node.js Express backend with:
1. Login endpoint — returns a JWT token
2. Auth middleware — protects all future endpoints
3. Persons CRUD — create, read, update, list people in the system
4. Audit log middleware — every write is recorded

Nothing else. No QR. No WhatsApp. No payments. Just auth + persons.

---

## PROJECT SETUP

```bash
mkdir gev-icms-backend && cd gev-icms-backend
npm init -y

npm install express pg bcrypt jsonwebtoken dotenv cors helmet
npm install --save-dev nodemon
```

Create this folder structure:
```
gev-icms-backend/
├── src/
│   ├── index.js            — Express app entry point
│   ├── db.js               — PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js         — JWT verification middleware
│   │   └── audit.js        — Audit log middleware
│   ├── routes/
│   │   ├── auth.js         — POST /api/auth/login, GET /api/auth/me
│   │   └── persons.js      — CRUD for persons
│   └── controllers/
│       ├── authController.js
│       └── personsController.js
├── .env
└── package.json
```

---

## FILE BY FILE — BUILD EXACTLY THIS

### `.env`
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gev_icms
DB_USER=gev_admin
DB_PASSWORD=gev_secure_2026
JWT_SECRET=gev_icms_jwt_secret_change_in_production_2026
JWT_EXPIRY=24h
PORT=3000
NODE_ENV=development
```

### `src/db.js` — PostgreSQL connection pool
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
```

### `src/middleware/auth.js` — JWT verification
```javascript
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied — insufficient role' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
```

### `src/middleware/audit.js` — Write to audit_log on every mutating request

Used for **both** authenticated routes and public paths (Smart Registration, Razorpay/eZee/WhatsApp webhooks, Greythr cron). When `req.user` is absent, the row is written with `user_id = NULL` — the schema allows that, and the `module` column captures the source (e.g. `webhook_razorpay`, `public_registration`, `cron_greythr`).

```javascript
const pool = require('../db');

// Schema column names (from GEV_Database_Schema_v3_Final.sql v4):
//   user_id, person_id, action, module, table_name, record_id,
//   old_value, new_value, ip_address, device_id, notes, created_at
function auditLog(action, module, tableName) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async function(body) {
      if (res.statusCode < 400) {
        try {
          const recordId =
            body?.data?.person_id || body?.data?.id || body?.data?.qr_id || null;
          await pool.query(
            `INSERT INTO audit_log
              (user_id, action, module, table_name, record_id,
               old_value, new_value, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              req.user?.user_id || null,           // NULL on public paths
              action,
              module,
              tableName || module,
              recordId,
              null,
              JSON.stringify(req.body),
              req.ip
            ]
          );
        } catch (err) {
          console.error('Audit log error:', err.message);
        }
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog };
```

> **Convention** — when calling `auditLog` from a public-path route, pass a descriptive `module` so the source is recoverable from the audit row alone. Suggested values: `public_registration`, `webhook_razorpay`, `webhook_ezee`, `webhook_whatsapp`, `cron_greythr`, `cron_forecast`.

### `src/controllers/authController.js`

`system_users` carries the credential and role. Profile fields (full_name, mobile) live on `persons`. Login joins them.

```javascript
const pool  = require('../db');
const bcrypt = require('bcrypt');
const jwt   = require('jsonwebtoken');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const result = await pool.query(
      `SELECT su.user_id, su.username, su.password_hash, su.role,
              su.module_access, su.dept_id, su.is_active, su.is_locked,
              p.person_id, p.full_name, p.mobile
         FROM system_users su
         JOIN persons p ON su.person_id = p.person_id
        WHERE su.username = $1
          AND su.is_active = TRUE
          AND su.is_locked = FALSE`,
      [username.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match) {
      // Track failed attempts; lock at 5
      await pool.query(
        `UPDATE system_users
            SET failed_login_count = failed_login_count + 1,
                is_locked = (failed_login_count + 1 >= 5)
          WHERE user_id = $1`,
        [user.user_id]
      );
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      {
        user_id:       user.user_id,
        username:      user.username,
        role:          user.role,
        module_access: user.module_access,
        dept_id:       user.dept_id,
        name:          user.full_name
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY }
    );

    await pool.query(
      `UPDATE system_users
          SET last_login = NOW(), failed_login_count = 0
        WHERE user_id = $1`,
      [user.user_id]
    );

    res.json({
      token,
      user: {
        user_id:       user.user_id,
        username:      user.username,
        name:          user.full_name,
        role:          user.role,
        module_access: user.module_access
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function me(req, res) {
  try {
    const result = await pool.query(
      `SELECT su.user_id, su.username, su.role, su.module_access, su.dept_id,
              p.full_name, p.mobile
         FROM system_users su
         JOIN persons p ON su.person_id = p.person_id
        WHERE su.user_id = $1`,
      [req.user.user_id]
    );
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { login, me };
```

### `src/controllers/personsController.js`

Column names match the schema. `persons` does **not** carry `valid_from / valid_until / group_size / address / email` — those live on `qr_passes` (validity, group_size) or are named `perm_address` here. To filter "active" people use `status` (the `person_status_enum`), not a separate `is_active` flag.

```javascript
const pool = require('../db');

const ALIVE_STATUSES = ['pre_registered', 'on_campus'];

async function list(req, res) {
  const { type, page = 1, limit = 50 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let query = `SELECT * FROM persons WHERE status = ANY($1)`;
    const params = [ALIVE_STATUSES];

    if (type) {
      params.push(type);
      query += ` AND person_type = $${params.length}`;
    }

    params.push(limit, offset);
    query += ` ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function getById(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM persons WHERE person_id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function create(req, res) {
  const {
    full_name, person_type, mobile,
    dept_id, id_proof_type, id_proof_number,
    date_of_birth, gender,
    perm_address, city, state, pincode,
    accommodation_block, room_number,
    registration_source
  } = req.body;

  if (!full_name || !person_type || !mobile) {
    return res.status(400).json({ error: 'full_name, person_type, and mobile are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO persons
        (full_name, person_type, mobile, dept_id,
         id_proof_type, id_proof_number, date_of_birth, gender,
         perm_address, city, state, pincode,
         accommodation_block, room_number,
         registered_by, registration_source, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pre_registered')
       RETURNING *`,
      [
        full_name, person_type, mobile, dept_id,
        id_proof_type, id_proof_number, date_of_birth, gender,
        perm_address, city, state, pincode,
        accommodation_block, room_number,
        req.user.user_id, registration_source || 'admin_portal'
      ]
    );
    res.status(201).json({ data: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function update(req, res) {
  const fields = req.body;
  const allowed = [
    'full_name','mobile','dept_id','id_proof_type','id_proof_number',
    'date_of_birth','gender','perm_address','city','state','pincode',
    'accommodation_block','room_number','status'
  ];

  const keys = Object.keys(fields).filter(k => allowed.includes(k));
  if (keys.length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const updates = keys.map((k, i) => `${k} = $${i + 2}`);
  const values  = keys.map(k => fields[k]);

  try {
    const result = await pool.query(
      `UPDATE persons SET ${updates.join(', ')}, updated_at = NOW()
       WHERE person_id = $1 RETURNING *`,
      [req.params.id, ...values]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Person not found' });
    res.json({ data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = { list, getById, create, update };
```

> **Note** — group registrations and pass validity (`valid_from`, `valid_until`, `group_size`) are recorded on the `qr_passes` row that gets issued in Phase 3, not on `persons`. The leader's individual member rows go in `group_members` (also Phase 3).

### `src/routes/auth.js`
```javascript
const express = require('express');
const router  = express.Router();
const { login, me } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', requireAuth, me);

module.exports = router;
```

### `src/routes/persons.js`
```javascript
const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/personsController');
const { requireAuth, requireRole } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

router.get('/',     requireAuth, ctrl.list);
router.get('/:id',  requireAuth, ctrl.getById);
router.post('/',    requireAuth, auditLog('CREATE_PERSON','vms','persons'), ctrl.create);
router.put('/:id',  requireAuth, auditLog('UPDATE_PERSON','vms','persons'), ctrl.update);

module.exports = router;
```

### `src/index.js` — Main app
```javascript
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth',    require('./routes/auth'));
app.use('/api/persons', require('./routes/persons'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', system: 'GEV ICMS', version: '1.0' });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GEV ICMS API running on port ${PORT}`);
});
```

### `package.json` scripts section
```json
"scripts": {
  "start": "node src/index.js",
  "dev":   "nodemon src/index.js"
}
```

---

## SET REAL PASSWORDS FOR TEST USERS

Before testing, set real bcrypt hashed passwords:

```javascript
// Run this once as a script: node set-passwords.js
require('dotenv').config();
const pool   = require('./src/db');
const bcrypt = require('bcrypt');

async function setPasswords() {
  const users = [
    { username: 'ram.prabhu', password: 'admin123' },
    { username: 'gate.staff', password: 'gev123'   },
    { username: 'anandprem',  password: 'gev123'   },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 12);
    await pool.query(
      'UPDATE system_users SET password_hash = $1, failed_login_count = 0, is_locked = FALSE WHERE username = $2',
      [hash, u.username]
    );
    console.log(`Password set for ${u.username}`);
  }
  process.exit(0);
}

setPasswords();
```

---

## TEST WITH THESE CURL COMMANDS

```bash
# Start the server
npm run dev

# 1. Health check
curl http://localhost:3000/api/health

# 2. Login (should return a JWT token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ram.prabhu","password":"admin123"}'

# Save the token from the response, use it below as TOKEN=...

# 3. Get current user
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Create a test person
curl -X POST http://localhost:3000/api/persons \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "full_name": "Test Visitor",
    "person_type": "free_day_visitor",
    "mobile": "+919876543210",
    "perm_address": "123 Some Street",
    "city": "Mumbai",
    "state": "Maharashtra"
  }'

# 5. List all persons
curl http://localhost:3000/api/persons \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 6. Try without token — should get 401
curl http://localhost:3000/api/persons
```

---

## DONE WHEN

1. `GET /api/health` returns `{ status: 'ok' }`
2. `POST /api/auth/login` with correct credentials returns a JWT token
3. `POST /api/auth/login` with wrong credentials returns 401
4. `GET /api/auth/me` with valid token returns user details
5. `GET /api/persons` without token returns 401
6. `POST /api/persons` creates a person and you can see it in the database
7. Audit log has a row for the person creation

---

## DO NOT DO IN THIS PHASE

- Do not build QR scan yet
- Do not build WhatsApp yet
- Do not build Razorpay yet
- Do not connect any frontend yet
- Do not build the gate app connection yet

---

*Next phase: Phase 3 — Gate Tablet App goes live*
