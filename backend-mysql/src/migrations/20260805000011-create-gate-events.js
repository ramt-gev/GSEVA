'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gate_events', {
      event_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'persons', key: 'person_id' },
      },
      qr_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'qr_passes', key: 'qr_id' },
      },

      gate: {
        type: Sequelize.ENUM('main_gate', 'gate_7', 'sbt_gate', 'exit_gate'),
        allowNull: false,
      },
      event_type: { type: Sequelize.ENUM('entry', 'exit'), allowNull: false },
      result: { type: Sequelize.ENUM('allowed', 'denied', 'manual_override'), allowNull: false },
      deny_reason: { type: Sequelize.TEXT, allowNull: true },

      is_batch_count: { type: Sequelize.BOOLEAN, defaultValue: false },
      batch_count: { type: Sequelize.INTEGER, allowNull: true },

      scanned_by: { type: Sequelize.CHAR(36), allowNull: true },
      scanned_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },

      device_id: { type: Sequelize.STRING(255), allowNull: true },
      is_offline_sync: { type: Sequelize.BOOLEAN, defaultValue: false },
    });

    await queryInterface.addIndex('gate_events', ['person_id'], { name: 'idx_gate_events_person' });
    await queryInterface.addIndex('gate_events', ['qr_id'], { name: 'idx_gate_events_qr' });
    await queryInterface.addIndex('gate_events', ['scanned_at'], { name: 'idx_gate_events_time' });
    await queryInterface.addIndex('gate_events', ['gate'], { name: 'idx_gate_events_gate' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('gate_events');
  },
};
