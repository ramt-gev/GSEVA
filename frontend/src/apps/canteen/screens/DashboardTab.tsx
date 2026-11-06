import { useEffect, useState } from 'react';
import styles from '../canteen.module.css';
import * as mealsApi from '../../../lib/endpoints/meals';

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast (B/D Registered)',
  khichadi_am: 'Khichadi AM',
  free_lunch: 'Free Lunch Prasad',
  khichadi_pm: 'Khichadi PM',
  dinner: 'Dinner (B/D Registered)',
};
const MEAL_ORDER = ['breakfast', 'khichadi_am', 'free_lunch', 'khichadi_pm', 'dinner'];
const BILLING_MEALS = new Set(['breakfast', 'dinner']);

interface CardData {
  id: string;
  scanned: number;
  tapped: number;
  registered: number | null;
}

export default function DashboardTab() {
  const [cards, setCards] = useState<CardData[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [stats, breakfastRoster, dinnerRoster] = await Promise.all([
          mealsApi.mealsToday(),
          mealsApi.registeredList('breakfast').catch(() => []),
          mealsApi.registeredList('dinner').catch(() => []),
        ]);
        if (cancelled) return;

        const rosterByMeal: Record<string, number> = {
          breakfast: breakfastRoster.length,
          dinner: dinnerRoster.length,
        };

        const next = MEAL_ORDER.map((id) => {
          const slot = stats.slot_counts.find((s) => s.meal_type === id);
          const tap = stats.tap_counts.find((t) => t.meal_slot === id);
          return {
            id,
            scanned: slot?.scanned || 0,
            tapped: tap?.tapped || 0,
            registered: BILLING_MEALS.has(id) ? rosterByMeal[id] ?? null : null,
          };
        });
        setCards(next);
      } catch {
        setCards([]);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashSection}>
        <div className={styles.dashTitle}>Today's Meal Summary</div>
        {cards === null && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>}
        <div className={styles.mealStatsGrid}>
          {cards?.map((card) => {
            const total = card.scanned + card.tapped;
            const isBilling = BILLING_MEALS.has(card.id);
            const pct = isBilling && card.registered ? Math.min(100, Math.round((card.scanned / card.registered) * 100)) : Math.min(100, total);
            return (
              <div className={styles.mealStatCard} key={card.id}>
                <div className={styles.mscName}>{MEAL_LABELS[card.id]}</div>
                {isBilling ? (
                  <>
                    <Row label="Served" value={card.scanned} color="var(--green2)" />
                    <Row label="Registered" value={card.registered ?? '—'} color="var(--saffron)" />
                    <Row
                      label="Absent"
                      value={card.registered != null ? Math.max(0, card.registered - card.scanned) : '—'}
                      color="var(--text-dim)"
                    />
                  </>
                ) : (
                  <>
                    <Row label="QR Scans" value={card.scanned} color="var(--olive)" />
                    <Row label="Tap (no QR)" value={card.tapped} color="var(--olive)" />
                    <Row label="Total" value={total} color="var(--saffron)" bold />
                  </>
                )}
                <div className={styles.mscBarWrap}>
                  <div className={styles.mscBar} style={{ width: `${pct}%`, background: 'var(--green2)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: number | string; color: string; bold?: boolean }) {
  return (
    <div className={styles.mscRow}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color, fontWeight: bold ? 700 : undefined }}>{value}</span>
    </div>
  );
}
