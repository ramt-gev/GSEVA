import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';
import type { KitchenUnit, MealType } from '../../../lib/endpoints/kitchen';

interface Props {
  canEdit: boolean;
  notify: (msg: string) => void;
}

const UNITS: KitchenUnit[] = ['KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'];
const SOURCES = ['DEPT', 'HR_API', 'BIOMETRIC', 'SYSTEM'];

export default function BldTab({ canEdit, notify }: Props) {
  const [depts, setDepts] = useState<kitchenApi.KitchenDepartment[]>([]);
  const [items, setItems] = useState<kitchenApi.KitchenCatalogItem[]>([]);
  const [sections, setSections] = useState<kitchenApi.BldSection[] | null>(null);
  const [summary, setSummary] = useState<kitchenApi.DeptSummary | null>(null);

  const [forDate, setForDate] = useState(new Date().toISOString().slice(0, 10));
  const [deptId, setDeptId] = useState('');
  const [mealType, setMealType] = useState<MealType>('DINNER');
  const [itemId, setItemId] = useState('');
  const [peopleCount, setPeopleCount] = useState('0');
  const [amount, setAmount] = useState('0');
  const [unit, setUnit] = useState<KitchenUnit>('KG');
  const [source, setSource] = useState('DEPT');

  function loadAll() {
    kitchenApi.bldSections().then(setSections).catch(() => setSections([]));
    kitchenApi.deptSummary().then(setSummary).catch(() => {});
  }
  useEffect(() => {
    kitchenApi.departments().then((d) => { setDepts(d); if (d[0]) setDeptId(d[0].dept_id); });
    kitchenApi.catalogItems().then((i) => { setItems(i); if (i[0]) setItemId(i[0].catalog_item_id); });
    loadAll();
  }, []);

  async function addRow() {
    if (!deptId || !itemId) return;
    try {
      await kitchenApi.addBld({
        for_date: forDate, dept_id: deptId, meal_type: mealType, catalog_item_id: itemId,
        people_count: Number(peopleCount) || 0, total_item_amount: Number(amount) || 0, unit, source,
      });
      loadAll();
      notify('Data entered into bld_entries');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not add entry');
    }
  }

  return (
    <>
      {canEdit && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Enter Data</span>
          </div>
          <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <Field label="for_date"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={forDate} onChange={(e) => setForDate(e.target.value)} /></Field>
              <Field label="Department">
                <select className={styles.select} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  {depts.map((d) => <option key={d.dept_id} value={d.dept_id}>{d.dept_name}</option>)}
                </select>
              </Field>
              <Field label="Meal Type">
                <select className={styles.select} value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
                  <option>DINNER</option><option>LUNCH</option><option>BREAKFAST</option>
                </select>
              </Field>
              <Field label="Item">
                <select className={styles.select} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {items.map((i) => <option key={i.catalog_item_id} value={i.catalog_item_id}>{i.item_name}</option>)}
                </select>
              </Field>
              <Field label="People Count"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} /></Field>
              <Field label="Dept. Total Item Amount"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
              <Field label="Unit">
                <select className={styles.select} value={unit} onChange={(e) => setUnit(e.target.value as KitchenUnit)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="Source">
                <select className={styles.select} value={source} onChange={(e) => setSource(e.target.value)}>
                  {SOURCES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} onClick={addRow}>
              Enter Data
            </button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Department-wise Count</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Dinner ({summary?.dinner_date})</th>
                <th>Lunch ({summary?.lunch_date})</th>
                <th>Breakfast ({summary?.breakfast_date})</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {summary?.rows.map((r) => (
                <tr key={r.department}>
                  <td>{r.department}</td><td>{r.dinner || '—'}</td><td>{r.lunch || '—'}</td><td>{r.breakfast || '—'}</td>
                  <td><strong>{r.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sections?.map((s) => (
        <div className={styles.card} key={s.meal_type}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>
              {s.meal_type.charAt(0) + s.meal_type.slice(1).toLowerCase()}{' '}
              <span style={{ fontWeight: 400, color: 'var(--text3)', fontFamily: 'inherit' }}>
                — {new Date(s.for_date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </span>
            <div className={styles.cardActions}>
              <span className={`${styles.tag} ${s.locked ? styles.tagG : styles.tagA}`}>
                {s.locked ? '🔒 Locked (auto, 12:00 PM)' : 'Open — auto-locks today 12:00 PM'}
              </span>
            </div>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.dataTable}>
              <thead><tr><th>Dept</th><th>Item</th><th>People</th><th>Amount</th><th>Source</th></tr></thead>
              <tbody>
                {s.rows.length ? s.rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.department}</td><td>{r.item}</td><td>{r.people_count}</td><td>{r.total_item_amount} {r.unit}</td>
                    <td><span className={`${styles.tag} ${styles.tagGrey}`}>{r.source}</span></td>
                  </tr>
                )) : <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No entries yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
