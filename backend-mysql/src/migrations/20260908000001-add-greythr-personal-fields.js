'use strict';

// Personal/contact fields synced from Greythr's real /employees/personal and
// /employees/addresses/{type} endpoints (confirmed against their published
// API spec). perm_address/city/state/pincode/gender/date_of_birth already
// exist on persons — this adds what didn't: personal email, blood group,
// marital status, anniversary date, and a separate present-address field
// (Greythr tracks present vs permanent address as two distinct records).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('persons', 'personal_email', { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addColumn('persons', 'blood_group', { type: Sequelize.STRING(10), allowNull: true });
    await queryInterface.addColumn('persons', 'marital_status', { type: Sequelize.STRING(50), allowNull: true });
    await queryInterface.addColumn('persons', 'anniversary_date', { type: Sequelize.DATEONLY, allowNull: true });
    await queryInterface.addColumn('persons', 'present_address', { type: Sequelize.TEXT, allowNull: true });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('persons', 'personal_email');
    await queryInterface.removeColumn('persons', 'blood_group');
    await queryInterface.removeColumn('persons', 'marital_status');
    await queryInterface.removeColumn('persons', 'anniversary_date');
    await queryInterface.removeColumn('persons', 'present_address');
  },
};
