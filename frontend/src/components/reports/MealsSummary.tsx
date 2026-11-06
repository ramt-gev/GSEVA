import { useEffect, useState } from 'react';
import styles from '../../styles/backoffice.module.css';
import * as mealsApi from '../../lib/endpoints/meals';
import BillingTable from './BillingTable';

export default function Meals() {
  const [stats, setStats] = useState<mealsApi.MealsTodayStats | null>(null);
  const [breakfastRoster, setBreakfastRoster] = useState<mealsApi.RegisteredDiner[]>([]);
  const [dinnerRoster, setDinnerRoster] = useState<mealsApi.RegisteredDiner[]>([]);

  useEffect(() => {
    mealsApi.mealsToday().then(setStats).catch(() => {});
    mealsApi.registeredList('breakfast').then(setBreakfastRoster).catch(() => {});
    mealsApi.registeredList('dinner').then(setDinnerRoster).catch(() => {});
  }, []);

  const scanned = (id: string) => stats?.slot_counts.find((s) => s.meal_type === id)?.scanned ?? 0;
  const tapped = (id: string) => stats?.tap_counts.find((t) => t.meal_slot === id)?.tapped ?? 0;
  const breakfastServed = breakfastRoster.filter((r) => r.served_today).length;
  const dinnerServed = dinnerRoster.filter((r) => r.served_today).length;

  return (
    <>
      <div className={`${styles.callout} ${styles.ok}`}>
        <span className={styles.calloutIcon}>✅</span>
        <div className={styles.calloutBody}>
          <strong>Annakshetra scanning active</strong>
          Free lunch begins 12:45 PM · Breakfast/Dinner require B/D registration
        </div>
      </div>

      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        <Stat cls="sO" val={breakfastServed} lbl="Breakfast Served" sub={`${breakfastRoster.length} registered · ${breakfastRoster.length - breakfastServed} pending`} />
        <Stat cls="sG" val={scanned('free_lunch') + tapped('free_lunch')} lbl="Free Lunch So Far" sub={`${scanned('free_lunch')} QR + ${tapped('free_lunch')} tap`} />
        <Stat cls="sP" val={stats?.lunch_indicated_today ?? '—'} lbl="Free Lunch Indicated" sub="Day visitors, at registration · for planning" />
        <Stat cls="sB" val={dinnerServed} lbl="Dinner Served" sub={`${dinnerRoster.length} registered · starts 6:30 PM`} />
        <Stat
          cls="sT"
          val={scanned('khichadi_am') + tapped('khichadi_am') + scanned('khichadi_pm') + tapped('khichadi_pm')}
          lbl="Khichadi (AM+PM)"
          sub={`AM: ${scanned('khichadi_am') + tapped('khichadi_am')} · PM: ${scanned('khichadi_pm') + tapped('khichadi_pm')}`}
        />
        <Stat cls="sA" val={stats?.registered_bd.reduce((s, r) => s + r.count, 0) ?? '—'} lbl="Registered B/D (all types)" sub="Across all categories" />
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span>📊</span>
          <span className={styles.cardTitle}>Monthly Contractor Billing Recovery</span>
          <span className={styles.cardSub}>Rate read from system_config</span>
        </div>
        <BillingTable />
      </div>
    </>
  );
}

function Stat({ cls, val, lbl, sub }: { cls: keyof typeof styles; val: string | number; lbl: string; sub: string }) {
  return (
    <div className={`${styles.stat} ${styles[cls]}`}>
      <div className={styles.statBar} />
      <div className={styles.statVal}>{val}</div>
      <div className={styles.statLbl}>{lbl}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}
