'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vf_slot_bookings', {
      booking_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      slot_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'vf_tour_slots', key: 'slot_id' },
      },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      booked_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      status: {
        type: Sequelize.ENUM('confirmed', 'cancelled', 'no_show'),
        allowNull: false,
        defaultValue: 'confirmed',
      },
    });

    await queryInterface.addIndex('vf_slot_bookings', ['slot_id'], { name: 'idx_vf_bookings_slot' });
    await queryInterface.addIndex('vf_slot_bookings', ['person_id'], { name: 'idx_vf_bookings_person' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vf_slot_bookings');
  },
};
