const pool = require('../db');

const MEAL_SLOTS = {
  breakfast:    { label: 'Breakfast',    time: '07:15-08:15', billing_relevant: true  },
  khichadi_am:  { label: 'Khichadi AM',  time: '09:30-12:30', billing_relevant: false },
  free_lunch:   { label: 'Free Lunch',   time: '12:45-14:30', billing_relevant: false },
  khichadi_pm:  { label: 'Khichadi PM',  time: '16:00-19:30', billing_relevant: false },
  dinner:       { label: 'Dinner',       time: '18:30-19:15', billing_relevant: true  },
};

async function scanMeal(req, res) {
  const { qr_id, meal_type } = req.body;

  if (!qr_id || !meal_type) {
    return res.status(400).json({ error: 'qr_id and meal_type required' });
  }
  if (!MEAL_SLOTS[meal_type]) {
    return res.status(400).json({ error: 'Invalid meal_type' });
  }

  try {
    const result = await pool.query(
      `SELECT
         qp.qr_id, p.person_id, p.full_name, p.person_type,
         p.dept_id, d.dept_name
       FROM qr_passes qp
       JOIN persons p ON qp.person_id = p.person_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       WHERE qp.qr_id = $1 AND qp.is_active = true`,
      [qr_id]
    );

    if (result.rows.length === 0) {
      return res.json({ result: 'deny', reason: 'QR not found or inactive' });
    }
    const person = result.rows[0];

    let reg_id = null;
    if (MEAL_SLOTS[meal_type].billing_relevant) {
      const reg = await pool.query(
        `SELECT reg_id FROM meal_registrations
          WHERE person_id = $1 AND meal_type = $2 AND is_active = TRUE`,
        [person.person_id, meal_type]
      );
      if (reg.rows.length === 0) {
        return res.json({
          result: 'deny',
          person: buildMealPersonResponse(person),
          reason: `${person.full_name} is not registered for ${MEAL_SLOTS[meal_type].label}`
        });
      }
      reg_id = reg.rows[0].reg_id;
    }

    const dup = await pool.query(
      `SELECT token_id FROM meal_token_events
        WHERE person_id = $1 AND meal_type = $2 AND meal_date = CURRENT_DATE`,
      [person.person_id, meal_type]
    );
    if (dup.rows.length > 0) {
      return res.json({
        result:  'already_served',
        person:  buildMealPersonResponse(person),
        message: `${person.full_name} already received ${MEAL_SLOTS[meal_type].label} today`
      });
    }

    await pool.query(
      `INSERT INTO meal_token_events
        (person_id, reg_id, meal_type, meal_date, served_by)
       VALUES ($1, $2, $3, CURRENT_DATE, $4)`,
      [person.person_id, reg_id, meal_type, req.user.user_id]
    );

    res.json({
      result: 'served',
      person: buildMealPersonResponse(person),
      meal:   MEAL_SLOTS[meal_type].label
    });

  } catch (err) {
    console.error('Meal scan error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

async function tapCounter(req, res) {
  const { meal_type, count = 1 } = req.body;

  if (!meal_type || !MEAL_SLOTS[meal_type]) {
    return res.status(400).json({ error: 'Valid meal_type required' });
  }
  if (MEAL_SLOTS[meal_type].billing_relevant) {
    return res.status(400).json({ error: 'Tap counter is for free meals only — use /scan for B/D' });
  }

  try {
    await pool.query(
      `INSERT INTO free_meal_counts
        (meal_date, meal_slot, count, entry_type, recorded_by)
       VALUES (CURRENT_DATE, $1, $2, $3, $4)`,
      [meal_type, count, count > 1 ? 'bulk' : 'single', req.user.user_id]
    );

    const countResult = await pool.query(
      `SELECT
         COALESCE((SELECT SUM(count) FROM free_meal_counts
                    WHERE meal_date = CURRENT_DATE AND meal_slot = $1), 0)
         + COALESCE((SELECT COUNT(*) FROM meal_token_events
                      WHERE meal_date = CURRENT_DATE AND meal_type = $1), 0)
         AS total`,
      [meal_type]
    );

    res.json({
      success: true,
      meal_type,
      tap_count: count,
      total_today: parseInt(countResult.rows[0].total)
    });

  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function todayStats(req, res) {
  try {
    const slotCounts = await pool.query(
      `SELECT
         meal_type,
         COUNT(*)                                   AS scanned,
         COUNT(*) FILTER (WHERE reg_id IS NOT NULL) AS bd_scanned,
         COUNT(*) FILTER (WHERE reg_id IS NULL)     AS free_scanned
       FROM meal_token_events
       WHERE meal_date = CURRENT_DATE
       GROUP BY meal_type`
    );

    const tapCounts = await pool.query(
      `SELECT meal_slot AS meal_type, SUM(count) AS tapped
         FROM free_meal_counts
        WHERE meal_date = CURRENT_DATE
        GROUP BY meal_slot`
    );

    const registered = await pool.query(
      `SELECT p.person_type, COUNT(*) AS count
         FROM persons p
        WHERE p.status IN ('on_campus','pre_registered')
          AND p.person_type IN (
            'resident_staff','staff_dependant','brahmachari',
            'varishtha_vaishnava','volunteer_seva',
            'construction_labourer','weekly_labourer_local',
            'weekly_labourer_outstation','course_student'
          )
        GROUP BY p.person_type`
    );

    res.json({
      data: {
        slot_counts:   slotCounts.rows,
        tap_counts:    tapCounts.rows,
        registered_bd: registered.rows,
        date: new Date().toLocaleDateString('en-IN')
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

async function registeredList(req, res) {
  const { meal_type = 'breakfast' } = req.query;
  if (!['breakfast','dinner'].includes(meal_type)) {
    return res.status(400).json({ error: 'meal_type must be breakfast or dinner' });
  }

  try {
    const result = await pool.query(
      `SELECT
         p.full_name, p.person_type, p.mobile, d.dept_name,
         mr.payment_method,
         CASE WHEN mte.token_id IS NOT NULL THEN true ELSE false END AS served_today
       FROM meal_registrations mr
       JOIN persons p ON mr.person_id = p.person_id
       LEFT JOIN departments d ON p.dept_id = d.dept_id
       LEFT JOIN meal_token_events mte
         ON mte.person_id = p.person_id
        AND mte.meal_type = mr.meal_type
        AND mte.meal_date = CURRENT_DATE
       WHERE mr.is_active = TRUE
         AND mr.meal_type = $1
         AND p.status IN ('on_campus','pre_registered')
       ORDER BY p.person_type, p.full_name`,
      [meal_type]
    );
    res.json({ data: result.rows, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// GET /api/meals/billing — monthly contractor billing summary.
// Rate is read from system_config.bd_monthly_rate by the monthly_billing_summary view.
async function contractorBilling(req, res) {
  const m = req.query.month || new Date().getMonth() + 1;
  const y = req.query.year  || new Date().getFullYear();

  try {
    const result = await pool.query(
      `SELECT *
         FROM monthly_billing_summary
        WHERE contractor_id IS NOT NULL
        ORDER BY monthly_amount_to_recover DESC`
    );
    res.json({ data: result.rows, month: m, year: y });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

function buildMealPersonResponse(person) {
  return {
    name:      person.full_name,
    type:      person.person_type,
    dept:      person.dept_name || '—',
    person_id: person.person_id
  };
}

module.exports = { scanMeal, tapCounter, todayStats, registeredList, contractorBilling };
