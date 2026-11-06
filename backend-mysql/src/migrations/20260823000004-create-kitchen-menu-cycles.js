'use strict';

// Singleton-ish: one "current cycle" row at a time. menu_entries reference
// whichever cycle was open when the row was added; locking it blocks new
// menu_entries rather than deleting/hiding the existing plan.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kitchen_menu_cycles', {
      cycle_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: false },
      is_locked: { type: Sequelize.BOOLEAN, defaultValue: false },
      locked_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      locked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kitchen_menu_cycles');
  },
};
