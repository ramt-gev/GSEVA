'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class MealRegistration extends Model {
    static associate(models) {
      MealRegistration.belongsTo(models.Person, { foreignKey: 'person_id', as: 'person' });
      MealRegistration.belongsTo(models.Department, { foreignKey: 'dept_sponsor_id', as: 'dept_sponsor' });
      MealRegistration.belongsTo(models.Contractor, { foreignKey: 'contractor_id', as: 'contractor' });
      MealRegistration.hasMany(models.MealTokenEvent, { foreignKey: 'reg_id', as: 'token_events' });
    }
  }

  MealRegistration.init(
    {
      reg_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      person_id: { type: DataTypes.CHAR(36), allowNull: false },
      meal_type: { type: DataTypes.ENUM('breakfast', 'dinner'), allowNull: false },
      payment_method: {
        type: DataTypes.ENUM('salary_deduction', 'dept_sponsored', 'free_welfare', 'ashram_covered', 'rent_included', 'self_paid'),
        allowNull: false,
      },
      dept_sponsor_id: { type: DataTypes.CHAR(36), allowNull: true },
      contractor_id: { type: DataTypes.CHAR(36), allowNull: true },
      valid_from: { type: DataTypes.DATEONLY, allowNull: false },
      valid_until: { type: DataTypes.DATEONLY, allowNull: true },
      is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
      monthly_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      registered_by: { type: DataTypes.CHAR(36), allowNull: true },
      // DB-internal, backs the partial-unique "one active reg per
      // person+meal_type" constraint (migration 000021). Populated below,
      // never set directly by app code.
      active_reg_unique_key: { type: DataTypes.STRING(80), allowNull: true },
    },
    {
      sequelize,
      modelName: 'MealRegistration',
      tableName: 'meal_registrations',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      hooks: {
        beforeSave: (reg) => {
          reg.active_reg_unique_key = reg.is_active ? `${reg.person_id}|${reg.meal_type}` : null;
        },
      },
    }
  );

  return MealRegistration;
};
