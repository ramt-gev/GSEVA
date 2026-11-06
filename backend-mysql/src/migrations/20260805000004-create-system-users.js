'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_users', {
      user_id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },

      username: { type: Sequelize.STRING(100), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },

      role: {
        type: Sequelize.ENUM('super_admin', 'management', 'module_admin', 'dept_manager', 'operator'),
        allowNull: false,
      },

      // Postgres TEXT[] -> JSON array. e.g. ['vms'] for a gate operator.
      module_access: { type: Sequelize.JSON, defaultValue: [] },

      dept_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'departments', key: 'dept_id' },
      },

      permission_overrides: { type: Sequelize.JSON, defaultValue: {} },

      access_valid_from: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      access_valid_until: { type: Sequelize.DATE, allowNull: true },

      allowed_device_ids: { type: Sequelize.JSON, allowNull: true },

      last_login: { type: Sequelize.DATE, allowNull: true },
      failed_login_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      is_locked: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },

      created_by: { type: Sequelize.CHAR(36), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },

      google_sub: { type: Sequelize.STRING(255), allowNull: true, unique: true },
    });

    await queryInterface.addIndex('system_users', ['person_id'], { name: 'idx_users_person' });
    await queryInterface.addIndex('system_users', ['role'], { name: 'idx_users_role' });
    await queryInterface.addIndex('system_users', ['dept_id'], { name: 'idx_users_dept' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_users');
  },
};
