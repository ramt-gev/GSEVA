'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Contractor extends Model {
    static associate(models) {
      Contractor.belongsTo(models.Department, { foreignKey: 'dept_id', as: 'department' });
      Contractor.hasMany(models.ContractorLabourer, { foreignKey: 'contractor_id', as: 'labourers' });
      Contractor.hasMany(models.MealRegistration, { foreignKey: 'contractor_id', as: 'meal_registrations' });
    }
  }

  Contractor.init(
    {
      contractor_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      company_name: { type: DataTypes.STRING(255), allowNull: false },
      poc_name: { type: DataTypes.STRING(255), allowNull: false },
      poc_mobile: { type: DataTypes.STRING(20), allowNull: false },
      poc_email: { type: DataTypes.STRING(255), allowNull: true },

      contract_type: {
        type: DataTypes.ENUM('construction', 'maintenance', 'landscaping', 'electrical', 'housekeeping', 'other'),
        allowNull: false,
      },
      dept_id: { type: DataTypes.CHAR(36), allowNull: true },
      project_name: { type: DataTypes.STRING(255), allowNull: true },
      project_scope: { type: DataTypes.TEXT, allowNull: true },

      portal_username: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      portal_password_hash: { type: DataTypes.STRING(255), allowNull: true },

      approved_by: { type: DataTypes.CHAR(36), allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },

      start_date: { type: DataTypes.DATEONLY, allowNull: true },
      end_date: { type: DataTypes.DATEONLY, allowNull: true },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'deactivated'),
        defaultValue: 'pending',
      },

      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Contractor',
      tableName: 'contractors',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return Contractor;
};
