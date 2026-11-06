'use strict';

const MEAL_TYPES = [
  'breakfast', 'free_lunch', 'dinner', 'khichadi_am', 'khichadi_pm',
  'ashram_breakfast', 'ashram_brunch', 'ashram_dinner',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('meal_token_events', {
      token_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      // NULL for free meals (free_lunch, khichadi_*, ashram_*) — see CHECK below
      reg_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'meal_registrations', key: 'reg_id' },
      },
      meal_type: { type: Sequelize.ENUM(...MEAL_TYPES), allowNull: false },
      meal_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('(CURRENT_DATE)') },
      served_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      served_by: { type: Sequelize.CHAR(36), allowNull: true },
    });

    await queryInterface.addIndex('meal_token_events', ['meal_date'], { name: 'idx_meal_tokens_date' });
    await queryInterface.addIndex('meal_token_events', ['person_id'], { name: 'idx_meal_tokens_person' });
    await queryInterface.addIndex('meal_token_events', ['reg_id'], { name: 'idx_meal_tokens_reg' });
    await queryInterface.addIndex('meal_token_events', ['person_id', 'meal_type', 'meal_date'], {
      name: 'idx_meal_tokens_unique',
      unique: true,
    });

    // B/D scans must reference a registration; free meals must not.
    await queryInterface.sequelize.query(`
      ALTER TABLE meal_token_events ADD CONSTRAINT reg_id_matches_meal_type CHECK (
        (meal_type IN ('breakfast', 'dinner') AND reg_id IS NOT NULL)
        OR
        (meal_type NOT IN ('breakfast', 'dinner') AND reg_id IS NULL)
      )
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('meal_token_events');
  },
};
