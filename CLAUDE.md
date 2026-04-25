# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository state

This repo currently contains **only specifications** under `Docs/` — no application code, no `package.json`, no database, not a git repo. The implementation has not started. Treat the docs as the contract and build outward from them.

The full project brief lives in `Docs/CLAUDE_CODE_STARTER_PROMPT.md` — read it before starting implementation work. Phase-by-phase build instructions are in `Docs/Phase_01_Database.md` through `Docs/Phases_06_to_09.md`; they are sequential and the user expects them executed in order.

## What we are building

GEV ICMS — Integrated Campus Management System for Govardhan EcoVillage (ISKCON, Wada). Five modules sharing one PostgreSQL database and one Node/Express API:

- **Visitor Management (VMS)** — 16 person types, 4 zones, QR-based access
- **Annakshetra Food Management** — meal token + free meal counting
- **Festival/Event Management** — batch entry, crowd dashboards
- **Security & Reporting** — monthly police report, audit trail, RBAC
- **WhatsApp** — 13 flows via Interakt API

Five frontends, all already designed as standalone HTML prototypes in `Docs/`:
`GEV_Gate_Tablet_App_v2.html`, `GEV_Annakshetra_Canteen_App.html`, `GEV_Admin_Portal_v2.html`, `GEV_Smart_Registration_Page.html`, `GEV_Dashboard_Reports.html`. Each uses hardcoded mock data — wiring them to the real API means replacing those mocks, **not redesigning UI**.

## Planned architecture

```
gev-icms-backend/          ← Node.js + Express, single API for all clients
  src/
    index.js               ← app entry
    db.js                  ← pg Pool (no ORM in early phases)
    middleware/auth.js     ← JWT verify + requireRole(...roles)
    middleware/audit.js    ← wraps res.json to write audit_log on 2xx
    routes/                ← thin: requireAuth → audit → controller
    controllers/           ← all SQL lives here (raw pg queries)
    services/              ← qrService, whatsappService, razorpayService

frontend/                  ← one folder per HTML prototype, served as PWAs
database/schema.sql        ← copy of Docs/GEV_Database_Schema_v3_Final.sql
```

Two of the frontends (Gate Tablet App, Canteen App) are PWAs running on physical tablets — they share the API but have separate logins and separate functionality.

## Schema status

`Docs/GEV_Database_Schema_v3_Final.sql` is at **internal v4** (the file name is kept v3 for doc continuity). v3 was reviewed 2026-04-25 and rewritten to fix ~30 issues — broken FKs that wouldn't deploy, a NOT NULL on `meal_token_events.reg_id` that blocked free meals, role-enum drift, hardcoded `₹1860` in a view, immutability-by-comment-only on `audit_log`, etc. The header of the SQL file lists every fix with codes (B1–B7, I1–I15) traceable to the review report.

Schema modifications going forward should still go through Ram Prabhu — but it is no longer a hard "do not touch" rule. The file is meant to be deployed as-is.

## Critical invariants

These are non-negotiable and apply across every phase:

1. **Do not redesign the HTML prototypes.** Connect them to the API; don't rework layouts/flows.
2. **Never hardcode business values.** Prices (₹350, ₹850, ₹1860), `max_group_size`, `day_pass_valid_until=20:00`, `festival_mode_active`, `bd_monthly_rate`, etc. all live in the `system_config` table — read via `(SELECT config_value FROM system_config WHERE config_key = '...')`. The schema seeds 12 keys; views like `monthly_billing_summary` already read from it.
3. **Every write to any table must also write to `audit_log`.** `audit_log` has DB-level UPDATE/DELETE rules that turn those into no-ops — relying on application code alone is insufficient. Audit columns are `(user_id, person_id, action, module, table_name, record_id, old_value, new_value, ip_address, device_id, notes, created_at)`. **Public-path writes** (Smart Registration, Razorpay/eZee/WhatsApp webhooks, Greythr cron) write rows with `user_id = NULL` — the schema allows it. Use `module` to capture the source: `public_registration`, `webhook_razorpay`, `webhook_ezee`, `webhook_whatsapp`, `cron_greythr`, `cron_forecast`.
4. **QR pass content is the `qr_passes.qr_id` UUID** (`gen_random_uuid()`). v4 dropped the redundant `qr_code TEXT` column — the gate tablet sends `qr_id::text` to `POST /api/qr/scan` and the API resolves allow/deny.
5. **`qr_passes.zone_access` is a JSONB array**: `["zone1","zone2","zone3"]`. A CHECK constraint enforces array shape. (v3 used an object; v4 standardises on the array form Phase 3 already produces.)
6. **`gate_enum` has exactly 4 values:** `main_gate`, `gate_7`, `sbt_gate`, `exit_gate`. Annakshetra is **not** a gate — meals go to `meal_token_events`, not `gate_events`.
7. **`meal_type_enum` ≠ `cafe_meal_type_enum`.** Annakshetra uses `meal_type_enum` (8 values, including `'free_lunch'`). Paid Govindas/Dhanvantari cafés use `cafe_meal_type_enum` (`'breakfast' / 'lunch' / 'dinner'`). Don't cross them — `'lunch'` and `'free_lunch'` are different domains.
8. **`persons` has no `is_active` flag** — use the `status` enum (`pre_registered`, `on_campus`, `departed`, `suspended`, `archived`). Other tables (`qr_passes`, `meal_registrations`, `system_users`) keep `is_active` because it means something different there.
9. **`persons.mobile` is partial-unique** — only enforced for non-`staff_dependant` rows, so family members can share a WhatsApp number with the staff they depend on.
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

`system_users.person_id` is required — every login is backed by a `persons` row carrying the human details (`full_name`, `mobile`). Login queries join the two.

## Build order (the user enforces this)

Phases 1 → 9 are sequential. Don't jump ahead — the user has explicit "DO NOT DO IN THIS PHASE" lists at the bottom of each phase doc. Current phase: **Phase 1 (database)** has not yet been executed.

| Phase | Adds |
|---|---|
| 1 | PostgreSQL + schema deploy + seed `system_config` (10 rows) and 3 test users |
| 2 | Auth (JWT) + Persons CRUD + audit middleware |
| 3 | QR scan API + gate events + Gate Tablet App wired to real backend |
| 4 | Smart Registration + Razorpay + Interakt WhatsApp + eZee webhook + Zone 3 upgrade |
| 5 | Annakshetra meal scan + nightly forecast cron + contractor billing |
| 6–9 | Reports, Greythr sync, festival mode, dashboard, all 13 WhatsApp flows, go-live |

## Common commands (post Phase 1–2 setup)

```bash
# Database (Phase 1)
sudo -u postgres psql -c "CREATE DATABASE gev_icms;"
psql -U gev_admin -d gev_icms -f database/schema.sql
psql -U gev_admin -d gev_icms -f database/seed.sql

# Backend (Phase 2+)
cd gev-icms-backend
npm install
npm run dev                 # nodemon src/index.js
npm start                   # node src/index.js (production)
node set-passwords.js       # one-shot: replace placeholder bcrypt hashes

# Sanity checks
curl http://localhost:3000/api/health
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"ram.prabhu","password":"admin123"}'
```

There is no test framework specified yet. Verification in early phases is curl-based, as documented in each phase's "DONE WHEN" checklist.

## Integrations — keys and base URLs

All credentials go in `.env` (template in `Docs/CLAUDE_CODE_STARTER_PROMPT.md`). Key external systems already in use at GEV:

- **Razorpay** — paid day visit (₹850), VF tour slots, Zone 3 upgrade. Always verify webhook HMAC.
- **Interakt** — `https://api.interakt.ai/v1/public/message/`. Templates must be pre-approved in their dashboard. QR passes go as image URLs (generate PNG via `qrcode`, upload to S3).
- **eZee Centrix** — hotel booking source of truth. Webhook creates `persons` + `qr_passes` and triggers WhatsApp flow 2.
- **Greythr** — HRMS for 118 payroll staff. Daily sync seeds `persons`; monthly pull reconciles B/D meal billing.

## People you'll see referenced

- **Ram Prabhu** (IT Software Head) — your day-to-day point of contact, super_admin
- **Vasudev Prabhuji** (GAC 3) — final project authority
- **Sri Gaurcaran P** (GAC 4) — IT Director
- **Anandprem P / Hari Guru P** — Annakshetra; receive nightly meal forecast WhatsApp at 21:00 IST
- **Anandnimai P** — recovers contractor B/D billing
