'use strict';
const { Model } = require('sequelize');

const MEAL_TYPES = [
  'breakfast', 'free_lunch', 'dinner', 'khichadi_am', 'khichadi_pm',
  'ashram_breakfast', 'ashram_brunch', 'ashram_dinner',
];

module.exports = (sequelize, DataTypes) => {
  class MealTokenEvent extends Model {
    static associate(models) {
      MealTokenEvent.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      MealTokenEvent.belongsTo(models.MealRegistration, { foreignKey: 'reg_id', as: 'registration' });
    }
  }

  MealTokenEvent.init(
    {
      token_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },
      reg_id: { type: DataTypes.CHAR(36), allowNull: true },
      meal_type: { type: DataTypes.ENUM(...MEAL_TYPES), allowNull: false },
      meal_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      served_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      served_by: { type: DataTypes.CHAR(36), allowNull: true },
      group_size: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    },
    {
      sequelize,
      modelName: 'MealTokenEvent',
      tableName: 'meal_token_events',
      timestamps: false,
    }
  );

  return MealTokenEvent;
};
