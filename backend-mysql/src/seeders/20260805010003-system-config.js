'use strict';

// Mirrors Docs/GEV_Database_Schema_v3_Final.sql STEP 8 seed (12 keys).
// CLAUDE.md invariant 2: business values (prices, thresholds, etc.) live
// here, never hardcoded in controllers.
const CONFIG = [
  ['max_group_size', '10', 'integer', 'Maximum persons in a single visitor group'],
  ['zone3_cafe_price', '350', 'integer', 'Zone 3 upgrade price per person (INR)'],
  ['vf_slot_capacity', '30', 'integer', 'Max persons per Vrindavan Forest tour slot'],
  ['vf_slot_times', '["10:30","12:00","14:00","15:30","17:00","18:30"]', 'json', 'Available VF tour slot times'],
  ['day_pass_valid_until', '20:00', 'string', 'Time of day when day visitor QRs expire (IST 24h)'],
  ['zone3_upgrade_valid_hrs', '3', 'integer', 'Hours a Zone 3 upgrade pass remains valid'],
  ['festival_mode_active', 'false', 'boolean', 'When true: batch entry, no VF slots, walk-in only'],
  ['registration_open', 'true', 'boolean', 'When false: visitor self-registration is paused'],
  ['paid_day_visit_price', '850', 'integer', 'Paid day visit price per person (INR)'],
  ['cafe_daily_capacity', '50', 'integer', 'Default Govindas Guest Area daily cover capacity'],
  ['nightly_forecast_time', '21:00', 'string', 'Time the nightly meal forecast WhatsApp goes out (IST)'],
  ['bd_monthly_rate', '1860', 'integer', 'Annakshetra B/D rate per person per month (INR)'],
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    await queryInterface.bulkInsert(
      'system_config',
      CONFIG.map(([config_key, config_value, config_type, description]) => ({
        config_key,
        config_value,
        config_type,
        description,
        updated_at: now,
      }))
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('system_config', null, {});
  },
};
