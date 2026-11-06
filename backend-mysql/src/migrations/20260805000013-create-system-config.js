'use strict';

// Pulled forward from Module 9: registerVisitor (day_pass_valid_until) and
// publicConfig/getCafeCapacity (Module 4) already need to read this table.
// CLAUDE.md invariant 2: business values must live here, never hardcoded.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_config', {
      config_key: { type: Sequelize.STRING(100), primaryKey: true },
      config_value: { type: Sequelize.TEXT, allowNull: false },
      config_type: {
        type: Sequelize.ENUM('string', 'integer', 'boolean', 'json'),
        defaultValue: 'string',
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      updated_by: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'system_users', key: 'user_id' },
      },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_config');
  },
};
