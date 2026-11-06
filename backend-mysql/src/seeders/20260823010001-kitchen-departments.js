'use strict';
const { randomUUID } = require('crypto');

// The 4 department names the Kitchen prototypes plan against that don't
// already exist in the main departments seed (Goshala/GOSHA already does).
const DEPARTMENTS = [
  ['Deity Flowers', 'DEITYFL'],
  ['Book Distribution', 'BOOKDIST'],
  ['Guest House', 'GUESTHSE'],
  ['Prasadam Sevaks', 'PRASADSV'],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'departments',
      DEPARTMENTS.map(([dept_name, dept_code]) => ({
        dept_id: randomUUID(),
        dept_name,
        dept_code,
        is_active: true,
        created_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('departments', { dept_code: DEPARTMENTS.map((d) => d[1]) });
  },
};
