import styles from '../gate.module.css';
import type { GateEventEntry, GateOption } from '../useGateSession';

interface Props {
  gate: GateOption;
  events: GateEventEntry[];
  onBack: () => void;
}

export default function EventsScreen({ gate, events, onBack }: Props) {
  return (
    <div className={`${styles.screen} ${styles.eventsScreen}`}>
      <div className={styles.eventsHeader}>
        <button className={styles.iconBtn} onClick={onBack} style={{ flexShrink: 0 }}>
          ←
        </button>
        <span className={styles.eventsTitle}>Recent Gate Events</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>{gate.name}</span>
      </div>
      <div className={styles.eventsBody}>
        {events.length === 0 && <div className={styles.eventsEmpty}>No events yet</div>}
        {events.map((e, i) => (
          <div className={`${styles.evItem} ${e.type === 'a' ? styles.a : styles.d}`} key={i}>
            <div className={styles.evTop}>
              <span className={`${styles.evBadge} ${e.type === 'a' ? styles.a : styles.d}`}>
                {e.type === 'a' ? '✓ Allowed' : '✗ Denied'}
              </span>
              <span className={styles.evTime}>{e.time}</span>
            </div>
            <div className={styles.evName}>{e.name}</div>
            <div className={styles.evSub}>{e.sub}</div>
          </div>
        ))}
      </div>
      <div className={styles.bottomNav}>
        <button className={styles.bnavBtn} onClick={onBack}>
          <span className={styles.bnavIcon}>📷</span>
          <span className={styles.bnavLabel}>Scanner</span>
        </button>
        <button className={`${styles.bnavBtn} ${styles.active}`}>
          <span className={styles.bnavIcon}>📋</span>
          <span className={styles.bnavLabel}>Events</span>
        </button>
      </div>
    </div>
  );
}
