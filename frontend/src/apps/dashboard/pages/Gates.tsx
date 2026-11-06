import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as gateApi from '../../../lib/endpoints/gate';
import * as reportsApi from '../../../lib/endpoints/reports';
import * as adminApi from '../../../lib/endpoints/admin';

const GATE_LABELS: Record<string, string> = {
  main_gate: '🚧 Main Gate',
  gate_7: '🌳 Gate No. 7',
  sbt_gate: '🏠 SBT Gate',
  exit_gate: '🚪 Exit Gate',
};

export default function Gates() {
  const [stats, setStats] = useState<gateApi.GateStatRow[] | null>(null);
  const [activity, setActivity] = useState<reportsApi.GateActivityReport | null>(null);
  const [zone3, setZone3] = useState<adminApi.Zone3UpgradesToday | null>(null);

  useEffect(() => {
    gateApi.gateStats().then(setStats).catch(() => {});
    reportsApi.gateActivity({ limit: 20 }).then(setActivity).catch(() => {});
    adminApi.zone3UpgradesToday().then(setZone3).catch(() => {});
  }, []);

  return (
    <>
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className={`${styles.stat} ${styles.sG}`}>
          <div className={styles.statBar} />
          <div className={styles.statVal}>{activity?.totals.entries ?? '—'}</div>
          <div className={styles.statLbl}>Entries Today</div>
          <div className={styles.statSub}>All 4 gates combined</div>
        </div>
        <div className={`${styles.stat} ${styles.sR}`}>
          <div className={styles.statBar} />
          <div className={styles.statVal}>{activity?.totals.denials ?? '—'}</div>
          <div className={styles.statLbl}>Denied Today</div>
          <div className={styles.statSub}>
            {activity && activity.totals.entries + activity.totals.denials > 0
              ? `${Math.round((activity.totals.denials / (activity.totals.entries + activity.totals.denials)) * 100)}% denial rate`
              : '—'}
          </div>
        </div>
        <div className={`${styles.stat} ${styles.sB}`}>
          <div className={styles.statBar} />
          <div className={styles.statVal}>{activity?.totals.overrides ?? '—'}</div>
          <div className={styles.statLbl}>Manual Overrides</div>
          <div className={styles.statSub}>All logged in audit</div>
        </div>
        <div className={`${styles.stat} ${styles.sA}`}>
          <div className={styles.statBar} />
          <div className={styles.statVal}>{zone3?.count ?? '—'}</div>
          <div className={styles.statLbl}>Zone 3 Upgrades</div>
          <div className={styles.statSub}>{zone3 ? `₹${zone3.total_revenue.toLocaleString('en-IN')} collected` : '—'}</div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>📍</span>
          <span className={styles.cardTitle}>Gate-wise Activity Summary — Today</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Gate</th>
                <th>Entries</th>
                <th>Denials</th>
                <th>Last Scan</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(['main_gate', 'gate_7', 'sbt_gate', 'exit_gate'] as const).map((g) => {
                const row = stats?.find((s) => s.gate === g);
                return (
                  <tr key={g}>
                    <td style={{ fontWeight: 700 }}>{GATE_LABELS[g]}</td>
                    <td className={styles.mono}>{row?.allowed ?? 0}</td>
                    <td className={styles.mono} style={{ color: 'var(--red)' }}>{row?.denied ?? 0}</td>
                    <td className={styles.mono} style={{ fontSize: 10 }}>
                      {row?.last_scan ? new Date(row.last_scan).toLocaleTimeString('en-IN', { hour12: false }) : '—'}
                    </td>
                    <td>
                      <span className={`${styles.tag} ${styles.tagG}`}>● Active</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>📋</span>
          <span className={styles.cardTitle}>Recent Gate Events</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Person</th>
                <th>Type</th>
                <th>Gate</th>
                <th>Result</th>
                <th>Reason / Note</th>
              </tr>
            </thead>
            <tbody>
              {activity?.events.map((e) => (
                <tr key={e.event_id}>
                  <td className={styles.mono} style={{ fontSize: 10 }}>
                    {new Date(e.scanned_at).toLocaleTimeString('en-IN', { hour12: false })}
                  </td>
                  <td style={{ fontWeight: 600 }}>{e.is_batch_count ? `Batch Entry × ${e.batch_count}` : e.full_name || '—'}</td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagGrey}`}>{e.person_type?.replace(/_/g, ' ') || '—'}</span>
                  </td>
                  <td>{e.gate.replace(/_/g, ' ')}</td>
                  <td>
                    {e.result === 'allowed' && <span className={`${styles.tag} ${styles.tagG}`}>✓ Allowed</span>}
                    {e.result === 'denied' && <span className={`${styles.tag} ${styles.tagR}`}>✗ Denied</span>}
                    {e.result === 'manual_override' && <span className={`${styles.tag} ${styles.tagB}`}>⚠ Override</span>}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text3)' }}>{e.deny_reason || '—'}</td>
                </tr>
              ))}
              {activity && activity.events.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    No gate events today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
