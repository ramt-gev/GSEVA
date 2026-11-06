'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class KitchenMeeting extends Model {
    static associate(models) {
      KitchenMeeting.belongsTo(models.SystemUser, { foreignKey: 'created_by', as: 'creator' });
      KitchenMeeting.belongsTo(models.SystemUser, { foreignKey: 'finalized_by', as: 'finalizer' });
    }
  }

  KitchenMeeting.init(
    {
      meeting_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      for_date: { type: DataTypes.DATEONLY, allowNull: false, unique: true },
      convened_at: { type: DataTypes.DATE, allowNull: true },
      prasadam_taker_estimate: { type: DataTypes.INTEGER, allowNull: true },
      quantity_notes: { type: DataTypes.TEXT, allowNull: true },
      machinery_status_note: { type: DataTypes.TEXT, allowNull: true },
      status: { type: DataTypes.ENUM('IN_PROGRESS', 'FINALIZED'), defaultValue: 'IN_PROGRESS' },
      created_by: { type: DataTypes.CHAR(36), allowNull: true },
      finalized_by: { type: DataTypes.CHAR(36), allowNull: true },
      finalized_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'KitchenMeeting',
      tableName: 'kitchen_meetings',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    }
  );

  return KitchenMeeting;
};
