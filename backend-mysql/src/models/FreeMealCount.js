'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FreeMealCount extends Model {}

  FreeMealCount.init(
    {
      count_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      meal_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      meal_slot: { type: DataTypes.ENUM('free_lunch', 'khichadi_am', 'khichadi_pm'), allowNull: false },
      count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
      entry_type: { type: DataTypes.ENUM('single', 'bulk'), defaultValue: 'single' },
      recorded_by: { type: DataTypes.CHAR(36), allowNull: true },
      // Plain column, not Sequelize's managed `updatedAt` — the app only
      // ever inserts new rows here (one per tap event), never updates one,
      // so this is a creation timestamp in practice, same reasoning as
      // CafeCapacity.declared_at.
      recorded_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'FreeMealCount',
      tableName: 'free_meal_counts',
      timestamps: false,
    }
  );

  return FreeMealCount;
};
