'use strict';

// Pulled forward from Module 5: registerStaff's labourer path and
// listContractors (both Module 4) need this table now.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('contractors', {
      contractor_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      company_name: { type: Sequelize.STRING(255), allowNull: false },
      poc_name: { type: Sequelize.STRING(255), allowNull: false },
      poc_mobile: { type: Sequelize.STRING(20), allowNull: false },
      poc_email: { type: Sequelize.STRING(255), allowNull: true },

      contract_type: {
        type: Sequelize.ENUM('construction', 'maintenance', 'landscaping', 'electrical', 'housekeeping', 'other'),
        allowNull: false,
      },
      dept_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'departments', key: 'dept_id' },
      },
      project_name: { type: Sequelize.STRING(255), allowNull: true },
      project_scope: { type: Sequelize.TEXT, allowNull: true },

      portal_username: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      portal_password_hash: { type: Sequelize.STRING(255), allowNull: true },

      approved_by: { type: Sequelize.CHAR(36), allowNull: true },
      approved_at: { type: Sequelize.DATE, allowNull: true },

      start_date: { type: Sequelize.DATEONLY, allowNull: true },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'deactivated'),
        defaultValue: 'pending',
      },

      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('contractors', ['dept_id'], { name: 'idx_contractors_dept' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('contractors');
  },
};
