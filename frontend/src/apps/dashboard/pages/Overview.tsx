import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import * as reportsApi from '../../../lib/endpoints/reports';
import BarChart from '../BarChart';

const DONUT_COLORS: Record<string, string> = {
  'Day Visitors': 'var(--blue)',
  'Staff & Family': 'var(--purple)',
  Labourers: 'var(--amber)',
  'Volunteers/Students': 'var(--teal)',
  'Room Guests': 'var(--saffron)',
};

export default function Overview() {
  const [dashboard, setDashboard] = useState<adminApi.DashboardSummary | null>(null);
  const [hourly, setHourly] = useState<reportsApi.HourlyStat[] | null>(null);
  const [recentEvents, setRecentEvents] = useState<reportsApi.GateActivityReport['events']>([]);
  const [pending, setPending] = useState<adminApi.PendingApproval[]>([]);

  useEffect(() => {
    function load() {
      adminApi.dashboardSummary().then(setDashboard).catch(() => {});
      reportsApi.hourlyGateStats().then(setHourly).catch(() => {});
      reportsApi.gateActivity({ limit: 5 }).then((r) => setRecentEvents(r.events)).catch(() => {});
      adminApi.pendingApprovals().then((rows) => setPending(rows.slice(0, 3))).catch(() => {});
    }
    load();
    const id1 = setInterval(() => {
      adminApi.dashboardSummary().then(setDashboard).catch(() => {});
    }, 60000);
    const id2 = setInterval(() => {
      reportsApi.hourlyGateStats().then(setHourly).catch(() => {});
    }, 300000);
    return () => {
      clearInterval(id1);
      clearInterval(id2);
    };
  }, []);

  const p = dashboard?.population;
  const donutTotal = p ? p.day_visitors + p.staff + p.labourers + p.volunteers_students + p.room_guests : 0;
  const donutRows = p
    ? [
        { label: 'Day Visitors', value: p.day_visitors },
        { label: 'Staff & Family', value: p.staff },
        { label: 'Labourers', value: p.labourers },
        { label: 'Volunteers/Students', value: p.volunteers_students },
        { label: 'Room Guests', value: p.room_guests },
      ]
    : [];

  const now = new Date().getHours();
  const from = Math.max(6, now - 7);
  const hourlySlice = hourly ? hourly.slice(from, from + 8).map((s) => ({ label: String(s.hour), value: s.entries })) : [];

  return (
    <>
      <div className={styles.statsGrid}>
        <Stat cls="sO" val={p?.total ?? '—'} lbl="Total On Campus" sub={dashboard ? `Entries today: ${dashboard.gate.entries} · Denials: ${dashboard.gate.denials}` : 'Loading…'} />
        <Stat cls="sG" val={p?.room_guests ?? '—'} lbl="Room Guests" sub="Overnight bookings" />
        <Stat cls="sB" val={p?.day_visitors ?? '—'} lbl="Day Visitors" sub="Free + Paid" />
        <Stat cls="sP" val={p?.staff ?? '—'} lbl="Staff & Family" sub="Payroll + dependants" />
        <Stat cls="sA" val={p?.labourers ?? '—'} lbl="Labourers" sub="All contractor camps" />
        <Stat cls="sT" val={p ? p.volunteers_students + p.ashram : '—'} lbl="Volunteers / Students" sub="Seva + Courses + Ashram" />
      </div>

      <div className={styles.g3}>
        <div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>📊</span>
              <span className={styles.cardTitle}>Today's Footfall by Hour</span>
              <span className={styles.cardSub}>Entry events</span>
            </div>
            <div className={styles.cardBody}>
              {hourly ? <BarChart data={hourlySlice} color="#703d1a" /> : <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>}
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>🚪</span>
              <span className={styles.cardTitle}>Recent Gate Activity</span>
            </div>
            <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
              {recentEvents.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No recent events.</div>}
              {recentEvents.map((e) => (
                <div className={styles.feedItem} key={e.event_id}>
                  <div className={styles.feedDot} style={{ background: e.result === 'allowed' ? 'var(--green)' : 'var(--red)' }} />
                  <div className={styles.feedText}>
                    <strong>{e.full_name || 'Unknown'}</strong> {e.result === 'allowed' ? 'entered' : 'denied'} — {e.gate.replace(/_/g, ' ')}
                    {e.deny_reason ? ` — ${e.deny_reason}` : ''}
                  </div>
                  <div className={styles.feedTime}>{new Date(e.scanned_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>🍽️</span>
              <span className={styles.cardTitle}>Campus Population</span>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.donutWrap}>
                <Donut rows={donutRows} total={donutTotal} />
                <div className={styles.donutLegend}>
                  {donutRows.map((row) => (
                    <div className={styles.legendItem} key={row.label}>
                      <div className={styles.legDot} style={{ background: DONUT_COLORS[row.label] }} />
                      <span className={styles.legLbl}>{row.label}</span>
                      <span className={styles.legVal}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span>⏳</span>
              <span className={styles.cardTitle}>Pending Actions</span>
            </div>
            <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
              {pending.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>Nothing pending.</div>}
              {pending.map((p) => (
                <div className={styles.feedItem} key={p.person_id}>
                  <div className={styles.feedDot} style={{ background: 'var(--amber)' }} />
                  <div className={styles.feedText}>
                    <strong>{p.full_name}</strong> — {p.person_type.replace(/_/g, ' ')} {p.contractor_name ? `(${p.contractor_name})` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ cls, val, lbl, sub }: { cls: keyof typeof styles; val: string | number; lbl: string; sub: string }) {
  return (
    <div className={`${styles.stat} ${styles[cls]}`}>
      <div className={styles.statBar} />
      <div className={styles.statVal}>{val}</div>
      <div className={styles.statLbl}>{lbl}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

function Donut({ rows, total }: { rows: { label: string; value: number }[]; total: number }) {
  const r = 36;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = rows.map((row) => {
    const frac = total > 0 ? row.value / total : 0;
    const dash = frac * circumference;
    const seg = { color: DONUT_COLORS[row.label], dash, offset: -offset };
    offset += dash;
    return seg;
  });

  return (
    <svg width={90} height={90} viewBox="0 0 90 90">
      <circle cx={45} cy={45} r={r} fill="none" stroke="#f0e4d6" strokeWidth={10} />
      {segments.map((s, i) => (
        <circle
          key={i}
          cx={45}
          cy={45}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth={10}
          strokeDasharray={`${s.dash} ${circumference - s.dash}`}
          strokeDashoffset={s.offset}
          transform="rotate(-90 45 45)"
        />
      ))}
      <text x={45} y={42} textAnchor="middle" fill="var(--saffron)" fontSize={11}>
        {total}
      </text>
      <text x={45} y={54} textAnchor="middle" fill="var(--text3)" fontSize={7.5}>
        on campus
      </text>
    </svg>
  );
}
