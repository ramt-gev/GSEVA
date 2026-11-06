'use strict';
const { Model } = require('sequelize');

// Not read/written by any controller yet — created for schema parity
// (Module 5's table group). total_count is a real DB GENERATED column
// (migration 000025); intentionally NOT declared as a model attribute so
// Sequelize never tries to write to it (same reasoning as
// persons.mobile_unique_key).
module.exports = (sequelize, DataTypes) => {
  class AshramKitchenCount extends Model {}

  AshramKitchenCount.init(
    {
      count_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      count_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      population_type: { type: DataTypes.ENUM('brahmachari', 'varishtha_vaishnava'), allowNull: false },
      meal_slot: { type: DataTypes.ENUM('ashram_breakfast', 'ashram_brunch', 'ashram_dinner'), allowNull: false },

      regular_count: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
      visiting_extra: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },

      updated_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'AshramKitchenCount',
      tableName: 'ashram_kitchen_counts',
      timestamps: true,
      createdAt: false,
      updatedAt: 'updated_at',
    }
  );

  return AshramKitchenCount;
};
