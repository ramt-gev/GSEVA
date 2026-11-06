import { useEffect, useState } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import styles from '../../../styles/backoffice.module.css';
import * as adminApi from '../../../lib/endpoints/admin';
import type { Department, Gender, SystemRole, Zone } from '../../../lib/types';

const MODULES = [
  { key: 'vms', label: 'VMS — Visitor Mgmt' },
  { key: 'ams', label: 'AMS — Annakshetra' },
  { key: 'security', label: 'Security' },
  { key: 'reports', label: 'Reports' },
];

interface Props {
  deptName?: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function RegisterSevakModal({ deptName, onClose, onCreated }: Props) {
  const [depts, setDepts] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [deptId, setDeptId] = useState('');
  const [zone2, setZone2] = useState(true);
  const [zone3, setZone3] = useState(true);
  const [zone4, setZone4] = useState(false);
  const [validity, setValidity] = useState('365');
  const [mealAccess, setMealAccess] = useState(false);
  const [mealPayment, setMealPayment] = useState('dept_sponsored');
  const [createLogin, setCreateLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<SystemRole>('operator');
  const [modules, setModules] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi.listDepartments().then((rows) => {
      setDepts(rows);
      if (deptName) {
        const match = rows.find((d) => d.dept_name.includes(deptName));
        if (match) setDeptId(match.dept_id);
      }
    });
  }, [deptName]);

  function toggleModule(key: string) {
    setModules((m) => (m.includes(key) ? m.filter((k) => k !== key) : [...m, key]));
  }

  async function submit() {
    setError('');
    if (!name.trim() || !mobile.trim()) {
      setError('Full name and mobile are required.');
      return;
    }
    if (!isValidPhoneNumber(mobile)) {
      setError('Please enter a valid mobile number.');
      return;
    }
    if (createLogin && (!username.trim() || !password)) {
      setError('Username and password are required for login creation.');
      return;
    }

    const zones: Zone[] = ['zone1'];
    if (zone2) zones.push('zone2');
    if (zone3) zones.push('zone3');
    if (zone4) zones.push('zone4');

    setSubmitting(true);
    try {
      const result = await adminApi.createSevak({
        full_name: name.trim(),
        mobile: mobile.trim(),
        gender,
        dept_id: deptId || undefined,
        zone_access: zones,
        meal_access: mealAccess,
        meal_payment: mealPayment,
        valid_days: validity ? Number(validity) : undefined,
        create_login: createLogin,
        username: createLogin ? username.trim() : undefined,
        password: createLogin ? password : undefined,
        login_role: role,
        module_access: modules,
      });
      alert(`✅ Sevak registered!\n\n${name} added to campus.\nQR Pass ID: ${result.qr_id.slice(0, 8)}…\nZones: ${zones.join(', ')}${createLogin ? `\nLogin: ${username}` : ''}`);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.modalBg} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} style={{ width: 580 }}>
        <div className={styles.modalHead}>
          <span style={{ fontSize: 18 }}>➕</span>
          <span className={styles.modalTitle}>Register New Sevak</span>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalBody} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--saffron)', marginBottom: 8 }}>Basic Information</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Full Name *">
                <input className={styles.dashInput} style={{ padding: '8px 10px' }} placeholder="Prasad Panda Prabhu" value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Mobile *">
                <div className={styles.phoneField}>
                  <PhoneInput international limitMaxLength defaultCountry="IN" countryCallingCodeEditable={false} value={mobile} onChange={(value) => setMobile(value || '')} />
                </div>
              </Field>
              <Field label="Gender">
                <select className={styles.select} value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="not_specified">Prefer not to say</option>
                </select>
              </Field>
              <Field label="Department">
                <select className={styles.select} value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                  <option value="">— Select department —</option>
                  {depts.map((d) => (
                    <option key={d.dept_id} value={d.dept_id}>
                      {d.dept_name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--saffron)', marginBottom: 8 }}>Access Configuration</div>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: 12.5 }}>
              <label>
                <input type="checkbox" checked disabled /> Zone 1 — Main Campus
              </label>
              <label>
                <input type="checkbox" checked={zone2} onChange={(e) => setZone2(e.target.checked)} /> Zone 2 — Gate 7
              </label>
              <label>
                <input type="checkbox" checked={zone3} onChange={(e) => setZone3(e.target.checked)} /> Zone 3 — SBT Gate
              </label>
              <label>
                <input type="checkbox" checked={zone4} onChange={(e) => setZone4(e.target.checked)} /> Zone 4 — Payal Bhavan
              </label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <Field label="Valid Duration">
                <select className={styles.select} value={validity} onChange={(e) => setValidity(e.target.value)}>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="180">6 months</option>
                  <option value="365">1 year</option>
                  <option value="">Permanent (no expiry)</option>
                </select>
              </Field>
              <Field label="Meal Access (B/D)">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <input type="checkbox" checked={mealAccess} onChange={(e) => setMealAccess(e.target.checked)} /> Breakfast &amp; Dinner meals
                </label>
              </Field>
            </div>
            {mealAccess && (
              <div style={{ marginTop: 10 }}>
                <Field label="Meal Payment Method">
                  <select className={styles.select} value={mealPayment} onChange={(e) => setMealPayment(e.target.value)}>
                    <option value="dept_sponsored">Department Sponsored</option>
                    <option value="free_welfare">Free Welfare</option>
                    <option value="salary_deduction">Salary Deduction</option>
                    <option value="ashram_covered">Ashram Covered</option>
                    <option value="self_paid">Self Paid</option>
                  </select>
                </Field>
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--saffron)', marginBottom: 8 }}>Login Account</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600 }}>
              <input type="checkbox" checked={createLogin} onChange={(e) => setCreateLogin(e.target.checked)} /> Create portal login for this sevak
            </label>
            {createLogin && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <Field label="Username *">
                    <input className={styles.dashInput} style={{ padding: '8px 10px' }} placeholder="e.g. prasad.panda" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </Field>
                  <Field label="Password *">
                    <input className={styles.dashInput} style={{ padding: '8px 10px' }} type="password" placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
                </div>
                <Field label="Portal Role">
                  <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value as SystemRole)}>
                    <option value="operator">Operator (limited access)</option>
                    <option value="dept_manager">Dept Manager</option>
                    <option value="module_admin">Module Admin</option>
                  </select>
                </Field>
                <div>
                  <label style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>Module Access</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {MODULES.map((m) => (
                      <span
                        key={m.key}
                        onClick={() => toggleModule(m.key)}
                        className={`${styles.tag} ${modules.includes(m.key) ? styles.tagG : styles.tagGrey}`}
                        style={{ cursor: 'pointer', padding: '5px 10px' }}
                      >
                        {m.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12.5 }}>{error}</div>}
        </div>
        <div className={styles.modalFoot}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onClose}>
            Cancel
          </button>
          <button className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting} onClick={submit}>
            {submitting ? 'Registering…' : 'Register Sevak'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>{label}</label>
      {children}
    </div>
  );
}
