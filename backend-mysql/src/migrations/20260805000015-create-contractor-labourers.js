'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contractor_labourers', {
      cl_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      contractor_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'contractors', key: 'contractor_id' },
      },

      camp_location: {
        type: Sequelize.ENUM('camp_a_inside', 'camp_b_outside', 'not_staying'),
        allowNull: false,
      },
      annakshetra_bd_opted: { type: Sequelize.BOOLEAN, allowNull: true },

      approval_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'deactivated'),
        defaultValue: 'pending',
      },
      approved_by: { type: Sequelize.CHAR(36), allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },
      rejection_reason: { type: Sequelize.TEXT, allowNull: true },

      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('contractor_labourers', ['person_id'], { name: 'idx_cl_person' });
    await queryInterface.addIndex('contractor_labourers', ['contractor_id'], { name: 'idx_cl_contractor' });
    await queryInterface.addIndex('contractor_labourers', ['person_id', 'contractor_id'], {
      name: 'idx_cl_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contractor_labourers');
  },
};
