import { Coffee, Leaf, Star } from 'lucide-react';
import styles from '../register.module.css';
import type { RegConfig, Services as ServicesState } from '../types';

interface Props {
  visitType: 'free' | 'paid';
  groupSize: number;
  services: ServicesState;
  config: RegConfig;
  cafeAvailable: number | null;
  dhanvantariAvailable: number | null;
  onToggleService: (service: 'lunch' | 'zone3' | 'dhanvantari' | 'khichadi') => void;
  onContinue: () => void;
  onBack: () => void;
}

export default function FoodOptions({
  visitType, groupSize, services, config, cafeAvailable, dhanvantariAvailable, onToggleService, onContinue, onBack,
}: Props) {
  const zone3Total = config.zone3Price * groupSize;

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Food &amp; Dining</div>
      <div className={styles.sectionSub}>Select your dining options for today's visit.</div>

      <div className={styles.foodGrid}>
        <div className={`${styles.foodCard} ${services.lunch ? styles.selected : ''}`}>
          <img src="/thali.avif" alt="Annakshetra Free Lunch" className={styles.foodImage} />
          <div className={styles.foodBody}>
            <div className={styles.foodName}>Annakshetra Free Lunch</div>
            <div className={styles.foodDesc}>Prasad lunch · 12:45–2:30 PM · Lalita Bhavan</div>
            <div className={styles.foodTags}>
              <span className={`${styles.scTag} ${styles.scFree}`}>Free for all</span>
            </div>
            <button
              type="button"
              className={`${styles.foodSelectBtn} ${services.lunch ? styles.selected : ''}`}
              onClick={() => onToggleService('lunch')}
            >
              {services.lunch ? '✓ Selected' : 'Select'}
            </button>
          </div>
        </div>

        <div className={`${styles.foodCard} ${services.khichadi ? styles.selected : ''}`}>
          <img src="/khichdi.png" alt="Khichadi" className={styles.foodImage} />
          <div className={styles.foodBody}>
            <div className={styles.foodName}>Khichadi</div>
            <div className={styles.foodDesc}>Free tap-counter meal · Morning &amp; evening</div>
            <div className={styles.foodTags}>
              <span className={`${styles.scTag} ${styles.scFree}`}>Free for all</span>
            </div>
            <button
              type="button"
              className={`${styles.foodSelectBtn} ${services.khichadi ? styles.selected : ''}`}
              onClick={() => onToggleService('khichadi')}
            >
              {services.khichadi ? '✓ Selected' : 'Select'}
            </button>
          </div>
        </div>

        <div className={`${styles.foodCard} ${styles.paid} ${services.zone3 ? styles.selected : ''}`}>
          <div className={styles.foodImagePlaceholder}>
            <Coffee size={32} strokeWidth={1.5} />
          </div>
          <div className={styles.foodBody}>
            <div className={styles.foodName}>Govinda's Guest Area</div>
            <div className={styles.foodDesc}>Zone 3 · Lunch 1:00–2:30 PM</div>
            <div className={styles.foodTags}>
              <span className={`${styles.scTag} ${styles.scPaid}`}>₹{config.zone3Price}/person</span>
              {cafeAvailable !== null && <span className={`${styles.scTag} ${styles.scAvail}`}>{cafeAvailable} left</span>}
            </div>
            <button
              type="button"
              className={`${styles.foodSelectBtn} ${styles.paid} ${services.zone3 ? styles.selected : ''}`}
              onClick={() => onToggleService('zone3')}
            >
              {services.zone3 ? '✓ Selected' : `Select · ₹${zone3Total.toLocaleString('en-IN')} total`}
            </button>
          </div>
        </div>

        <div className={`${styles.foodCard} ${styles.paid} ${services.dhanvantari ? styles.selected : ''}`}>
          <div className={styles.foodImagePlaceholder}>
            <Leaf size={32} strokeWidth={1.5} />
          </div>
          <div className={styles.foodBody}>
            <div className={styles.foodName}>Dhanvantari Café</div>
            <div className={styles.foodDesc}>Zone 3 · Ayurvedic dining</div>
            <div className={styles.foodTags}>
              <span className={`${styles.scTag} ${styles.scPaid}`}>₹{config.zone3Price}/person</span>
              {dhanvantariAvailable !== null && <span className={`${styles.scTag} ${styles.scAvail}`}>{dhanvantariAvailable} left</span>}
            </div>
            <button
              type="button"
              className={`${styles.foodSelectBtn} ${styles.paid} ${services.dhanvantari ? styles.selected : ''}`}
              onClick={() => onToggleService('dhanvantari')}
            >
              {services.dhanvantari ? '✓ Selected' : `Select · ₹${zone3Total.toLocaleString('en-IN')} total`}
            </button>
          </div>
        </div>
      </div>

      {(services.zone3 || services.dhanvantari) && (
        <div className={styles.fieldNote} style={{ marginTop: -14, marginBottom: 16 }}>
          Govinda's and Dhanvantari are both Zone 3 cafés — the ₹{config.zone3Price}/person Zone 3 access fee covers either one, not both.
        </div>
      )}

      {visitType === 'paid' && (
        <div className={styles.callout}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <Star size={18} color="#b45309" />
          </span>
          <div className={styles.calloutBody}>
            <strong>Paid Programme (₹{config.programmePrice}/person) includes:</strong>
            Full Goshala tour · Spiritual sessions · Govinda's lunch · Cart facility · All zones
          </div>
        </div>
      )}

      <button type="button" className={styles.btnPrimary} onClick={onContinue}>
        Review &amp; Pay →
      </button>
      <button type="button" className={styles.btnSecondary} onClick={onBack}>
        ← Back
      </button>
    </div>
  );
}
