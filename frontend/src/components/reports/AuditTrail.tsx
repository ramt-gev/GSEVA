import { useEffect, useState } from 'react';
import styles from '../../styles/backoffice.module.css';
import * as adminApi from '../../lib/endpoints/admin';

export default function Audit() {
  const [rows, setRows] = useState<adminApi.AuditLogRow[] | null>(null);

  useEffect(() => {
    adminApi.auditTrail({ limit: 50 }).then(setRows).catch(() => setRows([]));
  }, []);

  return (
    <>
      <div className={`${styles.callout} ${styles.warn}`}>
        <span className={styles.calloutIcon}>🔒</span>
        <div className={styles.calloutBody}>
          <strong>Immutable audit trail — Super Admin access only</strong>
          Every action by every user is permanently logged. Records cannot be edited or deleted.
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>🔐</span>
          <span className={styles.cardTitle}>Audit Log</span>
          <span className={styles.cardSub}>{rows ? `${rows.length} entries` : 'Loading…'}</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Table / Record</th>
                <th>Module</th>
              </tr>
            </thead>
            <tbody>
              {rows?.map((row) => (
                <tr key={row.audit_id}>
                  <td className={styles.mono} style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                    {new Date(row.created_at).toLocaleString('en-IN', { hour12: false })}
                  </td>
                  <td style={{ fontWeight: 600, fontSize: 11.5 }}>{row.user?.person?.full_name || row.user?.username || 'Public/System'}</td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagGrey}`}>{row.action}</span>
                  </td>
                  <td style={{ fontSize: 11 }}>
                    {row.table_name} {row.record_id ? `#${row.record_id.slice(0, 8)}` : ''}
                  </td>
                  <td>
                    <span className={`${styles.tag} ${styles.tagGrey}`} style={{ fontSize: 9 }}>
                      {row.module}
                    </span>
                  </td>
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                    No audit entries yet.
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
