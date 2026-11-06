import { useEffect, useState } from 'react';
import styles from '../../styles/backoffice.module.css';
import * as adminApi from '../../lib/endpoints/admin';
import { useAuth } from '../../lib/auth';

const STATUS_TAG: Record<string, { cls: keyof typeof styles; label: string }> = {
  past: { cls: 'tagGrey', label: 'Completed' },
  soon: { cls: 'tagA', label: '⏳ Upcoming' },
  future: { cls: 'tagB', label: 'Planning' },
};

function festivalStatus(dateStr: string): keyof typeof STATUS_TAG {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = (date.getTime() - now.getTime()) / 86400000;
  if (diffDays < 0) return 'past';
  if (diffDays <= 14) return 'soon';
  return 'future';
}

export default function Festival() {
  const { user } = useAuth();
  const [festivals, setFestivals] = useState<adminApi.Festival[] | null>(null);
  const canActivate = user && ['super_admin', 'management', 'module_admin'].includes(user.role);

  function load() {
    adminApi.festivalsList().then(setFestivals).catch(() => setFestivals([]));
  }

  useEffect(load, []);

  const upcoming = festivals?.filter((f) => new Date(f.festival_date) >= new Date()).sort((a, b) => a.festival_date.localeCompare(b.festival_date))[0];

  async function toggle(f: adminApi.Festival) {
    await adminApi.toggleFestivalMode(f.festival_id, !f.festival_mode_on);
    load();
  }

  return (
    <>
      {upcoming && (
        <div className={`${styles.callout} ${styles.info}`}>
          <span className={styles.calloutIcon}>📅</span>
          <div className={styles.calloutBody}>
            <strong>
              Next festival: {upcoming.festival_name} — {new Date(upcoming.festival_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </strong>
            {upcoming.expected_footfall ? `Expected footfall: ~${upcoming.expected_footfall.toLocaleString('en-IN')}. ` : ''}
            {upcoming.pre_reg_opens_at ? `Pre-registration opens ${new Date(upcoming.pre_reg_opens_at).toLocaleDateString('en-IN')}.` : ''}
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>🎉</span>
          <span className={styles.cardTitle}>Festival Calendar</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Festival</th>
                <th>Date</th>
                <th>Expected</th>
                <th>Pre-reg Opens</th>
                <th>Status</th>
                {canActivate && <th>Action</th>}
              </tr>
            </thead>
            <tbody>
              {festivals === null && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    Loading…
                  </td>
                </tr>
              )}
              {festivals?.map((f) => {
                const status = f.festival_mode_on ? { cls: 'tagG' as const, label: '⚡ Mode Active' } : STATUS_TAG[festivalStatus(f.festival_date)];
                return (
                  <tr key={f.festival_id}>
                    <td style={{ fontWeight: 600 }}>{f.festival_name}</td>
                    <td className={styles.mono}>{new Date(f.festival_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className={styles.mono}>{f.expected_footfall?.toLocaleString('en-IN') || '—'}</td>
                    <td>{f.pre_reg_opens_at ? new Date(f.pre_reg_opens_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}</td>
                    <td>
                      <span className={`${styles.tag} ${styles[status.cls]}`}>{status.label}</span>
                    </td>
                    {canActivate && (
                      <td>
                        <button className={`${styles.btn} ${f.festival_mode_on ? styles.btnDanger : styles.btnPrimary} ${styles.btnSm}`} onClick={() => toggle(f)}>
                          {f.festival_mode_on ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
