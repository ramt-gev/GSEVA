'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cafe_capacity', {
      capacity_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      // References departments.dept_code (unique, not the PK) — matches
      // the source schema (I8).
      cafe_code: {
        type: Sequelize.STRING(30),
        allowNull: false,
        references: { model: 'departments', key: 'dept_code' },
      },
      capacity_date: { type: Sequelize.DATEONLY, allowNull: false },
      meal_type: { type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'), allowNull: false },
      threshold: { type: Sequelize.INTEGER, allowNull: false },
      booked_count: { type: Sequelize.INTEGER, defaultValue: 0 },
      declared_by: { type: Sequelize.STRING(255), allowNull: true },
      declared_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      notes: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('cafe_capacity', ['capacity_date', 'cafe_code'], { name: 'idx_cafe_capacity_date' });
    await queryInterface.addIndex('cafe_capacity', ['cafe_code', 'capacity_date', 'meal_type'], {
      name: 'idx_cafe_capacity_unique',
      unique: true,
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE cafe_capacity ADD CONSTRAINT threshold_non_negative CHECK (threshold >= 0)
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE cafe_capacity ADD CONSTRAINT booked_count_non_negative CHECK (booked_count >= 0)
    `);
    // (N1 in source schema) Deliberately NO CHECK booked_count <= threshold —
    // the recount hook writes the authoritative sum after a payment commits;
    // a CHECK violation there would roll back an already-successful charge.
  },

  async down(queryInterface) {
    await queryInterface.dropTable('cafe_capacity');
  },
};
