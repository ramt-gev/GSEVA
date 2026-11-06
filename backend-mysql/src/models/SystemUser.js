'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SystemUser extends Model {
    static associate(models) {
      SystemUser.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      SystemUser.belongsTo(models.Department, { foreignKey: 'dept_id', as: 'department' });
      SystemUser.hasMany(models.Person, { foreignKey: 'registered_by', as: 'registered_persons' });
      SystemUser.hasMany(models.AuditLog, { foreignKey: 'user_id', as: 'audit_entries' });
      SystemUser.hasMany(models.RoleAssignmentLog, { foreignKey: 'target_user_id', as: 'role_assignments_received' });
      SystemUser.hasMany(models.RoleAssignmentLog, { foreignKey: 'done_by', as: 'role_assignments_made' });
    }
  }

  SystemUser.init(
    {
      user_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },

      username: { type: DataTypes.STRING(100), allowNull: false, unique: true },
      password_hash: { type: DataTypes.STRING(255), allowNull: false },

      role: {
        type: DataTypes.ENUM('super_admin', 'management', 'module_admin', 'dept_manager', 'operator'),
        allowNull: false,
      },

      // Postgres TEXT[] -> JSON array, e.g. ['vms'] for a gate operator.
      module_access: { type: DataTypes.JSON, defaultValue: [] },

      dept_id: { type: DataTypes.CHAR(36), allowNull: true },
      permission_overrides: { type: DataTypes.JSON, defaultValue: {} },

      access_valid_from: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      access_valid_until: { type: DataTypes.DATE, allowNull: true },

      allowed_device_ids: { type: DataTypes.JSON, allowNull: true },

      last_login: { type: DataTypes.DATE, allowNull: true },
      failed_login_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

      created_by: { type: DataTypes.CHAR(36), allowNull: true },
      google_sub: { type: DataTypes.STRING(255), allowNull: true, unique: true },
    },
    {
      sequelize,
      modelName: 'SystemUser',
      tableName: 'system_users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return SystemUser;
};
