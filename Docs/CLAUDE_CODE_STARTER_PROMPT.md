# GEV ICMS — Claude Code Starter Prompt
## Complete Project Handover Brief

---

## WHO YOU ARE WORKING FOR

**Organisation:** Govardhan EcoVillage (GEV) — ISKCON, Wada, Palghar, Maharashtra  
**Contact:** Ram Prabhu (IT Software Head) — project coordinator and your daily point of contact  
**Final authority:** Vasudev Prabhuji (GAC 3)  
**IT Director:** Sri Gaurcaran P (GAC 4)  

---

## WHAT THIS PROJECT IS

You are building the **GEV Integrated Campus Management System (ICMS)** — a full-stack web application that manages the daily operation of a large spiritual campus (Govardhan EcoVillage) with 700+ people on campus every day and 15,000–20,000 on major festival days.

The system covers:
1. **Visitor Management (VMS)** — 16 visitor types, 4-zone QR-based access control
2. **Gate Access Control** — 4 gates, tablet PWA for gate staff, QR scan, allow/deny
3. **Annakshetra Food Management** — meal token system, B/D registration, free meal counting
4. **Festival & Event Management** — batch entry, crowd counting, committee dashboards
5. **Security & Reporting** — monthly police report, audit trail, RBAC
6. **WhatsApp Integration** — 13 flows via Interakt API, QR pass delivery, alerts

---

## WHAT IS ALREADY BUILT (FRONTEND PROTOTYPES)

All frontend UI has been fully designed and prototyped as standalone HTML files. These are your UI reference — do not redesign, just connect to real backend:

| File | Description |
|---|---|
| `GEV_Gate_Tablet_App_v2.html` | PWA for 4 gate tablets — login, QR scan, allow/deny, Zone 3 upgrade |
| `GEV_Admin_Portal_v2.html` | Admin portal — 7 visitor type tabs, RBAC, settings, billing recovery |
| `GEV_Annakshetra_Canteen_App.html` | PWA for canteen counter — 5 meal slots, tap counter, dashboard |
| `GEV_Smart_Registration_Page.html` | Mobile webpage — visitor self-registration with Razorpay payment |
| `GEV_Dashboard_Reports.html` | Management dashboard — 9 views, 17 report types, police report |
| `GEV_WhatsApp_Flows_v1.html` | Reference — 13 WhatsApp flow designs (Interakt + ManyChat) |
| `GEV_Requirements_v4_FINAL.md` | Complete requirements document v4.2 — your primary specification |
| `GEV_Database_Schema_v3_Final.sql` | Complete PostgreSQL schema v3 — deploy this as-is |

---

## YOUR FIRST TASK — START HERE

Build in this exact order. Do not jump ahead.

### Step 1: Set up the project structure

```
gev-icms/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   └── services/
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── gate-app/          (Gate Tablet App)
│   ├── canteen-app/       (Annakshetra Canteen App)
│   ├── admin-portal/      (Admin Portal)
│   ├── registration/      (Smart Registration Page)
│   └── dashboard/         (Dashboard & Reports)
├── database/
│   └── schema.sql         (copy of GEV_Database_Schema_v3_Final.sql)
└── docker-compose.yml
```

### Step 2: Deploy the database

Take `GEV_Database_Schema_v3_Final.sql` and deploy it to PostgreSQL exactly as written. Do not modify the schema. It has 1490 lines covering all tables, enums, views, indexes, and triggers.

### Step 3: Build the backend API

**Technology:** Node.js with Express.js (or Python FastAPI — your choice based on what will be fastest to build and maintain)

**Authentication:**
- JWT-based auth
- 5 roles: super_admin, management, module_admin, dept_manager, operator
- Role stored in `users` table, validated on every API call
- Gate Tablet App and Canteen App use operator-level logins

**Core API endpoints to build first (in priority order):**

#### AUTH
```
POST   /api/auth/login          — username + password → JWT token
POST   /api/auth/logout         — invalidate token
GET    /api/auth/me             — get current user profile
```

#### QR & GATE (highest priority — gates need this on Day 1)
```
POST   /api/qr/scan             — scan QR code → return allow/deny + person details
GET    /api/qr/:qr_id           — get QR pass details
POST   /api/gate/event          — log gate entry/exit event
GET    /api/gate/stats          — today's allow/deny counts per gate
POST   /api/gate/batch          — batch entry (festival mode)
POST   /api/gate/override       — manual override (admin only, logged to audit)
```

#### QR SCAN RESPONSE FORMAT (critical — gate tablet reads this)
```json
{
  "result": "allow",
  "person": {
    "name": "Arun Mehta",
    "type": "room_guest",
    "dept": "Guest Services",
    "stay": "24–26 Apr 2026",
    "meals": "B+D registered",
    "mobile": "+91 98201 12345",
    "zones": ["zone1", "zone2", "zone3"],
    "group_size": 2
  },
  "deny_reason": null,
  "action": null
}
```

If denied:
```json
{
  "result": "deny",
  "person": { ... },
  "deny_reason": "Zone 3 not permitted for free day visitors",
  "action": "Offer Zone 3 café upgrade at ₹350/person"
}
```

#### ZONE 3 UPGRADE (SBT Gate specific)
```
GET    /api/cafe/capacity       — today's remaining Govinda's café spots
POST   /api/upgrade/zone3       — initiate Zone 3 upgrade payment (Razorpay)
POST   /api/upgrade/webhook     — Razorpay payment success webhook
```

#### PEOPLE / PERSONS
```
GET    /api/persons             — list all (paginated, filterable by type)
GET    /api/persons/:id         — get person details
POST   /api/persons             — register new person
PUT    /api/persons/:id         — update person
DELETE /api/persons/:id         — soft delete (is_active = false)
GET    /api/persons/:id/qr      — get active QR pass for person
```

#### VISITOR REGISTRATION (Smart Registration Page uses this)
```
POST   /api/register/visitor    — public endpoint, no auth required
                                  creates person + qr_pass + triggers WhatsApp
GET    /api/register/vf-slots   — get available Vrindavan Forest tour slots
GET    /api/register/cafe-capacity — live Govinda's café availability
POST   /api/payments/create     — create Razorpay order
POST   /api/payments/webhook    — Razorpay webhook (verify signature)
```

#### ANNAKSHETRA / MEALS
```
POST   /api/meals/scan          — scan QR for meal token
POST   /api/meals/tap           — tap counter increment (free meals, no QR)
GET    /api/meals/today         — today's count by meal slot and category
GET    /api/meals/forecast      — tonight's nightly forecast (for WhatsApp)
GET    /api/meals/registered    — list of B/D registered persons for today
```

#### ADMIN / SETTINGS
```
GET    /api/config              — get system_config values
PUT    /api/config              — update system_config (super_admin only)
GET    /api/reports/:type       — generate report (daily, monthly, police etc.)
GET    /api/audit               — audit trail (super_admin only)
GET    /api/billing/contractors — monthly contractor billing summary
```

#### WHATSAPP (Interakt integration)
```
POST   /api/whatsapp/send       — internal — send WhatsApp via Interakt API
POST   /api/whatsapp/webhook    — receive inbound WhatsApp messages
```

### Step 4: Connect frontends to backend

After the API is running, convert each HTML prototype from mock/demo data to real API calls. The HTML files already have all the UI — you only need to replace hardcoded demo data with fetch() calls to your API.

For the Gate Tablet App specifically — replace the `DEMO_SCANS` array and `demoScan()` function with a real camera QR scan (use `jsQR` library) that calls `POST /api/qr/scan`.

---

## TECHNOLOGY STACK

| Layer | Choice | Reason |
|---|---|---|
| Backend | Node.js + Express.js | Fast to build, large ecosystem |
| Database | PostgreSQL 15+ | Schema already written for Postgres |
| Auth | JWT (jsonwebtoken) | Simple, stateless, works on tablets |
| ORM | Knex.js or Prisma | Good Postgres support |
| WhatsApp | Interakt REST API | GEV already has Interakt account |
| Payments | Razorpay | Indian payment gateway, UPI support |
| Hotel sync | eZee Centrix webhook | Already in use at GEV |
| HRMS sync | Greythr API | Already in use at GEV |
| QR generation | qrcode npm package | Generate QR passes server-side |
| QR scanning | jsQR (browser library) | Works on tablet camera |
| File storage | AWS S3 or local | ID proof uploads |
| Deployment | Ubuntu VPS + PM2 + Nginx | Simple, reliable |
| SSL | Let's Encrypt (Certbot) | Free SSL |

---

## ENVIRONMENT VARIABLES NEEDED

Create `.env` with these:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gev_icms
DB_USER=gev_admin
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your_long_random_secret
JWT_EXPIRY=24h

# Razorpay
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Interakt (WhatsApp)
INTERAKT_API_KEY=...
INTERAKT_BASE_URL=https://api.interakt.ai/v1/public

# eZee (hotel bookings)
EZEE_PROPERTY_CODE=...
EZEE_AUTH_KEY=...
EZEE_WEBHOOK_SECRET=...

# Greythr (HRMS)
GREYTHR_BASE_URL=...
GREYTHR_API_KEY=...

# App
NODE_ENV=production
PORT=3000
BASE_URL=https://gev-icms.com
FRONTEND_URL=https://gev-icms.com

# Zone 3 upgrade defaults (also in system_config table)
ZONE3_PRICE=350
MAX_GROUP_SIZE=10
```

---

## KEY BUSINESS RULES (implement these exactly)

### Zone access rules
- **Zone 1** (Main Gate): everyone allowed, no QR needed for entry
- **Zone 2** (Gate 7): QR mandatory — room_guest, paid_day_visitor, course_student, volunteer_seva, staff, labourers, vendors with approval
- **Zone 3** (SBT Gate): QR mandatory — room_guest, course_student, volunteer_seva, resident_staff, varishtha_vaishnava, brahmachari only. Day visitors need to pay ₹350/person upgrade.
- **Zone 4** (Payal Bhavan): residents only — brahmachari, varishtha_vaishnava, resident_staff

### QR pass validity
- Room guests: check-in date to check-out date only
- Day visitors: valid_from to day_pass_valid_until (from system_config, default 20:00)
- Staff/residents: permanent (no expiry)
- Labourers: project start to project end date
- Volunteers: seva period dates

### Zone 3 upgrade flow (SBT Gate)
1. Scan QR → API returns `result: allow` but with `upgrade_eligible: true`
2. Gate tablet shows upgrade screen with ₹350 × group_size
3. Payment via Razorpay UPI
4. Razorpay webhook hits `/api/upgrade/webhook`
5. API updates `zone_upgrade_payments` table, extends QR zone access
6. WhatsApp receipt sent via Interakt
7. Gate tablet shows success screen, gate opens

### Annakshetra B/D billing
- Rate: ₹1,860 per person per month (Breakfast + Dinner only)
- Lunch is always free, not billed
- Contractor billing: registered_count × ₹1,860 — recovered by Anandnimai P from contractor
- Staff billing: deducted from salary via Greythr

### Nightly forecast (auto-send at 9 PM)
- Cron job at 21:00 IST
- Count tomorrow's B/D registered by category: staff, volunteer, labourer, student
- Add estimated free lunch count (based on 30-day rolling average)
- Send WhatsApp to Anandprem P and Hari Guru P via Interakt

### Group registration
- group_size field is mandatory for all visitor registrations
- Each group member's name, age, gender, relation stored in `group_members` table
- Zone 3 upgrade charge = ₹350 × group_size (not per individual payment)
- Max group size from system_config.max_group_size (default 10)

---

## WHATSAPP FLOWS TO IMPLEMENT (13 total)

All via Interakt API. Priority order:

1. **Walk-in Visitor Registration** — send gev-icms.com/register link on WhatsApp inquiry
2. **Pre-Arrival Guest Onboarding** — triggered by eZee webhook on new booking
3. **Paid Day Visit Booking (₹850)** — payment link, QR pass on success
4. **Gate 7 VF Tour Slot Booking** — live slot availability, Razorpay payment
5. **Zone 3 Access Confirmation** — triggered by Razorpay webhook after SBT upgrade
6. **Vendor Day Pass** — HOD approval flow
7. **Construction Worker QR Pass** — HOD approval required
8. **Annakshetra B/D Registration** — for volunteers, interns, new residents
9. **Nightly Meal Forecast** — cron at 9 PM to Anandprem P + Hari Guru P
10. **Festival Pre-Registration** — opens 7 days before festival
11. **VIP Arrival Alert** — auto-alert to Audaryacaitanya P + Jaduthakur P
12. **Departure Feedback** — sent on checkout / exit scan
13. **General Enquiries** — ManyChat handles, routes to human if needed

---

## DATABASE — KEY TABLES TO KNOW

The full schema is in `GEV_Database_Schema_v3_Final.sql`. Key tables:

| Table | Purpose |
|---|---|
| `persons` | Master record for every person on campus |
| `qr_passes` | QR pass issued to each person, has zone_access array |
| `gate_events` | Every scan at every gate — the core audit log |
| `meal_token_events` | Every meal served at Annakshetra |
| `zone_upgrade_payments` | Zone 3 upgrade payment records |
| `group_members` | Individual members within a visitor group |
| `cafe_capacity` | Daily capacity declared by Govinda's manager |
| `system_config` | All tunable parameters (max_group_size, prices, etc.) |
| `audit_log` | Every action by every user — immutable |
| `users` | Admin portal + app logins with RBAC roles |
| `departments` | 46 GEV departments |
| `vf_slot_bookings` | Vrindavan Forest tour slot bookings |
| `contractors` | Contractor company records |

---

## INTEGRATIONS — DETAILS

### eZee Centrix (hotel booking engine)
- GEV uses eZee for all room bookings
- Configure eZee webhook → POST to `/api/ezee/webhook`
- On new booking: create/update `persons` record, create `qr_passes` record, trigger WhatsApp flow 2 (Pre-Arrival Onboarding)
- On checkout: mark QR pass expired, trigger WhatsApp flow 12 (Departure Feedback)

### Greythr HRMS
- GEV uses Greythr for 118 payroll staff
- Daily sync via Greythr API: new employees → create persons record
- Monthly: pull meal deduction data for B/D billing reconciliation
- Employee exits → deactivate person + QR pass

### Razorpay
- Used for: paid day visit (₹850), VF tour slots, Zone 3 upgrade (₹350/person)
- Always verify webhook signature using `RAZORPAY_WEBHOOK_SECRET`
- On payment success: issue QR pass, trigger relevant WhatsApp flow
- Store all payment records in `payments` table

### Interakt (WhatsApp Business API)
- Base URL: `https://api.interakt.ai/v1/public`
- All outbound messages via `POST /message/`
- QR passes sent as images (generate PNG from qrcode library, upload to S3, send image URL)
- Template messages must be pre-approved in Interakt dashboard

---

## SECURITY REQUIREMENTS

1. All API endpoints require JWT except: `/api/auth/login`, `/api/register/visitor`, `/api/payments/webhook`, `/api/whatsapp/webhook`, `/api/ezee/webhook`
2. Webhook endpoints must verify signatures (Razorpay HMAC, eZee secret)
3. Every data-changing action must write to `audit_log` table
4. `audit_log` is INSERT-only — no UPDATE or DELETE ever
5. Role-based access: check user role on every protected endpoint
6. Rate limiting on public endpoints (registration page, payments)
7. HTTPS only in production — Nginx terminates SSL
8. Passwords hashed with bcrypt (min 12 rounds)
9. QR pass tokens must be UUIDs (already in schema as gen_random_uuid())

---

## DEPLOYMENT

```bash
# Server setup (Ubuntu 22.04)
apt update && apt install -y nodejs npm postgresql-15 nginx certbot

# Database
sudo -u postgres psql -c "CREATE DATABASE gev_icms;"
sudo -u postgres psql -c "CREATE USER gev_admin WITH PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE gev_icms TO gev_admin;"
psql -U gev_admin -d gev_icms -f database/schema.sql

# App
npm install
npm run build
pm2 start src/index.js --name gev-icms
pm2 save

# Nginx config for gev-icms.com
# SSL via certbot --nginx -d gev-icms.com
```

---

## WHAT TO BUILD FIRST — PRIORITISED CHECKLIST

**Week 1–2 (Core foundation):**
- [ ] Project setup, folder structure, package.json
- [ ] PostgreSQL schema deployed and verified
- [ ] Auth API (login, JWT, role check middleware)
- [ ] Persons CRUD API
- [ ] QR scan API (`POST /api/qr/scan`) — most critical endpoint
- [ ] Gate events API (log allow/deny)
- [ ] Gate Tablet App connected to real API (replace demo data)

**Week 3–4 (Visitor registration):**
- [ ] Smart Registration Page API
- [ ] Razorpay integration (paid visits + VF slots)
- [ ] QR pass generation (PNG image)
- [ ] Interakt WhatsApp — QR pass delivery
- [ ] eZee webhook handler
- [ ] Zone 3 upgrade flow (SBT Gate)

**Week 5–6 (Meals + Admin):**
- [ ] Annakshetra meal scan API
- [ ] Nightly forecast cron job
- [ ] Contractor billing report API
- [ ] Admin portal API (all tabs)
- [ ] RBAC enforcement on all endpoints
- [ ] Audit trail on all writes

**Week 7–8 (Reports + Polish):**
- [ ] All 17 report types
- [ ] Police report PDF generation
- [ ] Greythr HRMS sync
- [ ] Festival mode toggle
- [ ] WhatsApp all 13 flows
- [ ] Dashboard live data

**Week 9–10 (Testing + Go-live):**
- [ ] Integration testing all flows
- [ ] Pilot — Main Gate first
- [ ] All gates + Canteen App
- [ ] Full go-live

---

## HOW TO USE THE EXISTING HTML FILES

Each HTML file is a standalone prototype with mock data. To connect to backend:

**Gate Tablet App (`GEV_Gate_Tablet_App_v2.html`):**
- The `demoScan()` function simulates a QR scan — replace with real camera scan using `jsQR`
- The `USERS` object is mock login — replace `doLogin()` to call `POST /api/auth/login`
- The `processScan()` function receives scan result — replace with `fetch('POST /api/qr/scan', {qr_code: scannedCode})`

**Smart Registration Page (`GEV_Smart_Registration_Page.html`):**
- VF slot availability — replace with `GET /api/register/vf-slots`
- Café capacity — replace with `GET /api/register/cafe-capacity`
- Form submission — replace with `POST /api/register/visitor`
- Razorpay — replace mock with real Razorpay checkout

**Admin Portal (`GEV_Admin_Portal_v2.html`):**
- All table data is hardcoded mock — replace each section with fetch() to corresponding API
- Login is hardcoded — replace with `POST /api/auth/login` + store JWT in localStorage

**Dashboard (`GEV_Dashboard_Reports.html`):**
- Bar chart data is hardcoded — replace with `GET /api/reports/daily-occupancy`
- All stats cards — replace with live API calls
- Report generation buttons — call `GET /api/reports/:type?format=pdf`

---

## IMPORTANT NOTES FOR CLAUDE CODE

1. **Do not change the database schema.** It has been carefully designed and approved. If you think something is missing, ask Ram Prabhu first.

2. **Do not redesign the frontend UI.** The HTML files are approved designs. Only connect them to the backend.

3. **The system_config table controls all business parameters.** Never hardcode values like ₹350, max_group_size=10, or valid_until=20:00 anywhere in the code. Always read from system_config.

4. **Every write to any table must also write to audit_log.** No exceptions.

5. **QR passes use the UUID from the database as the QR code content.** When a gate tablet scans a QR, it sends that UUID to `POST /api/qr/scan`. The API looks it up and returns the allow/deny response.

6. **The gate_enum in PostgreSQL has exactly 4 values:** `main_gate`, `gate_7`, `sbt_gate`, `exit_gate`. Annakshetra is NOT a gate — it has its own `meal_token_events` table.

7. **WhatsApp messages are sent server-side only** — never from the browser. The frontend calls the backend API, which calls Interakt.

8. **Razorpay webhooks must be verified** using HMAC SHA256 with the webhook secret. Reject any unverified webhook call.

9. **The Annakshetra Canteen App and Gate Tablet App are separate PWAs** installed on different tablets. They share the same backend API but have separate logins and separate functionality.

10. **Festival Mode** is a boolean in system_config. When true: batch entry is enabled at all gates, VF tour slots are paused, registration is set to walk-in only, crowd counting dashboards activate.

---

## FIRST COMMAND TO RUN

After reading all the above and all the reference files, start with:

```bash
mkdir gev-icms && cd gev-icms
npm init -y
npm install express pg knex bcrypt jsonwebtoken dotenv cors helmet express-rate-limit multer qrcode uuid node-cron razorpay axios
mkdir -p src/routes src/controllers src/middleware src/models src/services database frontend
cp /path/to/GEV_Database_Schema_v3_Final.sql database/schema.sql
```

Then build `src/index.js` as the Express app entry point, `src/middleware/auth.js` for JWT verification, and `src/routes/auth.js` for the login endpoint.

Test the login endpoint works before moving to anything else.

**Jai Govardhan! 🙏**

---

*Reference files: GEV_Requirements_v4_FINAL.md · GEV_Database_Schema_v3_Final.sql · GEV_Gate_Tablet_App_v2.html · GEV_Admin_Portal_v2.html · GEV_Annakshetra_Canteen_App.html · GEV_Smart_Registration_Page.html · GEV_Dashboard_Reports.html · GEV_WhatsApp_Flows_v1.html*
