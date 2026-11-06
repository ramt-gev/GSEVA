'use strict';

// MySQL/MariaDB have no WHERE-qualified unique index (Postgres's
// idx_persons_mobile_unique excludes staff_dependant rows so family members
// can share the staff member's number). Workaround: a STORED generated
// column that is NULL for excluded rows, uniquely indexed — MySQL/MariaDB
// treat every NULL as distinct, so any number of staff_dependant rows can
// share a mobile value. Internal column, never read/written by app code.
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE persons
      ADD COLUMN mobile_unique_key VARCHAR(20)
      GENERATED ALWAYS AS (
        CASE WHEN person_type <> 'staff_dependant' THEN mobile ELSE NULL END
      ) STORED
    `);
    await queryInterface.addIndex('persons', ['mobile_unique_key'], {
      name: 'idx_persons_mobile_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('persons', 'idx_persons_mobile_unique');
    await queryInterface.sequelize.query(`ALTER TABLE persons DROP COLUMN mobile_unique_key`);
  },
};
