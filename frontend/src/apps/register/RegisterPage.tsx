import { useEffect, useState } from 'react';
import styles from './register.module.css';
import '../../styles/tokens-public.css';
import { ApiError } from '../../lib/api';
import * as registrationApi from '../../lib/endpoints/registration';
import { openCheckout } from '../../lib/razorpay';
import { DEFAULT_CONFIG, INITIAL_STATE, computeTotal } from './types';
import type { Member, RegConfig, RegistrationState } from './types';
import type { Gender } from '../../lib/types';
import VisitType from './steps/VisitType';
import GroupMembers from './steps/GroupMembers';
import VfTour from './steps/VfTour';
import FoodOptions from './steps/FoodOptions';
import ReviewAndPay from './steps/ReviewAndPay';
import Success from './steps/Success';
import type { SlotOption } from './steps/VfTour';

const STEP_LABELS = ['', 'Group Size', 'Your Details', 'Forest Tour', 'Food & Dining', 'Review & Pay'];
const STATIC_VF_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];

type Step = 1 | 2 | 3 | 4 | 5 | 'success';

export default function RegisterPage() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<RegistrationState>(INITIAL_STATE);
  const [config, setConfig] = useState<RegConfig>(DEFAULT_CONFIG);
  const [slots, setSlots] = useState<SlotOption[] | null>(null);
  const [cafeAvailable, setCafeAvailable] = useState<number | null>(null);
  const [dhanvantariAvailable, setDhanvantariAvailable] = useState<number | null>(null);
  const [loadingText, setLoadingText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<registrationApi.RegisterVisitorResult | null>(null);

  useEffect(() => {
    registrationApi
      .publicConfig()
      .then((cfg) => {
        setConfig({
          maxGroupSize: cfg.max_group_size ? parseInt(cfg.max_group_size, 10) : DEFAULT_CONFIG.maxGroupSize,
          // real system_config keys are zone3_cafe_price/paid_day_visit_price
          // (the original prototype read the wrong keys — zone3_upgrade_price/
          // paid_programme_price — and always silently fell back to defaults)
          zone3Price: cfg.zone3_cafe_price ? parseInt(cfg.zone3_cafe_price, 10) : DEFAULT_CONFIG.zone3Price,
          programmePrice: cfg.paid_day_visit_price ? parseInt(cfg.paid_day_visit_price, 10) : DEFAULT_CONFIG.programmePrice,
        });
      })
      .catch(() => {});

    registrationApi
      .vfSlots()
      .then((data) => {
        const today = new Date().toISOString().slice(0, 10);
        const todaySlots = data.filter((s) => s.tour_date?.slice(0, 10) === today);
        if (!todaySlots.length) {
          setSlots(STATIC_VF_SLOTS.map((time) => ({ time, slotId: null, available: null, full: false })));
          return;
        }
        setSlots(
          todaySlots.map((s) => {
            const available = Number(s.available);
            const timeLabel = new Date(`1970-01-01T${s.slot_time}`).toLocaleTimeString('en-IN', {
              hour: 'numeric', minute: '2-digit', hour12: true,
            });
            return { time: timeLabel, slotId: s.slot_id, available, full: available <= 0 };
          })
        );
      })
      .catch(() => setSlots(STATIC_VF_SLOTS.map((time) => ({ time, slotId: null, available: null, full: false }))));

    registrationApi
      .cafeCapacity('GGA', 'lunch')
      .then((cap) => setCafeAvailable(cap.available))
      .catch(() => {});

    registrationApi
      .cafeCapacity('DHAN', 'lunch')
      .then((cap) => setDhanvantariAvailable(cap.available))
      .catch(() => {});
  }, []);

  function updateState(patch: Partial<RegistrationState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function goToStep(n: Step) {
    setStep(n);
    window.scrollTo(0, 0);
  }

  function handleStep1Continue() {
    if (state.groupSize === 1) {
      updateState({ members: [{ name: state.leaderName, age: '', gender: '', relation: 'self' }] });
      goToStep(3);
    } else {
      const members: Member[] = Array.from({ length: state.groupSize }, (_, i) => ({
        name: i === 0 ? state.leaderName : '',
        age: '',
        gender: '',
        relation: i === 0 ? 'Leader' : 'Group member',
      }));
      updateState({ members });
      goToStep(2);
    }
  }

  function handleToggleService(service: 'lunch' | 'zone3' | 'dhanvantari' | 'khichadi') {
    updateState({ services: { ...state.services, [service]: !state.services[service] } });
  }

  function buildRegistrationBody(
    person_type: 'free_day_visitor' | 'paid_day_visitor',
    payment?: { razorpay_payment_id: string; razorpay_order_id: string }
  ): registrationApi.RegisterVisitorInput {
    return {
      full_name: state.leaderName,
      mobile: state.leaderMobile,
      person_type,
      group_size: state.groupSize,
      members: state.members.map((m) => ({
        name: m.name,
        age: parseInt(m.age, 10) || 0,
        gender: (m.gender || 'not_specified') as Gender,
        relation: m.relation,
      })),
      visit_date: new Date().toISOString().slice(0, 10),
      vf_slot_id: state.vfSlotId || undefined,
      lunch_indicated: state.services.lunch,
      khichadi_indicated: state.services.khichadi,
      zone3_upgrade: state.services.zone3 || state.services.dhanvantari,
      cafe_code: state.services.dhanvantari ? 'DHAN' : state.services.zone3 ? 'GGA' : undefined,
      razorpay_payment_id: payment?.razorpay_payment_id,
      razorpay_order_id: payment?.razorpay_order_id,
    };
  }

  async function submitFree() {
    setSubmitting(true);
    setLoadingText('Registering your visit...');
    try {
      const data = await registrationApi.registerVisitor(buildRegistrationBody('free_day_visitor'));
      setResult(data);
      goToStep('success');
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setSubmitting(false);
      setLoadingText(null);
    }
  }

  async function initiatePayment() {
    const total = computeTotal(state, config);
    const purpose = state.visitType === 'paid' ? 'paid_programme_850' : 'zone3_upgrade';
    const personType = state.visitType === 'paid' ? 'paid_day_visitor' : 'free_day_visitor';

    setSubmitting(true);
    setLoadingText('Creating payment...');
    try {
      const order = await registrationApi.createPayment({
        amount: total,
        purpose,
        person_name: state.leaderName,
        mobile: state.leaderMobile,
      });

      setLoadingText(order.test_mode ? 'Test mode — registering...' : null);

      await openCheckout({
        order,
        name: 'Govardhan EcoVillage',
        description: state.visitType === 'paid' ? `Paid Programme ₹${config.programmePrice}` : `Zone 3 Upgrade ₹${config.zone3Price}/person`,
        prefill: { name: state.leaderName, contact: state.leaderMobile },
        onSuccess: async (response) => {
          setLoadingText('Completing registration...');
          try {
            const data = await registrationApi.registerVisitor(buildRegistrationBody(personType, response));
            setResult(data);
            goToStep('success');
          } catch (err) {
            alert(err instanceof ApiError ? err.message : 'Registration failed. Please contact the gate with your payment confirmation.');
          } finally {
            setSubmitting(false);
            setLoadingText(null);
          }
        },
        onDismiss: () => {
          setSubmitting(false);
          setLoadingText(null);
        },
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Payment system unavailable. Please try again.');
      setSubmitting(false);
      setLoadingText(null);
    }
  }

  if (!started) {
    return (
      <div className={`theme-public ${styles.page}`}>
        <div className={styles.welcomeScreen}>
          <div className={styles.wlcHeading}>Hare Krishna</div>
          <div className={styles.wlcSub}>WELCOME TO</div>
          <div className={styles.wlcLogo}>
            <img src="/logo.png" alt="Govardhan EcoVillage" />
          </div>
          <button type="button" className={styles.wlcBtn} onClick={() => setStarted(true)}>
            REGISTER YOUR VISIT
          </button>
          <div className={styles.wlcDesc}>RECEIVE A DIGITAL QR PASS</div>
        </div>
      </div>
    );
  }

  const stepNumber = step === 'success' ? 5 : step;

  return (
    <div className={`theme-public ${styles.page}`}>
      {step !== 'success' && (
        <div className={styles.progressBar}>
          <div className={styles.progTrack}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className={`${styles.progSeg} ${i < stepNumber ? styles.done : ''} ${i === stepNumber ? styles.active : ''}`}
              />
            ))}
          </div>
          <div className={styles.progMeta}>
            <div className={styles.progStepLabel}>{STEP_LABELS[stepNumber]}</div>
            <div className={styles.progStepCount}>Step {stepNumber} of 5</div>
          </div>
        </div>
      )}

      <div className={styles.container}>
        {step === 1 && <VisitType state={state} config={config} onChange={updateState} onContinue={handleStep1Continue} />}
        {step === 2 && (
          <GroupMembers
            members={state.members}
            onChange={(members) => updateState({ members })}
            onContinue={() => goToStep(3)}
            onBack={() => goToStep(1)}
          />
        )}
        {step === 3 && (
          <VfTour
            vfSlot={state.vfSlot}
            slots={slots}
            onSelectSlot={(time, slotId) =>
              updateState({ vfSlot: time, vfSlotId: slotId, services: { ...state.services, vf: time !== null } })
            }
            onContinue={() => goToStep(4)}
            onBack={() => goToStep(state.groupSize <= 1 ? 1 : 2)}
          />
        )}
        {step === 4 && (
          <FoodOptions
            visitType={state.visitType}
            groupSize={state.groupSize}
            services={state.services}
            config={config}
            cafeAvailable={cafeAvailable}
            dhanvantariAvailable={dhanvantariAvailable}
            onToggleService={handleToggleService}
            onContinue={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}
        {step === 5 && (
          <ReviewAndPay
            state={state}
            config={config}
            submitting={submitting}
            onSubmitFree={submitFree}
            onInitiatePayment={initiatePayment}
            onBack={() => goToStep(4)}
          />
        )}
        {step === 'success' && result && <Success state={state} config={config} result={result} />}
      </div>

      {loadingText && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner} />
          <div className={styles.loadingText}>{loadingText}</div>
        </div>
      )}
    </div>
  );
}
