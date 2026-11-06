'use strict';

// Schema-only table, matching the source: not referenced by any controller
// yet in either backend (grepped, confirmed). Created here for schema
// parity with Docs/GEV_Database_Schema_v3_Final.sql STEP 3, not because a
// current feature needs it.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('temp_access_passes', {
      pass_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },

      zone: {
        type: Sequelize.ENUM('zone1', 'zone2', 'zone3', 'zone4'),
        allowNull: false,
        defaultValue: 'zone3',
      },
      purpose: { type: Sequelize.STRING(255), allowNull: true },
      cafe_name: { type: Sequelize.STRING(255), allowNull: true },
      meal_type: { type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'), allowNull: true },

      amount_paid: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      payment_mode: { type: Sequelize.STRING(50), allowNull: true },

      valid_from: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      valid_until: { type: Sequelize.DATE, allowNull: false },
      is_used: { type: Sequelize.BOOLEAN, defaultValue: false },

      issued_by: { type: Sequelize.CHAR(36), allowNull: true },
      issued_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('temp_access_passes', ['person_id'], { name: 'idx_temp_pass_person' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('temp_access_passes');
  },
};
