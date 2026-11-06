import { useEffect, useState } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import type { Department, Gender, IdProofType, PersonType } from '../../../lib/types';
import { PERSON_TYPES } from '../../../lib/types';

const TYPE_LABELS: Record<PersonType, string> = {
  room_guest: 'Room Booking Guest',
  free_day_visitor: 'Free Day Visitor',
  paid_day_visitor: 'Paid Day Visitor (₹850)',
  course_student: 'Course Student (Yoga / Ayurveda / Spiritual)',
  volunteer_seva: 'Volunteer / Seva',
  sustainability_intern: 'Sustainability Intern',
  resident_staff: 'Resident Staff',
  staff_dependant: 'Staff Dependant',
  brahmachari: 'Brahmachari',
  varishtha_vaishnava: 'Varishtha Vaishnava',
  weekly_labourer_local: 'Weekly Labourer — Local (day only)',
  weekly_labourer_outstation: 'Weekly Labourer — Outstation (overnight)',
  construction_labourer: 'Construction Labourer',
  vendor_supplier: 'Vendor / Supplier',
  corporate_tour_group: 'Corporate / Tour Group',
  vip_dignitary: 'VIP / Dignitary',
};

const EMPTY = {
  personType: '' as PersonType | '',
  fullName: '',
  mobile: '',
  gender: 'not_specified' as Gender,
  dob: '',
  idProofType: 'aadhaar' as IdProofType,
  idProofNumber: '',
  deptId: '',
  campusLocation: '',
  checkIn: '',
  checkOut: '',
  address: '',
  registerBd: 'no',
  bdPayment: 'dept_sponsored',
};

export default function RegisterPerson() {
  const [depts, setDepts] = useState<Department[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ name: string; qr_id: string } | null>(null);

  useEffect(() => {
    adminApi.listDepartments().then(setDepts).catch(() => {});
  }, []);

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError('');
    if (!form.personType || !form.fullName.trim() || !form.mobile.trim()) {
      setError('Person type, full name, and mobile are required.');
      return;
    }
    if (!isValidPhoneNumber(form.mobile)) {
      setError('Please enter a valid mobile number.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminApi.registerPerson({
        full_name: form.fullName.trim(),
        mobile: form.mobile.trim(),
        person_type: form.personType,
        gender: form.gender,
        date_of_birth: form.dob || undefined,
        id_proof_type: form.idProofType,
        id_proof_number: form.idProofNumber || undefined,
        dept_id: form.deptId || undefined,
        campus_location: form.campusLocation || undefined,
        check_in_date: form.checkIn || undefined,
        check_out_date: form.checkOut || undefined,
        perm_address: form.address || undefined,
        register_bd: form.registerBd !== 'no',
        bd_payment_method: form.bdPayment,
      });
      setSuccess({ name: form.fullName, qr_id: result.qr_id });
      setForm(EMPTY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.cardTitle}>Register New Person on Campus</span>
      </div>
      <div className={styles.cardBody} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {success && (
          <div className={`${styles.callout} ${styles.ok}`}>
            <span className={styles.calloutIcon}>✅</span>
            <div className={styles.calloutBody}>
              <strong>{success.name} registered successfully!</strong>
              QR pass generated and sent via WhatsApp — pass ID {success.qr_id.slice(0, 8)}…
            </div>
          </div>
        )}
        {error && (
          <div className={`${styles.callout} ${styles.warn}`}>
            <span className={styles.calloutIcon}>⚠️</span>
            <div className={styles.calloutBody}>{error}</div>
          </div>
        )}

        <Field label="Person Type *">
          <select className={styles.select} value={form.personType} onChange={(e) => set('personType', e.target.value as PersonType)}>
            <option value="">— Select type —</option>
            {PERSON_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Full Name *">
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} placeholder="As per ID proof" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
          </Field>
          <Field label="Mobile (WhatsApp) *">
            <div className={styles.phoneField}>
              <PhoneInput international limitMaxLength defaultCountry="IN" countryCallingCodeEditable={false} value={form.mobile} onChange={(value) => set('mobile', value || '')} />
            </div>
          </Field>
          <Field label="Gender">
            <select className={styles.select} value={form.gender} onChange={(e) => set('gender', e.target.value as Gender)}>
              <option value="not_specified">— Select —</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Date of Birth">
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={form.dob} onChange={(e) => set('dob', e.target.value)} />
          </Field>
          <Field label="ID Proof Type">
            <select className={styles.select} value={form.idProofType} onChange={(e) => set('idProofType', e.target.value as IdProofType)}>
              <option value="aadhaar">Aadhaar</option>
              <option value="passport">Passport</option>
              <option value="driving_licence">Driving Licence</option>
              <option value="voter_id">Voter ID</option>
              <option value="pan_card">PAN Card</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="ID Proof Number">
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} placeholder="XXXX XXXX XXXX" value={form.idProofNumber} onChange={(e) => set('idProofNumber', e.target.value)} />
          </Field>
          <Field label="Department">
            <select className={styles.select} value={form.deptId} onChange={(e) => set('deptId', e.target.value)}>
              <option value="">— Select Department —</option>
              {depts.map((d) => (
                <option key={d.dept_id} value={d.dept_id}>
                  {d.dept_name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Campus Location / Accommodation">
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} placeholder="e.g. Room 204, Camp A" value={form.campusLocation} onChange={(e) => set('campusLocation', e.target.value)} />
          </Field>
          <Field label="Check-in Date">
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} />
          </Field>
          <Field label="Expected Check-out">
            <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="date" value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} />
          </Field>
        </div>
        <Field label="Permanent Address">
          <input className={styles.dashInput} style={{ padding: '8px 10px' }} placeholder="Full address, city, state, pincode" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>

        <div style={{ padding: 14, background: 'var(--teal-bg, #e1f4ef)', borderRadius: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--teal)', marginBottom: 10 }}>🍲 Annakshetra B/D Registration</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Register for B/D?">
              <select className={styles.select} value={form.registerBd} onChange={(e) => set('registerBd', e.target.value)}>
                <option value="no">No — not required</option>
                <option value="yes">Breakfast + Dinner</option>
              </select>
            </Field>
            <Field label="Payment Method">
              <select className={styles.select} value={form.bdPayment} onChange={(e) => set('bdPayment', e.target.value)}>
                <option value="salary_deduction">Salary Deduction (payroll staff)</option>
                <option value="free_welfare">Free Welfare (construction labourer)</option>
                <option value="dept_sponsored">Dept Sponsored (volunteer)</option>
                <option value="ashram_covered">Ashram Covered</option>
              </select>
            </Field>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 9, justifyContent: 'flex-end' }}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={() => setForm(EMPTY)}>
            Clear Form
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting} onClick={submit}>
            {submitting ? 'Registering…' : '✅ Register & Send QR Pass'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}
