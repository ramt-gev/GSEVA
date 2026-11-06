'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GroupMember extends Model {
    static associate(models) {
      GroupMember.belongsTo(models.QrPass, { foreignKey: 'leader_qr_id', as: 'leader_qr_pass' });
      GroupMember.belongsTo(models.Person, { foreignKey: 'leader_person_id', as: 'leader_person' });
    }
  }

  GroupMember.init(
    {
      member_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      leader_qr_id: { type: DataTypes.CHAR(36), allowNull: false },
      leader_person_id: { type: DataTypes.CHAR(36), allowNull: false },
      member_number: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      full_name: { type: DataTypes.STRING(255), allowNull: false },
      age: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 0 } },
      gender: { type: DataTypes.ENUM('male', 'female', 'other', 'not_specified'), allowNull: true },
      relation_to_leader: { type: DataTypes.STRING(100), allowNull: true },
    },
    {
      sequelize,
      modelName: 'GroupMember',
      tableName: 'group_members',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return GroupMember;
};
