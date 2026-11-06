'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KhichdiEntry extends Model {}

  KhichdiEntry.init(
    {
      khichdi_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
      morning_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      evening_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: DataTypes.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
    },
    {
      sequelize,
      modelName: 'KhichdiEntry',
      tableName: 'khichdi_entries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return KhichdiEntry;
};
