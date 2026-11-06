'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class FestivalEvent extends Model {}

  FestivalEvent.init(
    {
      festival_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      festival_name: { type: DataTypes.STRING(255), allowNull: false },
      festival_date: { type: DataTypes.DATEONLY, allowNull: false },
      festival_end_date: { type: DataTypes.DATEONLY, allowNull: true },
      expected_footfall: { type: DataTypes.INTEGER, allowNull: true },
      festival_mode_on: { type: DataTypes.BOOLEAN, defaultValue: true },
      is_ekadashi: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_grain_free: { type: DataTypes.BOOLEAN, defaultValue: false },
      pre_reg_opens_at: { type: DataTypes.DATEONLY, allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'FestivalEvent',
      tableName: 'festival_events',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return FestivalEvent;
};
