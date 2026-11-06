'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('feedback', {
      feedback_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
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
      overall_rating: { type: Sequelize.INTEGER, allowNull: true },
      comment: { type: Sequelize.TEXT, allowNull: true },
      source: { type: Sequelize.ENUM('whatsapp', 'web_form'), defaultValue: 'whatsapp' },
      submitted_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('feedback', ['person_id'], { name: 'idx_feedback_person' });
    await queryInterface.addIndex('feedback', ['stay_id'], { name: 'idx_feedback_stay' });

    await queryInterface.sequelize.query(`
      ALTER TABLE feedback ADD CONSTRAINT overall_rating_range CHECK (overall_rating BETWEEN 1 AND 5)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('feedback');
  },
};
