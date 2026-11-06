'use strict';

const MEAL_TYPES = [
  'breakfast', 'free_lunch', 'dinner', 'khichadi_am', 'khichadi_pm',
  'ashram_breakfast', 'ashram_brunch', 'ashram_dinner',
];

// Not read by any Module 1-5 controller yet — created for schema parity and
// because forecastService.js (Module 9) will need it. Pulled forward per
// the plan's own grouping (Module 5's table list).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meal_forecasts', {
      forecast_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      forecast_date: { type: Sequelize.DATEONLY, allowNull: false },
      meal_slot: { type: Sequelize.ENUM(...MEAL_TYPES), allowNull: false },

      forecasted_total: { type: Sequelize.INTEGER, allowNull: true },
      confirmed_guests: { type: Sequelize.INTEGER, defaultValue: 0 },
      confirmed_students: { type: Sequelize.INTEGER, defaultValue: 0 },
      confirmed_bd_reg: { type: Sequelize.INTEGER, defaultValue: 0 },
      estimated_walkins: { type: Sequelize.INTEGER, defaultValue: 0 },

      staff_bd_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      volunteer_bd_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      labourer_bd_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      student_bd_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      other_bd_count: { type: Sequelize.INTEGER, defaultValue: 0 },

      actual_count: { type: Sequelize.INTEGER, allowNull: true },

      festival_flag: { type: Sequelize.BOOLEAN, defaultValue: false },
      festival_name: { type: Sequelize.STRING(255), allowNull: true },
      is_ekadashi: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_grain_free: { type: Sequelize.BOOLEAN, defaultValue: false },
      notes: { type: Sequelize.TEXT, allowNull: true },

      generated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('meal_forecasts', ['forecast_date', 'meal_slot'], {
      name: 'idx_meal_forecasts_unique',
      unique: true,
    });

    // BD-only breakdown columns must be zero on non-BD slots.
    await queryInterface.sequelize.query(`
      ALTER TABLE meal_forecasts ADD CONSTRAINT bd_breakdown_only_on_bd_slots CHECK (
        meal_slot IN ('breakfast','dinner')
        OR (
          staff_bd_count = 0 AND volunteer_bd_count = 0
          AND labourer_bd_count = 0 AND student_bd_count = 0
          AND other_bd_count = 0 AND confirmed_bd_reg = 0
        )
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meal_forecasts');
  },
};
