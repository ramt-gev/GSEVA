import { useEffect, useState } from 'react';
import styles from '../canteen.module.css';
import * as mealsApi from '../../../lib/endpoints/meals';
import type { CurrentMeal } from '../useCanteenSession';

interface Props {
  currentMeal: CurrentMeal;
}

export default function TodayListTab({ currentMeal }: Props) {
  const isRosterMeal = currentMeal.id === 'breakfast' || currentMeal.id === 'dinner';
  const [roster, setRoster] = useState<mealsApi.RegisteredDiner[] | null>(null);

  useEffect(() => {
    if (!isRosterMeal) {
      setRoster(null);
      return;
    }
    let cancelled = false;
    mealsApi
      .registeredList(currentMeal.id as mealsApi.BillingMealSlot)
      .then((data) => !cancelled && setRoster(data))
      .catch(() => !cancelled && setRoster([]));
    return () => {
      cancelled = true;
    };
  }, [currentMeal.id, isRosterMeal]);

  if (!isRosterMeal) {
    return (
      <div className={styles.dashboard}>
        <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            {currentMeal.name} is open to all visitors — there's no registration roster for this meal.
            <br />
            Use the tap counter or QR scan to record attendance.
          </div>
        </div>
      </div>
    );
  }

  const servedCount = roster?.filter((r) => r.served_today).length ?? 0;
  const pendingCount = roster ? roster.length - servedCount : 0;

  return (
    <div className={styles.dashboard}>
      <div className={styles.listChips}>
        <div className={styles.listChip} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          Showing: <strong style={{ color: 'var(--text)' }}>{currentMeal.name}</strong>
        </div>
        <div className={styles.listChip} style={{ background: 'var(--green-bg)', border: '1px solid var(--green-border)', color: 'var(--green2)' }}>
          Served: <strong>{servedCount}</strong>
        </div>
        <div className={styles.listChip} style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
          Pending: <strong>{pendingCount}</strong>
        </div>
      </div>

      <div className={styles.personList}>
        <div className={styles.plHead}>
          <span>Person</span>
          <span>Dept</span>
          <span>Status</span>
        </div>
        {roster === null && <div style={{ padding: 14, fontSize: 12, color: 'var(--text-dim)' }}>Loading…</div>}
        {roster?.map((person) => (
          <div className={styles.plRow} key={person.mobile}>
            <div>
              <div className={styles.plName}>{person.full_name}</div>
              <div className={styles.plType}>{person.person_type.replace(/_/g, ' ')}</div>
            </div>
            <div className={styles.plDept}>{person.dept_name || '—'}</div>
            <div>
              <span className={`${styles.plStatus} ${person.served_today ? styles.psYes : styles.psNo}`}>
                {person.served_today ? '✓ Served' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
        {roster?.length === 0 && <div style={{ padding: 14, fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>No one registered for this meal.</div>}
      </div>
    </div>
  );
}
