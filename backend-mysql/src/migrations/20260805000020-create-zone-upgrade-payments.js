'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('zone_upgrade_payments', {
      upgrade_id: { type: Sequelize.CHAR(36), primaryKey: true, defaultValue: Sequelize.UUIDV4 },
      qr_id: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        references: { model: 'qr_passes', key: 'qr_id' },
      },
      gate_name: {
        type: Sequelize.ENUM('main_gate', 'gate_7', 'sbt_gate', 'exit_gate'),
        allowNull: false,
        defaultValue: 'sbt_gate',
      },
      persons_count: { type: Sequelize.INTEGER, allowNull: false },
      price_per_person: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 350.0 },
      total_amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      razorpay_order_id: { type: Sequelize.STRING(255), allowNull: true },
      razorpay_payment_id: { type: Sequelize.STRING(255), allowNull: true },
      payment_status: {
        type: Sequelize.ENUM('pending', 'paid', 'failed', 'refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      cafe_code: {
        type: Sequelize.STRING(30),
        allowNull: true,
        references: { model: 'departments', key: 'dept_code' },
      },
      meal_type: { type: Sequelize.ENUM('breakfast', 'lunch', 'dinner'), allowNull: true },
      // Date the meal will actually be eaten (may differ from created_at
      // for pre-paid Smart Registration bookings) — the recount hook
      // groups by this, not created_at, so pre-bookings hit the right
      // cafe_capacity row.
      meal_date: { type: Sequelize.DATEONLY, allowNull: false, defaultValue: Sequelize.literal('(CURRENT_DATE)') },
      cafe_booking_confirmed: { type: Sequelize.BOOLEAN, defaultValue: false },
      paid_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    });

    await queryInterface.addIndex('zone_upgrade_payments', ['qr_id'], { name: 'idx_zone_upgrade_qr' });
    await queryInterface.addIndex('zone_upgrade_payments', ['created_at'], { name: 'idx_zone_upgrade_date' });

    await queryInterface.sequelize.query(`
      ALTER TABLE zone_upgrade_payments ADD CONSTRAINT persons_count_positive CHECK (persons_count > 0)
    `);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('zone_upgrade_payments');
  },
};
