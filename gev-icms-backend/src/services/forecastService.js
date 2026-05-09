const cron  = require('node-cron');
const pool  = require('../db');
const { sendNightlyForecast } = require('./whatsappService');

async function buildForecast() {
  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE p.person_type IN ('resident_staff','staff_dependant')) as staff,
       COUNT(*) FILTER (WHERE p.person_type IN ('volunteer_seva','sustainability_intern')) as volunteers,
       COUNT(*) FILTER (WHERE p.person_type IN (
         'construction_labourer','weekly_labourer_local','weekly_labourer_outstation'
       )) as labourers,
       COUNT(*) FILTER (WHERE p.person_type = 'course_student') as students
     FROM meal_registrations mr
     JOIN persons p ON p.person_id = mr.person_id
     WHERE mr.is_active = TRUE
       AND mr.meal_type = 'breakfast'
       AND p.status IN ('on_campus','pre_registered')`
  );

  const c = counts.rows[0];
  const bd_total = parseInt(c.staff) + parseInt(c.volunteers) +
                   parseInt(c.labourers) + parseInt(c.students);

  const avgResult = await pool.query(
    `SELECT ROUND(AVG(daily_count)) as avg_free_lunch
     FROM (
       SELECT day, SUM(c)::int AS daily_count
       FROM (
         SELECT meal_date AS day, COUNT(*) AS c
           FROM meal_token_events
          WHERE meal_type IN ('free_lunch','khichadi_am','khichadi_pm')
            AND meal_date > CURRENT_DATE - INTERVAL '30 days'
          GROUP BY meal_date
         UNION ALL
         SELECT meal_date AS day, SUM(count)::int AS c
           FROM free_meal_counts
          WHERE meal_slot IN ('free_lunch','khichadi_am','khichadi_pm')
            AND meal_date > CURRENT_DATE - INTERVAL '30 days'
          GROUP BY meal_date
       ) combined
       GROUP BY day
     ) daily`
  );

  const estimated_free = parseInt(avgResult.rows[0]?.avg_free_lunch || 0);

  return {
    breakfast:  bd_total,
    free_lunch: estimated_free,
    dinner:     bd_total,
    staff:      parseInt(c.staff),
    volunteers: parseInt(c.volunteers),
    labourers:  parseInt(c.labourers),
    students:   parseInt(c.students)
  };
}

function startForecastCron() {
  // 9 PM IST = 15:30 UTC
  cron.schedule('30 15 * * *', async () => {
    console.log('Running nightly forecast...');
    try {
      const forecast = await buildForecast();

      const recipients = await pool.query(
        "SELECT config_value FROM system_config WHERE config_key = 'forecast_recipients'"
      );

      const mobiles = recipients.rows[0]?.config_value
        ? JSON.parse(recipients.rows[0].config_value)
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
