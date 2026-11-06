import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import PersonTypeTable from '../components/PersonTypeTable';
import { useAuth } from '../../../lib/auth';
import { ApiError } from '../../../lib/api';

export default function Seva() {
  const { user } = useAuth();
  const [pending, setPending] = useState<adminApi.PendingApproval[] | null>(null);

  // Mirrors adminService.js's canApprovePersonType — volunteer/intern
  // approval is scoped to super_admin or a dept_manager whose module_access
  // includes 'seva' (the Seva HOD), not every role that can see this page.
  const canApprove = user?.role === 'super_admin' || (user?.role === 'dept_manager' && user.module_access.includes('seva'));

  function load() {
    adminApi
      .pendingApprovals()
      .then((rows) => setPending(rows.filter((r) => r.person_type === 'volunteer_seva' || r.person_type === 'sustainability_intern')))
      .catch(() => setPending([]));
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

  return (
    <>
      {pending && pending.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Pending Seva Applications</span>
            <span className={styles.cardSub}>{pending.length} awaiting approval</span>
          </div>
          <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
            {!canApprove && (
              <div style={{ fontSize: 11, color: 'var(--text3)', paddingBottom: 8 }}>
                Only the Seva HOD or Super Admin can approve — you can view these, not act on them.
              </div>
            )}
            {pending.map((p) => (
              <div className={styles.feedItem} key={p.person_id}>
                <div className={styles.feedDot} style={{ background: 'var(--amber)' }} />
                <div className={styles.feedText}>
                  <strong>{p.full_name}</strong> — {p.mobile} {p.dept_name ? `· ${p.dept_name}` : ''}
                </div>
                {canApprove ? (
                  <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => approve(p.person_id)}>
                    Approve
                  </button>
                ) : (
                  <span className={`${styles.tag} ${styles.tagGrey}`}>Awaiting Seva HOD</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <PersonTypeTable types="volunteer_seva,sustainability_intern" emptyLabel="Active Volunteers & Interns" />
    </>
  );
}
