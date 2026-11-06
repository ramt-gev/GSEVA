'use strict';

// GreytHR now supplies daily attendance directly (hourly-synced), separate
// from `status` (on_campus/departed lifecycle) and from gate-scan presence
// used for non-payroll person types. Null means "not GreytHR-linked, or not
// synced yet" — adminService falls back to gate events in that case.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('persons', 'greythr_present_today', {
      type: Sequelize.BOOLEAN,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('persons', 'greythr_present_today');
  },
};
