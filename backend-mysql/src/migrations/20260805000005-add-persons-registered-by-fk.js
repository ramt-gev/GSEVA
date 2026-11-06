'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addConstraint('persons', {
      fields: ['registered_by'],
      type: 'foreign key',
      name: 'fk_persons_registered_by',
      references: { table: 'system_users', field: 'user_id' },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('persons', 'fk_persons_registered_by');
  },
};
