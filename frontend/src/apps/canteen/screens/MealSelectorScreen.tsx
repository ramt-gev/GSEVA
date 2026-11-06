import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import styles from '../canteen.module.css';
import { useAuth } from '../../../lib/auth';
import * as mealsApi from '../../../lib/endpoints/meals';
import type { CurrentMeal } from '../useCanteenSession';

const MEAL_DEFS: CurrentMeal[] = [
  { id: 'breakfast', name: 'Breakfast', time: '7:15–8:15 AM', mode: 'scan_only', type: 'billing' },
  { id: 'khichadi_am', name: 'Khichadi (Morning)', time: '9:30 AM – 12:30 PM', mode: 'scan_tap', type: 'free' },
  { id: 'free_lunch', name: 'Free Lunch Prasad', time: '12:45 PM – 2:30 PM', mode: 'scan_tap', type: 'free' },
  { id: 'khichadi_pm', name: 'Khichadi (Evening)', time: '4:00 PM – 7:30 PM', mode: 'scan_tap', type: 'free' },
  { id: 'dinner', name: 'Dinner', time: '6:30 PM – 7:15 PM', mode: 'scan_only', type: 'billing' },
];

const SLOT_ICON: Record<string, string> = {
  breakfast: '/thali.avif',
  khichadi_am: '/khichdi.png',
  free_lunch: '/thali.avif',
  khichadi_pm: '/khichdi.png',
  dinner: '/thali.avif',
};

function suggestMeal(): { name: string; time: string } {
  const now = new Date();
  const t = now.getHours() * 60 + now.getMinutes();
  if (t < 7 * 60 + 15) return { name: 'Khichadi AM', time: '9:30 AM–12:30 PM' };
  if (t < 8 * 60 + 15) return { name: 'Breakfast', time: '7:15–8:15 AM' };
  if (t < 12 * 60 + 30) return { name: 'Khichadi AM', time: '9:30 AM–12:30 PM' };
  if (t < 14 * 60 + 30) return { name: 'Free Lunch', time: '12:45–2:30 PM' };
  if (t < 19 * 60 + 30) return { name: 'Khichadi PM', time: '4:00–7:30 PM' };
  return { name: 'Dinner', time: '6:30–7:15 PM' };
}

interface Props {
  currentMeal: CurrentMeal;
  onSelectMeal: (meal: CurrentMeal) => void;
  onStart: () => void;
}

export default function MealSelectorScreen({ currentMeal, onSelectMeal, onStart }: Props) {
  const { user, logout } = useAuth();
  const suggested = suggestMeal();
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    mealsApi
      .mealsToday()
      .then((stats) => {
        const counts: Record<string, number> = {};
        for (const slot of stats.slot_counts) counts[slot.meal_type] = slot.scanned;
        for (const tap of stats.tap_counts) counts[tap.meal_slot] = (counts[tap.meal_slot] || 0) + tap.tapped;
        setTodayCounts(counts);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <div className={styles.topbar}>
        <span className={styles.tbTitle}>Annakshetra — Select Meal</span>
        <button className={styles.tbBtn} onClick={logout}>
          Logout
        </button>
      </div>
      <div className={styles.mealSelector}>
      <div className={styles.msTitle}>Hare Krishna</div>
      <div className={styles.msSub}>Govardhan Annakshetra · Prasadam Service{user ? ` · ${user.full_name}` : ''}</div>

      <div className={styles.msCurrent}>
        <Clock size={22} color="#703d1a" />
        <div>
          <div className={styles.msCurrentLabel}>Suggested now</div>
          <div className={styles.msCurrentMeal}>{suggested.name}</div>
          <div className={styles.msCurrentTime}>{suggested.time}</div>
        </div>
      </div>

      <div className={styles.mealSlotList}>
        {MEAL_DEFS.map((meal) => (
          <div
            key={meal.id}
            className={`${styles.mealSlot} ${meal.mode === 'scan_only' ? styles.scanOnly : styles.scanTap} ${currentMeal.id === meal.id ? styles.activeSlot : ''}`}
            onClick={() => onSelectMeal(meal)}
          >
            <span className={styles.msIcon}>
              <img src={SLOT_ICON[meal.id]} alt={meal.name} />
            </span>
            <div className={styles.msBody}>
              <div className={styles.msName}>{meal.name}</div>
              <div className={styles.msTime}>{meal.time}</div>
              <div className={styles.msBadges}>
                {meal.mode === 'scan_only' ? (
                  <>
                    <span className={`${styles.badge} ${styles.badgeScan}`}>QR Scan only</span>
                    <span className={`${styles.badge} ${styles.badgeBilling}`}>Billing-relevant</span>
                  </>
                ) : (
                  <>
                    <span className={`${styles.badge} ${styles.badgeScan}`}>Scan primary</span>
                    <span className={`${styles.badge} ${styles.badgeTap}`}>+ Tap fallback</span>
                    <span className={`${styles.badge} ${styles.badgeFree}`}>Free for all</span>
                  </>
                )}
                {currentMeal.id === meal.id && <span className={`${styles.badge} ${styles.badgeActive}`}>● Active now</span>}
              </div>
            </div>
            <div className={styles.msCount}>
              <div className={styles.msCountNum}>{todayCounts[meal.id] ?? '—'}</div>
              <div className={styles.msCountLabel}>{meal.mode === 'scan_only' ? 'served today' : 'today'}</div>
            </div>
          </div>
        ))}
      </div>

      <button className={styles.startBtn} onClick={onStart}>
        Start {currentMeal.name} Counter →
      </button>
      </div>
    </>
  );
}
