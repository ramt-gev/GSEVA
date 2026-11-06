import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import * as reportsApi from '../../../lib/endpoints/reports';
import { useAuth } from '../../../lib/auth';
import { ApiError } from '../../../lib/api';

const SEVA_SCOPED_TYPES = ['volunteer_seva', 'sustainability_intern'];

export default function Dashboard() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<adminApi.DashboardSummary | null>(null);
  const [pending, setPending] = useState<adminApi.PendingApproval[]>([]);
  const [recentEvents, setRecentEvents] = useState<reportsApi.GateActivityReport['events']>([]);

  // Mirrors adminService.js's canApprovePersonType — see Seva.tsx for the same check.
  const canApproveSeva = user?.role === 'super_admin' || (user?.role === 'dept_manager' && user.module_access.includes('seva'));

  function load() {
    adminApi.dashboardSummary().then((d) => {
      setDashboard(d);
      if (d.pending_approvals > 0) {
        adminApi.pendingApprovals().then(setPending).catch(() => {});
      } else {
        setPending([]);
      }
    });
    reportsApi.gateActivity({ limit: 8 }).then((r) => setRecentEvents(r.events)).catch(() => {});
  }

  useEffect(load, []);

  async function approve(personId: string) {
    if (!confirm('Approve this person and send QR pass via WhatsApp?')) return;
    try {
      await adminApi.approvePerson(personId);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Could not approve this person.');
    }
  }

  const p = dashboard?.population;

  return (
    <>
      <div className={styles.statsGrid}>
        <Stat cls="sO" val={p?.room_guests ?? '—'} lbl="Room Guests" />
        <Stat cls="sB" val={p?.day_visitors ?? '—'} lbl="Day Visitors" />
        <Stat cls="sP" val={p?.staff ?? '—'} lbl="Staff & Family" />
        <Stat cls="sT" val={p?.volunteers_students ?? '—'} lbl="Seva & Volunteers" />
        <Stat cls="sA" val={p?.labourers ?? '—'} lbl="Labourers" />
        <Stat cls="sG" val={p?.ashram ?? '—'} lbl="Ashram Residents" />
      </div>

      <div className={styles.g2}>
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
                </div>
                <div className={styles.feedTime}>{new Date(e.scanned_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span>⏳</span>
            <span className={styles.cardTitle}>Pending Approvals</span>
            <span className={styles.cardSub}>{dashboard?.pending_approvals ?? 0} total</span>
          </div>
          <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
            {pending.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>No pending approvals</div>}
            {pending.map((p) => (
              <div key={p.person_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border, #e8ddd4)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.full_name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.contractor_name || p.person_type.replace(/_/g, ' ')}</div>
                </div>
                {SEVA_SCOPED_TYPES.includes(p.person_type) && !canApproveSeva ? (
                  <span className={`${styles.tag} ${styles.tagGrey}`}>Awaiting Seva HOD</span>
                ) : (
                  <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => approve(p.person_id)}>
                    Approve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Stat({ cls, val, lbl }: { cls: keyof typeof styles; val: string | number; lbl: string }) {
  return (
    <div className={`${styles.stat} ${styles[cls]}`}>
      <div className={styles.statBar} />
      <div className={styles.statVal}>{val}</div>
      <div className={styles.statLbl}>{lbl}</div>
    </div>
  );
}
