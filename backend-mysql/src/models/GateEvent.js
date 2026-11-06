'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GateEvent extends Model {
    static associate(models) {
      GateEvent.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      GateEvent.belongsTo(models.QrPass, { foreignKey: 'qr_id', as: 'qr_pass' });
    }
  }

  GateEvent.init(
    {
      event_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: true },
      qr_id: { type: DataTypes.CHAR(36), allowNull: true },

      gate: { type: DataTypes.ENUM('main_gate', 'gate_7', 'sbt_gate', 'exit_gate'), allowNull: false },
      event_type: { type: DataTypes.ENUM('entry', 'exit'), allowNull: false },
      result: { type: DataTypes.ENUM('allowed', 'denied', 'manual_override'), allowNull: false },
      deny_reason: { type: DataTypes.TEXT, allowNull: true },

      is_batch_count: { type: DataTypes.BOOLEAN, defaultValue: false },
      batch_count: { type: DataTypes.INTEGER, allowNull: true },

      scanned_by: { type: DataTypes.CHAR(36), allowNull: true },
      scanned_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },

      device_id: { type: DataTypes.STRING(255), allowNull: true },
      is_offline_sync: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'GateEvent',
      tableName: 'gate_events',
      timestamps: false,
    }
  );

  return GateEvent;
};
