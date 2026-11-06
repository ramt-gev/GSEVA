'use strict';

// One row per day — the 2:00 PM planning meeting. Supervisor convenes/enters
// inputs (status stays IN_PROGRESS); HOD is the only role that can move it
// to FINALIZED.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kitchen_meetings', {
      meeting_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      convened_at: { type: Sequelize.DATE, allowNull: true },
      prasadam_taker_estimate: { type: Sequelize.INTEGER, allowNull: true },
      quantity_notes: { type: Sequelize.TEXT, allowNull: true },
      machinery_status_note: { type: Sequelize.TEXT, allowNull: true },
      status: { type: Sequelize.ENUM('IN_PROGRESS', 'FINALIZED'), defaultValue: 'IN_PROGRESS' },
      created_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      finalized_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      finalized_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kitchen_meetings');
  },
};
