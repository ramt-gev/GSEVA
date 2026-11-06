'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProcurementRequest extends Model {
    static associate(models) {
      ProcurementRequest.belongsTo(models.CatalogItem, { foreignKey: 'catalog_item_id', as: 'item' });
      ProcurementRequest.belongsTo(models.SystemUser, { foreignKey: 'created_by', as: 'creator' });
    }
  }

  ProcurementRequest.init(
    {
      procurement_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      request_date: { type: DataTypes.DATEONLY, allowNull: false },
      catalog_item_id: { type: DataTypes.CHAR(36), allowNull: false },
      quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: DataTypes.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      is_supplementary: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_adhoc: { type: DataTypes.BOOLEAN, defaultValue: false },
      cpd_partner: { type: DataTypes.STRING(255), defaultValue: 'GEV Central Purchase Department' },
      status: {
        type: DataTypes.ENUM('REQUESTED', 'AVAILABLE', 'SHORT', 'ALTERNATE_PROPOSED', 'CONFIRMED', 'DISPATCHED'),
        defaultValue: 'REQUESTED',
      },
      created_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'ProcurementRequest',
      tableName: 'procurement_requests',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return ProcurementRequest;
};
