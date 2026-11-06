'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('departments', {
      dept_id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      dept_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      dept_code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
      },
      // No FK: source schema documents this as "set after persons exist" but
      // never actually adds the constraint (only persons.registered_by got
      // the two-phase FK treatment). Kept plain to match source behavior.
      dept_head_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
      },
      parent_dept_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'departments', key: 'dept_id' },
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('departments');
  },
};
