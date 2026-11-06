import { useEffect, useState } from 'react';
import styles from '../../styles/backoffice.module.css';
import * as mealsApi from '../../lib/endpoints/meals';

export default function BillingTable() {
  const [rows, setRows] = useState<mealsApi.BillingRow[] | null>(null);

  useEffect(() => {
    mealsApi.contractorBilling().then(setRows).catch(() => setRows([]));
  }, []);

  const total = rows?.reduce((sum, r) => sum + Number(r.monthly_amount_to_recover), 0) ?? 0;

  return (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Contractor</th>
            <th>HOD</th>
            <th>Registered</th>
            <th>B+D Registered</th>
            <th>Payment Method</th>
            <th>Monthly Bill</th>
          </tr>
        </thead>
        <tbody>
          {rows === null && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                Loading…
              </td>
            </tr>
          )}
          {rows?.map((r, i) => (
            <tr key={i}>
              <td style={{ fontWeight: 600 }}>{r.contractor_company || '—'}</td>
              <td>{r.hod_name || '—'}</td>
              <td className={styles.mono}>{r.registered_persons}</td>
              <td className={styles.mono}>{r.bd_registered}</td>
              <td>
                <span className={`${styles.tag} ${styles.tagGrey}`}>{r.payment_method.replace(/_/g, ' ')}</span>
              </td>
              <td className={styles.mono} style={{ fontWeight: 700, color: 'var(--saffron)' }}>
                ₹{Number(r.monthly_amount_to_recover).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
          {rows && rows.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                No contractor billing records for the current registrations.
              </td>
            </tr>
          )}
          {rows && rows.length > 0 && (
            <tr style={{ background: 'var(--surface, #f8eee4)' }}>
              <td style={{ fontWeight: 700 }} colSpan={5}>
                Total
              </td>
              <td className={styles.mono} style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>
                ₹{total.toLocaleString('en-IN')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
