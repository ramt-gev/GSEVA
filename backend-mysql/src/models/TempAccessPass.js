'use strict';
const { Model } = require('sequelize');

// Schema-only for now — not used by any service/controller yet (matches
// the Postgres backend, where this table is also unreferenced in src/).
module.exports = (sequelize, DataTypes) => {
  class TempAccessPass extends Model {
    static associate(models) {
      TempAccessPass.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
    }
  }

  TempAccessPass.init(
    {
      pass_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },

      zone: {
        type: DataTypes.ENUM('zone1', 'zone2', 'zone3', 'zone4'),
        allowNull: false,
        defaultValue: 'zone3',
      },
      purpose: { type: DataTypes.STRING(255), allowNull: true },
      cafe_name: { type: DataTypes.STRING(255), allowNull: true },
      meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'), allowNull: true },

      amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      payment_mode: { type: DataTypes.STRING(50), allowNull: true },

      valid_from: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      valid_until: { type: DataTypes.DATE, allowNull: false },
      is_used: { type: DataTypes.BOOLEAN, defaultValue: false },

      issued_by: { type: DataTypes.CHAR(36), allowNull: true },
      issued_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: 'TempAccessPass',
      tableName: 'temp_access_passes',
      timestamps: false,
    }
  );

  return TempAccessPass;
};
