'use strict';
const { randomUUID } = require('crypto');

function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(base, n) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z');

    const rows = [-1, 0, 1, 2].map((offset, i) => {
      const conditions = ['Clear skies', 'Partly cloudy, light evening showers likely', 'Overcast', 'Sunny with a light breeze'];
      return {
        snapshot_id: randomUUID(),
        for_date: toDateOnly(addDays(today, offset)),
        condition_text: conditions[i % conditions.length],
        temp_c: 27 + i,
        rain_mm: i === 1 ? 3.2 : 0,
        created_at: now,
      };
    });

    await queryInterface.bulkInsert('kitchen_weather_snapshots', rows);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('kitchen_weather_snapshots', null, {});
  },
};
