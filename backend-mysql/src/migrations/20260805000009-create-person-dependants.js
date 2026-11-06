'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('person_dependants', {
      dependant_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      staff_person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      dependant_person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      relation: {
        type: Sequelize.ENUM('spouse', 'son', 'daughter', 'father', 'mother', 'sibling', 'other'),
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('person_dependants', ['staff_person_id', 'dependant_person_id'], {
      name: 'idx_person_dependants_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('person_dependants');
  },
};
