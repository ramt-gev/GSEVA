'use strict';

// A day-visitor group scans one QR (the leader's) for free_lunch/khichadi —
// without this column, meal_token_events counted that as 1 person served,
// not the real headcount, undercounting exactly like qr_passes.group_size
// did for the dashboard population/lunch-indicated stats.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('meal_token_events', 'group_size', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('meal_token_events', 'group_size');
  },
};
