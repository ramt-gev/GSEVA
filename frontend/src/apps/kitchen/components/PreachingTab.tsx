import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

interface Props {
  canEdit: boolean;
  notify: (msg: string) => void;
  bare?: boolean; // true when embedded inside HOD's combined Preaching & Khichdi tab
}

export default function PreachingTab({ canEdit, notify, bare }: Props) {
  const [items, setItems] = useState<kitchenApi.KitchenCatalogItem[]>([]);
  const [rows, setRows] = useState<kitchenApi.PreachingRow[] | null>(null);

  const [forDate, setForDate] = useState(new Date().toISOString().slice(0, 10));
  const [preacherName, setPreacherName] = useState('');
  const [peopleCount, setPeopleCount] = useState('0');
  const [itemId, setItemId] = useState('');

  function load() {
    kitchenApi.preachList().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => {
    kitchenApi.catalogItems().then((i) => { setItems(i); if (i[0]) setItemId(i[0].catalog_item_id); });
    load();
  }, []);

  async function submit() {
    if (!itemId) return;
    try {
      await kitchenApi.addPreaching({ for_date: forDate, preacher_name: preacherName, people_count: Number(peopleCount) || 0, catalog_item_id: itemId });
      setPreacherName('');
      load();
      notify('Data entered into preaching_program_entries');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save entry');
    }
  }

  const table = (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead><tr><th>for_date</th><th>Preacher</th><th>People Count</th><th>Item</th></tr></thead>
        <tbody>
          {(rows ?? []).map((r, i) => (
            <tr key={i}><td>{r.for_date}</td><td>{r.preacher_name}</td><td>{r.people_count}</td><td>{r.item}</td></tr>
          ))}
          {rows?.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No preaching programs logged.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  if (bare) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>preaching_program_entries</span></div>
        {table}
      </div>
    );
  }

  return (
    <>
      {canEdit && (
        <div className={styles.card}>
          <div className={styles.cardHead}><span className={styles.cardTitle}>Enter Data</span></div>
          <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <Field label="for_date"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={forDate} onChange={(e) => setForDate(e.target.value)} /></Field>
              <Field label="Preacher Name"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="text" placeholder="e.g. Bhakti Vinoda Swami" value={preacherName} onChange={(e) => setPreacherName(e.target.value)} /></Field>
              <Field label="People Count"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} /></Field>
              <Field label="Item">
                <select className={styles.select} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {items.map((i) => <option key={i.catalog_item_id} value={i.catalog_item_id}>{i.item_name}</option>)}
                </select>
              </Field>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} onClick={submit}>Save Entry</button>
          </div>
        </div>
      )}
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Preaching Programs</span></div>
        {table}
      </div>
    </>
  );
}
