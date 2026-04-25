-- ============================================================
-- GEV INTEGRATED CAMPUS MANAGEMENT SYSTEM
-- Database Schema — Version 4 (April 2026)
-- PostgreSQL 15+
--
-- File name retained as v3_Final.sql for compatibility with Phase docs.
-- Internal version: 4 (incorporates all v3 review fixes).
--
-- v4 changes (review fixes — see Docs/Phase_01_Database.md for context):
--
--   Blockers
--   B1  group_members + zone_upgrade_payments now reference qr_passes(qr_id)
--       (the column was misnamed pass_id in v3 — schema would not deploy)
--   B2  meal_token_events.reg_id is nullable — free meals have no registration
--   B3  system_users requires person_id; Phase 1 seed creates persons first
--   B4  Roles unified to 5 (super_admin, management, module_admin,
--       dept_manager, operator) — module specialisation goes in module_access[]
--   B5  system_config column names: config_key, config_value, config_type
--   B7  audit_log canonical columns: record_id, table_name (Phase 2 doc updated)
--
--   Inconsistencies
--   I1  zone_access uses JSONB array form: ["zone1","zone2"]
--   I2  cafe_meal_type_enum for paid cafés (separate from meal_type_enum
--       which uses 'free_lunch' for the Annakshetra free meal)
--   I3  temp_access_passes.zone uses zone_enum
--   I4  gate_events.event_type uses gate_event_type_enum
--   I5  meal_registrations: CHECK breakfast/dinner only; partial unique on is_active
--   I6  free_meal_counts.meal_slot CHECK restricts to free meal types
--   I7  monthly_billing_summary reads bd_monthly_rate from system_config
--   I8  cafe_capacity.cafe_code FK → departments(dept_code)
--   I9  persons: dropped is_active (status enum is the single source of truth)
--   I10 persons.mobile: partial unique excluding staff_dependant rows
--   I11 Triggers keep vf_tour_slots.booked_count and cafe_capacity.booked_count
--       in sync with their child tables
--   I12 audit_log immutability enforced via UPDATE/DELETE rules
--   I13 dept_hods.dept_code NOT NULL UNIQUE
--   I15 meal_forecasts.meal_slot CHECK ensures BD breakdown only on B/D rows
--
--   Smaller fixes
--   - Dropped redundant qr_passes.qr_code (use qr_id::text as the QR payload)
--   - Added qr_passes.group_size
--   - festival_events UNIQUE(festival_name, festival_date)
--   - zone_upgrade_payments CHECK persons_count > 0
--   - departments.dept_code NOT NULL
--   - system_users.updated_at trigger added
--   - Added FK indexes on persons.dept_id, persons.host_person_id,
--     qr_passes.stay_id, meal_registrations.dept_sponsor_id, etc.
--   - Added system_config keys referenced by Phase docs:
--     paid_day_visit_price, cafe_daily_capacity, nightly_forecast_time,
--     bd_monthly_rate
--
--   v4 self-review fixes (after first v4 pass)
--   N1  Dropped cafe_capacity CHECK (booked_count <= threshold). The
--       recount trigger writes booked_count from authoritative source after
--       a payment commits — a CHECK violation there would roll back the
--       payment row, losing a successful Razorpay charge.
--   N2  Added zone_upgrade_payments.meal_date (NOT NULL DEFAULT today).
--       Recount trigger now groups by meal_date so pre-paid bookings
--       (Smart Registration Page) hit the correct cafe_capacity row.
--   N3  qr_passes.zone_access CHECK now also enforces zone-membership
--       (subset of ["zone1","zone2","zone3","zone4"]), not just array shape.
--   N4  festival_events seed ON CONFLICT now names target columns
--       (festival_name, festival_date) instead of swallowing all violations.
--   N5  meal_scan_gap_report.STRING_AGG has ORDER BY for stable output.
-- ============================================================


-- ============================================================
-- STEP 1: ENUMS
-- ============================================================

-- 16 visitor/person types
CREATE TYPE person_type_enum AS ENUM (
  'room_guest',
  'free_day_visitor',
  'paid_day_visitor',
  'course_student',
  'volunteer_seva',
  'sustainability_intern',
  'resident_staff',
  'staff_dependant',
  'brahmachari',
  'varishtha_vaishnava',
  'weekly_labourer_local',
  'weekly_labourer_outstation',
  'construction_labourer',
  'vendor_supplier',
  'corporate_tour_group',
  'vip_dignitary'
);

CREATE TYPE gender_enum AS ENUM ('male', 'female', 'other', 'not_specified');

CREATE TYPE id_proof_enum AS ENUM (
  'aadhaar', 'passport', 'driving_licence',
  'voter_id', 'pan_card', 'other'
);

CREATE TYPE person_status_enum AS ENUM (
  'pre_registered',
  'on_campus',
  'departed',
  'suspended',
  'archived'
);

CREATE TYPE zone_enum AS ENUM ('zone1', 'zone2', 'zone3', 'zone4');

CREATE TYPE gate_enum AS ENUM (
  'main_gate',
  'gate_7',
  'sbt_gate',
  'exit_gate'
);

-- (I4) gate_events.event_type — was free-form TEXT in v3
CREATE TYPE gate_event_type_enum AS ENUM ('entry', 'exit');

CREATE TYPE gate_result_enum AS ENUM ('allowed', 'denied', 'manual_override');

CREATE TYPE pass_type_enum AS ENUM (
  'permanent',
  'stay_pass',
  'day_pass',
  'festival_pass',
  'temp_cafe_pass',
  'tour_pass'
);

-- Annakshetra meal slots (8 values: B/D billed, free_lunch + khichadi free, ashram fixed)
CREATE TYPE meal_type_enum AS ENUM (
  'breakfast',
  'free_lunch',
  'dinner',
  'khichadi_am',
  'khichadi_pm',
  'ashram_breakfast',
  'ashram_brunch',
  'ashram_dinner'
);

-- (I2) Café meal types — paid Govindas/Dhanvantari cafés use 'lunch', not 'free_lunch'
CREATE TYPE cafe_meal_type_enum AS ENUM ('breakfast', 'lunch', 'dinner');

CREATE TYPE meal_payment_enum AS ENUM (
  'salary_deduction',
  'dept_sponsored',
  'free_welfare',
  'ashram_covered',
  'rent_included',
  'self_paid'
);

CREATE TYPE contract_type_enum AS ENUM (
  'construction', 'maintenance', 'landscaping',
  'electrical', 'housekeeping', 'other'
);

CREATE TYPE camp_location_enum AS ENUM (
  'camp_a_inside',
  'camp_b_outside',
  'not_staying'
);

CREATE TYPE approval_status_enum AS ENUM (
  'pending', 'approved', 'rejected', 'deactivated'
);

-- (B4) Five-role RBAC. Module specialisation goes in system_users.module_access[].
-- Replaces v3's two competing role enums (system_role_enum, rbac_role_enum).
CREATE TYPE system_role_enum AS ENUM (
  'super_admin',     -- full access
  'management',      -- view all, approve strategic items
  'module_admin',    -- full access within module(s) named in module_access
  'dept_manager',    -- HOD level — own department only
  'operator'         -- gate / canteen / reception / contractor portal — narrowest
);

CREATE TYPE whatsapp_status_enum AS ENUM ('sent', 'delivered', 'read', 'failed');

CREATE TYPE tour_type_enum AS ENUM ('free', 'paid');

CREATE TYPE relation_enum AS ENUM (
  'spouse', 'son', 'daughter', 'father',
  'mother', 'sibling', 'other'
);


-- ============================================================
-- STEP 2: CORE IDENTITY TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: departments
-- ------------------------------------------------------------
CREATE TABLE departments (
  dept_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_name       TEXT NOT NULL,
  dept_code       TEXT UNIQUE NOT NULL,            -- (small fix) was nullable in v3
  dept_head_id    UUID,                            -- → persons.person_id (set after persons exist)
  parent_dept_id  UUID REFERENCES departments(dept_id),
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMP DEFAULT NOW()
);


-- ------------------------------------------------------------
-- TABLE: persons
-- (I9) Dropped is_active — use status enum
-- (I10) mobile partial-unique below excludes staff_dependant
-- ------------------------------------------------------------
CREATE TABLE persons (
  person_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  mobile              TEXT NOT NULL,           -- WhatsApp number (UNIQUE handled by partial index below)
  gender              gender_enum DEFAULT 'not_specified',
  date_of_birth       DATE,
  photo_url           TEXT,

  -- Classification
  person_type         person_type_enum NOT NULL,
  person_subtype      TEXT,
  dept_id             UUID REFERENCES departments(dept_id),
  sub_dept            TEXT,

  -- ID proof
  id_proof_type       id_proof_enum,
  id_proof_number     TEXT,
  id_proof_image_url  TEXT,

  -- Address
  perm_address        TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,

  -- Campus details
  campus_location     TEXT,
  accommodation_block TEXT,
  room_number         TEXT,

  -- External system IDs
  greythr_id          TEXT UNIQUE,
  essl_id             TEXT UNIQUE,
  ezee_guest_id       TEXT,

  -- Host (for day-scholars staying with staff)
  host_person_id      UUID REFERENCES persons(person_id),

  -- Status — single source of truth
  status              person_status_enum DEFAULT 'pre_registered',

  -- Metadata
  registered_by       UUID,                    -- system_users.user_id (FK added later)
  registration_source TEXT,
  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- (I10) Mobile is unique except for staff_dependant rows that share a family number
CREATE UNIQUE INDEX idx_persons_mobile_unique
  ON persons(mobile)
  WHERE person_type <> 'staff_dependant';

CREATE INDEX idx_persons_mobile      ON persons(mobile);
CREATE INDEX idx_persons_type        ON persons(person_type);
CREATE INDEX idx_persons_status      ON persons(status);
CREATE INDEX idx_persons_greythr     ON persons(greythr_id);
CREATE INDEX idx_persons_dept        ON persons(dept_id);                -- (small fix) FK index
CREATE INDEX idx_persons_host        ON persons(host_person_id);         -- (small fix) FK index


-- ------------------------------------------------------------
-- TABLE: person_stays
-- ------------------------------------------------------------
CREATE TABLE person_stays (
  stay_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES persons(person_id),

  stay_type         TEXT,
  purpose           TEXT,
  check_in_date     DATE,
  check_out_date    DATE,
  actual_check_in   TIMESTAMP,
  actual_check_out  TIMESTAMP,
  is_overnight      BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,

  accommodation_block TEXT,
  room_number         TEXT,
  key_issued          BOOLEAN DEFAULT FALSE,
  key_returned        BOOLEAN DEFAULT FALSE,
  key_returned_at     TIMESTAMP,
  key_returned_to     TEXT,

  ezee_reservation_id TEXT,
  booking_source      TEXT,

  notes             TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_stays_person ON person_stays(person_id);
CREATE INDEX idx_stays_dates  ON person_stays(check_in_date, check_out_date);
CREATE INDEX idx_stays_active ON person_stays(is_active);


-- ------------------------------------------------------------
-- TABLE: person_dependants
-- ------------------------------------------------------------
CREATE TABLE person_dependants (
  dependant_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_person_id     UUID NOT NULL REFERENCES persons(person_id),
  dependant_person_id UUID NOT NULL REFERENCES persons(person_id),
  relation            relation_enum NOT NULL,
  created_at          TIMESTAMP DEFAULT NOW(),

  UNIQUE(staff_person_id, dependant_person_id)
);


-- ------------------------------------------------------------
-- TABLE: qr_passes
-- (Small fix) Dropped redundant qr_code — use qr_id::text as QR payload
-- (Small fix) Added group_size for group registrations
-- (I1) zone_access default is JSONB array form
-- ------------------------------------------------------------
CREATE TABLE qr_passes (
  qr_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID NOT NULL REFERENCES persons(person_id),
  stay_id       UUID REFERENCES person_stays(stay_id),

  pass_type     pass_type_enum NOT NULL,

  valid_from    TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until   TIMESTAMP,
  is_active     BOOLEAN DEFAULT TRUE,

  -- (I1) Array form: e.g. ["zone1","zone2","zone3"]
  -- (N3) CHECK validates both shape AND that every element is a real zone
  zone_access   JSONB NOT NULL DEFAULT '["zone1"]'::jsonb,
  CONSTRAINT zone_access_valid CHECK (
    jsonb_typeof(zone_access) = 'array'
    AND zone_access <@ '["zone1","zone2","zone3","zone4"]'::jsonb
  ),

  -- Group registration leader: this QR represents a group of size N
  group_size    INTEGER NOT NULL DEFAULT 1 CHECK (group_size >= 1),

  programme_details JSONB,

  issued_by     UUID,
  issued_at     TIMESTAMP DEFAULT NOW(),
  deactivated_at TIMESTAMP,
  deactivation_reason TEXT
);

CREATE INDEX idx_qr_person  ON qr_passes(person_id);
CREATE INDEX idx_qr_active  ON qr_passes(is_active);
CREATE INDEX idx_qr_stay    ON qr_passes(stay_id);     -- (small fix) FK index


-- ============================================================
-- STEP 3: ACCESS CONTROL & GATE TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: gate_events
-- (I4) event_type uses enum
-- ------------------------------------------------------------
CREATE TABLE gate_events (
  event_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID REFERENCES persons(person_id),
  qr_id         UUID REFERENCES qr_passes(qr_id),

  gate          gate_enum NOT NULL,
  event_type    gate_event_type_enum NOT NULL,
  result        gate_result_enum NOT NULL,
  deny_reason   TEXT,

  is_batch_count BOOLEAN DEFAULT FALSE,
  batch_count    INTEGER,

  scanned_by    UUID,
  scanned_at    TIMESTAMP DEFAULT NOW(),

  device_id     TEXT,
  is_offline_sync BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_gate_events_person ON gate_events(person_id);
CREATE INDEX idx_gate_events_qr     ON gate_events(qr_id);   -- (small fix) FK index
CREATE INDEX idx_gate_events_time   ON gate_events(scanned_at);
CREATE INDEX idx_gate_events_gate   ON gate_events(gate);


-- ------------------------------------------------------------
-- TABLE: temp_access_passes
-- (I3) zone uses zone_enum
-- ------------------------------------------------------------
CREATE TABLE temp_access_passes (
  pass_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID NOT NULL REFERENCES persons(person_id),

  zone          zone_enum NOT NULL DEFAULT 'zone3',
  purpose       TEXT,
  cafe_name     TEXT,
  meal_type     cafe_meal_type_enum,            -- (I2) café meal type, not Annakshetra

  amount_paid   DECIMAL(10,2),
  payment_mode  TEXT,

  valid_from    TIMESTAMP NOT NULL DEFAULT NOW(),
  valid_until   TIMESTAMP NOT NULL,
  is_used       BOOLEAN DEFAULT FALSE,

  issued_by     UUID,
  issued_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_temp_pass_person ON temp_access_passes(person_id);


-- ------------------------------------------------------------
-- TABLE: vf_tour_slots
-- ------------------------------------------------------------
CREATE TABLE vf_tour_slots (
  slot_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_date     DATE NOT NULL,
  slot_time     TIME NOT NULL,
  capacity      INTEGER DEFAULT 30,
  booked_count  INTEGER DEFAULT 0,
  tour_type     tour_type_enum DEFAULT 'free',

  created_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(tour_date, slot_time, tour_type),
  CHECK (booked_count >= 0 AND booked_count <= capacity)
);


-- ------------------------------------------------------------
-- TABLE: vf_slot_bookings
-- ------------------------------------------------------------
CREATE TABLE vf_slot_bookings (
  booking_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id       UUID NOT NULL REFERENCES vf_tour_slots(slot_id),
  person_id     UUID NOT NULL REFERENCES persons(person_id),
  booked_at     TIMESTAMP DEFAULT NOW(),
  status        TEXT NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed','cancelled','no_show'))
);

CREATE INDEX idx_vf_bookings_slot   ON vf_slot_bookings(slot_id);
CREATE INDEX idx_vf_bookings_person ON vf_slot_bookings(person_id);


-- ============================================================
-- STEP 4: ANNAKSHETRA & FOOD TABLES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: meal_registrations
-- (I5) CHECK breakfast/dinner only; partial unique on is_active
-- (I6) Note: free meals are tracked in meal_token_events (no row needed here)
-- ------------------------------------------------------------
CREATE TABLE meal_registrations (
  reg_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES persons(person_id),

  meal_type         meal_type_enum NOT NULL
                    CHECK (meal_type IN ('breakfast', 'dinner')),
  payment_method    meal_payment_enum NOT NULL,

  dept_sponsor_id   UUID REFERENCES departments(dept_id),
  contractor_id     UUID,                             -- FK added after contractors table

  valid_from        DATE NOT NULL,
  valid_until       DATE,
  is_active         BOOLEAN DEFAULT TRUE,

  monthly_amount    DECIMAL(10,2),

  registered_by     UUID,
  created_at        TIMESTAMP DEFAULT NOW()
);

-- (I5) Partial unique: only one active registration per person per meal type
CREATE UNIQUE INDEX idx_meal_reg_active_unique
  ON meal_registrations(person_id, meal_type)
  WHERE is_active = TRUE;

CREATE INDEX idx_meal_reg_person       ON meal_registrations(person_id);
CREATE INDEX idx_meal_reg_active       ON meal_registrations(is_active);
CREATE INDEX idx_meal_reg_dept_sponsor ON meal_registrations(dept_sponsor_id); -- (small fix) FK index


-- ------------------------------------------------------------
-- TABLE: meal_token_events
-- (B2) reg_id nullable: free meals (free_lunch, khichadi_*, ashram_*) have no registration
-- ------------------------------------------------------------
CREATE TABLE meal_token_events (
  token_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     UUID NOT NULL REFERENCES persons(person_id),
  reg_id        UUID REFERENCES meal_registrations(reg_id),  -- NULL for free meals

  meal_type     meal_type_enum NOT NULL,
  meal_date     DATE NOT NULL DEFAULT CURRENT_DATE,

  served_at     TIMESTAMP DEFAULT NOW(),
  served_by     UUID,

  -- Prevent double serving of the same meal slot to the same person same day
  UNIQUE(person_id, meal_type, meal_date),
  -- B/D scans must reference a registration; free meals must not
  CHECK (
    (meal_type IN ('breakfast', 'dinner') AND reg_id IS NOT NULL)
    OR
    (meal_type NOT IN ('breakfast', 'dinner') AND reg_id IS NULL)
  )
);

CREATE INDEX idx_meal_tokens_date   ON meal_token_events(meal_date);
CREATE INDEX idx_meal_tokens_person ON meal_token_events(person_id);
CREATE INDEX idx_meal_tokens_reg    ON meal_token_events(reg_id);   -- (small fix) FK index


-- ------------------------------------------------------------
-- TABLE: free_meal_counts
-- (I6) CHECK restricts slots to free types
-- ------------------------------------------------------------
CREATE TABLE free_meal_counts (
  count_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_slot     meal_type_enum NOT NULL
                CHECK (meal_slot IN ('free_lunch', 'khichadi_am', 'khichadi_pm')),
  count         INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),

  entry_type    TEXT DEFAULT 'single' CHECK (entry_type IN ('single','bulk')),

  recorded_by   UUID,
  recorded_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_free_meals_date ON free_meal_counts(meal_date, meal_slot);


-- ------------------------------------------------------------
-- TABLE: meal_forecasts
-- (I15) BD breakdown columns only meaningful when meal_slot is breakfast/dinner
-- ------------------------------------------------------------
CREATE TABLE meal_forecasts (
  forecast_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_date     DATE NOT NULL,
  meal_slot         meal_type_enum NOT NULL,

  forecasted_total  INTEGER,
  confirmed_guests  INTEGER DEFAULT 0,
  confirmed_students INTEGER DEFAULT 0,
  confirmed_bd_reg  INTEGER DEFAULT 0,
  estimated_walkins INTEGER DEFAULT 0,

  -- BD breakdown — must be zero on non-BD slots
  staff_bd_count        INTEGER DEFAULT 0,
  volunteer_bd_count    INTEGER DEFAULT 0,
  labourer_bd_count     INTEGER DEFAULT 0,
  student_bd_count      INTEGER DEFAULT 0,
  other_bd_count        INTEGER DEFAULT 0,

  actual_count      INTEGER,

  festival_flag     BOOLEAN DEFAULT FALSE,
  festival_name     TEXT,
  is_ekadashi       BOOLEAN DEFAULT FALSE,
  is_grain_free     BOOLEAN DEFAULT FALSE,
  notes             TEXT,

  generated_at      TIMESTAMP DEFAULT NOW(),
  UNIQUE(forecast_date, meal_slot),

  -- (I15) BD-only breakdowns must be zero on non-BD slots
  CHECK (
    meal_slot IN ('breakfast','dinner')
    OR (
      staff_bd_count = 0 AND volunteer_bd_count = 0
      AND labourer_bd_count = 0 AND student_bd_count = 0
      AND other_bd_count = 0 AND confirmed_bd_reg = 0
    )
  )
);


-- ------------------------------------------------------------
-- TABLE: ashram_kitchen_counts
-- ------------------------------------------------------------
CREATE TABLE ashram_kitchen_counts (
  count_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  population_type   TEXT NOT NULL CHECK (population_type IN ('brahmachari','varishtha_vaishnava')),
  meal_slot         meal_type_enum NOT NULL
                    CHECK (meal_slot IN ('ashram_breakfast','ashram_brunch','ashram_dinner')),

  regular_count     INTEGER NOT NULL CHECK (regular_count >= 0),
  visiting_extra    INTEGER DEFAULT 0 CHECK (visiting_extra >= 0),

  total_count       INTEGER GENERATED ALWAYS AS (regular_count + visiting_extra) STORED,

  updated_by        UUID,
  updated_at        TIMESTAMP DEFAULT NOW()
);


-- ============================================================
-- STEP 5: CONTRACTORS
-- ============================================================

CREATE TABLE contractors (
  contractor_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name    TEXT NOT NULL,
  poc_name        TEXT NOT NULL,
  poc_mobile      TEXT NOT NULL,
  poc_email       TEXT,

  contract_type   contract_type_enum NOT NULL,
  dept_id         UUID REFERENCES departments(dept_id),
  project_name    TEXT,
  project_scope   TEXT,

  portal_username TEXT UNIQUE,
  portal_password_hash TEXT,

  approved_by     UUID,
  approved_at     TIMESTAMP,

  start_date      DATE,
  end_date        DATE,
  status          approval_status_enum DEFAULT 'pending',

  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractors_dept ON contractors(dept_id);  -- (small fix) FK index


CREATE TABLE contractor_labourers (
  cl_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id             UUID NOT NULL REFERENCES persons(person_id),
  contractor_id         UUID NOT NULL REFERENCES contractors(contractor_id),

  camp_location         camp_location_enum NOT NULL,
  annakshetra_bd_opted  BOOLEAN,            -- App sets default per camp on insert

  approval_status       approval_status_enum DEFAULT 'pending',
  approved_by           UUID,
  approved_at           TIMESTAMP,
  rejection_reason      TEXT,

  created_at            TIMESTAMP DEFAULT NOW(),
  UNIQUE(person_id, contractor_id)
);

CREATE INDEX idx_cl_person     ON contractor_labourers(person_id);
CREATE INDEX idx_cl_contractor ON contractor_labourers(contractor_id);

-- Now that contractors exists, attach the FK from meal_registrations.contractor_id
ALTER TABLE meal_registrations
  ADD CONSTRAINT fk_meal_reg_contractor
  FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id);

CREATE INDEX idx_meal_reg_contractor ON meal_registrations(contractor_id);  -- (small fix) FK index


-- ============================================================
-- STEP 6: SYSTEM USERS, AUDIT, RBAC LOG
-- (B3, B4) system_users keyed to persons; 5-role enum + module_access[]
-- ============================================================

CREATE TABLE system_users (
  user_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id         UUID NOT NULL REFERENCES persons(person_id),

  username          TEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,

  role              system_role_enum NOT NULL,

  -- Module specialisation: ['vms','ams','security','festival','reports','vehicles']
  -- Operators carry a single-element array (e.g. ['vms'] for gate, ['ams'] for canteen).
  module_access     TEXT[] DEFAULT '{}',

  -- Department restriction: NULL = no restriction (super_admin / management)
  dept_id           UUID REFERENCES departments(dept_id),

  permission_overrides JSONB DEFAULT '{}',

  access_valid_from  TIMESTAMP DEFAULT NOW(),
  access_valid_until TIMESTAMP,

  allowed_device_ids TEXT[],

  last_login         TIMESTAMP,
  failed_login_count INTEGER DEFAULT 0,
  is_locked          BOOLEAN DEFAULT FALSE,
  is_active          BOOLEAN DEFAULT TRUE,

  created_by        UUID,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_person ON system_users(person_id);
CREATE INDEX idx_users_role   ON system_users(role);
CREATE INDEX idx_users_dept   ON system_users(dept_id);    -- (small fix) FK index

-- Now that system_users exists, attach FK from persons.registered_by
ALTER TABLE persons
  ADD CONSTRAINT fk_persons_registered_by
  FOREIGN KEY (registered_by) REFERENCES system_users(user_id);


-- ------------------------------------------------------------
-- TABLE: audit_log — INSERT-only, immutability enforced via rules
-- ------------------------------------------------------------
CREATE TABLE audit_log (
  audit_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES system_users(user_id),
  person_id     UUID REFERENCES persons(person_id),

  action        TEXT NOT NULL,
  module        TEXT,
  table_name    TEXT,
  record_id     UUID,

  old_value     JSONB,
  new_value     JSONB,

  ip_address    TEXT,
  device_id     TEXT,
  notes         TEXT,

  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_user      ON audit_log(user_id);
CREATE INDEX idx_audit_person    ON audit_log(person_id);
CREATE INDEX idx_audit_action    ON audit_log(action);
CREATE INDEX idx_audit_time      ON audit_log(created_at);
CREATE INDEX idx_audit_record    ON audit_log(record_id);   -- (small fix)
CREATE INDEX idx_audit_table     ON audit_log(table_name);  -- (small fix)

-- (I12) Immutability — UPDATE and DELETE are silently no-ops.
-- Application role should additionally have UPDATE/DELETE revoked.
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;


-- ------------------------------------------------------------
-- TABLE: role_assignment_log
-- ------------------------------------------------------------
CREATE TABLE role_assignment_log (
  log_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES system_users(user_id),
  action        TEXT NOT NULL CHECK (action IN ('role_assigned','role_revoked')),
  role_assigned system_role_enum,
  modules_given TEXT[],
  reason        TEXT,
  done_by       UUID NOT NULL REFERENCES system_users(user_id),
  done_at       TIMESTAMP DEFAULT NOW()
);


-- ------------------------------------------------------------
-- TABLE: whatsapp_logs
-- ------------------------------------------------------------
CREATE TABLE whatsapp_logs (
  log_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID REFERENCES persons(person_id),

  flow_type       TEXT NOT NULL,
  template_name   TEXT,
  message_preview TEXT,

  interakt_msg_id TEXT,
  status          whatsapp_status_enum DEFAULT 'sent',

  sent_at         TIMESTAMP DEFAULT NOW(),
  delivered_at    TIMESTAMP,
  read_at         TIMESTAMP,
  failed_reason   TEXT
);

CREATE INDEX idx_wa_logs_person ON whatsapp_logs(person_id);
CREATE INDEX idx_wa_logs_sent   ON whatsapp_logs(sent_at);


-- ------------------------------------------------------------
-- TABLE: festival_events
-- (Small fix) UNIQUE(festival_name, festival_date) so seed is idempotent
-- ------------------------------------------------------------
CREATE TABLE festival_events (
  festival_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_name     TEXT NOT NULL,
  festival_date     DATE NOT NULL,
  festival_end_date DATE,

  expected_footfall INTEGER,
  festival_mode_on  BOOLEAN DEFAULT TRUE,
  is_ekadashi       BOOLEAN DEFAULT FALSE,
  is_grain_free     BOOLEAN DEFAULT FALSE,

  pre_reg_opens_at  DATE,
  notes             TEXT,

  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(festival_name, festival_date)
);

INSERT INTO festival_events (festival_name, festival_date, expected_footfall, is_grain_free, festival_mode_on) VALUES
  ('Ekadashi', '2026-01-11', 500, TRUE, FALSE),
  ('Ekadashi', '2026-01-26', 500, TRUE, FALSE),
  ('Nityananda Trayodashi', '2026-02-03', 3000, FALSE, TRUE),
  ('Gaura Purnima', '2026-03-04', 5000, FALSE, TRUE),
  ('Ram Navami', '2026-03-29', 3000, FALSE, TRUE),
  ('Akshaya Tritiya', '2026-04-29', 2000, FALSE, FALSE),
  ('Janmashtami', '2026-08-15', 18000, FALSE, TRUE),
  ('Radhashtami', '2026-08-29', 5000, FALSE, TRUE),
  ('Diwali', '2026-10-20', 4000, FALSE, TRUE),
  ('New Year Eve', '2026-12-31', 12000, FALSE, TRUE)
ON CONFLICT (festival_name, festival_date) DO NOTHING;


-- ------------------------------------------------------------
-- TABLE: vehicles
-- ------------------------------------------------------------
CREATE TABLE vehicles (
  vehicle_id      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID REFERENCES persons(person_id),

  vehicle_number  TEXT NOT NULL,
  vehicle_type    TEXT,
  driver_name     TEXT,
  purpose         TEXT,

  is_permanent    BOOLEAN DEFAULT FALSE,
  is_gev_owned    BOOLEAN DEFAULT FALSE,

  entry_time      TIMESTAMP,
  exit_time       TIMESTAMP,
  parking_zone    TEXT,

  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_vehicles_number ON vehicles(vehicle_number);
CREATE INDEX idx_vehicles_entry  ON vehicles(entry_time);
CREATE INDEX idx_vehicles_person ON vehicles(person_id);  -- (small fix) FK index


-- ------------------------------------------------------------
-- TABLE: feedback
-- ------------------------------------------------------------
CREATE TABLE feedback (
  feedback_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID NOT NULL REFERENCES persons(person_id),
  stay_id         UUID REFERENCES person_stays(stay_id),

  overall_rating  INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
  comment         TEXT,
  source          TEXT DEFAULT 'whatsapp' CHECK (source IN ('whatsapp','web_form')),

  submitted_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_feedback_person ON feedback(person_id);
CREATE INDEX idx_feedback_stay   ON feedback(stay_id);


-- ============================================================
-- STEP 7: GROUPS, CAFE CAPACITY, ZONE 3 UPGRADES
-- ============================================================

-- ------------------------------------------------------------
-- TABLE: group_members
-- (B1) FK now correctly references qr_passes(qr_id)
-- ------------------------------------------------------------
CREATE TABLE group_members (
  member_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  leader_qr_id          UUID NOT NULL REFERENCES qr_passes(qr_id) ON DELETE CASCADE,
  leader_person_id      UUID NOT NULL REFERENCES persons(person_id),
  member_number         INTEGER NOT NULL CHECK (member_number >= 1),
  full_name             TEXT NOT NULL,
  age                   INTEGER CHECK (age IS NULL OR age >= 0),
  gender                gender_enum,
  relation_to_leader    TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),

  UNIQUE(leader_qr_id, member_number)
);

CREATE INDEX idx_group_members_qr     ON group_members(leader_qr_id);
CREATE INDEX idx_group_members_person ON group_members(leader_person_id);


-- ------------------------------------------------------------
-- TABLE: cafe_capacity
-- (I8) cafe_code FK to departments(dept_code)
-- (I2) meal_type uses cafe_meal_type_enum
-- ------------------------------------------------------------
CREATE TABLE cafe_capacity (
  capacity_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_code             TEXT NOT NULL REFERENCES departments(dept_code),
  capacity_date         DATE NOT NULL,
  meal_type             cafe_meal_type_enum NOT NULL,
  threshold             INTEGER NOT NULL CHECK (threshold >= 0),
  booked_count          INTEGER DEFAULT 0 CHECK (booked_count >= 0),
  declared_by           TEXT,
  declared_at           TIMESTAMP DEFAULT NOW(),
  notes                 TEXT,
  UNIQUE (cafe_code, capacity_date, meal_type)
  -- (N1) NO CHECK booked_count <= threshold here.
  -- The cafe_capacity_recount trigger sums up paid zone_upgrade_payments and
  -- writes the sum here AFTER the payment row is committed. If a CHECK rejected
  -- the trigger UPDATE, the entire transaction would roll back including the
  -- already-committed Razorpay payment row → money taken, no record.
  -- App is responsible for not allowing payment when capacity is reached
  -- (the cafe_capacity_status view returns 'FULL' when booked_count >= threshold).
);

CREATE INDEX idx_cafe_capacity_date ON cafe_capacity(capacity_date, cafe_code);


-- ------------------------------------------------------------
-- TABLE: zone_upgrade_payments
-- (B1) qr_id FK fixed
-- (I2) meal_type uses cafe_meal_type_enum
-- (Small fix) persons_count CHECK > 0
-- ------------------------------------------------------------
CREATE TABLE zone_upgrade_payments (
  upgrade_id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  qr_id                 UUID NOT NULL REFERENCES qr_passes(qr_id),
  gate_name             gate_enum NOT NULL DEFAULT 'sbt_gate',
  persons_count         INTEGER NOT NULL CHECK (persons_count > 0),
  price_per_person      NUMERIC(10,2) NOT NULL DEFAULT 350.00,
  total_amount          NUMERIC(10,2) NOT NULL,
  razorpay_order_id     TEXT,
  razorpay_payment_id   TEXT,
  payment_status        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (payment_status IN ('pending','paid','failed','refunded')),
  cafe_code             TEXT REFERENCES departments(dept_code),
  meal_type             cafe_meal_type_enum,
  -- (N2) Date the meal will actually be eaten. Differs from created_at when
  -- the visitor pre-pays (Smart Registration Page) — e.g. paid today for
  -- tomorrow's Govindas lunch. The cafe_capacity_recount trigger groups by
  -- meal_date so pre-bookings update the correct cafe_capacity row.
  meal_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  cafe_booking_confirmed BOOLEAN DEFAULT FALSE,
  paid_at               TIMESTAMP,
  created_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_zone_upgrade_qr   ON zone_upgrade_payments(qr_id);
CREATE INDEX idx_zone_upgrade_date ON zone_upgrade_payments(created_at);


-- ============================================================
-- STEP 8: SYSTEM CONFIG
-- (B5) Column names: config_key, config_value, config_type
-- ============================================================
CREATE TABLE system_config (
  config_key            TEXT PRIMARY KEY,
  config_value          TEXT NOT NULL,
  config_type           TEXT DEFAULT 'string'
                        CHECK (config_type IN ('string','integer','boolean','json')),
  description           TEXT,
  updated_by            UUID REFERENCES system_users(user_id),
  updated_at            TIMESTAMP DEFAULT NOW()
);

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
  ('max_group_size',            '10',     'integer', 'Maximum persons in a single visitor group'),
  ('zone3_cafe_price',          '350',    'integer', 'Zone 3 upgrade price per person (INR)'),
  ('vf_slot_capacity',          '30',     'integer', 'Max persons per Vrindavan Forest tour slot'),
  ('vf_slot_times',             '["10:30","12:00","14:00","15:30","17:00","18:30"]', 'json', 'Available VF tour slot times'),
  ('day_pass_valid_until',      '20:00',  'string',  'Time of day when day visitor QRs expire (IST 24h)'),
  ('zone3_upgrade_valid_hrs',   '3',      'integer', 'Hours a Zone 3 upgrade pass remains valid'),
  ('festival_mode_active',      'false',  'boolean', 'When true: batch entry, no VF slots, walk-in only'),
  ('registration_open',         'true',   'boolean', 'When false: visitor self-registration is paused'),
  -- Added in v4 (Phase docs reference these but v3 did not seed them)
  ('paid_day_visit_price',      '850',    'integer', 'Paid day visit price per person (INR)'),
  ('cafe_daily_capacity',       '50',     'integer', 'Default Govindas Guest Area daily cover capacity'),
  ('nightly_forecast_time',     '21:00',  'string',  'Time the nightly meal forecast WhatsApp goes out (IST)'),
  ('bd_monthly_rate',           '1860',   'integer', 'Annakshetra B/D rate per person per month (INR)')
ON CONFLICT (config_key) DO NOTHING;


-- ============================================================
-- STEP 9: GAC + DEPT HOD MASTER
-- (I13) dept_hods.dept_code NOT NULL UNIQUE
-- ============================================================
CREATE TABLE gac_members (
  gac_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id       UUID REFERENCES persons(person_id),
  gac_member_name TEXT NOT NULL,
  gac_position    TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dept_hods (
  hod_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dept_code       TEXT NOT NULL UNIQUE
                  REFERENCES departments(dept_code) ON DELETE CASCADE,
  hod_name        TEXT NOT NULL,
  gac_member      TEXT,
  project_contact TEXT,
  notes           TEXT
);


-- ============================================================
-- STEP 10: SEED DEPARTMENTS (46) + DEPT HODS + GAC MEMBERS
-- ============================================================

INSERT INTO departments (dept_name, dept_code) VALUES
-- Food & Hospitality
('Annakshetra',                                  'ANNAK'),
('Kitchen (Festival & Daily Cooking)',           'KITCHEN'),
('Guest Hospitality',                            'GHOSP'),
('Govindas Srinathji Bhavan (Cafe)',             'GSB'),
('Govindas Guest Area (Cafe)',                   'GGA'),
('Dhanvantari Cafe (Ayurveda Dept)',             'DHAN'),
-- Construction & Maintenance
('Construction Department',                      'CONST'),
('Maintenance Construction',                     'MAINT'),
('Civil Material Purchases',                     'CIVPURCH'),
-- Administration & IT
('IT Infrastructure',                            'IT_INFRA'),
('IT Software',                                  'IT_SW'),
('HR Department',                                'HR'),
('Front Desk / Reception',                       'FRONT'),
('Accounts & Finance',                           'ACCOUNTS'),
('Estate Management',                            'ESTATE'),
('Legal Liaisoning',                             'LEGAL'),
('Central Purchase',                             'CPURCH'),
('Godown Purchases',                             'GODOWN'),
('Vehicle Department',                           'VEHICLE'),
('Media Department',                             'MEDIA'),
-- Spiritual & Community Care
('ISKCON Govardhan Ashram (Guest Rooms)',        'ASHRAM'),
('Brahmachari Ashram',                           'BRACHRAM'),
('Varishtha Vaishnava Care (VVSHCH)',            'VVSHCH'),
('Deity Worship Department',                     'DEITY'),
('Deity Cooking',                                'DEITYCOOK'),
('Temple Hall & Sound System',                   'TEMPLE'),
('Kirtan Department',                            'KIRTAN'),
('Health & Spiritual Care',                      'HSC'),
('Festival Department',                          'FESTIVAL'),
-- Education & Training
('Govardhan School of Yoga (incl. Int TTC)',     'GSYOGA'),
('Govardhan Ayurveda',                           'AYUR'),
('GSEC - Govardhan School of Ed & Culture',      'GSEC'),
('Vidyapeetha (Long-term Spiritual)',            'VIDYA'),
('HRDI',                                         'HRDI'),
('GEMS - Govardhan English Medium School',       'GEMS'),
('Leadership Training Academy',                  'LTA'),
-- Sustainability, Goshala & Grounds
('Sustainability',                               'SUST'),
('SBT & Waste Management',                       'SBT'),
('Goshala',                                      'GOSHA'),
('Nursery, Landscape & Vrindavan Forest',        'NURSERY'),
('Agriculture',                                  'AGRI'),
('Dioramas',                                     'DIORAMA'),
-- Social Impact & Community
('Rural Development',                            'RURAL'),
('Rural Education',                              'RURALEDU'),
('CSR',                                          'CSR'),
-- Security & Operations
('Security & Parking',                           'SECUR')
ON CONFLICT (dept_code) DO NOTHING;


INSERT INTO gac_members (gac_member_name, gac_position) VALUES
('Sanatkumar P',         'GAC Member 1 — Rural Dev, Goshala, Agriculture'),
('Gauranga P',           'GAC Member 2 — Kitchen, Annakshetra, Guest Hospitality, Construction(co)'),
('Vasudev P',            'GAC Member 3 — Project Final Authority, Accounts, Vehicle, Purchase'),
('Sri Gaurcaran P',      'GAC Member 4 — IT/HR Director, Estate, Civil Purchase, Media'),
('Adikeshav P',          'GAC Member 5 — School of Yoga(co), Ayurveda, Community Dev'),
('Caitanyarupa P',       'GAC Member 6 — Sustainability, Seva Office, SBT, Volunteering'),
('Gauranga Darshan P',   'GAC Member 7 — GSEC, Shastric Education, Vidyapeetha'),
('Devarshi Narad P',     'GAC Member 8 — Local PR, Goshala(co), Legal Liaisoning'),
('Sri Gurucaran P',      'GAC Member 9 — ISKCON Ashram, School of Yoga, Maintenance, Govindas'),
('Madhav Gaur P',        'GAC Member 10 — Dioramas, SBT(co), Nursery & VF, Food Stalls'),
('Maha Bhagavat P',      'GAC Member 11 — Brahmachari Ashram, Temple Hall, HRDI, Construction(co)'),
('Ajit Mukund P',        'GAC Member 12 — GEMS, HRDI(co), Campus Preaching, Book Distribution'),
('Sushant Nitai P',      'GAC Member 13 — Deity Worship, VF Temples, Festivals, Deity Cooking(co)'),
('Premlila M',           'GAC Member 14 — Health & Spiritual Care, POSH & CPT'),
('Barsana Kumari M',     'GAC Member 15 — Volunteering(co), Kirtan(co), Deity Cooking(co)'),
('HariPriya Radha M',    'GAC Member 16 — ISKCON Ashram(co), Gift Shops, IGA Volunteering, Media(co)');


INSERT INTO dept_hods (dept_code, hod_name, gac_member, project_contact) VALUES
-- Food & Hospitality
('ANNAK',     'Anand Prem P',               'Gauranga P',                                            'Anand Prem P'),
('KITCHEN',   'Hari Guru P',                'Gauranga P',                                            'Hari Guru P'),
('GHOSP',     'Mohan Villas P',             'Gauranga P',                                            'Mohan Villas P'),
('GSB',       'Ramesh P',                   'Vasudev P',                                             'Ramesh P'),
('GGA',       'Prasad Panda P',             'Sri Gurucaran P',                                       'Prasad Panda P'),
('DHAN',      'Ganesh Ghosh P',             'Adikeshav P (Ayurveda Dept)',                           'Ganesh Ghosh P'),
-- Construction & Maintenance
('CONST',     'Anandnimai P',               'Gauranga P / Vasudev P / Sri Gaurcaran P / Maha Bhagavat P', 'Anandnimai P'),
('MAINT',     'Laxmanpran P',               'Sri Gurucaran P',                                       'Laxmanpran P'),
('CIVPURCH',  'Subal Sakha P',              'Sri Gaurcaran P',                                       'Subal Sakha P'),
-- Administration & IT
('IT_INFRA',  'Radhashyamsundar P',         'Sri Gaurcaran P',                                       'Sri Gaurcaran P'),
('IT_SW',     'Ram Prabhu',                 'Sri Gaurcaran P',                                       'Ram Prabhu'),
('HR',        'Radhashyamsundar P',         'Sri Gaurcaran P',                                       'Sri Gaurcaran P'),
('FRONT',     'Prasad Panda P',             'Sri Gurucaran P',                                       'Prasad Panda P'),
('ACCOUNTS',  'Gauranga Lila P',            'Vasudev P',                                             'Gauranga Lila P'),
('ESTATE',    'Sri Gaurcaran P',            'Sri Gaurcaran P',                                       'Sri Gaurcaran P'),
('LEGAL',     'Audarya Caitanya P',         'Devarshi Narad P',                                      'Audarya Caitanya P'),
('CPURCH',    'Braj Sakha P',               'Vasudev P',                                             'Braj Sakha P'),
('GODOWN',    'Parth Sakha P',              'Sri Gaurcaran P',                                       'Parth Sakha P'),
('VEHICLE',   'Vaishnav Sevak P',           'Vasudev P',                                             'Vaishnav Sevak P'),
('MEDIA',     'Ganganath Caitanya P',       'Sri Gaurcaran P / HariPriya Radha M',                   'Ganganath Caitanya P'),
-- Spiritual & Community Care
('ASHRAM',    'Veera Arjuna P',             'Sri Gurucaran P / HariPriya Radha M',                   'Veera Arjuna P'),
('BRACHRAM',  'Madhav Prem P',              'Maha Bhagavat P',                                       'Madhav Prem P'),
('VVSHCH',    'Achyuta Avtar P (Achyut Patil)', 'Gauranga P / Adikeshav P',                          'Achyut Patil'),
('DEITY',     'Deity Worship Committee',    'Sushant Nitai P',                                       'Sushant Nitai P'),
('DEITYCOOK', 'Vrindavan Priti M',          'Sushant Nitai P / Barsana Kumari M',                    'Vrindavan Priti M'),
('TEMPLE',    'Sri Kesavanand P',           'Maha Bhagavat P',                                       'Sri Kesavanand P'),
('KIRTAN',    'Jay Sacinandan P',           'Maha Bhagavat P / Barsana Kumari M',                    'Jay Sacinandan P'),
('HSC',       'Sridhar Nimai P',            'Premlila M',                                            'Sridhar Nimai P'),
('FESTIVAL',  'Festival Committee',         'Sushant Nitai P (Sanatkumar P Chair)',                  'Sanatkumar P'),
-- Education & Training
('GSYOGA',    'Priya Caitanya P',           'Sri Gurucaran P',                                       'Priya Caitanya P'),
('AYUR',      'Dr. Sudheesh',               'Adikeshav P',                                           'Dr. Sudheesh'),
('GSEC',      'Gauranga Darshan P',         'Gauranga Darshan P',                                    'Gauranga Darshan P'),
('VIDYA',     'Gaurangabihari P (HOD) / Gauranga Darshan P (Dean)', 'Gauranga Darshan P',           'Gaurangabihari P'),
('HRDI',      'Abhimanyu Pran P',           'Ajit Mukund P / Maha Bhagavat P',                       'Abhimanyu Pran P'),
('GEMS',      'Amolcaitanya P',             'Premlila M',                                            'Amolcaitanya P'),
('LTA',       'Mohan Vilas P',              'Gauranga P',                                            'Mohan Vilas P'),
-- Sustainability, Goshala & Grounds
('SUST',      'Caitanyarup P',              'Caitanyarupa P',                                        'Caitanyarup P'),
('SBT',       'Ganga Narayan P',            'Caitanyarupa P / Madhav Gaur P',                        'Ganga Narayan P'),
('GOSHA',     'Srinandanandan P',           'Sanatkumar P / Devarshi Narad P',                       'Srinandanandan P'),
('NURSERY',   'Abhay Gauranga P',           'Sanatkumar P / Madhav Gaur P',                          'Abhay Gauranga P'),
('AGRI',      'Prem Prada P',               'Sanatkumar P',                                          'Prem Prada P'),
('DIORAMA',   'Under Madhav Gaur P',        'Madhav Gaur P / Sushant Nitai P',                       'Madhav Gaur P'),
-- Social Impact & Community
('RURAL',     'Jadu Thakur P & Mohan Nimai P', 'Sanatkumar P',                                       'Mohan Nimai P'),
('RURALEDU',  'Nitai Caitanya P',           'Sanatkumar P',                                          'Nitai Caitanya P'),
('CSR',       'Anand Caitanya P',           'Gauranga P',                                            'Anand Caitanya P'),
-- Security
('SECUR',     'Premanjan P',                'Direct',                                                'Premanjan P')
ON CONFLICT (dept_code) DO NOTHING;


-- ============================================================
-- STEP 11: TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER persons_updated_at
  BEFORE UPDATE ON persons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER system_users_updated_at
  BEFORE UPDATE ON system_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- (I11) Keep vf_tour_slots.booked_count in sync with vf_slot_bookings (status = 'confirmed')
CREATE OR REPLACE FUNCTION vf_slot_bookings_recount()
RETURNS TRIGGER AS $$
DECLARE
  affected_slot UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    affected_slot := OLD.slot_id;
  ELSE
    affected_slot := NEW.slot_id;
  END IF;

  UPDATE vf_tour_slots
     SET booked_count = (
       SELECT COUNT(*) FROM vf_slot_bookings
        WHERE slot_id = affected_slot AND status = 'confirmed'
     )
   WHERE slot_id = affected_slot;

  -- For UPDATE that moves a booking between slots, update the old slot too
  IF TG_OP = 'UPDATE' AND OLD.slot_id <> NEW.slot_id THEN
    UPDATE vf_tour_slots
       SET booked_count = (
         SELECT COUNT(*) FROM vf_slot_bookings
          WHERE slot_id = OLD.slot_id AND status = 'confirmed'
       )
     WHERE slot_id = OLD.slot_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vf_slot_bookings_count_trg
  AFTER INSERT OR UPDATE OR DELETE ON vf_slot_bookings
  FOR EACH ROW EXECUTE FUNCTION vf_slot_bookings_recount();


-- (I11, N2) Keep cafe_capacity.booked_count in sync with paid zone_upgrade_payments.
-- Groups by zone_upgrade_payments.meal_date (= the day the meal is eaten),
-- not created_at, so pre-bookings update the right cafe_capacity row.
-- Recomputes for the (cafe, meal_date, meal) combination touched by NEW and
-- (if different) OLD.
CREATE OR REPLACE FUNCTION cafe_capacity_recount()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE')
     AND NEW.cafe_code IS NOT NULL
     AND NEW.meal_type IS NOT NULL THEN
    UPDATE cafe_capacity cc
       SET booked_count = (
         SELECT COALESCE(SUM(persons_count), 0)
           FROM zone_upgrade_payments z
          WHERE z.cafe_code     = cc.cafe_code
            AND z.meal_date     = cc.capacity_date
            AND z.meal_type     = cc.meal_type
            AND z.payment_status = 'paid'
            AND z.cafe_booking_confirmed = TRUE
       )
     WHERE cc.cafe_code     = NEW.cafe_code
       AND cc.capacity_date = NEW.meal_date
       AND cc.meal_type     = NEW.meal_type;
  END IF;

  IF TG_OP IN ('UPDATE', 'DELETE')
     AND OLD.cafe_code IS NOT NULL
     AND OLD.meal_type IS NOT NULL
     AND (TG_OP = 'DELETE'
          OR OLD.cafe_code <> NEW.cafe_code
          OR OLD.meal_type <> NEW.meal_type
          OR OLD.meal_date <> NEW.meal_date) THEN
    UPDATE cafe_capacity cc
       SET booked_count = (
         SELECT COALESCE(SUM(persons_count), 0)
           FROM zone_upgrade_payments z
          WHERE z.cafe_code     = cc.cafe_code
            AND z.meal_date     = cc.capacity_date
            AND z.meal_type     = cc.meal_type
            AND z.payment_status = 'paid'
            AND z.cafe_booking_confirmed = TRUE
       )
     WHERE cc.cafe_code     = OLD.cafe_code
       AND cc.capacity_date = OLD.meal_date
       AND cc.meal_type     = OLD.meal_type;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER zone_upgrade_capacity_trg
  AFTER INSERT OR UPDATE OR DELETE ON zone_upgrade_payments
  FOR EACH ROW EXECUTE FUNCTION cafe_capacity_recount();


-- ============================================================
-- STEP 12: VIEWS
-- ============================================================

CREATE VIEW current_campus_population AS
SELECT
  p.person_id,
  p.full_name,
  p.mobile,
  p.person_type,
  p.dept_id,
  d.dept_name,
  p.campus_location,
  ps.check_in_date,
  ps.check_out_date,
  ps.accommodation_block,
  ps.room_number
FROM persons p
LEFT JOIN departments d ON p.dept_id = d.dept_id
LEFT JOIN person_stays ps ON p.person_id = ps.person_id AND ps.is_active = TRUE
WHERE p.status = 'on_campus';


CREATE VIEW todays_breakfast_list AS
SELECT
  p.full_name,
  p.mobile,
  p.person_type,
  mr.payment_method,
  CASE WHEN mte.token_id IS NOT NULL THEN 'SERVED' ELSE 'PENDING' END AS breakfast_status
FROM meal_registrations mr
JOIN persons p ON mr.person_id = p.person_id
LEFT JOIN meal_token_events mte
  ON mr.person_id = mte.person_id
  AND mte.meal_type = 'breakfast'
  AND mte.meal_date = CURRENT_DATE
WHERE mr.meal_type = 'breakfast'
  AND mr.is_active = TRUE
  AND p.status = 'on_campus';


CREATE VIEW todays_dinner_list AS
SELECT
  p.full_name,
  p.mobile,
  p.person_type,
  mr.payment_method,
  CASE WHEN mte.token_id IS NOT NULL THEN 'SERVED' ELSE 'PENDING' END AS dinner_status
FROM meal_registrations mr
JOIN persons p ON mr.person_id = p.person_id
LEFT JOIN meal_token_events mte
  ON mr.person_id = mte.person_id
  AND mte.meal_type = 'dinner'
  AND mte.meal_date = CURRENT_DATE
WHERE mr.meal_type = 'dinner'
  AND mr.is_active = TRUE
  AND p.status = 'on_campus';


CREATE VIEW monthly_police_report AS
SELECT
  p.full_name,
  p.date_of_birth,
  p.gender,
  p.person_type,
  d.dept_name,
  p.id_proof_type,
  p.id_proof_number,
  p.perm_address,
  p.city,
  p.state,
  p.pincode,
  ps.check_in_date AS arrival_date,
  ps.check_out_date AS expected_departure,
  p.accommodation_block,
  p.room_number,
  c.company_name AS contractor_company
FROM persons p
LEFT JOIN departments d ON p.dept_id = d.dept_id
LEFT JOIN person_stays ps ON p.person_id = ps.person_id AND ps.is_active = TRUE
LEFT JOIN contractor_labourers cl ON p.person_id = cl.person_id
LEFT JOIN contractors c ON cl.contractor_id = c.contractor_id
WHERE ps.is_overnight = TRUE
  AND p.status IN ('on_campus', 'pre_registered')
ORDER BY p.person_type, p.full_name;


CREATE VIEW campus_headcount_summary AS
SELECT
  person_type,
  COUNT(*) AS count
FROM persons
WHERE status = 'on_campus'
GROUP BY person_type
ORDER BY count DESC;


CREATE VIEW zone3_upgrade_summary AS
SELECT
  DATE(zup.created_at) AS upgrade_date,
  zup.cafe_code,
  zup.meal_type,
  COUNT(*) AS total_upgrades,
  SUM(zup.persons_count) AS total_persons,
  SUM(zup.total_amount) AS total_revenue,
  COUNT(CASE WHEN zup.payment_status = 'paid' THEN 1 END) AS successful_payments
FROM zone_upgrade_payments zup
GROUP BY DATE(zup.created_at), zup.cafe_code, zup.meal_type
ORDER BY upgrade_date DESC;


CREATE VIEW cafe_capacity_status AS
SELECT
  cc.cafe_code,
  d.dept_name AS cafe_name,
  cc.capacity_date,
  cc.meal_type,
  cc.threshold,
  cc.booked_count,
  (cc.threshold - cc.booked_count) AS available_spots,
  CASE
    WHEN cc.booked_count >= cc.threshold THEN 'FULL'
    WHEN cc.booked_count >= (cc.threshold * 0.85) THEN 'ALMOST_FULL'
    ELSE 'AVAILABLE'
  END AS availability_status
FROM cafe_capacity cc
LEFT JOIN departments d ON cc.cafe_code = d.dept_code
WHERE cc.capacity_date = CURRENT_DATE;


-- (I7) Reads bd_monthly_rate from system_config — no hardcoded ₹1860
CREATE VIEW monthly_billing_summary AS
SELECT
  d.dept_name,
  d.dept_code,
  cl.contractor_id,
  c.company_name AS contractor_company,
  mr.payment_method,
  COUNT(DISTINCT mr.person_id) AS registered_persons,
  COUNT(DISTINCT CASE WHEN mr.meal_type IN ('breakfast','dinner') THEN mr.person_id END) AS bd_registered,
  COUNT(DISTINCT mr.person_id)
    * (SELECT config_value::numeric FROM system_config WHERE config_key = 'bd_monthly_rate')
    AS monthly_amount_to_recover,
  CURRENT_DATE AS report_month
FROM meal_registrations mr
LEFT JOIN persons p ON mr.person_id = p.person_id
LEFT JOIN departments d ON p.dept_id = d.dept_id
LEFT JOIN contractor_labourers cl ON p.person_id = cl.person_id
LEFT JOIN contractors c ON cl.contractor_id = c.contractor_id
WHERE mr.is_active = TRUE
  AND mr.meal_type IN ('breakfast', 'dinner')
  AND mr.payment_method != 'self_paid'
GROUP BY d.dept_name, d.dept_code, cl.contractor_id, c.company_name, mr.payment_method
ORDER BY monthly_amount_to_recover DESC;


CREATE VIEW meal_scan_gap_report AS
SELECT
  p.full_name,
  p.person_type,
  d.dept_name,
  c.company_name AS contractor,
  STRING_AGG(DISTINCT mr.meal_type::text, ', ' ORDER BY mr.meal_type::text) AS registered_meals,
  COUNT(CASE WHEN mte.meal_type = 'breakfast'
        AND DATE_TRUNC('month', mte.meal_date) = DATE_TRUNC('month', CURRENT_DATE)
        THEN 1 END) AS breakfast_scans_this_month,
  COUNT(CASE WHEN mte.meal_type = 'dinner'
        AND DATE_TRUNC('month', mte.meal_date) = DATE_TRUNC('month', CURRENT_DATE)
        THEN 1 END) AS dinner_scans_this_month,
  COUNT(CASE WHEN mte.meal_type = 'free_lunch'
        AND DATE_TRUNC('month', mte.meal_date) = DATE_TRUNC('month', CURRENT_DATE)
        THEN 1 END) AS lunch_scans_this_month,
  EXTRACT(DAY FROM CURRENT_DATE) AS days_elapsed
FROM meal_registrations mr
JOIN persons p ON mr.person_id = p.person_id
LEFT JOIN departments d ON p.dept_id = d.dept_id
LEFT JOIN contractor_labourers cl ON p.person_id = cl.person_id
LEFT JOIN contractors c ON cl.contractor_id = c.contractor_id
LEFT JOIN meal_token_events mte ON mr.person_id = mte.person_id
WHERE mr.is_active = TRUE
GROUP BY p.person_id, p.full_name, p.person_type, d.dept_name, c.company_name
ORDER BY p.person_type, d.dept_name, p.full_name;


CREATE VIEW annakshetra_daily_counts AS
SELECT
  mte.meal_type,
  mte.meal_date,
  p.person_type,
  d.dept_name,
  c.company_name AS contractor,
  COUNT(*) AS persons_served
FROM meal_token_events mte
JOIN persons p ON mte.person_id = p.person_id
LEFT JOIN departments d ON p.dept_id = d.dept_id
LEFT JOIN contractor_labourers cl ON p.person_id = cl.person_id
LEFT JOIN contractors c ON cl.contractor_id = c.contractor_id
WHERE mte.meal_date = CURRENT_DATE
GROUP BY mte.meal_type, mte.meal_date, p.person_type, d.dept_name, c.company_name
ORDER BY mte.meal_type, persons_served DESC;


CREATE VIEW active_system_users AS
SELECT
  su.user_id,
  p.full_name,
  p.mobile,
  su.username,
  su.role,
  su.module_access,
  d.dept_name,
  su.access_valid_until,
  su.last_login,
  su.is_active
FROM system_users su
JOIN persons p ON su.person_id = p.person_id
LEFT JOIN departments d ON su.dept_id = d.dept_id
WHERE su.is_active = TRUE
ORDER BY su.role, p.full_name;


-- ============================================================
-- DONE.
-- 29 tables, 11 views, 19 enums, 4 triggers (incl. 2 counter-sync triggers),
-- 2 immutability rules on audit_log.
-- ============================================================
