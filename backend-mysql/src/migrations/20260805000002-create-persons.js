'use strict';

// person_type_enum — 16 visitor/person types (unchanged from Docs/GEV_Database_Schema_v3_Final.sql)
const PERSON_TYPES = [
  'room_guest', 'free_day_visitor', 'paid_day_visitor', 'course_student',
  'volunteer_seva', 'sustainability_intern', 'resident_staff', 'staff_dependant',
  'brahmachari', 'varishtha_vaishnava', 'weekly_labourer_local',
  'weekly_labourer_outstation', 'construction_labourer', 'vendor_supplier',
  'corporate_tour_group', 'vip_dignitary',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('persons', {
      person_id: {
        type: Sequelize.CHAR(36),
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
      },
      full_name: { type: Sequelize.STRING(255), allowNull: false },
      // Uniqueness (except staff_dependant rows) is enforced via a generated
      // column + unique index added in the next migration — MySQL/MariaDB
      // have no WHERE-qualified unique index like Postgres's partial index.
      mobile: { type: Sequelize.STRING(20), allowNull: false },
      gender: {
        type: Sequelize.ENUM('male', 'female', 'other', 'not_specified'),
        defaultValue: 'not_specified',
      },
      date_of_birth: { type: Sequelize.DATEONLY, allowNull: true },
      photo_url: { type: Sequelize.STRING(500), allowNull: true },

      person_type: { type: Sequelize.ENUM(...PERSON_TYPES), allowNull: false },
      person_subtype: { type: Sequelize.STRING(255), allowNull: true },
      dept_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'departments', key: 'dept_id' },
      },
      sub_dept: { type: Sequelize.STRING(255), allowNull: true },

      id_proof_type: {
        type: Sequelize.ENUM('aadhaar', 'passport', 'driving_licence', 'voter_id', 'pan_card', 'other'),
        allowNull: true,
      },
      id_proof_number: { type: Sequelize.STRING(50), allowNull: true },
      id_proof_image_url: { type: Sequelize.STRING(500), allowNull: true },

      perm_address: { type: Sequelize.TEXT, allowNull: true },
      city: { type: Sequelize.STRING(100), allowNull: true },
      state: { type: Sequelize.STRING(100), allowNull: true },
      pincode: { type: Sequelize.STRING(10), allowNull: true },

      campus_location: { type: Sequelize.STRING(255), allowNull: true },
      accommodation_block: { type: Sequelize.STRING(255), allowNull: true },
      room_number: { type: Sequelize.STRING(50), allowNull: true },

      greythr_id: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      essl_id: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      ezee_guest_id: { type: Sequelize.STRING(100), allowNull: true },

      host_person_id: {
        type: Sequelize.CHAR(36),
        allowNull: true,
        references: { model: 'persons', key: 'person_id' },
      },

      status: {
        type: Sequelize.ENUM('pre_registered', 'on_campus', 'departed', 'suspended', 'archived'),
        defaultValue: 'pre_registered',
      },

      // FK to system_users added later (Module 1 migration 5) — system_users
      // itself references persons.person_id, so this side must come first
      // (same two-phase pattern as the source schema).
      registered_by: { type: Sequelize.CHAR(36), allowNull: true },
      registration_source: { type: Sequelize.STRING(100), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },

      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('persons', ['mobile'], { name: 'idx_persons_mobile' });
    await queryInterface.addIndex('persons', ['person_type'], { name: 'idx_persons_type' });
    await queryInterface.addIndex('persons', ['status'], { name: 'idx_persons_status' });
    await queryInterface.addIndex('persons', ['dept_id'], { name: 'idx_persons_dept' });
    await queryInterface.addIndex('persons', ['host_person_id'], { name: 'idx_persons_host' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('persons');
  },
};
