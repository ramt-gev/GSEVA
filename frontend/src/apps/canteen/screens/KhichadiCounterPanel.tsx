import { useState } from 'react';
import styles from '../canteen.module.css';
import type { CurrentMeal } from '../useCanteenSession';

interface Props {
  meal: CurrentMeal;
  tapCount: number;
  scanCount: number;
  onChange: (delta: number) => void;
}

export default function KhichadiCounterPanel({ meal, tapCount, scanCount, onChange }: Props) {
  const [flash, setFlash] = useState(false);

  function tapPlus() {
    onChange(1);
    setFlash(false);
    requestAnimationFrame(() => setFlash(true));
  }

  return (
    <div className={styles.kpPanel}>
      <img
        src="/khichdi.png"
        alt="Khichadi"
        style={{ width: 150, height: 150, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 6px 24px rgba(112,61,26,0.25)', marginBottom: 14 }}
      />
      <div className={styles.kpMealName}>{meal.name}</div>
      <div className={styles.kpTime}>{meal.time}</div>

      <div className={`${styles.kpCircle} ${flash ? styles.flash : ''}`} onClick={tapPlus} onAnimationEnd={() => setFlash(false)}>
        <div className={styles.kpCountDisplay}>{tapCount}</div>
        <div className={styles.kpCircleLabel}>TAP TO COUNT</div>
      </div>

      <button className={styles.kpMinusBtn} onClick={() => onChange(-1)}>
        −
      </button>

      <div className={styles.kpStatsRow}>
        <div className={styles.kpStat}>
          <div className={styles.kpStatNum}>{tapCount + scanCount}</div>
          <div className={styles.kpStatLbl}>Total Today</div>
        </div>
      </div>
    </div>
  );
}
