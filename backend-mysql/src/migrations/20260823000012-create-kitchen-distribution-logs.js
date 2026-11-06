'use strict';

// The "future distribution_logs table" the Collection/Distribution
// prototype's comment flagged as not yet existing — one row per bld_entry
// (1:1, unique), tracking both the PENDING->COLLECTED->DELIVERED handoff
// and (once delivered) the final actual-vs-expected count, which the
// Supervisor's "Final Distribution Count" tab reads/writes.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kitchen_distribution_logs', {
      log_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      bld_id: {
        type: Sequelize.CHAR(36), allowNull: false, unique: true,
        references: { model: 'bld_entries', key: 'bld_id' },
      },
      status: { type: Sequelize.ENUM('PENDING', 'COLLECTED', 'DELIVERED'), defaultValue: 'PENDING' },
      collected_at: { type: Sequelize.DATE, allowNull: true },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      actual_distributed_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      updated_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kitchen_distribution_logs');
  },
};
