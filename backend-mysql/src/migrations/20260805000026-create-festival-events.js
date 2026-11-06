'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('festival_events', {
      festival_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      festival_name: { type: Sequelize.STRING(255), allowNull: false },
      festival_date: { type: Sequelize.DATEONLY, allowNull: false },
      festival_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      expected_footfall: { type: Sequelize.INTEGER, allowNull: true },
      festival_mode_on: { type: Sequelize.BOOLEAN, defaultValue: true },
      is_ekadashi: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_grain_free: { type: Sequelize.BOOLEAN, defaultValue: false },
      pre_reg_opens_at: { type: Sequelize.DATEONLY, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('festival_events', ['festival_name', 'festival_date'], {
      name: 'idx_festival_events_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('festival_events');
  },
};
