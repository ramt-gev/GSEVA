'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicles', {
      vehicle_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'persons', key: 'person_id' },
      },
      vehicle_number: { type: Sequelize.STRING(50), allowNull: false },
      vehicle_type: { type: Sequelize.STRING(50), allowNull: true },
      driver_name: { type: Sequelize.STRING(255), allowNull: true },
      purpose: { type: Sequelize.STRING(255), allowNull: true },
      is_permanent: { type: Sequelize.BOOLEAN, defaultValue: false },
      is_gev_owned: { type: Sequelize.BOOLEAN, defaultValue: false },
      entry_time: { type: Sequelize.DATE, allowNull: true },
      exit_time: { type: Sequelize.DATE, allowNull: true },
      parking_zone: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('vehicles', ['vehicle_number'], { name: 'idx_vehicles_number' });
    await queryInterface.addIndex('vehicles', ['entry_time'], { name: 'idx_vehicles_entry' });
    await queryInterface.addIndex('vehicles', ['person_id'], { name: 'idx_vehicles_person' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vehicles');
  },
};
