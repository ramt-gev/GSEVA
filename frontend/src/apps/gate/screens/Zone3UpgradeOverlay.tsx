import { useEffect } from 'react';
import styles from '../gate.module.css';
import type { UpgradeState } from '../useGateSession';

interface Props {
  upgrade: UpgradeState;
  onConfirm: () => void;
  onDismiss: () => void;
}

export default function Zone3UpgradeOverlay({ upgrade, onConfirm, onDismiss }: Props) {
  const isSuccess = upgrade.phase === 'success';

  useEffect(() => {
    if (!isSuccess) return;
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  if (upgrade.phase === 'success') {
    return (
      <div className={styles.upgradeSuccess}>
        <div className={styles.usIcon}>✅</div>
        <div className={styles.usTitle}>Zone 3 Access Granted!</div>
        <div className={styles.usSub}>Payment confirmed · WhatsApp receipt sent · Gate opening</div>
        <div className={styles.usDetail}>
          <div className={styles.usRow}>
            <span>Visitor</span>
            <span>{upgrade.person.name}</span>
          </div>
          <div className={styles.usRow}>
            <span>Persons</span>
            <span>
              {upgrade.groupSize} person{upgrade.groupSize > 1 ? 's' : ''}
            </span>
          </div>
          <div className={styles.usRow}>
            <span>Amount paid</span>
            <span>₹{upgrade.total.toLocaleString('en-IN')}</span>
          </div>
          <div className={styles.usRow}>
            <span>Zone 3 valid</span>
            <span>Until 8:00 PM today</span>
          </div>
          <div className={styles.usRow}>
            <span>Cafe</span>
            <span>Govinda's Guest Area</span>
          </div>
        </div>
        <div className={styles.usReturn}>🔄 Returning to scanner shortly...</div>
      </div>
    );
  }

  const processing = upgrade.phase === 'processing';
  const cafeAvailable = upgrade.phase === 'offer' ? upgrade.cafeAvailable : null;
  const isFull = cafeAvailable !== null && cafeAvailable <= 0;

  return (
    <div className={styles.upgradeOverlay}>
      <div className={styles.upgradeHeader}>
        <div className={styles.upgradeBadge}>
          <span>⬆️ Zone 3 Upgrade Available</span>
        </div>
        <div className={styles.upgradePerson}>{upgrade.person.name}</div>
        <div className={styles.upgradeGroup}>
          Group of {upgrade.groupSize} · {upgrade.person.type.replace(/_/g, ' ')} · Today only
        </div>
        <div className={styles.upgradeZones}>
          <span className={`${styles.uz} ${styles.uzOk}`}>Zone 1 ✓</span>
          <span className={`${styles.uz} ${styles.uzOk}`}>Zone 2 ✓</span>
          <span className={`${styles.uz} ${styles.uzNo}`}>Zone 3</span>
        </div>
      </div>
      <div className={styles.upgradeBody}>
        {!isFull ? (
          <div className={styles.upgradeCard}>
            <div className={styles.ucTitle}>🍽️ Govinda's Guest Area — Buffet Lunch</div>
            <div className={styles.ucDetail}>
              Spots available today: <strong style={{ color: '#22C55E' }}>{cafeAvailable ?? '—'}</strong> remaining
              <br />
              Price: ₹{upgrade.phase === 'offer' ? upgrade.pricePerPerson : 350} per person · Zone 3 access included
              <br />
              Valid until 8:00 PM · WhatsApp confirmation sent
            </div>
            <div className={styles.ucCalc}>
              ₹{upgrade.phase === 'offer' ? upgrade.pricePerPerson : 0} × {upgrade.groupSize} person
              {upgrade.groupSize > 1 ? 's' : ''} = <strong>₹{upgrade.total.toLocaleString('en-IN')}</strong>
              <small>Govinda's Buffet Lunch · Valid until 8:00 PM</small>
            </div>
            <button className={styles.upgradePayBtn} disabled={processing} onClick={onConfirm}>
              {processing ? 'Processing payment...' : `💳  Pay ₹${upgrade.total.toLocaleString('en-IN')} — Enter Zone 3`}
            </button>
            <button className={styles.upgradeSkipBtn} disabled={processing} onClick={onDismiss}>
              ✕ Cancel — Go back to scanner
            </button>
          </div>
        ) : (
          <div className={styles.upgradeFullBox}>
            <div className={styles.upgradeFullTitle}>❌ Govinda's Buffet — Fully Booked Today</div>
            <div className={styles.upgradeFullDesc}>
              All covers reserved for today.
              <br />
              <br />
              Alternatives:
              <br />
              🍴 Govinda's Srinathji Bhavan — Zone 1 (Lunch ₹100)
              <br />
              🌱 Annakshetra Free Lunch — 12:45–2:30 PM
            </div>
            <button className={styles.upgradeSkipBtn} style={{ marginTop: 10 }} onClick={onDismiss}>
              ← Back to Scanner
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
