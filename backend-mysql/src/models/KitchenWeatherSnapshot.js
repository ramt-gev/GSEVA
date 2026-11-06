'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KitchenWeatherSnapshot extends Model {}

  KitchenWeatherSnapshot.init(
    {
      snapshot_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
      condition_text: { type: DataTypes.STRING(255), allowNull: true },
      temp_c: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
      rain_mm: { type: DataTypes.DECIMAL(5, 1), allowNull: true },
    },
    {
      sequelize,
      modelName: 'KitchenWeatherSnapshot',
      tableName: 'kitchen_weather_snapshots',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return KitchenWeatherSnapshot;
};
