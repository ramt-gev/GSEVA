'use strict';
const { Model } = require('sequelize');

// 16 visitor/person types — Docs/GEV_Database_Schema_v3_Final.sql person_type_enum
const PERSON_TYPES = [
  'room_guest', 'free_day_visitor', 'paid_day_visitor', 'course_student',
  'volunteer_seva', 'sustainability_intern', 'resident_staff', 'staff_dependant',
  'brahmachari', 'varishtha_vaishnava', 'weekly_labourer_local',
  'weekly_labourer_outstation', 'construction_labourer', 'vendor_supplier',
  'corporate_tour_group', 'vip_dignitary',
];

module.exports = (sequelize, DataTypes) => {
  class Person extends Model {
    static associate(models) {
      Person.belongsTo(models.Department, { foreignKey: 'dept_id', as: 'department' });
      Person.belongsTo(models.Person, { foreignKey: 'host_person_id', as: 'host' });
      Person.belongsTo(models.SystemUser, { foreignKey: 'registered_by', as: 'registered_by_user' });
      Person.hasOne(models.SystemUser, { foreignKey: 'person_id', as: 'system_user' });
      Person.hasMany(models.AuditLog, { foreignKey: 'person_id', as: 'audit_entries' });
      Person.hasMany(models.PersonStay, { foreignKey: 'person_id', as: 'stays' });
      Person.hasMany(models.PersonDependant, { foreignKey: 'staff_person_id', as: 'dependants' });
      Person.hasMany(models.PersonDependant, { foreignKey: 'dependant_person_id', as: 'dependant_of' });
      Person.hasMany(models.QrPass, { foreignKey: 'person_id', as: 'qr_passes' });
      Person.hasMany(models.GateEvent, { foreignKey: 'person_id', as: 'gate_events' });
      Person.hasMany(models.TempAccessPass, { foreignKey: 'person_id', as: 'temp_access_passes' });
      Person.hasMany(models.ContractorLabourer, { foreignKey: 'person_id', as: 'contractor_labourer_records' });
      Person.hasMany(models.VfSlotBooking, { foreignKey: 'person_id', as: 'vf_slot_bookings' });
      Person.hasMany(models.GroupMember, { foreignKey: 'leader_person_id', as: 'led_group_members' });
      Person.hasMany(models.MealRegistration, { foreignKey: 'person_id', as: 'meal_registrations' });
      Person.hasMany(models.MealTokenEvent, { foreignKey: 'person_id', as: 'meal_token_events' });
      Person.hasMany(models.Vehicle, { foreignKey: 'person_id', as: 'vehicles' });
      Person.hasMany(models.Feedback, { foreignKey: 'person_id', as: 'feedback_entries' });
      Person.hasMany(models.GacMember, { foreignKey: 'person_id', as: 'gac_memberships' });
      Person.hasMany(models.WhatsappLog, { foreignKey: 'person_id', as: 'whatsapp_logs' });
    }
  }

  Person.init(
    {
      person_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      full_name: { type: DataTypes.STRING(255), allowNull: false },
      mobile: { type: DataTypes.STRING(20), allowNull: false },
      gender: {
        type: DataTypes.ENUM('male', 'female', 'other', 'not_specified'),
        defaultValue: 'not_specified',
      },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      photo_url: { type: DataTypes.STRING(500), allowNull: true },

      person_type: { type: DataTypes.ENUM(...PERSON_TYPES), allowNull: false },
      person_subtype: { type: DataTypes.STRING(255), allowNull: true },
      dept_id: { type: DataTypes.CHAR(36), allowNull: true },
      sub_dept: { type: DataTypes.STRING(255), allowNull: true },

      id_proof_type: {
        type: DataTypes.ENUM('aadhaar', 'passport', 'driving_licence', 'voter_id', 'pan_card', 'other'),
        allowNull: true,
      },
      id_proof_number: { type: DataTypes.STRING(50), allowNull: true },
      id_proof_image_url: { type: DataTypes.STRING(500), allowNull: true },

      perm_address: { type: DataTypes.TEXT, allowNull: true },
      present_address: { type: DataTypes.TEXT, allowNull: true },
      city: { type: DataTypes.STRING(100), allowNull: true },
      state: { type: DataTypes.STRING(100), allowNull: true },
      pincode: { type: DataTypes.STRING(10), allowNull: true },

      personal_email: { type: DataTypes.STRING(255), allowNull: true },
      blood_group: { type: DataTypes.STRING(10), allowNull: true },
      marital_status: { type: DataTypes.STRING(50), allowNull: true },
      anniversary_date: { type: DataTypes.DATEONLY, allowNull: true },

      campus_location: { type: DataTypes.STRING(255), allowNull: true },
      accommodation_block: { type: DataTypes.STRING(255), allowNull: true },
      room_number: { type: DataTypes.STRING(50), allowNull: true },

      greythr_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      // Synced hourly from GreytHR's attendance endpoint — null until the
      // first sync runs (or for persons with no greythr_id at all).
      greythr_present_today: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: null },
      essl_id: { type: DataTypes.STRING(100), allowNull: true, unique: true },
      ezee_guest_id: { type: DataTypes.STRING(100), allowNull: true },

      host_person_id: { type: DataTypes.CHAR(36), allowNull: true },

      status: {
        type: DataTypes.ENUM('pre_registered', 'on_campus', 'departed', 'suspended', 'archived'),
        defaultValue: 'pre_registered',
      },

      registered_by: { type: DataTypes.CHAR(36), allowNull: true },
      registration_source: { type: DataTypes.STRING(100), allowNull: true },
      notes: { type: DataTypes.TEXT, allowNull: true },

      // Note: the DB also has a `mobile_unique_key` generated column backing
      // the partial-unique mobile constraint (migration ...000003). It's
      // intentionally NOT declared here — Sequelize only ever
      // reads/writes attributes declared on the model, so leaving it out
      // keeps it fully DB-internal and untouchable from the app/API.
    },
    {
      sequelize,
      modelName: 'Person',
      tableName: 'persons',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return Person;
};
