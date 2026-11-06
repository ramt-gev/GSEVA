import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';
import type { MealType } from '../../../lib/endpoints/kitchen';

interface Props {
  canEdit: boolean;
  notify: (msg: string) => void;
}

export default function MenuTab({ canEdit, notify }: Props) {
  const [depts, setDepts] = useState<kitchenApi.KitchenDepartment[]>([]);
  const [items, setItems] = useState<kitchenApi.KitchenCatalogItem[]>([]);
  const [sections, setSections] = useState<kitchenApi.MenuSection[] | null>(null);
  const [rows, setRows] = useState<kitchenApi.MenuRow[] | null>(null);
  const [cycle, setCycle] = useState<kitchenApi.MenuCycle | null>(null);

  const [forDate, setForDate] = useState(new Date().toISOString().slice(0, 10));
  const [deptId, setDeptId] = useState('');
  const [mealType, setMealType] = useState<MealType>('DINNER');
  const [itemId, setItemId] = useState('');

  const [filterDept, setFilterDept] = useState('');
  const [filterMeal, setFilterMeal] = useState<MealType | ''>('');

  function loadAll() {
    kitchenApi.menuSections().then(setSections).catch(() => setSections([]));
    kitchenApi.menuCycle().then(setCycle).catch(() => {});
  }
  useEffect(() => {
    kitchenApi.departments().then((d) => {
      setDepts(d);
      if (d[0]) setDeptId(d[0].dept_id);
    });
    kitchenApi.catalogItems().then((i) => {
      setItems(i);
      if (i[0]) setItemId(i[0].catalog_item_id);
    });
    loadAll();
  }, []);
  useEffect(() => {
    kitchenApi.menuList({ dept_id: filterDept || undefined, meal_type: filterMeal || undefined }).then(setRows).catch(() => setRows([]));
  }, [filterDept, filterMeal]);

  async function addRow() {
    if (!deptId || !itemId) return;
    try {
      await kitchenApi.addMenu({ for_date: forDate, dept_id: deptId, meal_type: mealType, catalog_item_id: itemId });
      loadAll();
      kitchenApi.menuList({ dept_id: filterDept || undefined, meal_type: filterMeal || undefined }).then(setRows);
      notify('menu_entries row added to the 15-day cycle');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add menu row');
    }
  }

  async function lock() {
    try {
      const c = await kitchenApi.lockMenu();
      setCycle(c);
      notify('menu_entries cycle locked for the next 15 days');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not lock cycle');
    }
  }

  return (
    <>
      {canEdit && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Plan a Cycle Row</span>
            <div className={styles.cardActions}>
              <span className={`${styles.tag} ${cycle?.is_locked ? styles.tagG : styles.tagA}`}>
                {cycle?.is_locked ? '🔒 Cycle Locked' : 'Editable — not yet locked'}
              </span>
            </div>
          </div>
          <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              <Field label="for_date">
                <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={forDate} onChange={(e) => setForDate(e.target.value)} />
              </Field>
              <Field label="Department">
                <select className={styles.select} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  {depts.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Meal Type">
                <select className={styles.select} value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                  <option>DINNER</option><option>LUNCH</option><option>BREAKFAST</option>
                </select>
              </Field>
              <Field label="Item">
                <select className={styles.select} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {items.map((i) => (
                    <option key={i.catalog_item_id} value={i.catalog_item_id}>{i.item_name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={cycle?.is_locked} onClick={addRow}>
                Add to Cycle
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} disabled={cycle?.is_locked} onClick={lock}>
                {cycle?.is_locked ? 'Cycle Locked' : 'Lock Menu for 15 Days'}
              </button>
            </div>
            {cycle?.is_locked && <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>locked_at: {cycle.locked_at ? new Date(cycle.locked_at).toLocaleString('en-IN') : '—'}</p>}
          </div>
        </div>
      )}

      {!canEdit && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <select className={styles.select} style={{ width: 200 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {depts.map((d) => (
              <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>
            ))}
          </select>
          <select className={styles.select} style={{ width: 200 }} value={filterMeal} onChange={(e) => setFilterMeal(e.target.value as MealType | '')}>
            <option value="">All Meal Types</option>
            <option>BREAKFAST</option><option>LUNCH</option><option>DINNER</option>
          </select>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Upcoming Meals</span>
          <span className={styles.cardSub}>Dinner (today) → Lunch → Breakfast (tomorrow)</span>
        </div>
        <div className={styles.cardBody}>
          {sections === null && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>}
          {sections?.map((s) => (
            <div key={s.meal_type} style={{ marginBottom: 18 }}>
              <strong style={{ fontSize: 12.5 }}>
                {s.meal_type.charAt(0) + s.meal_type.slice(1).toLowerCase()}{' '}
                <span style={{ fontWeight: 400, color: 'var(--text3)' }}>
                  — {new Date(s.for_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </strong>
              <div className={styles.tableScroll} style={{ marginTop: 8 }}>
                <table className={styles.dataTable}>
                  <thead><tr><th>Department</th><th>Item</th></tr></thead>
                  <tbody>
                    {s.rows.length ? s.rows.map((r, i) => <tr key={i}><td>{r.department}</td><td>{r.item}</td></tr>)
                      : <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>Not planned yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Full 15-Day Rolling Window</span>
          <span className={styles.cardSub}>for_date BETWEEN today AND +15 days</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead><tr><th>for_date</th><th>Department</th><th>Meal Type</th><th>Item</th><th>Created By</th></tr></thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <tr key={i}><td>{r.for_date}</td><td>{r.department}</td><td>{r.meal_type}</td><td>{r.item}</td><td>{r.created_by}</td></tr>
              ))}
              {rows?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No menu rows in this window.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
