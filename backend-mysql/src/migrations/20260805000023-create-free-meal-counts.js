'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('free_meal_counts', {
      count_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      meal_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('(CURRENT_DATE)') },
      meal_slot: { type: Sequelize.ENUM('free_lunch', 'khichadi_am', 'khichadi_pm'), allowNull: false },
      count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      entry_type: { type: Sequelize.ENUM('single', 'bulk'), defaultValue: 'single' },
      recorded_by: { type: Sequelize.CHAR(36), allowNull: true },
      recorded_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('free_meal_counts', ['meal_date', 'meal_slot'], { name: 'idx_free_meals_date' });

    await queryInterface.sequelize.query(`
      ALTER TABLE free_meal_counts ADD CONSTRAINT count_non_negative CHECK (count >= 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('free_meal_counts');
  },
};
