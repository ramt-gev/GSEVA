import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

interface Props {
  notify: (msg: string) => void;
  onGoToCpd: () => void;
}

export default function SupervisorMeetingTab({ notify, onGoToCpd }: Props) {
  const [meeting, setMeeting] = useState<kitchenApi.KitchenMeeting | null>(null);
  const [estimate, setEstimate] = useState('');
  const [qtyNotes, setQtyNotes] = useState('');
  const [machNote, setMachNote] = useState('');

  useEffect(() => {
    kitchenApi.getMeeting().then((m) => {
      setMeeting(m);
      setEstimate(m.prasadam_taker_estimate != null ? String(m.prasadam_taker_estimate) : '');
      setQtyNotes(m.quantity_notes || '');
      setMachNote(m.machinery_status_note || '');
    }).catch(() => {});
  }, []);

  async function save() {
    try {
      const m = await kitchenApi.saveMeeting({
        prasadam_taker_estimate: Number(estimate) || undefined,
        quantity_notes: qtyNotes,
        machinery_status_note: machNote,
      });
      setMeeting(m);
      notify('kitchen_meetings row saved — awaiting HOD approval/finalization');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save meeting');
    }
  }

  function broadcast(label: string) {
    notify(`Alert queued — notifications table: "${label}"`);
  }

  const finalized = meeting?.status === 'FINALIZED';

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Today&apos;s Meeting — 2:00 PM</span>
          <span className={styles.cardSub}>kitchen_meetings — enter the planning inputs; HOD approves &amp; finalizes</span>
        </div>
        <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 12 }}>
            <Field label="Prasadam Taker Estimate">
              <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="number" value={estimate} onChange={(e) => setEstimate(e.target.value)} disabled={finalized} />
            </Field>
            <Field label="Quantity Notes">
              <textarea className={styles.dashInput} style={{ padding: '8px 10px', minHeight: 54, resize: 'vertical' }} value={qtyNotes} onChange={(e) => setQtyNotes(e.target.value)} disabled={finalized} />
            </Field>
            <Field label="Machinery Status Note">
              <textarea className={styles.dashInput} style={{ padding: '8px 10px', minHeight: 54, resize: 'vertical' }} value={machNote} onChange={(e) => setMachNote(e.target.value)} disabled={finalized} />
            </Field>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 12.5 }}>
              Status:{' '}
              <span className={`${styles.tag} ${finalized ? styles.tagG : styles.tagA}`}>
                {finalized ? 'FINALIZED' : 'IN_PROGRESS'}
              </span>
            </span>
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={finalized} onClick={save}>
              Convene &amp; Submit for HOD Approval
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>
            {finalized
              ? `Finalized by ${meeting?.finalized_by_name} at ${meeting?.finalized_at ? new Date(meeting.finalized_at).toLocaleString('en-IN') : ''}`
              : 'Sets kitchen_meetings.convened_at and the fields above; status stays IN_PROGRESS until HOD finalizes.'}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>End-of-Meeting Actions</span>
        </div>
        <div className={styles.cardBody} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => broadcast('Send menu + raw material + expected output amount to Preparation team')}>
            Send menu + raw material + expected output amount to Preparation team
          </button>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => broadcast('Send alert to Distribution Team')}>
            Send alert to Distribution Team
          </button>
          <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onGoToCpd}>
            Go to CPD Procurement →
          </button>
        </div>
      </div>
    </>
  );
}
