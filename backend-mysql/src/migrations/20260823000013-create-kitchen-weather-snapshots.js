'use strict';

// Display-only context for the kitchen overview bar (rain affects prasadam
// footfall estimates) — no entry screen in any of the 3 Kitchen prototypes,
// so this is seeded/read-only for now, same treatment as festival_events.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kitchen_weather_snapshots', {
      snapshot_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      condition_text: { type: Sequelize.STRING(255), allowNull: true },
      temp_c: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
      rain_mm: { type: Sequelize.DECIMAL(5, 1), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kitchen_weather_snapshots');
  },
};
