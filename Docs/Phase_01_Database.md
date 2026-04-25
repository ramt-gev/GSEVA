# GEV ICMS — Phase 1 Prompt for Claude Code
## Database Setup Only

---

## WHAT WE ARE DOING IN THIS PHASE

Setting up the PostgreSQL database for the GEV Integrated Campus Management System.
Nothing else. No API. No frontend. Just the database.

By the end of this phase you will have:
- PostgreSQL running locally
- All tables created from the schema
- Seed data inserted (departments, system config, test users)
- Verified every table looks correct

---

## CONTEXT — WHAT THIS SYSTEM IS

Govardhan EcoVillage (GEV) is a large spiritual campus in Wada, Palghar, Maharashtra.
This system manages 700+ people on campus daily — staff, visitors, labourers, guests.
The database is the foundation that all apps will read from and write to.

---

## YOUR TASK

### Step 1: Install PostgreSQL if not already installed

**macOS (development machine — Ram Prabhu)**
```bash
# Install Postgres 15 via Homebrew
brew install postgresql@15

# Start it as a background service (auto-restarts on reboot)
brew services start postgresql@15

# Verify it is running (returns a status line)
brew services info postgresql@15
pg_isready

# Add psql etc. to PATH for this shell if Homebrew didn't link them
export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
```

**Ubuntu (production VPS — for Phase 9 go-live)**
```bash
sudo apt update
sudo apt install -y postgresql-15 postgresql-contrib
sudo service postgresql start
sudo service postgresql status
```

### Step 2: Create the database and user

On macOS, Homebrew installs Postgres as **your** user — there is no `postgres` superuser to `sudo` to. Connect using the default `postgres` database via your own account:

**macOS**
```bash
# Connect as your user (Homebrew creates a database matching $USER on first start)
psql postgres
```

**Ubuntu**
```bash
sudo -u postgres psql
```

Once inside `psql`, run the same commands on either platform:
```sql
CREATE DATABASE gev_icms;
CREATE USER gev_admin WITH PASSWORD 'gev_secure_2026';
GRANT ALL PRIVILEGES ON DATABASE gev_icms TO gev_admin;

-- Postgres 15+: also grant schema privileges so gev_admin can create tables
\c gev_icms
GRANT ALL ON SCHEMA public TO gev_admin;
\q
```

> The extra `GRANT ON SCHEMA public` is only required on Postgres 15+, where the default `public` schema is owned by `pg_database_owner` rather than the connecting user. Without it, `CREATE TABLE` will fail with `permission denied for schema public`.

### Step 3: Deploy the schema

The schema file is `GEV_Database_Schema_v3_Final.sql` (internal v4).
Deploy it exactly as written. Do not modify anything.

```bash
# Run from the directory containing the SQL file
cd /Users/ramshakuntala/develop/GSEVA/Docs
psql -U gev_admin -d gev_icms -h localhost -f GEV_Database_Schema_v3_Final.sql
```

> `-h localhost` forces TCP authentication — without it psql tries Unix-socket auth and Homebrew's default `pg_hba.conf` may not let `gev_admin` connect that way. If it prompts for a password, use `gev_secure_2026`.

If there are errors, read them carefully and fix only the environment issue
(missing extension, wrong Postgres version, etc.) — do not change the schema.
The schema requires `gen_random_uuid()` from the `pgcrypto` extension; it's
built-in to Postgres 13+ as part of `contrib`, so this should "just work"
on both Homebrew Postgres 15 and Ubuntu's `postgresql-contrib` package.

### Step 4: Insert seed data

The schema file already seeds:
- 12 `system_config` rows (including `paid_day_visit_price`, `cafe_daily_capacity`, `nightly_forecast_time`, `bd_monthly_rate`)
- 46 `departments`
- 46 `dept_hods`
- 16 `gac_members`
- 10 `festival_events`

Phase 1 only needs to add **test users**. `system_users` requires a `person_id` (FK to `persons`), so create the person row first, then the user row.

Create a file called `seed.sql` and insert this data:

```sql
-- ------------------------------------------------------------------
-- Test users (Phase 1)
--
-- Each user is a (persons row) + (system_users row) pair, linked by person_id.
-- Password hashes here are placeholders — Phase 2 replaces them with real
-- bcrypt hashes via set-passwords.js. Until then login will fail; that's fine
-- for Phase 1 verification (we only need rows to exist).
-- ------------------------------------------------------------------

-- 1. Persons
INSERT INTO persons (person_id, full_name, mobile, person_type, dept_id, status)
VALUES
  (gen_random_uuid(),
   'Ram Prabhu',         '+919999999999', 'resident_staff',
   (SELECT dept_id FROM departments WHERE dept_code = 'IT_SW'),
   'on_campus'),
  (gen_random_uuid(),
   'Suresh Kumar',       '+919999999998', 'resident_staff',
   (SELECT dept_id FROM departments WHERE dept_code = 'SECUR'),
   'on_campus'),
  (gen_random_uuid(),
   'Anandprem Prabhu',   '+919999999997', 'resident_staff',
   (SELECT dept_id FROM departments WHERE dept_code = 'ANNAK'),
   'on_campus');

-- 2. System users — joined to persons by mobile (a stable natural key for seeding)
INSERT INTO system_users (person_id, username, password_hash, role, module_access, dept_id)
SELECT
  p.person_id,
  'ram.prabhu',
  '$2b$12$placeholder_hash_replace_in_phase_2',
  'super_admin',
  ARRAY['vms','ams','security','festival','reports','vehicles'],
  p.dept_id
FROM persons p WHERE p.mobile = '+919999999999';

INSERT INTO system_users (person_id, username, password_hash, role, module_access, dept_id)
SELECT
  p.person_id,
  'gate.staff',
  '$2b$12$placeholder_hash_replace_in_phase_2',
  'operator',
  ARRAY['vms'],                  -- gate operators access VMS only
  p.dept_id
FROM persons p WHERE p.mobile = '+919999999998';

INSERT INTO system_users (person_id, username, password_hash, role, module_access, dept_id)
SELECT
  p.person_id,
  'anandprem',
  '$2b$12$placeholder_hash_replace_in_phase_2',
  'operator',
  ARRAY['ams'],                  -- canteen operators access AMS only
  p.dept_id
FROM persons p WHERE p.mobile = '+919999999997';
```

Notes:
- The 5-role enum is `super_admin, management, module_admin, dept_manager, operator`. Granularity beyond that (gate vs canteen vs reception) is expressed via `module_access TEXT[]`.
- `system_users.dept_id` is set so a future `dept_manager` would be scoped to one department; `super_admin` rows can have any dept (no restriction is enforced for super_admin in the auth layer).
- We will replace the placeholder hashes in Phase 2 via `node set-passwords.js`. Until then login returns 401 — that's expected.

### Step 5: Apply seed.sql

```bash
cd /Users/ramshakuntala/develop/GSEVA/Docs
psql -U gev_admin -d gev_icms -h localhost -f seed.sql
```

### Step 6: Verify the setup

Run these queries to confirm everything is correct:

```bash
# Connect to the database (macOS — note the -h localhost for TCP auth)
psql -U gev_admin -d gev_icms -h localhost
```

```sql
-- List all tables (should show ~29 tables)
\dt

-- Check key tables have correct columns
\d persons
\d qr_passes
\d gate_events
\d meal_token_events
\d system_config
\d system_users
\d audit_log

-- Check enums were created
\dT

-- Check system_config has the 12 default rows
SELECT config_key, config_value FROM system_config ORDER BY config_key;

-- Check users were created (joined to persons for full_name)
SELECT su.username, su.role, su.module_access, p.full_name
  FROM system_users su
  JOIN persons p ON su.person_id = p.person_id
ORDER BY su.role, su.username;

-- Check all 4 gate enum values exist
SELECT unnest(enum_range(NULL::gate_enum));

-- Check person_type enum has all 16 types
SELECT unnest(enum_range(NULL::person_type_enum));

-- Check role enum has the 5 simplified values
SELECT unnest(enum_range(NULL::system_role_enum));

-- Check 46 departments seeded
SELECT COUNT(*) FROM departments;
```

### Step 7: Create a .env file for database connection

Create `.env` in your project root (this gets copied/used by the Phase 2 backend):

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gev_icms
DB_USER=gev_admin
DB_PASSWORD=gev_secure_2026
```

---

## WHAT YOU SHOULD SEE WHEN DONE

Running `\dt` in psql should show tables including:
- persons, person_stays, person_dependants
- qr_passes, group_members
- gate_events, temp_access_passes
- vf_tour_slots, vf_slot_bookings
- meal_registrations, meal_token_events, free_meal_counts, meal_forecasts, ashram_kitchen_counts
- contractors, contractor_labourers
- system_users, audit_log, role_assignment_log
- departments, dept_hods, gac_members
- system_config, festival_events, vehicles, feedback
- whatsapp_logs, cafe_capacity, zone_upgrade_payments

Running `SELECT config_key, config_value FROM system_config;` should return **12 rows**.

Running the joined system_users query should return **3 rows** (ram.prabhu, gate.staff, anandprem).

---

## DONE WHEN

You can open a psql session and:
1. See ~29 tables with `\dt`
2. See 12 rows in `system_config`
3. See 3 rows joining `system_users` to `persons`
4. See all 4 gate enum values: `main_gate, gate_7, sbt_gate, exit_gate`
5. See all 16 person_type enum values
6. See 5 system_role_enum values: `super_admin, management, module_admin, dept_manager, operator`
7. See 46 rows in `departments`

When all 5 are confirmed — Phase 1 is complete. Move to Phase 2.

---

## DO NOT DO IN THIS PHASE

- Do not install Node.js or write any JavaScript yet
- Do not worry about the API
- Do not worry about the frontend
- Do not modify the schema
- Do not connect any app to the database yet

---

*Next phase: Phase 2 — Backend auth and persons API*
