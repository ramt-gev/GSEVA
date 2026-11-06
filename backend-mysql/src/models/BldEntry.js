'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BldEntry extends Model {
    static associate(models) {
      BldEntry.belongsTo(models.Department, { foreignKey: 'dept_id', as: 'department' });
      BldEntry.belongsTo(models.CatalogItem, { foreignKey: 'catalog_item_id', as: 'item' });
      BldEntry.belongsTo(models.SystemUser, { foreignKey: 'created_by', as: 'creator' });
      BldEntry.hasOne(models.KitchenDistributionLog, { foreignKey: 'bld_id', as: 'distribution' });
    }
  }

  BldEntry.init(
    {
      bld_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false },
      dept_id: { type: DataTypes.CHAR(36), allowNull: false },
      meal_type: { type: DataTypes.ENUM('BREAKFAST', 'LUNCH', 'DINNER'), allowNull: false },
      catalog_item_id: { type: DataTypes.CHAR(36), allowNull: false },
      people_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      total_item_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: DataTypes.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      source: { type: DataTypes.ENUM('DEPT', 'HR_API', 'BIOMETRIC', 'SYSTEM'), allowNull: false, defaultValue: 'DEPT' },
      created_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'BldEntry',
      tableName: 'bld_entries',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return BldEntry;
};
