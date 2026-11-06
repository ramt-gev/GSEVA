import { useEffect } from 'react';
import styles from '../gate.module.css';
import type { GateScanPerson } from '../../../lib/endpoints/gate';
import type { Zone } from '../../../lib/types';

const ALL_ZONES: Zone[] = ['zone1', 'zone2', 'zone3', 'zone4'];
const ZONE_LABELS: Record<Zone, string> = { zone1: 'Zone 1', zone2: 'Zone 2', zone3: 'Zone 3', zone4: 'Zone 4' };

interface Props {
  person: GateScanPerson;
  onNext: () => void;
  onNavEvents: () => void;
  onNavLogout: () => void;
}

export default function AllowedScreen({ person, onNext, onNavEvents, onNavLogout }: Props) {
  useEffect(() => {
    const timer = setTimeout(onNext, 4000);
    return () => clearTimeout(timer);
  }, [onNext]);

  return (
    <div className={`${styles.screen} ${styles.resultScreen} ${styles.green}`}>
      <div className={styles.resRing}>✅</div>
      <div className={styles.resStatus}>ACCESS GRANTED</div>
      <div className={styles.resName}>{person.name}</div>
      <div className={styles.resType}>
        {person.type.replace(/_/g, ' ')}
        {person.group_size > 1 && ` · Group of ${person.group_size}`}
      </div>
      <div className={styles.resCard}>
        {person.group_size > 1 && (
          <div className={styles.detRow}>
            <span className={styles.detIc}>👪</span>
            <div>
              <div className={styles.detLbl}>Group Size</div>
              <div className={styles.detVal}>{person.group_size} people — let the whole group through</div>
            </div>
          </div>
        )}
        <div className={styles.detRow}>
          <span className={styles.detIc}>🪪</span>
          <div>
            <div className={styles.detLbl}>Person Type</div>
            <div className={styles.detVal}>{person.type.replace(/_/g, ' ')}</div>
          </div>
        </div>
        <div className={styles.detRow}>
          <span className={styles.detIc}>🏢</span>
          <div>
            <div className={styles.detLbl}>Department / Contractor</div>
            <div className={styles.detVal}>{person.dept || '—'}</div>
          </div>
        </div>
        <div className={styles.detRow}>
          <span className={styles.detIc}>📅</span>
          <div>
            <div className={styles.detLbl}>Stay Period</div>
            <div className={styles.detVal}>{person.stay || '—'}</div>
          </div>
        </div>
        <div className={styles.detRow}>
          <span className={styles.detIc}>🗺️</span>
          <div>
            <div className={styles.detLbl}>Zone Access</div>
            <div className={styles.zoneChips}>
              {ALL_ZONES.map((z) => (
                <span key={z} className={`${styles.zchip} ${person.zones.includes(z) ? styles.a : styles.b}`}>
                  {ZONE_LABELS[z]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <button className={`${styles.btnNext} ${styles.g}`} onClick={onNext}>
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
