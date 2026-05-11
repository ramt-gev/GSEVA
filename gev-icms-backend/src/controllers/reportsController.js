const pool   = require('../db');
const PDFDoc = require('pdfkit');

// Hourly gate event counts for today (for the bar chart)
async function hourlyGateStats(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         EXTRACT(HOUR FROM scanned_at)::int AS hour,
         COUNT(*) FILTER (WHERE result = 'allowed') AS entries,
         COUNT(*) FILTER (WHERE result = 'denied')  AS denials
       FROM gate_events
       WHERE scanned_at::date = CURRENT_DATE
       GROUP BY hour
       ORDER BY hour`
    );

    // Build 24-slot array; dashboard shows 8 slots from 6am to now
    const slots = Array.from({ length: 24 }, (_, i) => ({
      hour: i, entries: 0, denials: 0
    }));
    for (const row of result.rows) {
      slots[row.hour].entries = parseInt(row.entries);
      slots[row.hour].denials = parseInt(row.denials);
    }
    res.json({ data: slots });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Daily campus occupancy (current or for a past date)
async function occupancyReport(req, res) {
  const { date } = req.query;
  const target = date || 'CURRENT_DATE';

  try {
    const byType = await pool.query(
      `SELECT
         person_type,
         COUNT(*) AS count
       FROM persons
       WHERE status = 'on_campus'
       GROUP BY person_type
       ORDER BY count DESC`
    );

    const total = await pool.query(
      `SELECT COUNT(*) AS total FROM persons WHERE status = 'on_campus'`
    );

    const gateEvents = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'allowed') AS entries,
         COUNT(*) FILTER (WHERE result = 'denied')  AS denials
       FROM gate_events
       WHERE scanned_at::date = $1`,
      [date || new Date().toISOString().slice(0, 10)]
    );

    res.json({
      date: date || new Date().toISOString().slice(0, 10),
      total: parseInt(total.rows[0].total),
      by_type: byType.rows,
      gate: gateEvents.rows[0],
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Gate activity log
async function gateActivity(req, res) {
  const { date, gate, limit = 100, offset = 0 } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  try {
    const result = await pool.query(
      `SELECT
         ge.event_id, ge.gate, ge.result, ge.deny_reason,
         ge.scanned_at, ge.is_batch_count, ge.batch_count,
         p.full_name, p.person_type,
         su.display_name AS scanned_by_name
       FROM gate_events ge
       LEFT JOIN persons      p  ON ge.person_id = p.person_id
       LEFT JOIN system_users su ON ge.scanned_by = su.user_id
       WHERE ge.scanned_at::date = $1
         ${gate ? 'AND ge.gate = $4' : ''}
       ORDER BY ge.scanned_at DESC
       LIMIT $2 OFFSET $3`,
      gate
        ? [targetDate, limit, offset, gate]
        : [targetDate, limit, offset]
    );

    const totals = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE result = 'allowed') AS entries,
         COUNT(*) FILTER (WHERE result = 'denied')  AS denials,
         COUNT(*) FILTER (WHERE result = 'manual_override') AS overrides
       FROM gate_events
       WHERE scanned_at::date = $1`,
      [targetDate]
    );

    res.json({
      date: targetDate,
      totals: totals.rows[0],
      events: result.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Meal consumption report
async function mealConsumption(req, res) {
  const { date } = req.query;
  const targetDate = date || new Date().toISOString().slice(0, 10);

  try {
    const served = await pool.query(
      `SELECT meal_type, COUNT(*) AS count
       FROM meal_token_events
       WHERE meal_date = $1
       GROUP BY meal_type`,
      [targetDate]
    );

    const taps = await pool.query(
      `SELECT meal_type, SUM(count) AS total
       FROM free_meal_counts
       WHERE count_date = $1
       GROUP BY meal_type`,
      [targetDate]
    );

    res.json({
      date: targetDate,
      registered_served: served.rows,
      free_tap_counts: taps.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
}

// Monthly police report — JSON or PDF
async function policeReport(req, res) {
  const now   = new Date();
  const year  = parseInt(req.query.year)  || now.getFullYear();
  const month = parseInt(req.query.month) || now.getMonth() + 1;
  const format = req.query.format || 'json';

  // Overnight residents: on_campus persons with is_overnight stay types or permanent presence
  // Includes room_guests, staff, ashram residents, labourers, volunteers, course_students
  try {
    const result = await pool.query(
      `SELECT
         p.person_id,
         p.full_name,
         p.person_type,
         p.mobile,
         p.gender,
         p.date_of_birth,
         p.id_proof_type,
         p.id_proof_number,
         p.address,
         p.city,
         p.state,
         p.pincode,
         d.dept_name,
         ps.check_in_date,
         ps.check_out_date,
         ps.stay_type,
         c.company_name AS contractor_name
       FROM persons p
       LEFT JOIN departments        d  ON p.dept_id = d.dept_id
       LEFT JOIN person_stays       ps ON ps.person_id = p.person_id
                                      AND ps.is_active = true
       LEFT JOIN contractor_labourers cl ON cl.person_id = p.person_id
       LEFT JOIN contractors        c  ON c.contractor_id = cl.contractor_id
       WHERE p.status IN ('on_campus')
         AND p.person_type NOT IN ('free_day_visitor','paid_day_visitor','corporate_tour_group','vf_tour_visitor')
       ORDER BY p.person_type, p.full_name`,
      []
    );

    const records  = result.rows;
    const monthName = new Date(year, month - 1, 1)
      .toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="GEV_Police_Report_${year}_${String(month).padStart(2,'0')}.pdf"`
      );

      const doc = new PDFDoc({ margin: 40, size: 'A4', layout: 'landscape' });
      doc.pipe(res);

      // Header
      doc.fontSize(14).font('Helvetica-Bold')
         .text('Govardhan EcoVillage — ISKCON GEV', { align: 'center' });
      doc.fontSize(11).font('Helvetica')
         .text(`Monthly Campus Resident Register — ${monthName}`, { align: 'center' });
      doc.text('Galtare, Hamrapur, Wada, Palghar — 421303, Maharashtra', { align: 'center' });
      doc.text(
        `Report Date: ${now.toLocaleDateString('en-IN')} · Total Records: ${records.length} · Prepared by: Premanjan P (Security HOD)`,
        { align: 'center' }
      );
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.5);

      // Column widths
      const cols = [28, 130, 100, 100, 90, 60, 70, 80, 95];
      const headers = ['#', 'Full Name', 'Type', 'Dept / Company', 'ID Proof', 'DOB', 'Arrived', 'Stay Until', 'Address'];
      let x = 40;
      let y = doc.y;

      // Table header
      doc.fontSize(8).font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, x, y, { width: cols[i], lineBreak: false });
        x += cols[i];
      });
      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(doc.page.width - 40, doc.y).stroke();
      doc.moveDown(0.2);

      // Rows
      doc.font('Helvetica').fontSize(7);
      records.forEach((r, idx) => {
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
          doc.fontSize(7).font('Helvetica');
        }
        x = 40;
        y = doc.y;
        const idProof = r.id_proof_type && r.id_proof_number
          ? `${r.id_proof_type} ${String(r.id_proof_number).slice(-4).padStart(r.id_proof_number.length, 'X')}`
          : '—';
        const arrived = r.check_in_date
          ? new Date(r.check_in_date).toLocaleDateString('en-IN')
          : 'Permanent';
        const until = r.check_out_date
          ? new Date(r.check_out_date).toLocaleDateString('en-IN')
          : '—';
        const address = [r.address, r.city, r.state, r.pincode].filter(Boolean).join(', ');

        const cells = [
          String(idx + 1),
          r.full_name || '—',
          r.person_type?.replace(/_/g, ' ') || '—',
          r.contractor_name || r.dept_name || '—',
          idProof,
          r.date_of_birth ? new Date(r.date_of_birth).toLocaleDateString('en-IN') : '—',
          arrived,
          until,
          address || '—',
        ];

        cells.forEach((cell, i) => {
          doc.text(cell, x, y, { width: cols[i] - 2, lineBreak: false, ellipsis: true });
          x += cols[i];
        });
        doc.moveDown(0.5);
      });

      // Footer
      doc.moveDown(1);
      doc.fontSize(8).font('Helvetica');
      doc.text('Premanjan P — Security HOD        Signature: ______________', 40);
      doc.text(`Vasudev Prabhuji — Final Authority        Signature: ______________`, 40);

      doc.end();
      return;
    }

    // JSON response
    res.json({
      month: monthName,
      total: records.length,
      records,
    });
  } catch (err) {
    console.error('Police report error:', err);
    res.status(500).json({ error: 'Report generation failed' });
  }
}

module.exports = { hourlyGateStats, occupancyReport, gateActivity, mealConsumption, policeReport };
