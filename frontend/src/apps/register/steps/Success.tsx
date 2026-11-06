import { useState } from 'react';
import { CircleCheck, MessageCircle, Utensils } from 'lucide-react';
import styles from '../register.module.css';
import type { RegConfig, RegistrationState } from '../types';
import { computeTotal } from '../types';
import * as registrationApi from '../../../lib/endpoints/registration';
import { openCheckout } from '../../../lib/razorpay';

interface Props {
  state: RegistrationState;
  config: RegConfig;
  result: registrationApi.RegisterVisitorResult;
}

export default function Success({ state, config, result }: Props) {
  const g = state.groupSize;
  const total = computeTotal(state, config);
  const upgradeTotal = config.zone3Price * g;
  const alreadyHasZone3 = state.visitType === 'paid' || state.services.zone3 || state.services.dhanvantari;

  const [upgrading, setUpgrading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function downloadQr() {
    setDownloading(true);
    try {
      const res = await fetch(result.qr_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GEV-QR-Pass-${state.leaderName.trim().replace(/\s+/g, '-') || 'Pass'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Cross-origin/network hiccup fallback — open it so they can long-press-save on mobile.
      window.open(result.qr_url, '_blank');
    } finally {
      setDownloading(false);
    }
  }

  const services: string[] = [];
  if (state.services.darshan) services.push('Temple Darshan');
  if (state.services.lunch) services.push('Annakshetra Lunch');
  if (state.services.khichadi) services.push('Khichadi');
  if (state.services.vf && state.vfSlot) services.push(`VF Tour ${state.vfSlot}`);
  if (state.services.zone3) services.push("Govinda's Guest Area");
  if (state.services.dhanvantari) services.push('Dhanvantari Café');
  if (state.visitType === 'paid') services.push(`Full Programme ₹${config.programmePrice}`);

  async function initiateGovindaUpgrade() {
    setUpgrading(true);
    try {
      const order = await registrationApi.createPayment({
        amount: upgradeTotal,
        purpose: 'zone3_upgrade',
        person_name: state.leaderName,
        mobile: state.leaderMobile,
      });

      await openCheckout({
        order,
        name: 'Govardhan EcoVillage',
        description: `Zone 3 Upgrade — ${g} person${g > 1 ? 's' : ''}`,
        prefill: { name: state.leaderName, contact: state.leaderMobile },
        onSuccess: () => setUpgraded(true),
        onDismiss: () => setUpgrading(false),
      });
    } catch {
      alert('Payment system unavailable.');
      setUpgrading(false);
    }
  }

  return (
    <div className={styles.successScreen}>
      <div className={styles.successTitle}>Hare Krishna</div>
      <div className={styles.successThank}>Thank you for registering</div>
      <div className={styles.successSub}>Your QR pass is ready. Download it and show it at the Main Gate to enter.</div>

      <div className={styles.qrPlaceholder}>
        <img src={result.qr_url} alt="Your GEV QR Pass" className={styles.qrImage} />
        <button type="button" className={styles.qrDownloadBtn} disabled={downloading} onClick={downloadQr}>
          {downloading ? 'Downloading…' : '⬇  Download QR'}
        </button>
        <div className={styles.qrNote}>Save it to your phone — no signal needed to show it at the gate</div>
      </div>

      <div className={styles.successDetails}>
        <div className={styles.sdRow}>
          <span className={styles.sdLabel}>Name</span>
          <span className={styles.sdValue}>{state.leaderName}</span>
        </div>
        <div className={styles.sdRow}>
          <span className={styles.sdLabel}>Group</span>
          <span className={styles.sdValue}>{g} person{g > 1 ? 's' : ''}</span>
        </div>
        <div className={styles.sdRow}>
          <span className={styles.sdLabel}>Access</span>
          <span className={styles.sdValue}>{alreadyHasZone3 ? 'Zone 1 + 2 + 3' : 'Zone 1 + 2'}</span>
        </div>
        <div className={styles.sdRow}>
          <span className={styles.sdLabel}>Services</span>
          <span className={styles.sdValue}>{services.join(' · ')}</span>
        </div>
        <div className={styles.sdRow}>
          <span className={styles.sdLabel}>Valid until</span>
          <span className={styles.sdValue}>Today 8:00 PM</span>
        </div>
        {total > 0 && (
          <div className={styles.sdRow}>
            <span className={styles.sdLabel}>Paid</span>
            <span className={styles.sdValue} style={{ color: 'var(--green)' }}>
              ₹{total.toLocaleString('en-IN')} ✓
            </span>
          </div>
        )}
      </div>

      <div className={styles.waNote}>
        <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <MessageCircle size={16} />
        </span>
        <span>
          A copy has also been sent to <strong>{state.leaderMobile}</strong> via WhatsApp.
        </span>
      </div>

      {!alreadyHasZone3 && !upgraded && (
        <div style={{ marginTop: 16, background: '#f8eee4', border: '1.5px solid #e8ddd4', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, background: '#fdf6f0', borderRadius: 12, flexShrink: 0, color: '#703d1a' }}>
              <Utensils size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#703d1a', marginBottom: 4 }}>Want Special Govinda's Buffet Lunch?</div>
              <div style={{ fontSize: 12, color: '#8a7a6a', lineHeight: 1.6, marginBottom: 10 }}>
                Authentic satvik cuisine at Govinda's Guest Area · Serene garden setting · ₹{config.zone3Price} per person
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                <span style={{ background: 'rgba(112,61,26,0.08)', border: '1px solid rgba(112,61,26,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#703d1a', fontWeight: 600 }}>
                  1:00 – 2:30 PM
                </span>
                <span style={{ background: 'rgba(112,61,26,0.08)', border: '1px solid rgba(112,61,26,0.2)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#703d1a', fontWeight: 600 }}>
                  Zone 3 · Govinda's Guest Area
                </span>
                <span style={{ background: 'rgba(85,107,47,0.1)', border: '1px solid rgba(85,107,47,0.25)', borderRadius: 8, padding: '4px 10px', fontSize: 11, color: '#556B2F', fontWeight: 600 }}>
                  Spots available
                </span>
              </div>
            </div>
          </div>
          <div style={{ margin: '0 16px', padding: 12, background: 'rgba(112,61,26,0.06)', border: '1px solid #e8ddd4', borderRadius: 10, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: '#8a7a6a' }}>₹{config.zone3Price} × {g} person(s)</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: '#703d1a' }}>₹{upgradeTotal.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ fontSize: 11, color: '#8a7a6a' }}>Zone 3 access included · Valid until 8:00 PM today · WhatsApp confirmation sent</div>
          </div>
          <div style={{ padding: '0 16px 16px' }}>
            <button
              type="button"
              disabled={upgrading}
              onClick={initiateGovindaUpgrade}
              style={{
                width: '100%', background: '#703d1a', border: 'none', borderRadius: 11, padding: 15,
                fontSize: 15, fontWeight: 800, color: 'white', cursor: upgrading ? 'not-allowed' : 'pointer',
                letterSpacing: 0.2, boxShadow: '0 4px 18px rgba(112,61,26,0.3)', opacity: upgrading ? 0.7 : 1,
              }}
            >
              {upgrading ? '⏳  Opening payment...' : "Upgrade to Special Govinda's Buffet Lunch"}
            </button>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: '#8a7a6a' }}>
              Secure payment · Razorpay · UPI / Card / Net Banking
            </div>
          </div>
        </div>
      )}

      {upgraded && (
        <div style={{ marginTop: 16, background: 'var(--green-bg)', border: '1.5px solid var(--green-border)', borderRadius: 14, padding: 16, textAlign: 'center' }}>
          <div style={{ marginBottom: 8, color: '#556B2F', display: 'flex', justifyContent: 'center' }}>
            <CircleCheck size={28} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#556B2F', marginBottom: 4 }}>Govinda's Buffet Confirmed!</div>
          <div style={{ fontSize: 12, color: '#556B2F', lineHeight: 1.6, marginBottom: 10 }}>
            Zone 3 access activated · ₹{upgradeTotal.toLocaleString('en-IN')} paid · WhatsApp receipt sent
          </div>
          <div style={{ background: 'white', borderRadius: 8, padding: 10, fontSize: 12, color: 'var(--text2)' }}>
            Govinda's Guest Area · Zone 3 · 1:00–2:30 PM
            <br />
            Show your QR at the SBT Gate to enter Zone 3
          </div>
        </div>
      )}
    </div>
  );
}
