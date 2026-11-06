import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';
import type { KitchenUnit } from '../../../lib/endpoints/kitchen';

interface Props {
  notify: (msg: string) => void;
}

const UNITS: KitchenUnit[] = ['KG', 'G', 'PIECE', 'GARLAND', 'LITRE', 'PACKET'];

function statusTag(s: string) {
  const cls: Record<string, string> = {
    REQUESTED: styles.tagA, AVAILABLE: styles.tagG, SHORT: styles.tagR,
    ALTERNATE_PROPOSED: styles.tagA, CONFIRMED: styles.tagG, DISPATCHED: styles.tagG,
  };
  return <span className={`${styles.tag} ${cls[s] || styles.tagGrey}`}>{s}</span>;
}

export default function CpdProcurementTab({ notify }: Props) {
  const [candidates, setCandidates] = useState<kitchenApi.CpdCandidates | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [rows, setRows] = useState<kitchenApi.ProcurementRow[] | null>(null);
  const [items, setItems] = useState<kitchenApi.KitchenCatalogItem[]>([]);

  const [adhocItemId, setAdhocItemId] = useState('');
  const [adhocQty, setAdhocQty] = useState('0');
  const [adhocUnit, setAdhocUnit] = useState<KitchenUnit>('KG');
  const [supplementary, setSupplementary] = useState(false);
  const [adhoc, setAdhoc] = useState(false);

  function loadCandidates() {
    kitchenApi.cpdCandidates().then(setCandidates).catch(() => setCandidates({ menu_candidates: [], storage_candidates: [] }));
  }
  function loadRequests() {
    kitchenApi.procurementList().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => {
    loadCandidates();
    loadRequests();
    kitchenApi.catalogItems().then((i) => { setItems(i); if (i[0]) setAdhocItemId(i[0].catalog_item_id); });
  }, []);

  function key(source: 'menu' | 'storage', c: kitchenApi.CpdCandidate) {
    return `${source}-${c.catalog_item_id}-${c.context}`;
  }
  function toggle(source: 'menu' | 'storage', c: kitchenApi.CpdCandidate) {
    const k = key(source, c);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
    setQtyOverride((prev) => (k in prev ? prev : { ...prev, [k]: c.suggested_qty }));
  }

  async function sendSelected() {
    if (selected.size === 0) { notify('Select at least one item first'); return; }
    const all = [
      ...(candidates?.menu_candidates || []).map((c) => ({ ...c, source: 'menu' as const })),
      ...(candidates?.storage_candidates || []).map((c) => ({ ...c, source: 'storage' as const })),
    ];
    const selections = all
      .filter((c) => selected.has(key(c.source, c)))
      .map((c) => ({ catalog_item_id: c.catalog_item_id, quantity: qtyOverride[key(c.source, c)] ?? c.suggested_qty, unit: c.unit, source: c.source }));
    try {
      const res = await kitchenApi.cpdSendBatch(selections);
      setSelected(new Set());
      loadCandidates();
      loadRequests();
      notify(`Sent ${res.created} item(s) to CPD as one batch — procurement_requests rows created`);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send to CPD');
    }
  }

  async function sendAdhoc() {
    if (!adhocItemId) return;
    try {
      await kitchenApi.addProcurement({ catalog_item_id: adhocItemId, quantity: Number(adhocQty) || 0, unit: adhocUnit, is_supplementary: supplementary, is_adhoc: adhoc });
      loadRequests();
      notify('procurement_requests row created — sent to CPD');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not send request');
    }
  }

  function candidateTable(source: 'menu' | 'storage', list: kitchenApi.CpdCandidate[]) {
    return (
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead><tr><th></th><th>Item</th><th>Context</th><th>Qty to Request</th><th>Unit</th></tr></thead>
          <tbody>
            {list.map((c) => {
              const k = key(source, c);
              const isSel = selected.has(k);
              return (
                <tr key={k} style={{ cursor: 'pointer', background: isSel ? 'var(--surface, #f8eee4)' : undefined }} onClick={() => toggle(source, c)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={isSel} onChange={() => toggle(source, c)} />
                  </td>
                  <td>{c.item}</td>
                  <td>{c.context}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="number" className={styles.dashInput} style={{ padding: '5px 8px', width: 80 }}
                      value={qtyOverride[k] ?? c.suggested_qty}
                      onChange={(e) => setQtyOverride((prev) => ({ ...prev, [k]: Number(e.target.value) }))}
                    />
                  </td>
                  <td>{c.unit}</td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>Nothing here right now.</td></tr>}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Finalized Menu Items — Upcoming Meals</span></div>
        <div className={styles.cardBody}>{candidateTable('menu', candidates?.menu_candidates || [])}</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Storage Items — Current Inventory</span></div>
        <div className={styles.cardBody}>
          {candidateTable('storage', candidates?.storage_candidates || [])}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--sidebar-grad-end, #2a1206)', color: '#fff', padding: '10px 16px', borderRadius: 8, marginTop: 12 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{selected.size} item{selected.size === 1 ? '' : 's'} selected</span>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={sendSelected}>Send Selected Items to CPD</button>
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Ad-hoc / Other Item Request</span></div>
        <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
            <Field label="Item">
              <select className={styles.select} value={adhocItemId} onChange={(e) => setAdhocItemId(e.target.value)}>
                {items.map((i) => <option key={i.catalog_item_id} value={i.catalog_item_id}>{i.item_name}</option>)}
              </select>
            </Field>
            <Field label="Quantity"><input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" step="0.1" value={adhocQty} onChange={(e) => setAdhocQty(e.target.value)} /></Field>
            <Field label="Unit">
              <select className={styles.select} value={adhocUnit} onChange={(e) => setAdhocUnit(e.target.value as KitchenUnit)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="CPD Partner"><div style={{ fontSize: 12.5, padding: '9px 0', color: 'var(--text2)' }}>GEV Central Purchase Department</div></Field>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text2)' }}>
              <input type="checkbox" checked={supplementary} onChange={(e) => setSupplementary(e.target.checked)} /> is_supplementary
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text2)' }}>
              <input type="checkbox" checked={adhoc} onChange={(e) => setAdhoc(e.target.checked)} /> is_adhoc
            </label>
          </div>
          <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ alignSelf: 'flex-start' }} onClick={sendAdhoc}>
            Send This Item to CPD
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}><span className={styles.cardTitle}>Requests Sent</span></div>
        <div className={styles.tableScroll}>
          <table className={styles.dataTable}>
            <thead><tr><th>request_date</th><th>Item</th><th>Qty</th><th>Flags</th><th>Status</th></tr></thead>
            <tbody>
              {(rows ?? []).map((r, i) => (
                <tr key={i}>
                  <td>{r.request_date}</td><td>{r.item}</td><td>{r.quantity} {r.unit}</td>
                  <td>
                    {r.is_supplementary && <span className={`${styles.tag} ${styles.tagGrey}`}>supplementary</span>}{' '}
                    {r.is_adhoc && <span className={`${styles.tag} ${styles.tagGrey}`}>adhoc</span>}
                  </td>
                  <td>{statusTag(r.status)}</td>
                </tr>
              ))}
              {rows?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>No requests sent yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
