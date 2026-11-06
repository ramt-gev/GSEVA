'use strict';
const { Model } = require('sequelize');

const MEAL_TYPES = [
  'breakfast', 'free_lunch', 'dinner', 'khichadi_am', 'khichadi_pm',
  'ashram_breakfast', 'ashram_brunch', 'ashram_dinner',
];

// Not read/written by any controller yet — Module 9's forecastService is
// the first real consumer. Created now for schema parity (grouped with the
// rest of Module 5's Annakshetra tables in the source schema).
module.exports = (sequelize, DataTypes) => {
  class MealForecast extends Model {}

  MealForecast.init(
    {
      forecast_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      forecast_date: { type: DataTypes.DATEONLY, allowNull: false },
      meal_slot: { type: DataTypes.ENUM(...MEAL_TYPES), allowNull: false },

      forecasted_total: { type: DataTypes.INTEGER, allowNull: true },
      confirmed_guests: { type: DataTypes.INTEGER, defaultValue: 0 },
      confirmed_students: { type: DataTypes.INTEGER, defaultValue: 0 },
      confirmed_bd_reg: { type: DataTypes.INTEGER, defaultValue: 0 },
      estimated_walkins: { type: DataTypes.INTEGER, defaultValue: 0 },

      staff_bd_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      volunteer_bd_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      labourer_bd_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      student_bd_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      other_bd_count: { type: DataTypes.INTEGER, defaultValue: 0 },

      actual_count: { type: DataTypes.INTEGER, allowNull: true },

      festival_flag: { type: DataTypes.BOOLEAN, defaultValue: false },
      festival_name: { type: DataTypes.STRING(255), allowNull: true },
      is_ekadashi: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_grain_free: { type: DataTypes.BOOLEAN, defaultValue: false },
      notes: { type: DataTypes.TEXT, allowNull: true },
      generated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'MealForecast',
      tableName: 'meal_forecasts',
      timestamps: false,
    }
  );

  return MealForecast;
};
