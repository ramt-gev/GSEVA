import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';
import type { KitchenUnit } from '../../../lib/endpoints/kitchen';

interface Props {
  recordType: 'STORAGE' | 'WASTAGE';
  canEdit: boolean;
  notify: (msg: string) => void;
}

const UNITS: KitchenUnit[] = ['KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'];
const STATUSES = ['HELD', 'PARTIALLY_RESOLVED', 'CLOSED'];

export default function StorageWastageTab({ recordType, canEdit, notify }: Props) {
  const isStorage = recordType === 'STORAGE';
  const [items, setItems] = useState<kitchenApi.KitchenCatalogItem[]>([]);
  const [rows, setRows] = useState<kitchenApi.TransactionRow[] | null>(null);

  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState<KitchenUnit>('KG');
  const [status, setStatus] = useState('HELD');
  const [remarks, setRemarks] = useState('');
  const [reason, setReason] = useState('');

  function load() {
    (isStorage ? kitchenApi.storageList() : kitchenApi.wastageList()).then(setRows).catch(() => setRows([]));
  }
  useEffect(() => {
    kitchenApi.catalogItems().then((i) => { setItems(i); if (i[0]) setItemId(i[0].catalog_item_id); });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordType]);

  async function submit() {
    if (!itemId) return;
    try {
      if (isStorage) {
        await kitchenApi.addStorage({ catalog_item_id: itemId, quantity: Number(quantity) || 0, unit, status, remarks: remarks || undefined });
        notify('Data entered into storage_logs (kitchen_transactions record_type=STORAGE)');
      } else {
        await kitchenApi.addWastage({ catalog_item_id: itemId, quantity: Number(quantity) || 0, unit, reason: reason || undefined });
        notify('Data entered into wastage_logs (kitchen_transactions record_type=WASTAGE)');
      }
      setRemarks('');
      setReason('');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save entry');
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
              <Field label="Item">
                <select className={styles.select} value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {items.map((i) => <option key={i.catalog_item_id} value={i.catalog_item_id}>{i.item_name}</option>)}
                </select>
              </Field>
              <Field label="Quantity"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" step="0.1" value={quantity} onChange={(e) => setQuantity(e.target.value)} /></Field>
              {isStorage ? (
                <Field label="Status">
                  <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </Field>
              ) : (
                <Field label="Unit">
                  <select className={styles.select} value={unit} onChange={(e) => setUnit(e.target.value as KitchenUnit)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </Field>
              )}
              {isStorage ? (
                <Field label="Remarks" span={2}>
                  <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="text" placeholder="e.g. Cold store, bay 3" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                </Field>
              ) : (
                <Field label="Reason" span={2}>
                  <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="text" placeholder="e.g. Over-preparation, evening batch" value={reason} onChange={(e) => setReason(e.target.value)} />
                </Field>
              )}
              {isStorage && (
                <Field label="Unit">
                  <select className={styles.select} value={unit} onChange={(e) => setUnit(e.target.value as KitchenUnit)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} onClick={submit}>
              Submit / Save Entry
            </button>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>{isStorage ? 'Storage' : 'Wastage'}</span>
          <span className={styles.cardSub}>kitchen_transactions (record_type=&apos;{recordType}&apos;)</span>
        </div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>entry_date</th><th>Item</th><th>Quantity</th>
                {isStorage ? <th>Status</th> : null}
                <th>{isStorage ? 'Remarks' : 'Reason'}</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <tr key={i}>
                  <td>{r.entry_date}</td><td>{r.item}</td><td>{r.quantity}</td>
                  {isStorage ? (
                    <td>
                      <span className={`${styles.tag} ${r.status === 'CLOSED' ? styles.tagG : r.status === 'HELD' ? styles.tagA : styles.tagGrey}`}>
                        {r.status}
                      </span>
                    </td>
                  ) : null}
                  <td>{isStorage ? r.remarks : r.reason}</td>
                  <td>{r.recorded_by}</td>
                </tr>
              ))}
              {rows?.length === 0 && <tr><td colSpan={isStorage ? 6 : 5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
