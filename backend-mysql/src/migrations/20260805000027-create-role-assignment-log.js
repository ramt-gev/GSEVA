'use strict';

// Not read/written by any controller yet (grepped adminController.js —
// confirmed unreferenced there too). Created for schema parity.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('role_assignment_log', {
      log_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      target_user_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'system_users', key: 'user_id' },
      },
      action: { type: Sequelize.ENUM('role_assigned', 'role_revoked'), allowNull: false },
      role_assigned: {
        type: Sequelize.ENUM('super_admin', 'management', 'module_admin', 'dept_manager', 'operator'),
        allowNull: true,
      },
      modules_given: { type: Sequelize.JSON, allowNull: true },
      reason: { type: Sequelize.TEXT, allowNull: true },
      done_by: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'system_users', key: 'user_id' },
      },
      done_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('role_assignment_log');
  },
};
