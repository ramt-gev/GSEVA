'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KitchenDistributionLog extends Model {
    static associate(models) {
      KitchenDistributionLog.belongsTo(models.BldEntry, { foreignKey: 'bld_id', as: 'bld_entry' });
      KitchenDistributionLog.belongsTo(models.SystemUser, { foreignKey: 'updated_by', as: 'updater' });
    }
  }

  KitchenDistributionLog.init(
    {
      log_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      bld_id: { type: DataTypes.CHAR(36), allowNull: false, unique: true },
      status: { type: DataTypes.ENUM('PENDING', 'COLLECTED', 'DELIVERED'), defaultValue: 'PENDING' },
      collected_at: { type: DataTypes.DATE, allowNull: true },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      actual_distributed_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      submitted_at: { type: DataTypes.DATE, allowNull: true },
      updated_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'KitchenDistributionLog',
      tableName: 'kitchen_distribution_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return KitchenDistributionLog;
};
