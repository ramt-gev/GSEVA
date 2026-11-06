'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('group_members', {
      member_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      leader_qr_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'qr_passes', key: 'qr_id' },
        onDelete: 'CASCADE',
      },
      leader_person_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'persons', key: 'person_id' },
      },
      member_number: { type: Sequelize.INTEGER, allowNull: false },
      full_name: { type: Sequelize.STRING(255), allowNull: false },
      age: { type: Sequelize.INTEGER, allowNull: true },
      gender: { type: Sequelize.ENUM('male', 'female', 'other', 'not_specified'), allowNull: true },
      relation_to_leader: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('group_members', ['leader_qr_id'], { name: 'idx_group_members_qr' });
    await queryInterface.addIndex('group_members', ['leader_person_id'], { name: 'idx_group_members_person' });
    await queryInterface.addIndex('group_members', ['leader_qr_id', 'member_number'], {
      name: 'idx_group_members_unique',
      unique: true,
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE group_members ADD CONSTRAINT member_number_positive CHECK (member_number >= 1)
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE group_members ADD CONSTRAINT age_non_negative CHECK (age IS NULL OR age >= 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('group_members');
  },
};
