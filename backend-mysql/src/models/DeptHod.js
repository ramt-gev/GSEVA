'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DeptHod extends Model {
    static associate(models) {
      DeptHod.belongsTo(models.Department, { foreignKey: 'dept_code', targetKey: 'dept_code', as: 'department' });
    }
  }

  DeptHod.init(
    {
      hod_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      dept_code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
      hod_name: { type: DataTypes.STRING(255), allowNull: false },
      gac_member: { type: DataTypes.STRING(255), allowNull: true },
      project_contact: { type: DataTypes.STRING(255), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'DeptHod',
      tableName: 'dept_hods',
      timestamps: false,
    }
  );

  return DeptHod;
};
