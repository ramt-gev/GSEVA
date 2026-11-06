'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('procurement_requests', {
      procurement_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      request_date: { type: Sequelize.DATEONLY, allowNull: false },
      catalog_item_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'catalog_items', key: 'catalog_item_id' } },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      is_supplementary: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_adhoc: { type: Sequelize.BOOLEAN, defaultValue: false },
      cpd_partner: { type: Sequelize.STRING(255), defaultValue: 'GEV Central Purchase Department' },
      status: {
        type: Sequelize.ENUM('REQUESTED', 'AVAILABLE', 'SHORT', 'ALTERNATE_PROPOSED', 'CONFIRMED', 'DISPATCHED'),
        defaultValue: 'REQUESTED',
      },
      created_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('procurement_requests');
  },
};
