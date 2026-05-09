-- ------------------------------------------------------------------
-- Phase 1 seed: 3 test users (persons + system_users pairs)
--
-- Password hashes here are placeholders — Phase 2 replaces them with
-- real bcrypt hashes via `node set-passwords.js`. Until then login
-- returns 401, which is fine for Phase 1 verification.
-- ------------------------------------------------------------------

-- 1. Persons
INSERT INTO persons (full_name, mobile, person_type, dept_id, status)
VALUES
  ('Ram Prabhu',       '+919999999999', 'resident_staff',
    (SELECT dept_id FROM departments WHERE dept_code = 'IT_SW'),
    'on_campus'),
  ('Suresh Kumar',     '+919999999998', 'resident_staff',
    (SELECT dept_id FROM departments WHERE dept_code = 'SECUR'),
    'on_campus'),
  ('Anandprem Prabhu', '+919999999997', 'resident_staff',
    (SELECT dept_id FROM departments WHERE dept_code = 'ANNAK'),
    'on_campus');

-- 2. System users
INSERT INTO system_users (person_id, username, password_hash, role, module_access, dept_id)
SELECT p.person_id,
       'ram.prabhu',
       '$2b$12$placeholder_hash_replace_in_phase_2',
       'super_admin',
       ARRAY['vms','ams','security','festival','reports','vehicles'],
       p.dept_id
  FROM persons p WHERE p.mobile = '+919999999999';

INSERT INTO system_users (person_id, username, password_hash, role, module_access, dept_id)
SELECT p.person_id,
       'gate.staff',
       '$2b$12$placeholder_hash_replace_in_phase_2',
       'operator',
       ARRAY['vms'],
       p.dept_id
  FROM persons p WHERE p.mobile = '+919999999998';

INSERT INTO system_users (person_id, username, password_hash, role, module_access, dept_id)
SELECT p.person_id,
       'anandprem',
       '$2b$12$placeholder_hash_replace_in_phase_2',
       'operator',
       ARRAY['ams'],
       p.dept_id
  FROM persons p WHERE p.mobile = '+919999999997';
