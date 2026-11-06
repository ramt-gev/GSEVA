'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      Department.hasMany(models.Person, { foreignKey: 'dept_id', as: 'persons' });
      Department.hasMany(models.SystemUser, { foreignKey: 'dept_id', as: 'system_users' });
      Department.hasMany(models.Department, { foreignKey: 'parent_dept_id', as: 'sub_departments' });
      Department.belongsTo(models.Department, { foreignKey: 'parent_dept_id', as: 'parent_department' });
      Department.hasMany(models.Contractor, { foreignKey: 'dept_id', as: 'contractors' });
      Department.hasMany(models.CafeCapacity, { foreignKey: 'cafe_code', sourceKey: 'dept_code', as: 'cafe_capacity_records' });
      Department.hasMany(models.ZoneUpgradePayment, { foreignKey: 'cafe_code', sourceKey: 'dept_code', as: 'cafe_zone_upgrade_payments' });
      Department.hasMany(models.MealRegistration, { foreignKey: 'dept_sponsor_id', as: 'sponsored_meal_registrations' });
      Department.hasOne(models.DeptHod, { foreignKey: 'dept_code', sourceKey: 'dept_code', as: 'hod' });
    }
  }

  Department.init(
    {
      dept_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      dept_name: { type: DataTypes.STRING(255), allowNull: false },
      dept_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      dept_head_id: { type: DataTypes.CHAR(36), allowNull: true },
      parent_dept_id: { type: DataTypes.CHAR(36), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      sequelize,
      modelName: 'Department',
      tableName: 'departments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return Department;
};
