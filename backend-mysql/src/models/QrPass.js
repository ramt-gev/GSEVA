'use strict';
const { Model } = require('sequelize');

const VALID_ZONES = ['zone1', 'zone2', 'zone3', 'zone4'];

module.exports = (sequelize, DataTypes) => {
  class QrPass extends Model {
    static associate(models) {
      QrPass.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      QrPass.belongsTo(models.PersonStay, { foreignKey: 'stay_id', as: 'stay' });
      QrPass.hasMany(models.GateEvent, { foreignKey: 'qr_id', as: 'gate_events' });
      QrPass.hasMany(models.GroupMember, { foreignKey: 'leader_qr_id', as: 'group_members' });
      QrPass.hasMany(models.ZoneUpgradePayment, { foreignKey: 'qr_id', as: 'zone_upgrade_payments' });
    }
  }

  QrPass.init(
    {
      qr_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },
      stay_id: { type: DataTypes.CHAR(36), allowNull: true },

      pass_type: {
        type: DataTypes.ENUM('permanent', 'stay_pass', 'day_pass', 'festival_pass', 'temp_cafe_pass', 'tour_pass'),
        allowNull: false,
      },

      valid_from: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      valid_until: { type: DataTypes.DATE, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

      // DB CHECK enforces "is a JSON array" (migration 000010); the
      // "every element is a real zone" half of the source schema's CHECK
      // has no MySQL/MariaDB equivalent (Postgres's <@ containment
      // operator), so it's enforced here instead.
      zone_access: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: ['zone1'],
        validate: {
          isValidZoneList(value) {
            if (!Array.isArray(value) || value.some((z) => !VALID_ZONES.includes(z))) {
              throw new Error('zone_access must be an array containing only zone1..zone4');
            }
          },
        },
      },

      group_size: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: { min: 1 },
      },
      programme_details: { type: DataTypes.JSON, allowNull: true },

      issued_by: { type: DataTypes.CHAR(36), allowNull: true },
      issued_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      deactivated_at: { type: DataTypes.DATE, allowNull: true },
      deactivation_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'QrPass',
      tableName: 'qr_passes',
      timestamps: false,
    }
  );

  return QrPass;
};
