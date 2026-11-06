import { useEffect, useState } from 'react';
import styles from '../../../styles/backoffice.module.css';
import Field from './Field';
import * as kitchenApi from '../../../lib/endpoints/kitchen';

interface Props {
  notify: (msg: string) => void;
}

const valueBoxStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, padding: '9px 11px', background: 'var(--surface, #f8eee4)',
  border: '1px solid var(--border, #e8ddd4)', borderRadius: 8, minHeight: 18,
};

export default function HodMeetingTab({ notify }: Props) {
  const [meeting, setMeeting] = useState<kitchenApi.KitchenMeeting | null>(null);
  const [summary, setSummary] = useState<kitchenApi.MeetingSummary | null>(null);

  function load() {
    kitchenApi.getMeeting().then(setMeeting).catch(() => {});
    kitchenApi.meetingSummary().then(setSummary).catch(() => {});
  }
  useEffect(load, []);

  async function finalize() {
    try {
      const m = await kitchenApi.finalizeMeeting();
      setMeeting(m);
      notify("Meeting finalized — kitchen_meetings.status = 'FINALIZED'");
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not finalize meeting');
    }
  }

  const finalized = meeting?.status === 'FINALIZED';

  return (
    <>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Today&apos;s Kitchen Meeting</span>
          <span className={styles.cardSub}>for_date: {meeting?.for_date || '—'} — HOD holds final approval</span>
        </div>
        <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Field label="Convened At"><div style={valueBoxStyle}>{meeting?.convened_at ? new Date(meeting.convened_at).toLocaleString('en-IN') : '—'}</div></Field>
            <Field label="Prasadam Taker Estimate"><div style={valueBoxStyle}>{meeting?.prasadam_taker_estimate ?? '—'}</div></Field>
            <Field label="Status">
              <div style={valueBoxStyle}>
                {meeting?.status ? (
                  <span className={`${styles.tag} ${finalized ? styles.tagG : styles.tagA}`}>
                    {finalized ? 'FINALIZED' : 'IN_PROGRESS — awaiting your approval'}
                  </span>
                ) : '—'}
              </div>
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Field label="Quantity Notes"><div style={valueBoxStyle}>{meeting?.quantity_notes || '—'}</div></Field>
            <Field label="Machinery Status Note"><div style={valueBoxStyle}>{meeting?.machinery_status_note || '—'}</div></Field>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={!meeting?.for_date || finalized} onClick={finalize}>
              {finalized ? 'Finalized' : "Approve & Finalize Day's Plan"}
            </button>
            {finalized && (
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                finalized_by: {meeting?.finalized_by_name} · finalized_at: {meeting?.finalized_at ? new Date(meeting.finalized_at).toLocaleString('en-IN') : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Pending Approvals</span>
        </div>
        <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <Field label="Special Requests Awaiting Decision"><div style={valueBoxStyle}>{summary?.pending_special_requests ?? 0}</div></Field>
            <Field label="Upcoming BLD Rows Logged"><div style={valueBoxStyle}>{summary?.bld_rows_logged ?? 0}</div></Field>
            <Field label="Locked Total (people)"><div style={valueBoxStyle}>{summary?.locked_total_people ?? 0}</div></Field>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text3)', margin: 0 }}>HOD approves, never enters, at every module below.</p>
        </div>
      </div>
    </>
  );
}
