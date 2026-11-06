'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('qr_passes', {
      qr_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      stay_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'person_stays', key: 'stay_id' },
      },

      pass_type: {
        type: Sequelize.ENUM('permanent', 'stay_pass', 'day_pass', 'festival_pass', 'temp_cafe_pass', 'tour_pass'),
        allowNull: false,
      },

      valid_from: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      valid_until: { type: Sequelize.DATE, allowNull: true },
      is_active: { type: Sequelize.BOOLEAN, defaultValue: true },

      // (N3 in source schema) shape+membership CHECK — MySQL/MariaDB can
      // enforce shape (JSON_TYPE) but not Postgres's <@ containment
      // operator, so the "every element is a real zone" half moves to a
      // Sequelize model validator (QrPass.js) instead. See migration 000011.
      zone_access: { type: Sequelize.JSON, allowNull: false, defaultValue: ['zone1'] },

      group_size: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      programme_details: { type: Sequelize.JSON, allowNull: true },

      issued_by: { type: Sequelize.CHAR(36), allowNull: true },
      issued_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      deactivated_at: { type: Sequelize.DATE, allowNull: true },
      deactivation_reason: { type: Sequelize.TEXT, allowNull: true },
    });

    await queryInterface.addIndex('qr_passes', ['person_id'], { name: 'idx_qr_person' });
    await queryInterface.addIndex('qr_passes', ['is_active'], { name: 'idx_qr_active' });
    await queryInterface.addIndex('qr_passes', ['stay_id'], { name: 'idx_qr_stay' });

    await queryInterface.sequelize.query(`
      ALTER TABLE qr_passes
      ADD CONSTRAINT group_size_positive CHECK (group_size >= 1)
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE qr_passes
      ADD CONSTRAINT zone_access_is_array CHECK (JSON_TYPE(zone_access) = 'ARRAY')
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('qr_passes');
  },
};
