'use strict';
const { randomUUID } = require('crypto');

// Mirrors Docs/GEV_Database_Schema_v3_Final.sql STEP 6 seed (10 festivals).
const FESTIVALS = [
  ['Ekadashi', '2026-01-11', 500, true, false],
  ['Ekadashi', '2026-01-26', 500, true, false],
  ['Nityananda Trayodashi', '2026-02-03', 3000, false, true],
  ['Gaura Purnima', '2026-03-04', 5000, false, true],
  ['Ram Navami', '2026-03-29', 3000, false, true],
  ['Akshaya Tritiya', '2026-04-29', 2000, false, false],
  ['Janmashtami', '2026-08-15', 18000, false, true],
  ['Radhashtami', '2026-08-29', 5000, false, true],
  ['Diwali', '2026-10-20', 4000, false, true],
  ['New Year Eve', '2026-12-31', 12000, false, true],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'festival_events',
      FESTIVALS.map(([festival_name, festival_date, expected_footfall, is_grain_free, festival_mode_on]) => ({
        festival_id: randomUUID(),
        festival_name,
        festival_date,
        expected_footfall,
        is_grain_free,
        festival_mode_on,
        is_ekadashi: false,
        created_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('festival_events', null, {});
  },
};
