import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

export default function DistributionBoardTab() {
  const [board, setBoard] = useState<kitchenApi.DistributionBoard | null>(null);

  useEffect(() => {
    kitchenApi.distributionBoard().then(setBoard).catch(() => {});
  }, []);

  return (
    <>
      <div className={`${styles.callout} ${board?.finalized ? styles.ok : styles.warn}`}>
        <span className={styles.calloutIcon}>{board?.finalized ? '✅' : '⏳'}</span>
        <div className={styles.calloutBody}>
          <strong>{board?.finalized ? "Today's plan is finalized and ready for distribution" : 'Waiting on HOD approval'}</strong>
          {board?.finalized
            ? `Approved by ${board.finalized_by} at ${board.finalized_at ? new Date(board.finalized_at).toLocaleString('en-IN') : ''} — all items below are confirmed.`
            : "Today's plan hasn't been finalized yet — items below may still change. Check back closer to service time."}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Department-wise Count</span></div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Dinner ({board?.dept_summary.dinner_date})</th>
                <th>Lunch ({board?.dept_summary.lunch_date})</th>
                <th>Breakfast ({board?.dept_summary.breakfast_date})</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {board?.dept_summary.rows.map((r) => (
                <tr key={r.department}>
                  <td>{r.department}</td><td>{r.dinner || '—'}</td><td>{r.lunch || '—'}</td><td>{r.breakfast || '—'}</td>
                  <td><strong>{r.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {board?.sections.map((s) => (
        <div className={styles.card} key={s.meal_type}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              {s.meal_type.charAt(0) + s.meal_type.slice(1).toLowerCase()}{' '}
              <span style={{ fontWeight: 400, color: 'var(--text3)', fontFamily: 'inherit' }}>
                — {new Date(s.for_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </span>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead><tr><th>Department</th><th>Item</th><th>People Count</th><th>Total Item Amount</th></tr></thead>
              <tbody>
                {s.rows.length ? s.rows.map((r, i) => (
                  <tr key={i}><td>{r.department}</td><td>{r.item}</td><td>{r.people_count}</td><td>{r.total_item_amount} {r.unit}</td></tr>
                )) : <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No finalized items.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Khichdi — Today</span></div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead><tr><th>Morning Amount</th><th>Evening Amount</th><th>Unit</th></tr></thead>
            <tbody>
              {board?.khichdi ? (
                <tr><td>{board.khichdi.morning_amount}</td><td>{board.khichdi.evening_amount}</td><td>{board.khichdi.unit}</td></tr>
              ) : <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>Not logged yet today.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Preaching Programs — Today</span></div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead><tr><th>Preacher</th><th>People Count</th><th>Item</th></tr></thead>
            <tbody>
              {board?.preaching.length ? board.preaching.map((p, i) => (
                <tr key={i}><td>{p.preacher_name}</td><td>{p.people_count}</td><td>{p.item}</td></tr>
              )) : <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>None today.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
