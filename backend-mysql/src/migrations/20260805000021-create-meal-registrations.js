'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meal_registrations', {
      reg_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      meal_type: { type: Sequelize.ENUM('breakfast', 'dinner'), allowNull: false },
      payment_method: {
        type: Sequelize.ENUM('salary_deduction', 'dept_sponsored', 'free_welfare', 'ashram_covered', 'rent_included', 'self_paid'),
        allowNull: false,
      },
      dept_sponsor_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'departments', key: 'dept_id' },
      },
      contractor_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'contractors', key: 'contractor_id' },
      },
      valid_from: { type: Sequelize.DATEONLY, allowNull: false },
      valid_until: { type: Sequelize.DATEONLY, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
      monthly_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
      registered_by: { type: Sequelize.CHAR(36), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('meal_registrations', ['person_id'], { name: 'idx_meal_reg_person' });
    await queryInterface.addIndex('meal_registrations', ['is_active'], { name: 'idx_meal_reg_active' });
    await queryInterface.addIndex('meal_registrations', ['dept_sponsor_id'], { name: 'idx_meal_reg_dept_sponsor' });
    await queryInterface.addIndex('meal_registrations', ['contractor_id'], { name: 'idx_meal_reg_contractor' });

    // Partial-unique workaround (MySQL/MariaDB have no WHERE-qualified
    // unique index): one active registration per person+meal_type.
    // NOTE: unlike persons.mobile_unique_key (migration 000003), this can't
    // be a GENERATED ALWAYS column — MariaDB disallows generated columns
    // that depend on a column carrying a foreign key constraint (person_id
    // here references persons.person_id). Confirmed empirically: the exact
    // same CASE-expression pattern that worked for persons.mobile fails on
    // this table with "Function or expression ... cannot be used" the
    // moment person_id (the FK column) is referenced, even with no CONCAT
    // involved. Plain column instead, populated by a beforeSave hook in the
    // MealRegistration model — same DB-level uniqueness guarantee, just
    // computed in the app layer rather than by MariaDB.
    await queryInterface.addColumn('meal_registrations', 'active_reg_unique_key', {
      type: Sequelize.STRING(80),
      allowNull: true,
    });
    await queryInterface.addIndex('meal_registrations', ['active_reg_unique_key'], {
      name: 'idx_meal_reg_active_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meal_registrations');
  },
};
