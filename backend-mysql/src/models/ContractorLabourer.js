'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ContractorLabourer extends Model {
    static associate(models) {
      ContractorLabourer.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      ContractorLabourer.belongsTo(models.Contractor, { foreignKey: 'contractor_id', as: 'contractor' });
    }
  }

  ContractorLabourer.init(
    {
      cl_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },
      contractor_id: { type: DataTypes.CHAR(36), allowNull: false },

      camp_location: {
        type: DataTypes.ENUM('camp_a_inside', 'camp_b_outside', 'not_staying'),
        allowNull: false,
      },
      annakshetra_bd_opted: { type: DataTypes.BOOLEAN, allowNull: true },

      approval_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'deactivated'),
        defaultValue: 'pending',
      },
      approved_by: { type: DataTypes.CHAR(36), allowNull: true },
      approved_at: { type: DataTypes.DATE, allowNull: true },
      rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ContractorLabourer',
      tableName: 'contractor_labourers',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return ContractorLabourer;
};
