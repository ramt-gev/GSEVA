import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';
import type { KitchenUnit } from '../../../lib/endpoints/kitchen';

interface Props {
  canEdit: boolean;
  notify: (msg: string) => void;
  bare?: boolean; // true when embedded inside HOD's combined Preaching & Khichdi tab
}

const UNITS: KitchenUnit[] = ['KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'];

export default function KhichdiTab({ canEdit, notify, bare }: Props) {
  const [rows, setRows] = useState<kitchenApi.KhichdiRow[] | null>(null);
  const [forDate, setForDate] = useState(new Date().toISOString().slice(0, 10));
  const [morning, setMorning] = useState('0');
  const [evening, setEvening] = useState('0');
  const [unit, setUnit] = useState<KitchenUnit>('KG');

  function load() {
    kitchenApi.khichdiList().then(setRows).catch(() => setRows([]));
  }
  useEffect(load, []);

  async function submit() {
    try {
      await kitchenApi.saveKhichdi({ for_date: forDate, morning_amount: Number(morning) || 0, evening_amount: Number(evening) || 0, unit });
      load();
      notify('khichdi_entries row saved (for_date is UNIQUE — upsert)');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save entry');
    }
  }

  const table = (
    <div className={styles.tableScroll}>
      <table className={styles.dataTable}>
        <thead><tr><th>for_date</th><th>Morning</th><th>Evening</th><th>Unit</th></tr></thead>
        <tbody>
          {(rows ?? []).map((r, i) => (
            <tr key={i}><td>{r.for_date}</td><td>{r.morning_amount}</td><td>{r.evening_amount}</td><td>{r.unit}</td></tr>
          ))}
          {rows?.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No khichdi entries logged.</td></tr>}
        </tbody>
      </table>
    </div>
  );

  if (bare) {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>khichdi_entries</span></div>
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
              <Field label="Morning Amount"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" step="0.1" value={morning} onChange={(e) => setMorning(e.target.value)} /></Field>
              <Field label="Evening Amount"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" step="0.1" value={evening} onChange={(e) => setEvening(e.target.value)} /></Field>
              <Field label="Unit">
                <select className={styles.select} value={unit} onChange={(e) => setUnit(e.target.value as KitchenUnit)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </Field>
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} onClick={submit}>
              Save Entry (upsert by for_date)
            </button>
          </div>
        </div>
      )}
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Morning / Evening Khichdi</span></div>
        {table}
      </div>
    </>
  );
}
