import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

interface Props {
  notify: (msg: string) => void;
}

function collectionTag(status: string) {
  if (status === 'DELIVERED') return <span className={`${styles.tag} ${styles.tagG}`}>DELIVERED</span>;
  if (status === 'COLLECTED') return <span className={`${styles.tag} ${styles.tagA}`}>COLLECTED — awaiting delivery</span>;
  return <span className={`${styles.tag} ${styles.tagGrey}`}>PENDING</span>;
}

export default function CollectionStatusTab({ notify }: Props) {
  const [rows, setRows] = useState<kitchenApi.CollectionStatusRow[] | null>(null);

  function load() {
    kitchenApi.collectionStatus().then(setRows).catch(() => setRows([]));
  }
  useEffect(load, []);

  async function mark(bldId: string, stage: 'COLLECTED' | 'DELIVERED') {
    try {
      await kitchenApi.markDistributionStage(bldId, stage);
      load();
      notify(stage === 'COLLECTED' ? 'Marked collected from the kitchen' : 'Marked delivered to the department');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not update status');
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>Collection / Delivery Status</span>
        <span className={styles.cardSub}>Collection (from the kitchen) and delivery (to the department) are separate events</span>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead><tr><th>Item</th><th>For</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.bld_id}>
                <td>{r.item_label}</td>
                <td>{r.department}</td>
                <td>{collectionTag(r.status)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={r.status !== 'PENDING'} onClick={() => mark(r.bld_id, 'COLLECTED')}>
                      Mark Collected
                    </button>
                    <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} disabled={r.status !== 'COLLECTED'} onClick={() => mark(r.bld_id, 'DELIVERED')}>
                      Mark Delivered
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows?.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>Nothing to collect right now.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
