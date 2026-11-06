'use strict';

// Keyed on the preacher, not a requesting department — a touring sannyasi's
// programme isn't tied to any one campus department.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('preaching_program_entries', {
      preaching_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false },
      preacher_name: { type: Sequelize.STRING(255), allowNull: false },
      people_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      catalog_item_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'catalog_items', key: 'catalog_item_id' } },
      created_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('preaching_program_entries');
  },
};
