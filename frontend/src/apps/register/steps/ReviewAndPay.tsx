import styles from '../register.module.css';
import type { RegConfig, RegistrationState } from '../types';
import { computeTotal } from '../types';

interface Props {
  state: RegistrationState;
  config: RegConfig;
  submitting: boolean;
  onSubmitFree: () => void;
  onInitiatePayment: () => void;
  onBack: () => void;
}

export default function ReviewAndPay({ state, config, submitting, onSubmitFree, onInitiatePayment, onBack }: Props) {
  const g = state.groupSize;
  const total = computeTotal(state, config);
  const programmeAmount = config.programmePrice * g;
  const zone3Amount = config.zone3Price * g;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Review Your Visit</div>
      <div className={styles.sectionSub}>Check your details before confirming.</div>

      <div style={{ background: 'var(--surface, #f8eee4)', border: '1.5px solid var(--border)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text3)', marginBottom: 10 }}>
          Your Details
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7, fontSize: 13 }}>
          <Row label="Group Leader" value={state.leaderName} />
          <Row label="Mobile" value={state.leaderMobile} />
          <Row label="Visit Type" value={state.visitType === 'paid' ? 'Full Programme' : 'Free Darshan'} />
          <Row label="Group Size" value={`${g} person${g > 1 ? 's' : ''}`} />
          {state.services.vf && state.vfSlot && <Row label="VF Tour Slot" value={state.vfSlot} />}
          {state.services.lunch && <Row label="Annakshetra Lunch" value="Pre-indicated ✓" valueColor="var(--green)" />}
          {state.services.khichadi && <Row label="Khichadi" value="Pre-indicated ✓" valueColor="var(--green)" />}
          {state.services.zone3 && (
            <Row label="Govinda's Guest Area" value={`₹${zone3Amount.toLocaleString('en-IN')} ✓`} valueColor="var(--brown)" />
          )}
          {state.services.dhanvantari && (
            <Row label="Dhanvantari Café" value={`₹${zone3Amount.toLocaleString('en-IN')} ✓`} valueColor="var(--brown)" />
          )}
        </div>
      </div>

      {total === 0 ? (
        <div>
          <div className={styles.psFree}>
            <div className={styles.psFreeText}>No payment required · Free visit confirmed</div>
          </div>
          <button type="button" className={styles.btnPrimary} disabled={submitting} onClick={onSubmitFree}>
            {submitting ? 'Registering…' : 'Get My QR Pass'}
          </button>
        </div>
      ) : (
        <div>
          <div className={styles.paySummary}>
            <div className={styles.psTitle}>Payment Summary</div>
            {state.visitType === 'paid' && (
              <div className={styles.psRow}>
                <span className={styles.label}>₹{config.programmePrice} Programme × {g}</span>
                <span className={styles.amount}>₹{programmeAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {(state.services.zone3 || state.services.dhanvantari) && state.visitType !== 'paid' && (
              <div className={styles.psRow}>
                <span className={styles.label}>{state.services.dhanvantari ? 'Dhanvantari Café' : "Govinda's Guest Area"} × {g}</span>
                <span className={styles.amount}>₹{zone3Amount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className={styles.psTotal}>
              <span className={styles.label}>Total</span>
              <span className={styles.amount}>₹{total.toLocaleString('en-IN')}</span>
            </div>
          </div>
          <button type="button" className={styles.btnPrimary} disabled={submitting} onClick={onInitiatePayment}>
            {submitting ? 'Processing…' : `💳  Pay ₹${total.toLocaleString('en-IN')} & Get QR Pass`}
          </button>
          <div className={styles.orDivider}>or</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 12 }}>
            Cash payment at Main Gate reception
          </div>
        </div>
      )}

      <button type="button" className={styles.btnSecondary} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text3)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: valueColor }}>{value}</span>
    </div>
  );
}
