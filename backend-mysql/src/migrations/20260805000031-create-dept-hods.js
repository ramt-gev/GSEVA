'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('dept_hods', {
      hod_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      dept_code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        unique: true,
        references: { model: 'departments', key: 'dept_code' },
        onDelete: 'CASCADE',
      },
      hod_name: { type: Sequelize.STRING(255), allowNull: false },
      gac_member: { type: Sequelize.STRING(255), allowNull: true },
      project_contact: { type: Sequelize.STRING(255), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('dept_hods');
  },
};
