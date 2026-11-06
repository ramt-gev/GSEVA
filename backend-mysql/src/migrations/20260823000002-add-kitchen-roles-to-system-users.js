'use strict';

// Kitchen is its own role family, not a module_access flag on the existing 5
// roles — a kitchen_supervisor has no business seeing the VMS/AMS admin
// pages, and vice versa. MySQL ENUM alteration needs a full column rebuild,
// not an incremental add.
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('system_users', 'role', {
      type: Sequelize.ENUM(
        'super_admin', 'management', 'module_admin', 'dept_manager', 'operator',
        'kitchen_supervisor', 'kitchen_hod', 'kitchen_collection_distribution'
      ),
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('system_users', 'role', {
      type: Sequelize.ENUM('super_admin', 'management', 'module_admin', 'dept_manager', 'operator'),
      allowNull: false,
    });
  },
};
