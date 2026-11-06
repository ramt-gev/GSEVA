'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class WhatsappLog extends Model {
    static associate(models) {
      WhatsappLog.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  WhatsappLog.init(
    {
      log_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: true },
      flow_type: { type: DataTypes.STRING(100), allowNull: false },
      template_name: { type: DataTypes.STRING(255), allowNull: true },
      message_preview: { type: DataTypes.TEXT, allowNull: true },
      interakt_msg_id: { type: DataTypes.STRING(255), allowNull: true },
      status: { type: DataTypes.ENUM('sent', 'delivered', 'read', 'failed'), defaultValue: 'sent' },
      sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      delivered_at: { type: DataTypes.DATE, allowNull: true },
      read_at: { type: DataTypes.DATE, allowNull: true },
      failed_reason: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'WhatsappLog',
      tableName: 'whatsapp_logs',
      timestamps: false,
    }
  );

  return WhatsappLog;
};
