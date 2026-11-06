'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Feedback extends Model {
    static associate(models) {
      Feedback.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      Feedback.belongsTo(models.PersonStay, { foreignKey: 'stay_id', as: 'stay' });
    }
  }

  Feedback.init(
    {
      feedback_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },
      stay_id: { type: DataTypes.CHAR(36), allowNull: true },
      overall_rating: { type: DataTypes.INTEGER, allowNull: true, validate: { min: 1, max: 5 } },
      comment: { type: DataTypes.TEXT, allowNull: true },
      source: { type: DataTypes.ENUM('whatsapp', 'web_form'), defaultValue: 'whatsapp' },
      submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'Feedback',
      tableName: 'feedback',
      timestamps: false,
    }
  );

  return Feedback;
};
