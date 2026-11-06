'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PersonStay extends Model {
    static associate(models) {
      PersonStay.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  PersonStay.init(
    {
      stay_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },

      stay_type: { type: DataTypes.STRING(100), allowNull: true },
      purpose: { type: DataTypes.STRING(255), allowNull: true },
      check_in_date: { type: DataTypes.DATEONLY, allowNull: true },
      check_out_date: { type: DataTypes.DATEONLY, allowNull: true },
      actual_check_in: { type: DataTypes.DATE, allowNull: true },
      actual_check_out: { type: DataTypes.DATE, allowNull: true },
      is_overnight: { type: DataTypes.BOOLEAN, defaultValue: false },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

      accommodation_block: { type: DataTypes.STRING(255), allowNull: true },
      room_number: { type: DataTypes.STRING(50), allowNull: true },
      key_issued: { type: DataTypes.BOOLEAN, defaultValue: false },
      key_returned: { type: DataTypes.BOOLEAN, defaultValue: false },
      key_returned_at: { type: DataTypes.DATE, allowNull: true },
      key_returned_to: { type: DataTypes.STRING(255), allowNull: true },

      ezee_reservation_id: { type: DataTypes.STRING(100), allowNull: true },
      booking_source: { type: DataTypes.STRING(100), allowNull: true },

      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'PersonStay',
      tableName: 'person_stays',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return PersonStay;
};
