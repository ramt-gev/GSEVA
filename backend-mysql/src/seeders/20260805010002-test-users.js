'use strict';
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');

// Mirrors Docs/seed.sql's 3 test users. Unlike the Postgres backend (which
// seeds placeholder hashes and requires a separate `node set-passwords.js`
// run), this seeder hashes the real dev passwords directly — there's no
// historical reason to replicate the two-step dance here.
const USERS = [
  { name: 'Ram Prabhu', mobile: '+919999999999', deptCode: 'IT_SW', username: 'ram.prabhu', password: 'admin123', role: 'super_admin', module_access: ['vms', 'ams', 'security', 'festival', 'reports', 'vehicles'] },
  { name: 'Suresh Kumar', mobile: '+919999999998', deptCode: 'SECUR', username: 'gate.staff', password: 'gev123', role: 'operator', module_access: ['vms'] },
  { name: 'Anandprem Prabhu', mobile: '+919999999997', deptCode: 'ANNAK', username: 'anandprem', password: 'gev123', role: 'operator', module_access: ['ams'] },
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [depts] = await queryInterface.sequelize.query('SELECT dept_id, dept_code FROM departments');
    const deptIdByCode = Object.fromEntries(depts.map((d) => [d.dept_code, d.dept_id]));

    const personRows = [];
    const userRows = [];

    for (const u of USERS) {
      const person_id = randomUUID();
      const dept_id = deptIdByCode[u.deptCode];
      personRows.push({
        person_id,
        full_name: u.name,
        mobile: u.mobile,
        person_type: 'resident_staff',
        dept_id,
        status: 'on_campus',
        created_at: now,
        updated_at: now,
      });

      userRows.push({
        user_id: randomUUID(),
        person_id,
        username: u.username,
        password_hash: await bcrypt.hash(u.password, 12),
        role: u.role,
        module_access: JSON.stringify(u.module_access),
        dept_id,
        permission_overrides: JSON.stringify({}),
        access_valid_from: now,
        failed_login_count: 0,
        is_locked: false,
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    }

    await queryInterface.bulkInsert('persons', personRows);
    await queryInterface.bulkInsert('system_users', userRows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('system_users', {
      username: ['ram.prabhu', 'gate.staff', 'anandprem'],
    });
    await queryInterface.bulkDelete('persons', {
      mobile: ['+919999999999', '+919999999998', '+919999999997'],
    });
  },
};
