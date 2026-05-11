# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

Phases 1–3 are complete; Phase 4 (Smart Registration + Razorpay + WhatsApp) is ~80% done. The backend is live in `gev-icms-backend/` with controllers for auth, persons, gate scanning, and visitor registration. The database schema is deployed (`gev_icms` PostgreSQL, user `gev_admin`). Three test users exist in `system_users`.

Phase-by-phase build instructions are in `Docs/Phase_01_Database.md` through `Docs/Phases_06_to_09.md`; they are sequential and must be executed in order. The full project brief is in `Docs/CLAUDE_CODE_STARTER_PROMPT.md`.

## What we are building

GEV ICMS — Integrated Campus Management System for Govardhan EcoVillage (ISKCON, Wada). Five modules sharing one PostgreSQL database and one Node/Express API:

- **Visitor Management (VMS)** — 16 person types, 4 zones, QR-based access
- **Annakshetra Food Management** — meal token + free meal counting
- **Festival/Event Management** — batch entry, crowd dashboards
- **Security & Reporting** — monthly police report, audit trail, RBAC
- **WhatsApp** — 13 flows via Interakt API

Five frontends, all already designed as standalone HTML prototypes in `Docs/`:
`GEV_Gate_Tablet_App_v2.html`, `GEV_Annakshetra_Canteen_App.html`, `GEV_Admin_Portal_v2.html`, `GEV_Smart_Registration_Page.html`, `GEV_Dashboard_Reports.html`. Each uses hardcoded mock data — wiring them to the real API means replacing those mocks, **not redesigning UI**.

## Architecture

```
gev-icms-backend/
  src/
    index.js               ← Express entry; mounts all routes; /api/health
    db.js                  ← pg.Pool (no ORM — raw queries throughout)
    middleware/auth.js     ← requireAuth (JWT verify) + requireRole(...roles)
    middleware/audit.js    ← wraps res.json; inserts audit_log row on 2xx
    routes/                ← thin wrappers: requireAuth → auditLog → controller
    controllers/           ← all SQL lives here
    services/qrService.js  ← QR generation, zone mapping (getZoneAccess)
    services/whatsappService.js  ← Interakt calls (server-side only)

frontend/                  ← one folder per HTML prototype (not yet populated)
database/schema.sql        ← copy of Docs/GEV_Database_Schema_v3_Final.sql
```

**Implemented endpoints (Phases 1–4):**

| Route | Auth | Purpose |
|---|---|---|
| `POST /api/auth/login` | public | JWT token |
| `GET /api/auth/me` | JWT | current user |
| `GET/POST/PUT /api/persons` | JWT | persons CRUD |
| `POST /api/gate/scan` | JWT | QR scan → allow/deny |
| `GET /api/gate/stats` | JWT | today's gate counts |
| `POST /api/gate/batch` | JWT | festival batch entry |
| `POST /api/gate/override` | JWT + role | manual override |
| `GET /api/gate/image/:qr_id` | public | QR PNG |
| `POST /api/register/visitor` | public | full visitor reg flow |
| `POST /api/register/payment/create` | public | Razorpay order |
| `POST /api/register/payment/webhook` | public | Razorpay webhook |
| `GET /api/register/public-config` | public | visitor-facing config (prices, group size) |
| `GET /api/register/vf-slots` | public | visitor farm tour slots |
| `GET /api/register/cafe-capacity` | public | Govindas availability |
| `GET /api/reports/hourly` | JWT | hourly gate counts (bar chart) |
| `GET /api/reports/occupancy` | JWT | daily campus occupancy |
| `GET /api/reports/gate` | JWT | gate event log |
| `GET /api/reports/meals` | JWT | meal consumption report |
| `GET /api/reports/police` | JWT + role | monthly police report (JSON or PDF) |
| `POST /api/whatsapp/webhook` | public | Interakt inbound message handler |

**JWT payload** includes `user_id`, `role`, `module_access[]` — available as `req.user` after `requireAuth`.

**Audit middleware** (`auditLog(action, module, tableName)`) wraps `res.json` and fires on 2xx. Public-path writes set `user_id = NULL`.

## Schema status

`Docs/GEV_Database_Schema_v3_Final.sql` is at **internal v4** (filename kept v3 for doc continuity). It fixed ~30 issues reviewed 2026-04-25 — broken FKs, a NOT NULL on `meal_token_events.reg_id` blocking free meals, role-enum drift, hardcoded `₹1860` in a view, immutability-by-comment-only on `audit_log`. Every fix is coded B1–B7, I1–I15 in the file header.

Schema modifications should go through Ram Prabhu but are no longer blocked. The file deploys as-is.

## Critical invariants

These are non-negotiable and apply across every phase:

1. **Do not redesign the HTML prototypes.** Connect them to the API; don't rework layouts/flows.
2. **Never hardcode business values.** Prices (₹350, ₹850, ₹1860), `max_group_size`, `day_pass_valid_until=20:00`, `festival_mode_active`, `bd_monthly_rate`, etc. all live in the `system_config` table — read via `(SELECT config_value FROM system_config WHERE config_key = '...')`. The schema seeds 12 keys; views like `monthly_billing_summary` already read from it.
3. **Every write to any table must also write to `audit_log`.** `audit_log` has DB-level UPDATE/DELETE rules that turn those into no-ops — relying on application code alone is insufficient. Audit columns are `(user_id, person_id, action, module, table_name, record_id, old_value, new_value, ip_address, device_id, notes, created_at)`. **Public-path writes** (Smart Registration, Razorpay/eZee/WhatsApp webhooks, Greythr cron) write rows with `user_id = NULL` — the schema allows it. Use `module` to capture the source: `public_registration`, `webhook_razorpay`, `webhook_ezee`, `webhook_whatsapp`, `cron_greythr`, `cron_forecast`.
4. **QR pass content is the `qr_passes.qr_id` UUID** (`gen_random_uuid()`). v4 dropped the redundant `qr_code TEXT` column — the gate tablet sends `qr_id::text` to `POST /api/gate/scan` and the API resolves allow/deny.
5. **`qr_passes.zone_access` is a JSONB array**: `["zone1","zone2","zone3"]`. A CHECK constraint enforces array shape. Always `JSON.stringify` before INSERT.
6. **`gate_enum` has exactly 4 values:** `main_gate`, `gate_7`, `sbt_gate`, `exit_gate`. Annakshetra is **not** a gate — meals go to `meal_token_events`, not `gate_events`.
7. **`meal_type_enum` ≠ `cafe_meal_type_enum`.** Annakshetra uses `meal_type_enum` (8 values, including `'free_lunch'`). Paid Govindas/Dhanvantari cafés use `cafe_meal_type_enum` (`'breakfast' / 'lunch' / 'dinner'`). Don't cross them.
8. **`persons` has no `is_active` flag** — use the `status` enum (`pre_registered`, `on_campus`, `departed`, `suspended`, `archived`). Other tables (`qr_passes`, `meal_registrations`, `system_users`) keep `is_active`.
9. **`persons.mobile` is partial-unique** — only enforced for non-`staff_dependant` rows, so family members can share a number with the staff they depend on.
10. **Group registration fields live on `qr_passes`, not `persons`.** `qr_passes.group_size` is the count; `group_members` rows hold individual member details (FK is `leader_qr_id` → `qr_passes(qr_id)`).
11. **WhatsApp is server-side only.** Browsers never call Interakt directly.
12. **Webhook endpoints must verify signatures** (Razorpay HMAC-SHA256 with `RAZORPAY_WEBHOOK_SECRET`, eZee shared secret). Reject unverified.
13. **Public/unauthenticated endpoints are exactly:** `/api/auth/login`, `/api/register/visitor`, `/api/payments/webhook`, `/api/whatsapp/webhook`, `/api/ezee/webhook`. Everything else requires JWT.

## Zone access rules (encode once, in `qrService.getZoneAccess` + scan logic)

- **Zone 1** (Main Gate) — open to everyone, no QR needed
- **Zone 2** (Gate 7) — QR required: room_guest, paid_day_visitor, course_student, volunteer_seva, staff, labourers, approved vendors
- **Zone 3** (SBT Gate) — QR required: room_guest, course_student, volunteer_seva, resident_staff, varishtha_vaishnava, brahmachari. Day visitors must pay ₹350/person upgrade (Razorpay flow → webhook → extend `qr_passes.zone_access`).
- **Zone 4** (Payal Bhavan) — residents only: brahmachari, varishtha_vaishnava, resident_staff

The 16-type → zone mapping is enumerated in `Docs/Phase_03_Gate_App_Live.md` (`getZoneAccess`). Use that table as the source of truth.

## Roles (RBAC)

Five roles in `system_users.role` (enum `system_role_enum`): `super_admin`, `management`, `module_admin`, `dept_manager`, `operator`. Granularity beyond that lives in `system_users.module_access TEXT[]` — e.g. a gate operator is `role='operator', module_access=['vms']` and a canteen operator is `role='operator', module_access=['ams']`. Use `requireRole(...)` middleware to gate by role and `requireModule(...)` (Phase 3+) for module checks.

`system_users.person_id` is required — every login is backed by a `persons` row. Login queries join the two.

## Build order

Phases 1 → 9 are sequential. Don't jump ahead — each phase doc has an explicit "DO NOT DO IN THIS PHASE" list.

| Phase | Status | Adds |
|---|---|---|
| 1 | ✅ Done | PostgreSQL + schema deploy + seed `system_config` + 3 test users |
| 2 | ✅ Done | Auth (JWT) + Persons CRUD + audit middleware |
| 3 | ✅ Done | QR scan API + gate events + Gate Tablet App wiring |
| 4 | ✅ Done | Smart Registration + Razorpay + Interakt WhatsApp + eZee webhook + Zone 3 upgrade |
| 5 | ✅ Done | Annakshetra meal scan + nightly forecast cron + contractor billing |
| 6 | ✅ Done | Admin Portal backend + RBAC enforcement |
| 7 | ✅ Done | eZee Centrix + Greythr HRMS integrations |
| 8 | ✅ Done | Reports API (17 types) + police report PDF + Dashboard live data |
| 9 | ✅ Done | Smart Registration wired + health monitoring + WhatsApp webhook + PM2/Nginx deploy configs |

## Common commands

```bash
# Backend dev
cd gev-icms-backend
npm install
npm run dev                 # nodemon src/index.js (hot reload)
npm start                   # node src/index.js (production)
node set-passwords.js       # one-shot: replace placeholder bcrypt hashes in seed users

# Database (if redeploying schema)
psql -U gev_admin -d gev_icms -f Docs/GEV_Database_Schema_v3_Final.sql
psql -U gev_admin -d gev_icms -f Docs/seed.sql

# Sanity checks
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ram.prabhu","password":"admin123"}'
```

Verification is curl-based, as documented in each phase's "DONE WHEN" checklist. No test framework yet.

## Integrations — keys and base URLs

All credentials go in `gev-icms-backend/.env` (template in `Docs/CLAUDE_CODE_STARTER_PROMPT.md`). Key external systems:

- **Razorpay** — paid day visit (₹850), VF tour slots, Zone 3 upgrade. Always verify webhook HMAC.
- **Interakt** — `https://api.interakt.ai/v1/public/message/`. Templates must be pre-approved. QR passes go as image URLs (generate PNG via `qrcode`, upload to S3).
- **eZee Centrix** — hotel booking source of truth. Webhook creates `persons` + `qr_passes` and triggers WhatsApp flow 2.
- **Greythr** — HRMS for 118 payroll staff. Daily sync seeds `persons`; monthly pull reconciles B/D meal billing.

## People you'll see referenced

- **Ram Prabhu** (IT Software Head) — day-to-day contact, super_admin
- **Vasudev Prabhuji** (GAC 3) — final project authority
- **Sri Gaurcaran P** (GAC 4) — IT Director
- **Anandprem P / Hari Guru P** — Annakshetra; receive nightly meal forecast WhatsApp at 21:00 IST
- **Anandnimai P** — recovers contractor B/D billing
