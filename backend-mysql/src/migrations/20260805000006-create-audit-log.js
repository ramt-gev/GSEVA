'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_log', {
      audit_id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      // Nullable: public-path writes (Smart Registration, webhooks, cron
      // jobs) insert audit rows with user_id = NULL — see CLAUDE.md invariant 3.
      user_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'system_users', key: 'user_id' },
      },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'persons', key: 'person_id' },
      },

      action: { type: Sequelize.STRING(100), allowNull: false },
      module: { type: Sequelize.STRING(100), allowNull: true },
      table_name: { type: Sequelize.STRING(100), allowNull: true },
      record_id: { type: Sequelize.CHAR(36), allowNull: true },

      old_value: { type: Sequelize.JSON, allowNull: true },
      new_value: { type: Sequelize.JSON, allowNull: true },

      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      device_id: { type: Sequelize.STRING(255), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },

      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('audit_log', ['user_id'], { name: 'idx_audit_user' });
    await queryInterface.addIndex('audit_log', ['person_id'], { name: 'idx_audit_person' });
    await queryInterface.addIndex('audit_log', ['action'], { name: 'idx_audit_action' });
    await queryInterface.addIndex('audit_log', ['created_at'], { name: 'idx_audit_time' });
    await queryInterface.addIndex('audit_log', ['record_id'], { name: 'idx_audit_record' });
    await queryInterface.addIndex('audit_log', ['table_name'], { name: 'idx_audit_table' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_log');
  },
};
