'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vf_tour_slots', {
      slot_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      tour_date: { type: Sequelize.DATEONLY, allowNull: false },
      slot_time: { type: Sequelize.TIME, allowNull: false },
      capacity: { type: Sequelize.INTEGER, defaultValue: 30 },
      booked_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      tour_type: { type: Sequelize.ENUM('free', 'paid'), defaultValue: 'free' },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('vf_tour_slots', ['tour_date', 'slot_time', 'tour_type'], {
      name: 'idx_vf_slots_unique',
      unique: true,
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE vf_tour_slots
      ADD CONSTRAINT vf_slots_booked_within_capacity
      CHECK (booked_count >= 0 AND booked_count <= capacity)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vf_tour_slots');
  },
};
