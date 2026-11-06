import styles from '../register.module.css';

export interface SlotOption {
  time: string;
  slotId: string | null;
  available: number | null;
  full: boolean;
}

interface Props {
  vfSlot: string | null;
  slots: SlotOption[] | null;
  onSelectSlot: (time: string | null, slotId: string | null) => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function VfTour({ vfSlot, slots, onSelectSlot, onContinue, onBack }: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Vrindavan Forest Tour</div>
      <div className={styles.sectionSub}>Select your Vrindavan Forest Tour time slot for today's visit.</div>

      <div className={styles.serviceList}>
        <div className={`${styles.serviceCard} ${vfSlot ? styles.selected : ''}`}>
          <div>
            <div className={styles.slotGrid}>
              {slots === null && <div style={{ fontSize: 11, color: 'var(--text3)', padding: 8 }}>Loading slots…</div>}
              {slots?.map((slot) => (
                <div
                  key={slot.time}
                  className={`${styles.slotBtn} ${vfSlot === slot.time ? styles.selected : ''} ${slot.full ? styles.full : ''}`}
                  onClick={() => {
                    if (slot.full) return;
                    onSelectSlot(vfSlot === slot.time ? null : slot.time, vfSlot === slot.time ? null : slot.slotId);
                  }}
                >
                  <div className={styles.slotTime}>{slot.time}</div>
                  {slot.available !== null && (
                    <div className={styles.slotAvail}>{slot.full ? 'Full' : `${slot.available} left`}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button type="button" className={styles.btnPrimary} onClick={onContinue}>
        Continue →
      </button>
      <button type="button" className={styles.btnSecondary} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
