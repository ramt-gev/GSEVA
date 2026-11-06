'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CafeCapacity extends Model {
    static associate(models) {
      CafeCapacity.belongsTo(models.Department, { foreignKey: 'cafe_code', targetKey: 'dept_code', as: 'department' });
    }
  }

  CafeCapacity.init(
    {
      capacity_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      cafe_code: { type: DataTypes.STRING(30), allowNull: false },
      capacity_date: { type: DataTypes.DATEONLY, allowNull: false },
      meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'), allowNull: false },
      threshold: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 0 } },
      // Kept in sync by ZoneUpgradePayment's hooks (see ZoneUpgradePayment.js)
      // — never written directly elsewhere. No booked_count<=threshold CHECK
      // by design (N1 in source schema) — see migration 000019.
      booked_count: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
      declared_by: { type: DataTypes.STRING(255), allowNull: true },
      // Plain column, not Sequelize's managed `updatedAt` — it means "when
      // the threshold was declared," not "last touched." The booked_count
      // recount hook must not silently redefine that by re-stamping it on
      // every payment.
      declared_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
      notes: { type: DataTypes.TEXT, allowNull: true },
    },
    {
      sequelize,
      modelName: 'CafeCapacity',
      tableName: 'cafe_capacity',
      timestamps: false,
    }
  );

  return CafeCapacity;
};
