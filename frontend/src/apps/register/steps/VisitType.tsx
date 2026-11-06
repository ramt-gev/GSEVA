import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import styles from '../register.module.css';
import type { RegConfig, RegistrationState } from '../types';

interface Props {
  state: RegistrationState;
  config: RegConfig;
  onChange: (patch: Partial<RegistrationState>) => void;
  onContinue: () => void;
}

export default function VisitType({ state, config, onChange, onContinue }: Props) {
  function selectType(type: 'free' | 'paid') {
    if (type === 'paid') {
      onChange({
        visitType: type,
        services: { ...state.services, darshan: true, lunch: true, zone3: false, dhanvantari: false },
      });
    } else {
      onChange({ visitType: type });
    }
  }

  function selectGroup(n: number) {
    if (n < 1 || n > config.maxGroupSize) return;
    onChange({ groupSize: n });
  }

  function handleContinue() {
    if (!state.leaderName.trim()) {
      alert('Please enter your name.');
      return;
    }
    if (!state.leaderMobile || !isValidPhoneNumber(state.leaderMobile)) {
      alert('Please enter a valid mobile number.');
      return;
    }
    onContinue();
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>Welcome to Govardhan EcoVillage</div>
      <div className={styles.sectionSub}>Let's set up your visit. This takes about 90 seconds.</div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>
          Select your Visit Type <span className={styles.req}>*</span>
        </div>
        <div className={styles.typeGrid}>
          <div
            className={`${styles.typeCard} ${state.visitType === 'free' ? styles.selected : ''}`}
            onClick={() => selectType('free')}
          >
            <div className={styles.typeCheck} />
            <div className={styles.typeBody}>
              <div className={styles.typeName}>Free Darshan</div>
              <div className={styles.typeDesc}>Simple, peaceful spiritual visit — no charges</div>
              <div className={styles.typePrice}>Free Entry</div>
              <div className={styles.typeIncludes}>
                <span className={styles.typeTag}>Temple Darshan</span>
                <span className={styles.typeTag}>Vrindavan Forest</span>
                <span className={styles.typeTag}>Free Lunch</span>
                <span className={styles.typeTag}>Zone 1 &amp; 2 Access</span>
                <span className={styles.typeTag}>Valid till 8 PM</span>
              </div>
            </div>
          </div>
          <div
            className={`${styles.typeCard} ${state.visitType === 'paid' ? styles.selected : ''}`}
            onClick={() => selectType('paid')}
          >
            <div className={styles.typeCheck} />
            <div className={styles.typeBody}>
              <div className={styles.typeName}>Full Programme</div>
              <div className={styles.typeDesc}>Complete spiritual day — all zones &amp; experiences</div>
              <div className={styles.typePrice}>₹{config.programmePrice} / person</div>
              <div className={styles.typeIncludes}>
                <span className={styles.typeTag}>Everything in Free</span>
                <span className={`${styles.typeTag} ${styles.highlight}`}>Zone 3 Access</span>
                <span className={`${styles.typeTag} ${styles.highlight}`}>Visitor Farm Tour</span>
                <span className={`${styles.typeTag} ${styles.highlight}`}>Govinda's Café</span>
                <span className={`${styles.typeTag} ${styles.highlight}`}>Special Activities</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>
          How many persons are in your group? <span className={styles.req}>*</span>
        </div>
        <div className={styles.groupCounter}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.gcNumBtn} ${state.groupSize === n ? styles.selected : ''}`}
              onClick={() => selectGroup(n)}
            >
              {n}
            </button>
          ))}
        </div>
        {state.groupSize >= config.maxGroupSize && (
          <div className={styles.groupMaxNote}>
            ℹ️ Maximum group size is <strong>{config.maxGroupSize}</strong> persons per registration.
          </div>
        )}
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>
          Your Name (Group Leader) <span className={styles.req}>*</span>
        </div>
        <input
          type="text"
          placeholder="Full name as per ID proof"
          value={state.leaderName}
          onChange={(e) => onChange({ leaderName: e.target.value })}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>
          WhatsApp Mobile <span className={styles.req}>*</span>
        </div>
        <div className={styles.phoneField}>
          <PhoneInput
            international
            limitMaxLength
            defaultCountry="IN"
            countryCallingCodeEditable={false}
            value={state.leaderMobile}
            onChange={(value) => onChange({ leaderMobile: value || '' })}
          />
        </div>
        <div className={styles.fieldNote}>📱 Your QR pass will be sent to this number · any country</div>
      </div>

      <div className={styles.field}>
        <div className={styles.fieldLabel}>Visiting From (City)</div>
        <input
          type="text"
          placeholder="e.g. Mumbai, Pune, Nashik"
          value={state.leaderCity}
          onChange={(e) => onChange({ leaderCity: e.target.value })}
        />
      </div>

      <button type="button" className={styles.btnPrimary} onClick={handleContinue}>
        Continue →
      </button>
    </div>
  );
}
