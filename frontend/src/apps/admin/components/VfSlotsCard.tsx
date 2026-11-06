import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';

export default function VfSlotsCard() {
  const [slots, setSlots] = useState<adminApi.AdminVfSlot[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  function load() {
    adminApi.vfSlotsListAdmin().then(setSlots).catch(() => setSlots([]));
  }
  useEffect(load, []);

  async function remove(slot_id: string) {
    if (!confirm('Delete this VF tour slot?')) return;
    try {
      await adminApi.deleteVfSlot(slot_id);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span>🌳</span>
        <span className={styles.cardTitle}>Vrindavan Forest Tour Slots</span>
        <span className={styles.cardSub}>Next 7 days · shown to visitors during Smart Registration</span>
        <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} style={{ marginLeft: 'auto' }} onClick={() => setShowAdd(true)}>
          + Add Slot
        </button>
      </div>
      <div className={styles.tableScroll}>
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Booked</th>
              <th>Available</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {slots === null && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                  Loading…
                </td>
              </tr>
            )}
            {slots?.map((s) => (
              <tr key={s.slot_id}>
                <td style={{ fontSize: 12 }}>{new Date(s.tour_date).toLocaleDateString('en-IN')}</td>
                <td className={styles.mono}>{s.slot_time.slice(0, 5)}</td>
                <td>
                  <span className={`${styles.tag} ${styles.tagGrey}`}>{s.tour_type}</span>
                </td>
                <td className={styles.mono}>{s.capacity}</td>
                <td className={styles.mono}>{s.booked_count}</td>
                <td className={styles.mono}>{s.available}</td>
                <td>
                  <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => remove(s.slot_id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {slots && slots.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text3)', padding: 16 }}>
                  No slots configured — visitors won't be able to book a real VF tour time until you add some.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showAdd && <AddSlotModal onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
    </div>
  );
}

function AddSlotModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState('09:00');
  const [capacity, setCapacity] = useState('30');
  const [tourType, setTourType] = useState<'free' | 'paid'>('free');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      await adminApi.upsertVfSlot({
        tour_date: date,
        slot_time: `${time}:00`,
        capacity: Number(capacity),
        tour_type: tourType,
      });
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
          <span style={{ fontSize: 18 }}>🌳</span>
          <span className={styles.modalTitle}>Add VF Tour Slot</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Date</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Time</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Capacity (persons)</label>
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Type</label>
            <select className={styles.select} value={tourType} onChange={(e) => setTourType(e.target.value as 'free' | 'paid')}>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>
            Adding a slot for an existing date/time/type updates its capacity instead of duplicating it.
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting} onClick={submit}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
