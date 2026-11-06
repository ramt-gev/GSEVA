import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

interface Props {
  notify: (msg: string) => void;
}

export default function FinalCountTab({ notify }: Props) {
  const [rows, setRows] = useState<kitchenApi.FinalCountRow[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  function load() {
    kitchenApi.finalCounts().then((data) => {
      setRows(data);
      setDrafts(Object.fromEntries(data.map((r) => [r.bld_id, r.actual != null ? String(r.actual) : ''])));
    }).catch(() => setRows([]));
  }
  useEffect(load, []);

  async function submit(bldId: string) {
    try {
      await kitchenApi.submitFinalCount(bldId, Number(drafts[bldId]) || 0);
      load();
      notify('Final distributed count recorded');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not submit count');
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>Final Distribution Count</span>
        <span className={styles.cardSub}>Actual vs. expected, against today&apos;s finalized BLD plan (Dinner)</span>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead><tr><th>Item</th><th>Expected (from BLD)</th><th>Actual Distributed</th><th>Submitted</th></tr></thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.bld_id}>
                <td>{r.item_label}</td>
                <td>{r.expected}</td>
                <td>
                  <input
                    className={styles.dashInput} style={{ padding: '6px 8px', width: 100 }}
                    type="number" step="0.1" value={drafts[r.bld_id] ?? ''} disabled={r.submitted}
                    onChange={(e) => setDrafts((d) => ({ ...d, [r.bld_id]: e.target.value }))}
                  />
                </td>
                <td>
                  {r.submitted
                    ? <span className={`${styles.tag} ${styles.tagG}`}>Submitted</span>
                    : <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => submit(r.bld_id)}>Submit</button>}
                </td>
              </tr>
            ))}
            {rows?.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No dinner items planned for today.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
