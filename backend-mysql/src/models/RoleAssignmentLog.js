'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class RoleAssignmentLog extends Model {
    static associate(models) {
      RoleAssignmentLog.belongsTo(models.SystemUser, { foreignKey: 'target_user_id', as: 'target_user' });
      RoleAssignmentLog.belongsTo(models.SystemUser, { foreignKey: 'done_by', as: 'done_by_user' });
    }
  }

  RoleAssignmentLog.init(
    {
      log_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      target_user_id: { type: DataTypes.CHAR(36), allowNull: false },
      action: { type: DataTypes.ENUM('role_assigned', 'role_revoked'), allowNull: false },
      role_assigned: {
        type: DataTypes.ENUM('super_admin', 'management', 'module_admin', 'dept_manager', 'operator'),
        allowNull: true,
      },
      modules_given: { type: DataTypes.JSON, allowNull: true },
      reason: { type: DataTypes.TEXT, allowNull: true },
      done_by: { type: DataTypes.CHAR(36), allowNull: false },
      done_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'RoleAssignmentLog',
      tableName: 'role_assignment_log',
      timestamps: false,
    }
  );

  return RoleAssignmentLog;
};
