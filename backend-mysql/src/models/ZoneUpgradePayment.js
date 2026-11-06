'use strict';
const { Model } = require('sequelize');

// Recomputes cafe_capacity.booked_count for one (cafe_code, meal_date,
// meal_type) combination from the authoritative source: sum of persons_count
// across paid + confirmed zone_upgrade_payments. Mirrors the Postgres
// backend's cafe_capacity_recount() trigger. No-op if the payment row has
// no cafe_code/meal_type (a plain Zone 3 access upgrade with no café add-on).
async function recomputeCafeCapacity(sequelize, { cafe_code, meal_date, meal_type }, options) {
  if (!cafe_code || !meal_type) return;

  const { ZoneUpgradePayment, CafeCapacity } = sequelize.models;
  const total = await ZoneUpgradePayment.sum('persons_count', {
    where: { cafe_code, meal_date, meal_type, payment_status: 'paid', cafe_booking_confirmed: true },
    transaction: options.transaction,
  });

  await CafeCapacity.update(
    { booked_count: total || 0 },
    { where: { cafe_code, capacity_date: meal_date, meal_type }, transaction: options.transaction }
  );
}

module.exports = (sequelize, DataTypes) => {
  class ZoneUpgradePayment extends Model {
    static associate(models) {
      ZoneUpgradePayment.belongsTo(models.QrPass, { foreignKey: 'qr_id', as: 'qr_pass' });
      ZoneUpgradePayment.belongsTo(models.Department, { foreignKey: 'cafe_code', targetKey: 'dept_code', as: 'cafe' });
    }
  }

  ZoneUpgradePayment.init(
    {
      upgrade_id: { type: DataTypes.CHAR(36), primaryKey: true, defaultValue: DataTypes.UUIDV4 },
      qr_id: { type: DataTypes.CHAR(36), allowNull: false },
      gate_name: {
        type: DataTypes.ENUM('main_gate', 'gate_7', 'sbt_gate', 'exit_gate'),
        allowNull: false,
        defaultValue: 'sbt_gate',
      },
      persons_count: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
      price_per_person: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 350.0 },
      total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      razorpay_order_id: { type: DataTypes.STRING(255), allowNull: true },
      razorpay_payment_id: { type: DataTypes.STRING(255), allowNull: true },
      payment_status: {
        type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      cafe_code: { type: DataTypes.STRING(30), allowNull: true },
      meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner'), allowNull: true },
      meal_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
      cafe_booking_confirmed: { type: DataTypes.BOOLEAN, defaultValue: false },
      paid_at: { type: DataTypes.DATE, allowNull: true },
    },
    {
      sequelize,
      modelName: 'ZoneUpgradePayment',
      tableName: 'zone_upgrade_payments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      hooks: {
        afterCreate: (payment, options) => recomputeCafeCapacity(sequelize, payment, options),
        afterUpdate: async (payment, options) => {
          await recomputeCafeCapacity(sequelize, payment, options);
          const prevCafeCode = payment.previous('cafe_code');
          const prevMealType = payment.previous('meal_type');
          const prevMealDate = payment.previous('meal_date');
          const moved =
            (prevCafeCode && prevCafeCode !== payment.cafe_code) ||
            (prevMealType && prevMealType !== payment.meal_type) ||
            (prevMealDate && String(prevMealDate) !== String(payment.meal_date));
          if (moved) {
            await recomputeCafeCapacity(
              sequelize,
              { cafe_code: prevCafeCode, meal_type: prevMealType, meal_date: prevMealDate },
              options
            );
          }
        },
        afterDestroy: (payment, options) => recomputeCafeCapacity(sequelize, payment, options),
      },
    }
  );

  return ZoneUpgradePayment;
};
