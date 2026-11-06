import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import { useAuth } from '../../../lib/auth';

const CONFIG_FIELDS: { key: string; label: string; note: string; type: 'number' | 'text' | 'select'; options?: [string, string][] }[] = [
  { key: 'max_group_size', label: 'Max Group Size (day visitor registration)', note: 'Visitor cannot register more than this many persons in one group', type: 'number' },
  { key: 'zone3_cafe_price', label: 'Zone 3 Café Price per Person (₹)', note: "Govinda's Guest Area lunch — used in SBT Gate upgrade calculation", type: 'number' },
  { key: 'vf_slot_capacity', label: 'VF Tour Slot Capacity (persons per slot)', note: 'When a slot reaches this count it shows as unavailable', type: 'number' },
  { key: 'day_pass_valid_until', label: 'Day Pass Valid Until (IST 24hr)', note: 'All day visitor QR passes expire at this time', type: 'text' },
  { key: 'paid_day_visit_price', label: 'Paid Day Visit Price (₹)', note: 'Full programme price shown on Smart Registration', type: 'number' },
  { key: 'registration_open', label: 'New Visitor Registration', note: '', type: 'select', options: [['true', 'Open — accepting registrations'], ['false', 'Closed — not accepting today']] },
];

export default function Settings() {
  const { user } = useAuth();
  const canSave = user?.role === 'super_admin';
  const [config, setConfig] = useState<Record<string, string> | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [cafeCapacity, setCafeCapacity] = useState<adminApi.CafeCapacityRow[] | null>(null);
  const [zone3, setZone3] = useState<adminApi.Zone3UpgradesToday | null>(null);
  const [showDeclare, setShowDeclare] = useState(false);

  function loadConfig() {
    adminApi.getConfig().then((c) => {
      setConfig(c);
      setValues(c);
    });
  }
  function loadCafe() {
    adminApi.cafeCapacityList().then(setCafeCapacity).catch(() => setCafeCapacity([]));
  }

  useEffect(() => {
    loadConfig();
    loadCafe();
    adminApi.zone3UpgradesToday().then(setZone3).catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      await adminApi.updateConfig(values);
      alert('✅ Settings saved — changes take effect immediately');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  const knownKeys = new Set(CONFIG_FIELDS.map((f) => f.key));
  const otherKeys = config ? Object.keys(config).filter((k) => !knownKeys.has(k)) : [];

  return (
    <>
      <div className={`${styles.callout} ${styles.ok}`}>
        <span className={styles.calloutIcon}>🔐</span>
        <div className={styles.calloutBody}>
          <strong>Super Admin only</strong>
          These settings control system behaviour. Changes take effect immediately.
        </div>
      </div>

      <div className={styles.g2}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>System Configuration</span>
            <span className={styles.cardSub}>system_config table</span>
          </div>
          <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {config === null && <div style={{ fontSize: 12, color: 'var(--text3)' }}>Loading…</div>}
            {CONFIG_FIELDS.filter((f) => config && f.key in config).map((f) => (
              <div key={f.key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{f.label}</label>
                {f.type === 'select' ? (
                  <select className={styles.select} value={values[f.key] ?? ''} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                    {f.options!.map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={styles.dashInput}
                    style={{ padding: '8px 10px' }}
                    type={f.type}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                )}
                {f.note && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{f.note}</span>}
              </div>
            ))}
            {otherKeys.map((key) => (
              <div key={key}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</label>
                <input
                  className={styles.dashInput}
                  style={{ padding: '8px 10px' }}
                  value={values[key] ?? ''}
                  onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
              <button className={`${styles.btn} ${styles.btnOutline}`} onClick={loadConfig}>
                ↺ Reload from DB
              </button>
              {canSave && (
                <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={saving} onClick={save}>
                  💾 {saving ? 'Saving…' : 'Save All Settings'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Café Daily Capacity</span>
              <span className={styles.cardSub}>Declared each morning</span>
            </div>
            <div className={styles.cardBody}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Café</th>
                    <th>Meal</th>
                    <th>Threshold</th>
                    <th>Booked</th>
                    <th>Available</th>
                  </tr>
                </thead>
                <tbody>
                  {cafeCapacity?.map((c) => (
                    <tr key={c.capacity_id}>
                      <td>{c.cafe_code}</td>
                      <td>
                        <span className={`${styles.tag} ${styles.tagO}`}>{c.meal_type}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{c.threshold}</td>
                      <td style={{ textAlign: 'center' }}>{c.booked_count}</td>
                      <td style={{ textAlign: 'center', color: 'var(--green)', fontWeight: 600 }}>{c.threshold - c.booked_count}</td>
                    </tr>
                  ))}
                  {cafeCapacity && cafeCapacity.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text3)', padding: 12 }}>
                        Nothing declared for today yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} style={{ marginTop: 12 }} onClick={() => setShowDeclare(true)}>
                + Declare Today's Capacity
              </button>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.cardTitle}>Zone 3 Upgrades Today</span>
            </div>
            <div className={styles.cardBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                <div style={{ textAlign: 'center', background: 'var(--surface, #f8eee4)', border: '1px solid var(--border, #e8ddd4)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 24, color: 'var(--saffron)' }}>{zone3?.count ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Upgrades today</div>
                </div>
                <div style={{ textAlign: 'center', background: 'var(--surface, #f8eee4)', border: '1px solid var(--border, #e8ddd4)', borderRadius: 10, padding: 10 }}>
                  <div style={{ fontSize: 24, color: 'var(--green)' }}>₹{zone3?.total_revenue.toLocaleString('en-IN') ?? '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>Revenue today</div>
                </div>
              </div>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Visitor</th>
                    <th>Persons</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {zone3?.payments.map((p) => (
                    <tr key={p.upgrade_id}>
                      <td style={{ color: 'var(--text3)' }}>{p.paid_at ? new Date(p.paid_at).toLocaleTimeString('en-IN', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td style={{ fontWeight: 500 }}>{p.full_name || '—'}</td>
                      <td style={{ textAlign: 'center' }}>{p.persons_count}</td>
                      <td style={{ fontWeight: 600, color: 'var(--saffron)' }}>₹{p.total_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  {zone3 && zone3.payments.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text3)', padding: 12 }}>
                        No upgrades yet today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showDeclare && (
        <DeclareCapacityModal
          onClose={() => setShowDeclare(false)}
          onSaved={() => {
            loadCafe();
            setShowDeclare(false);
          }}
        />
      )}
    </>
  );
}

function DeclareCapacityModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [cafeCode, setCafeCode] = useState('GGA');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [threshold, setThreshold] = useState('30');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      await adminApi.declareCafeCapacity({ cafe_code: cafeCode, capacity_date: date, meal_type: mealType, threshold: Number(threshold), notes: notes || undefined });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHead}>
          <span style={{ fontSize: 18 }}>🏪</span>
          <span className={styles.modalTitle}>Declare Today's Café Capacity</span>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Café Code</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} value={cafeCode} onChange={(e) => setCafeCode(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Meal</label>
            <select className={styles.select} value={mealType} onChange={(e) => setMealType(e.target.value as typeof mealType)}>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Capacity Threshold</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Notes</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting} onClick={submit}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
