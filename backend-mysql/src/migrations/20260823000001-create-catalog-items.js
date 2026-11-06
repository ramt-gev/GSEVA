'use strict';

// Shared item lookup for every Kitchen module (menu_entries, bld_entries,
// kitchen_transactions, procurement_requests, etc.) — one canonical name per
// prasadam item instead of each table free-texting its own spelling.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('catalog_items', {
      catalog_item_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      item_name: { type: Sequelize.STRING(255), allowNull: false, unique: true },
      default_unit: {
        type: Sequelize.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'),
        allowNull: false,
        defaultValue: 'KG',
      },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('catalog_items');
  },
};
