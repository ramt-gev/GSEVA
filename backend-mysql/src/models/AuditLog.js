'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  // Intentionally no update/destroy convenience wired up anywhere in the
  // app for this model — audit_log is insert-only. The DB also enforces
  // this with BEFORE UPDATE/DELETE triggers (migration ...000007) as a
  // backstop against direct edits outside the app.
  class AuditLog extends Model {
    static associate(models) {
      AuditLog.belongsTo(models.SystemUser, { foreignKey: 'user_id', as: 'user' });
      AuditLog.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  AuditLog.init(
    {
      audit_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      user_id: { type: DataTypes.CHAR(36), allowNull: true },
      person_id: { type: DataTypes.CHAR(36), allowNull: true },

      action: { type: DataTypes.STRING(100), allowNull: false },
      module: { type: DataTypes.STRING(100), allowNull: true },
      table_name: { type: DataTypes.STRING(100), allowNull: true },
      record_id: { type: DataTypes.CHAR(36), allowNull: true },

      old_value: { type: DataTypes.JSON, allowNull: true },
      new_value: { type: DataTypes.JSON, allowNull: true },

      ip_address: { type: DataTypes.STRING(45), allowNull: true },
      device_id: { type: DataTypes.STRING(255), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'AuditLog',
      tableName: 'audit_log',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return AuditLog;
};
