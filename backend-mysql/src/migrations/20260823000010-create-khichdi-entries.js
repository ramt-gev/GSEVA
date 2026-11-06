'use strict';

// One whole-kitchen figure per day — for_date is UNIQUE, writes are an
// upsert (see kitchenService.saveKhichdi).
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('khichdi_entries', {
      khichdi_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      for_date: { type: Sequelize.DATEONLY, allowNull: false, unique: true },
      morning_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      evening_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      unit: { type: Sequelize.ENUM('KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'), allowNull: false, defaultValue: 'KG' },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('khichdi_entries');
  },
};
