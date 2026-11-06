import { useEffect, useState } from 'react';
import styles from '../gate.module.css';
import { RequireRole } from '../../../components/RequireRole';
import * as gateApi from '../../../lib/endpoints/gate';
import type { GateScanResult } from '../../../lib/endpoints/gate';
import type { Gate, Zone } from '../../../lib/types';

const ALL_ZONES: Zone[] = ['zone1', 'zone2', 'zone3', 'zone4'];
const ZONE_LABELS: Record<Zone, string> = { zone1: 'Zone 1', zone2: 'Zone 2', zone3: 'Zone 3', zone4: 'Zone 4' };

interface Props {
  result: GateScanResult;
  gate: Gate;
  onNext: () => void;
  onNavEvents: () => void;
  onNavLogout: () => void;
}

export default function DeniedScreen({ result, gate, onNext, onNavEvents, onNavLogout }: Props) {
  const [overriding, setOverriding] = useState(false);
  const person = result.person;

  useEffect(() => {
    const timer = setTimeout(onNext, 5000);
    return () => clearTimeout(timer);
  }, [onNext]);

  async function doOverride() {
    const reason = prompt('Enter reason for manual override.\n(This will be logged in the audit trail)');
    if (!reason || !reason.trim()) return;
    setOverriding(true);
    try {
      await gateApi.gateOverride({ gate, reason: reason.trim() });
      alert('Override logged. Audit entry created.');
      onNext();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Override failed');
    } finally {
      setOverriding(false);
    }
  }

  return (
    <div className={`${styles.screen} ${styles.resultScreen} ${styles.red}`}>
      <div className={`${styles.resRing} ${styles.red}`}>🚫</div>
      <div className={`${styles.resStatus} ${styles.red}`}>ACCESS DENIED</div>
      <div className={styles.resName}>{person?.name || '—'}</div>
      <div className={styles.resType}>{person?.type.replace(/_/g, ' ') || '—'}</div>
      <div className={styles.denyBox}>
        <div className={styles.denyBoxLbl}>Reason for Denial</div>
        <div className={styles.denyBoxMsg}>{result.deny_reason || 'Not eligible for this zone'}</div>
      </div>
      <div className={`${styles.resCard} ${styles.redCard}`} style={{ maxWidth: 380 }}>
        <div className={styles.detRow}>
          <span className={styles.detIc}>🪪</span>
          <div>
            <div className={styles.detLbl}>Person Type</div>
            <div className={styles.detVal}>{person?.type.replace(/_/g, ' ') || '—'}</div>
          </div>
        </div>
        <div className={styles.detRow}>
          <span className={styles.detIc}>📞</span>
          <div>
            <div className={styles.detLbl}>Mobile</div>
            <div className={styles.detVal}>{person?.mobile || '—'}</div>
          </div>
        </div>
        <div className={styles.detRow}>
          <span className={styles.detIc}>🗺️</span>
          <div>
            <div className={styles.detLbl}>Zone Access</div>
            <div className={styles.zoneChips}>
              {ALL_ZONES.map((z) => (
                <span key={z} className={`${styles.zchip} ${person?.zones.includes(z) ? styles.a : styles.b}`}>
                  {ZONE_LABELS[z]}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.detRow}>
          <span className={styles.detIc}>💡</span>
          <div>
            <div className={styles.detLbl}>Action Required</div>
            <div className={styles.detVal} style={{ color: 'var(--saffron)', fontSize: 12 }}>
              {result.action || 'Contact admin for assistance'}
            </div>
          </div>
        </div>
      </div>

      {/* Restricted to super_admin/module_admin — matches POST /api/gate/override's
          own server-side role check exactly; hidden here rather than shown and 403ing. */}
      <RequireRole roles={['super_admin', 'module_admin']}>
        <button className={styles.btnOverride} disabled={overriding} onClick={doOverride}>
          ⚠️ Manual Override (Admin Only)
        </button>
      </RequireRole>

      <button className={`${styles.btnNext} ${styles.r}`} onClick={onNext}>
        NEXT SCAN →
      </button>
      <div className={`${styles.bottomNav} ${styles.deneyInlineNav}`}>
        <button className={styles.bnavBtn} onClick={onNext}>
          <span className={styles.bnavIcon}>📷</span>
          <span className={styles.bnavLabel}>Scanner</span>
        </button>
        <button className={styles.bnavBtn} onClick={onNavEvents}>
          <span className={styles.bnavIcon}>📋</span>
          <span className={styles.bnavLabel}>Events</span>
        </button>
        <button className={styles.bnavBtn} onClick={onNavLogout}>
          <span className={styles.bnavIcon}>🔓</span>
          <span className={styles.bnavLabel}>Logout</span>
        </button>
      </div>
    </div>
  );
}
