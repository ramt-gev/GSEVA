'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ashram_kitchen_counts', {
      count_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      count_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('(CURRENT_DATE)') },
      population_type: { type: Sequelize.ENUM('brahmachari', 'varishtha_vaishnava'), allowNull: false },
      meal_slot: { type: Sequelize.ENUM('ashram_breakfast', 'ashram_brunch', 'ashram_dinner'), allowNull: false },

      regular_count: { type: Sequelize.INTEGER, allowNull: false },
      visiting_extra: { type: Sequelize.INTEGER, defaultValue: 0 },
      // GENERATED column ports ~verbatim from the Postgres source.
      total_count: {
        type: `INT GENERATED ALWAYS AS (regular_count + visiting_extra) STORED`,
      },

      updated_by: { type: Sequelize.CHAR(36), allowNull: true },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE ashram_kitchen_counts ADD CONSTRAINT regular_count_non_negative CHECK (regular_count >= 0)
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE ashram_kitchen_counts ADD CONSTRAINT visiting_extra_non_negative CHECK (visiting_extra >= 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('ashram_kitchen_counts');
  },
};
