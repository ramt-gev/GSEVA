import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import PersonTypeTable from '../components/PersonTypeTable';
import UploadRosterModal from '../components/UploadRosterModal';

type AshramType = 'brahmachari' | 'varishtha_vaishnava';

export default function Ashram() {
  const [brahmachariCount, setBrahmachariCount] = useState<number | null>(null);
  const [vvCount, setVvCount] = useState<number | null>(null);
  const [uploadType, setUploadType] = useState<AshramType | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  function loadCounts() {
    adminApi.personsByType({ type: 'brahmachari', limit: 1 }).then((r) => setBrahmachariCount(r.total)).catch(() => {});
    adminApi.personsByType({ type: 'varishtha_vaishnava', limit: 1 }).then((r) => setVvCount(r.total)).catch(() => {});
  }
  useEffect(loadCounts, []);

  function handleImported() {
    loadCounts();
    setRefreshKey((k) => k + 1);
  }

  return (
    <>
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className={`${styles.stat} ${styles.sT}`}>
          <div className={styles.statBar} />
          <div className={styles.statVal}>{brahmachariCount ?? '—'}</div>
          <div className={styles.statLbl}>Brahmacharis</div>
          <div className={styles.statSub}>On campus / pre-registered</div>
          <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} style={{ marginTop: 10 }} onClick={() => setUploadType('brahmachari')}>
            📋 Upload Roster
          </button>
        </div>
        <div className={`${styles.stat} ${styles.sT}`}>
          <div className={styles.statBar} />
          <div className={styles.statVal}>{vvCount ?? '—'}</div>
          <div className={styles.statLbl}>Varishtha Vaishnavas</div>
          <div className={styles.statSub}>On campus / pre-registered</div>
          <button className={`${styles.btn} ${styles.btnOutline} ${styles.btnSm}`} style={{ marginTop: 10 }} onClick={() => setUploadType('varishtha_vaishnava')}>
            📋 Upload Roster
          </button>
        </div>
      </div>
      <PersonTypeTable types="brahmachari,varishtha_vaishnava" emptyLabel="Ashram Residents" refreshKey={refreshKey} />

      {uploadType && (
        <UploadRosterModal
          personType={uploadType}
          label={uploadType === 'brahmachari' ? 'Brahmacharis' : 'Varishtha Vaishnavas'}
          onClose={() => setUploadType(null)}
          onImported={handleImported}
        />
      )}
    </>
  );
}
