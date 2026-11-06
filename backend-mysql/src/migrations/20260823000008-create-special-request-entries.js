'use strict';

// requested_by is free text, not a system_users FK — department coordinators
// who submit these (e.g. "Guest House Coordinator") don't have GSEVA logins.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('special_request_entries', {
      request_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false },
      dept_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'departments', key: 'dept_id' } },
      catalog_item_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'catalog_items', key: 'catalog_item_id' } },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      requested_by: { type: Sequelize.STRING(255), allowNull: false },
      status: { type: Sequelize.ENUM('REQUESTED', 'APPROVED', 'REJECTED'), defaultValue: 'REQUESTED' },
      approved_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('special_request_entries');
  },
};
