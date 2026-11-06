'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GacMember extends Model {
    static associate(models) {
      GacMember.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  GacMember.init(
    {
      gac_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: true },
      gac_member_name: { type: DataTypes.STRING(255), allowNull: false },
      gac_position: { type: DataTypes.STRING(255), allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'GacMember',
      tableName: 'gac_members',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return GacMember;
};
