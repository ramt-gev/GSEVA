'use strict';

// Not written by any service yet — whatsappService.js (Module 4) is a pure
// Interakt API wrapper with no SQL (confirmed via grep across the whole
// Postgres backend too: zero references). Created for schema parity.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('whatsapp_logs', {
      log_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'persons', key: 'person_id' },
      },
      flow_type: { type: Sequelize.STRING(100), allowNull: false },
      template_name: { type: Sequelize.STRING(255), allowNull: true },
      message_preview: { type: Sequelize.TEXT, allowNull: true },
      interakt_msg_id: { type: Sequelize.STRING(255), allowNull: true },
      status: { type: Sequelize.ENUM('sent', 'delivered', 'read', 'failed'), defaultValue: 'sent' },
      sent_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      delivered_at: { type: Sequelize.DATE, allowNull: true },
      read_at: { type: Sequelize.DATE, allowNull: true },
      failed_reason: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('whatsapp_logs', ['person_id'], { name: 'idx_wa_logs_person' });
    await queryInterface.addIndex('whatsapp_logs', ['sent_at'], { name: 'idx_wa_logs_sent' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('whatsapp_logs');
  },
};
