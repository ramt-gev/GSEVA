import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import PersonTypeTable from '../components/PersonTypeTable';

export default function Vendors() {
  const [pending, setPending] = useState<adminApi.PendingApproval[] | null>(null);

  function load() {
    adminApi.pendingApprovals().then((rows) => setPending(rows.filter((r) => r.person_type === 'vendor_supplier'))).catch(() => setPending([]));
  }
  useEffect(load, []);

  async function approve(personId: string) {
    if (!confirm('Approve this vendor and send QR pass via WhatsApp?')) return;
    await adminApi.approvePerson(personId);
    load();
  }

  return (
    <>
      {pending && pending.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Pending Vendor Registrations</span>
            <span className={styles.cardSub}>{pending.length} awaiting approval</span>
          </div>
          <div className={styles.cardBody} style={{ padding: '8px 16px' }}>
            {pending.map((p) => (
              <div className={styles.feedItem} key={p.person_id}>
                <div className={styles.feedDot} style={{ background: 'var(--amber)' }} />
                <div className={styles.feedText}>
                  <strong>{p.full_name}</strong> — {p.mobile}
                </div>
                <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => approve(p.person_id)}>
                  Approve
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <PersonTypeTable types="vendor_supplier" emptyLabel="Registered Vendors & Suppliers" />
    </>
  );
}
