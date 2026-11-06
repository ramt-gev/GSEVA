'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gac_members', {
      gac_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'persons', key: 'person_id' },
      },
      gac_member_name: { type: Sequelize.STRING(255), allowNull: false },
      gac_position: { type: Sequelize.STRING(255), allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('gac_members');
  },
};
