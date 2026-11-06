'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bld_entries', {
      bld_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false },
      dept_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'departments', key: 'dept_id' } },
      meal_type: { type: Sequelize.ENUM('BREAKFAST', 'LUNCH', 'DINNER'), allowNull: false },
      catalog_item_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'catalog_items', key: 'catalog_item_id' } },
      people_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      total_item_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      source: { type: Sequelize.ENUM('DEPT', 'HR_API', 'BIOMETRIC', 'SYSTEM'), allowNull: false, defaultValue: 'DEPT' },
      created_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('bld_entries', ['for_date', 'meal_type'], { name: 'idx_bld_date_meal' });
    await queryInterface.addIndex('bld_entries', ['dept_id'], { name: 'idx_bld_dept' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bld_entries');
  },
};
