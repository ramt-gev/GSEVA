import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

interface Props {
  canDecide: boolean;
  notify: (msg: string) => void;
}

function statusTag(s: string) {
  if (s === 'APPROVED') return <span className={`${styles.tag} ${styles.tagG}`}>APPROVED</span>;
  if (s === 'REJECTED') return <span className={`${styles.tag} ${styles.tagR}`}>REJECTED</span>;
  return <span className={`${styles.tag} ${styles.tagA}`}>REQUESTED</span>;
}

export default function SpecialRequestsTab({ canDecide, notify }: Props) {
  const [rows, setRows] = useState<kitchenApi.SpecialRequestRow[] | null>(null);

  function load() {
    kitchenApi.specialList().then(setRows).catch(() => setRows([]));
  }
  useEffect(load, []);

  async function decide(id: string, decision: 'APPROVED' | 'REJECTED') {
    try {
      await kitchenApi.specialDecide(id, decision);
      load();
      notify(`special_request_entries.status = '${decision}'`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not record decision');
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>Special Requests</span>
        <span className={styles.cardSub}>{canDecide ? 'Approve or reject each pending request' : 'View only — approval belongs to the HOD role'}</span>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>for_date</th><th>Department</th><th>Item</th><th>Amount</th><th>Requested By</th><th>Status</th>
              {canDecide && <th>Decision</th>}
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.request_id}>
                <td>{r.for_date}</td><td>{r.department}</td><td>{r.item}</td><td>{r.amount} {r.unit}</td><td>{r.requested_by}</td>
                <td>{statusTag(r.status)}</td>
                {canDecide && (
                  <td>
                    {r.status === 'REQUESTED' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => decide(r.request_id, 'APPROVED')}>
                          Approve
                        </button>
                        <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={() => decide(r.request_id, 'REJECTED')}>
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>approved_by: {r.approved_by}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {rows?.length === 0 && <tr><td colSpan={canDecide ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No special requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
