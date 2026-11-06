'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KitchenTransaction extends Model {
    static associate(models) {
      KitchenTransaction.belongsTo(models.CatalogItem, { foreignKey: 'catalog_item_id', as: 'item' });
      KitchenTransaction.belongsTo(models.SystemUser, { foreignKey: 'recorded_by', as: 'recorder' });
    }
  }

  KitchenTransaction.init(
    {
      txn_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      record_type: { type: DataTypes.ENUM('STORAGE', 'WASTAGE'), allowNull: false },
      entry_date: { type: DataTypes.DATEONLY, allowNull: false },
      catalog_item_id: { type: DataTypes.CHAR(36), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: DataTypes.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      status: { type: DataTypes.ENUM('HELD', 'PARTIALLY_RESOLVED', 'CLOSED'), allowNull: true },
      remarks: { type: DataTypes.TEXT, allowNull: true },
      reason: { type: DataTypes.TEXT, allowNull: true },
      recorded_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'KitchenTransaction',
      tableName: 'kitchen_transactions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return KitchenTransaction;
};
