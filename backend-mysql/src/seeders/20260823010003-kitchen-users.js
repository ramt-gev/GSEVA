'use strict';
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');

// Dev logins for the 3 Kitchen roles, named after the prototype's own
// example users — mirrors 20260805010002-test-users.js's pattern exactly.
const USERS = [
  { name: 'Nitai Chandra Das', mobile: '+919999999996', deptCode: 'KITCHEN', username: 'nitai.chandra', password: 'gev123', role: 'kitchen_supervisor' },
  { name: 'Gauranga Das', mobile: '+919999999995', deptCode: 'KITCHEN', username: 'gauranga.hod', password: 'gev123', role: 'kitchen_hod' },
  { name: 'Radha Priya Dasi', mobile: '+919999999994', deptCode: 'KITCHEN', username: 'radhapriya.cd', password: 'gev123', role: 'kitchen_collection_distribution' },
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
        module_access: JSON.stringify([]),
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
      username: ['nitai.chandra', 'gauranga.hod', 'radhapriya.cd'],
    });
    await queryInterface.bulkDelete('persons', {
      mobile: ['+919999999996', '+919999999995', '+919999999994'],
    });
  },
};
