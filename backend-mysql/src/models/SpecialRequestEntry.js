'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SpecialRequestEntry extends Model {
    static associate(models) {
      SpecialRequestEntry.belongsTo(models.Department, { foreignKey: 'dept_id', as: 'department' });
      SpecialRequestEntry.belongsTo(models.CatalogItem, { foreignKey: 'catalog_item_id', as: 'item' });
      SpecialRequestEntry.belongsTo(models.SystemUser, { foreignKey: 'approved_by', as: 'approver' });
    }
  }

  SpecialRequestEntry.init(
    {
      request_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false },
      dept_id: { type: DataTypes.CHAR(36), allowNull: false },
      catalog_item_id: { type: DataTypes.CHAR(36), allowNull: false },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: DataTypes.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      requested_by: { type: DataTypes.STRING(255), allowNull: false },
      status: { type: DataTypes.ENUM('REQUESTED', 'APPROVED', 'REJECTED'), defaultValue: 'REQUESTED' },
      approved_by: { type: DataTypes.CHAR(36), allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'SpecialRequestEntry',
      tableName: 'special_request_entries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return SpecialRequestEntry;
};
