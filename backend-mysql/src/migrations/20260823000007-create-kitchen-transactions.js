'use strict';

// Storage and Wastage share one table (record_type discriminator) — same
// shape (entry_date, item, quantity, free-text note) with only one field
// each doesn't use (status is storage-only, reason is wastage-only).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kitchen_transactions', {
      txn_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      record_type: { type: Sequelize.ENUM('STORAGE', 'WASTAGE'), allowNull: false },
      entry_date: { type: Sequelize.DATEONLY, allowNull: false },
      catalog_item_id: { type: Sequelize.CHAR(36), allowNull: false, references: { model: 'catalog_items', key: 'catalog_item_id' } },
      quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      status: { type: Sequelize.ENUM('HELD', 'PARTIALLY_RESOLVED', 'CLOSED'), allowNull: true },
      remarks: { type: Sequelize.TEXT, allowNull: true },
      reason: { type: Sequelize.TEXT, allowNull: true },
      recorded_by: { type: Sequelize.CHAR(36), allowNull: true, references: { model: 'system_users', key: 'user_id' } },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('kitchen_transactions', ['record_type', 'entry_date'], { name: 'idx_kt_type_date' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kitchen_transactions');
  },
};
