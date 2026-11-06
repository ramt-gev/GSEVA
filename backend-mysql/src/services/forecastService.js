const cron = require('node-cron');
const { QueryTypes } = require('sequelize');
const { sequelize, SystemConfig } = require('../models');
const { sendNightlyForecast } = require('./whatsappService');

async function buildForecast() {
  const [counts] = await sequelize.query(
    `SELECT
       SUM(CASE WHEN p.person_type IN ('resident_staff','staff_dependant') THEN 1 ELSE 0 END) as staff,
       SUM(CASE WHEN p.person_type IN ('volunteer_seva','sustainability_intern') THEN 1 ELSE 0 END) as volunteers,
       SUM(CASE WHEN p.person_type IN ('construction_labourer','weekly_labourer_local','weekly_labourer_outstation') THEN 1 ELSE 0 END) as labourers,
       SUM(CASE WHEN p.person_type = 'course_student' THEN 1 ELSE 0 END) as students
     FROM meal_registrations mr
     JOIN persons p ON p.person_id = mr.person_id
     WHERE mr.is_active = TRUE
       AND mr.meal_type = 'breakfast'
       AND p.status IN ('on_campus','pre_registered')`,
    { type: QueryTypes.SELECT }
  );

  const staff = Number(counts.staff) || 0;
  const volunteers = Number(counts.volunteers) || 0;
  const labourers = Number(counts.labourers) || 0;
  const students = Number(counts.students) || 0;
  const bd_total = staff + volunteers + labourers + students;

  // Postgres: CURRENT_DATE - INTERVAL '30 days' -> MySQL: DATE_SUB(CURDATE(), INTERVAL 30 DAY).
  // The nested derived-table UNION ALL is portable to MySQL 8+ as-is.
  const [avgRow] = await sequelize.query(
    `SELECT ROUND(AVG(daily_count)) as avg_free_lunch
       FROM (
         SELECT day, SUM(c) AS daily_count
           FROM (
             SELECT meal_date AS day, COUNT(*) AS c
               FROM meal_token_events
              WHERE meal_type IN ('free_lunch','khichadi_am','khichadi_pm')
                AND meal_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              GROUP BY meal_date
             UNION ALL
             SELECT meal_date AS day, SUM(count) AS c
               FROM free_meal_counts
              WHERE meal_slot IN ('free_lunch','khichadi_am','khichadi_pm')
                AND meal_date > DATE_SUB(CURDATE(), INTERVAL 30 DAY)
              GROUP BY meal_date
           ) combined
          GROUP BY day
       ) daily`,
    { type: QueryTypes.SELECT }
  );

  const estimated_free = parseInt(avgRow?.avg_free_lunch || 0, 10);

  return {
    breakfast: bd_total,
    free_lunch: estimated_free,
    dinner: bd_total,
    staff,
    volunteers,
    labourers,
    students,
  };
}

function startForecastCron() {
  // 9 PM IST = 15:30 UTC
  cron.schedule('30 15 * * *', async () => {
    console.log('Running nightly forecast...');
    try {
      const forecast = await buildForecast();

      const recipientsConfig = await SystemConfig.findByPk('forecast_recipients');
      // 'forecast_recipients' isn't among the 12 seeded system_config keys
      // (matches the Postgres backend's own seed data — confirmed against
      // the schema) — this lookup always misses in practice, so the
      // fallback below is what actually runs. Not a bug: the original
      // behaves identically, this is just an unused override path.
      const mobiles = recipientsConfig?.config_value
        ? JSON.parse(recipientsConfig.config_value)
        : ['+919999999996', '+919999999995']; // Anandprem P, Hari Guru P

      for (const mobile of mobiles) {
        await sendNightlyForecast(mobile, forecast);
      }

      console.log('Nightly forecast sent successfully');
    } catch (err) {
      console.error('Forecast cron error:', err);
    }
  });

  console.log('Nightly forecast cron scheduled for 9:00 PM IST');
}

module.exports = { startForecastCron, buildForecast };
