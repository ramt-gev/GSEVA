'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('menu_entries', {
      menu_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false },
      dept_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'departments', key: 'dept_id' } },
      meal_type: { type: Sequelize.ENUM('BREAKFAST', 'LUNCH', 'DINNER'), allowNull: false },
      catalog_item_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'catalog_items', key: 'catalog_item_id' } },
      cycle_id: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'kitchen_menu_cycles', key: 'cycle_id' } },
      created_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('menu_entries', ['for_date', 'meal_type'], { name: 'idx_menu_date_meal' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('menu_entries');
  },
};
