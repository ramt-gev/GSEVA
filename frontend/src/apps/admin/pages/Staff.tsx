import { useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import PersonTypeTable from '../components/PersonTypeTable';
import { useAuth } from '../../../lib/auth';
import { ApiError } from '../../../lib/api';

export default function Staff() {
  const { user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const canSync = user?.role === 'super_admin';

  async function syncNow() {
    setSyncing(true);
    setSyncResult(null);
    setSyncError('');
    try {
      const staff = await adminApi.syncGreythrStaff();
      const attendance = await adminApi.syncGreythrAttendance();
      setSyncResult(
        `${staff.created} created, ${staff.updated} updated, ${staff.deactivated} archived` +
        (staff.skippedNoMobile || staff.skippedNoDept ? ` (${staff.skippedNoMobile} skipped: no mobile, ${staff.skippedNoDept} skipped: no dept match)` : '') +
        ` · ${attendance.present} present of ${attendance.total} today`
      );
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <div className={`${styles.callout} ${styles.info}`}>
        <span className={styles.calloutIcon}>ℹ️</span>
        <div className={styles.calloutBody}>
          <strong>Greythr HRMS sync</strong>
          Payroll staff and dependants are seeded/updated daily by the Greythr sync cron (attendance hourly) — records here reflect the
          last sync.
          {canSync && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} disabled={syncing} onClick={syncNow}>
                {syncing ? 'Syncing…' : 'Sync Now'}
              </button>
              {syncResult && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{syncResult}</span>}
              {syncError && <span style={{ fontSize: 12, color: 'var(--red)' }}>{syncError}</span>}
            </div>
          )}
        </div>
      </div>
      <PersonTypeTable types="resident_staff,staff_dependant" emptyLabel="Resident Staff & Family" refreshKey={refreshKey} />
    </>
  );
}
