'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VfTourSlot extends Model {
    static associate(models) {
      VfTourSlot.hasMany(models.VfSlotBooking, { foreignKey: 'slot_id', as: 'bookings' });
    }
  }

  VfTourSlot.init(
    {
      slot_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      tour_date: { type: DataTypes.DATEONLY, allowNull: false },
      slot_time: { type: DataTypes.TIME, allowNull: false },
      capacity: { type: DataTypes.INTEGER, defaultValue: 30 },
      // Kept in sync by VfSlotBooking's afterCreate/afterUpdate/afterDestroy
      // hooks (see VfSlotBooking.js) — never written directly elsewhere.
      booked_count: { type: DataTypes.INTEGER, defaultValue: 0 },
      tour_type: { type: DataTypes.ENUM('free', 'paid'), defaultValue: 'free' },
    },
    {
      sequelize,
      modelName: 'VfTourSlot',
      tableName: 'vf_tour_slots',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    }
  );

  return VfTourSlot;
};
