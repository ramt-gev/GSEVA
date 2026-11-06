'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SystemConfig extends Model {
    static associate(models) {
      SystemConfig.belongsTo(models.SystemUser, { foreignKey: 'updated_by', as: 'updated_by_user' });
    }
  }

  SystemConfig.init(
    {
      config_key: { type: DataTypes.STRING(100), primaryKey: true },
      config_value: { type: DataTypes.TEXT, allowNull: false },
      config_type: {
        type: DataTypes.ENUM('string', 'integer', 'boolean', 'json'),
        defaultValue: 'string',
      },
      description: { type: DataTypes.TEXT, allowNull: true },
      updated_by: { type: DataTypes.CHAR(36), allowNull: true },
    },
    {
      sequelize,
      modelName: 'SystemConfig',
      tableName: 'system_config',
      timestamps: true,
      createdAt: false,
      updatedAt: 'updated_at',
    }
  );

  return SystemConfig;
};
