'use strict';
const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');

// Seva HOD — the scoped approver for volunteer_seva / sustainability_intern
// registrations (see adminService.js's SCOPED_APPROVAL_TYPES). A
// dept_manager with module_access=['seva'] is exactly what canAccess()
// already grants the Seva & Volunteers admin page for, and is now also the
// authorization boundary adminService.approvePerson checks for this type.
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const person_id = randomUUID();

    await queryInterface.bulkInsert('persons', [{
      person_id,
      full_name: 'Balaji Govind Prabhu',
      mobile: '+919999999993',
      person_type: 'resident_staff',
      status: 'on_campus',
      created_at: now,
      updated_at: now,
    }]);

    await queryInterface.bulkInsert('system_users', [{
      user_id: randomUUID(),
      person_id,
      username: 'balaji.govind',
      password_hash: await bcrypt.hash('admin123', 12),
      role: 'dept_manager',
      module_access: JSON.stringify(['seva']),
      dept_id: null,
      permission_overrides: JSON.stringify({}),
      access_valid_from: now,
      failed_login_count: 0,
      is_locked: false,
      is_active: true,
      created_at: now,
      updated_at: now,
    }]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('system_users', { username: 'balaji.govind' });
    await queryInterface.bulkDelete('persons', { mobile: '+919999999993' });
  },
};
