'use strict';
const { Model } = require('sequelize');

// Recomputes vf_tour_slots.booked_count for one slot from the authoritative
// source (count of confirmed bookings). Mirrors the Postgres backend's
// vf_slot_bookings_recount() trigger, as an application-layer hook instead
// of a DB trigger (see plan: counter-sync logic lives in the app, audit
// immutability stays a DB trigger).
async function recomputeSlotCount(sequelize, slot_id, options) {
  const { VfSlotBooking, VfTourSlot } = sequelize.models;
  const count = await VfSlotBooking.count({
    where: { slot_id, status: 'confirmed' },
    transaction: options.transaction,
  });
  await VfTourSlot.update(
    { booked_count: count },
    { where: { slot_id }, transaction: options.transaction }
  );
}

module.exports = (sequelize, DataTypes) => {
  class VfSlotBooking extends Model {
    static associate(models) {
      VfSlotBooking.belongsTo(models.VfTourSlot, { foreignKey: 'slot_id', as: 'slot' });
      VfSlotBooking.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  VfSlotBooking.init(
    {
      booking_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      slot_id: { type: DataTypes.CHAR(36), allowNull: false },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },
      booked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      status: {
        type: DataTypes.ENUM('confirmed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
    },
    {
      sequelize,
      modelName: 'VfSlotBooking',
      tableName: 'vf_slot_bookings',
      timestamps: false,
      hooks: {
        afterCreate: (booking, options) => recomputeSlotCount(sequelize, booking.slot_id, options),
        afterUpdate: async (booking, options) => {
          await recomputeSlotCount(sequelize, booking.slot_id, options);
          const previousSlotId = booking.previous('slot_id');
          if (previousSlotId && previousSlotId !== booking.slot_id) {
            await recomputeSlotCount(sequelize, previousSlotId, options);
          }
        },
        afterDestroy: (booking, options) => recomputeSlotCount(sequelize, booking.slot_id, options),
      },
    }
  );

  return VfSlotBooking;
};
