'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('person_stays', {
      stay_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },

      stay_type: { type: Sequelize.STRING(100), allowNull: true },
      purpose: { type: Sequelize.STRING(255), allowNull: true },
      check_in_date: { type: Sequelize.DATEONLY, allowNull: true },
      check_out_date: { type: Sequelize.DATEONLY, allowNull: true },
      actual_check_in: { type: Sequelize.DATE, allowNull: true },
      actual_check_out: { type: Sequelize.DATE, allowNull: true },
      is_overnight: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },

      accommodation_block: { type: Sequelize.STRING(255), allowNull: true },
      room_number: { type: Sequelize.STRING(50), allowNull: true },
      key_issued: { type: Sequelize.BOOLEAN, defaultValue: false },
      key_returned: { type: Sequelize.BOOLEAN, defaultValue: false },
      key_returned_at: { type: Sequelize.DATE, allowNull: true },
      key_returned_to: { type: Sequelize.STRING(255), allowNull: true },

      ezee_reservation_id: { type: Sequelize.STRING(100), allowNull: true },
      booking_source: { type: Sequelize.STRING(100), allowNull: true },

      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('person_stays', ['person_id'], { name: 'idx_stays_person' });
    await queryInterface.addIndex('person_stays', ['check_in_date', 'check_out_date'], { name: 'idx_stays_dates' });
    await queryInterface.addIndex('person_stays', ['is_active'], { name: 'idx_stays_active' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('person_stays');
  },
};
