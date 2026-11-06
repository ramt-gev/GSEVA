import { useState } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import styles from './register-staff.module.css';
import '../../styles/tokens-public.css';
import { ApiError } from '../../lib/api';
import * as registrationApi from '../../lib/endpoints/registration';
import type { CampLocation, Gender, StaffRegPersonType } from '../../lib/types';

type SelectedType = StaffRegPersonType | 'labourer';

const TYPE_CARDS: { type: SelectedType; name: string; desc: string }[] = [
  { type: 'volunteer_seva', name: 'Volunteer (Seva)', desc: 'Offering time/service to a department, short or long term.' },
  { type: 'labourer', name: 'Contractor Labourer', desc: 'Working under a registered contractor company (construction, maintenance, etc.)' },
  { type: 'vendor_supplier', name: 'Vendor / Supplier', desc: 'Delivering goods or providing an external service to campus.' },
  { type: 'brahmachari', name: 'Brahmachari', desc: 'Joining ashram life as a resident brahmachari.' },
  { type: 'varishtha_vaishnava', name: 'Varishtha Vaishnava', desc: 'Senior devotee taking up residence at GEV.' },
  { type: 'room_guest', name: 'Guest of Residence', desc: "Staying with a resident/staff member on campus — short visit or extended stay." },
];

// Partial: only the 6 selectable cards have an entry — the 3 raw labourer_type
// values are never selected directly (only via the 'labourer' card + sub-select).
const NOTES_LABEL: Partial<Record<SelectedType, string>> = {
  volunteer_seva: 'Seva interest / notes (optional)',
  labourer: 'Notes (optional)',
  vendor_supplier: 'Company name / service provided',
  brahmachari: 'Referred by / sponsoring devotee',
  varishtha_vaishnava: 'Referred by / sponsoring devotee',
  room_guest: 'Purpose of visit (optional)',
};

const LABOURER_TYPE_OPTIONS: { value: StaffRegPersonType; label: string }[] = [
  { value: 'construction_labourer', label: 'Construction' },
  { value: 'weekly_labourer_local', label: 'Weekly — Local' },
  { value: 'weekly_labourer_outstation', label: 'Weekly — Outstation' },
];

const CAMP_LOCATION_OPTIONS: { value: CampLocation; label: string }[] = [
  { value: 'camp_a_inside', label: 'Camp A — staying inside campus' },
  { value: 'camp_b_outside', label: 'Camp B — staying outside campus' },
  { value: 'not_staying', label: 'Not staying — day commute' },
];

const OTHER_COMPANY = '__other__';

interface FieldErrors {
  full_name?: boolean;
  mobile?: boolean;
  contractor_id?: boolean;
  new_contractor_name?: boolean;
  host_name?: boolean;
  host_mobile?: boolean;
  check_in_date?: boolean;
  check_out_date?: boolean;
  dept_id?: boolean;
}

export default function RegisterStaffPage() {
  const [selectedType, setSelectedType] = useState<SelectedType | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gender, setGender] = useState<Gender>('not_specified');
  const [notes, setNotes] = useState('');
  const [contractorId, setContractorId] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [labourerType, setLabourerType] = useState<StaffRegPersonType>('construction_labourer');
  const [campLocation, setCampLocation] = useState<CampLocation>('camp_a_inside');
  const [hostName, setHostName] = useState('');
  const [hostMobile, setHostMobile] = useState('');
  const [stayType, setStayType] = useState<'short' | 'long'>('short');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [deptId, setDeptId] = useState('');

  const [contractors, setContractors] = useState<registrationApi.RegisterContractor[] | null>(null);
  const [contractorsError, setContractorsError] = useState(false);
  const [departments, setDepartments] = useState<registrationApi.RegisterDepartment[] | null>(null);
  const [departmentsError, setDepartmentsError] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [bannerError, setBannerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ full_name: string; mobile: string } | null>(null);

  const isLabourer = selectedType === 'labourer';
  const isGuest = selectedType === 'room_guest';
  const isVolunteer = selectedType === 'volunteer_seva';
  const todayStr = new Date().toISOString().slice(0, 10);

  async function selectType(type: SelectedType) {
    setSelectedType(type);
    if (type === 'labourer' && contractors === null) {
      try {
        const list = await registrationApi.contractors();
        setContractors(list);
      } catch {
        setContractorsError(true);
      }
    }
    if (type === 'volunteer_seva' && departments === null) {
      try {
        const list = await registrationApi.departments();
        setDepartments(list);
      } catch {
        setDepartmentsError(true);
      }
    }
  }

  async function submit() {
    setFieldErrors({});
    setBannerError('');

    if (!selectedType) {
      setBannerError('Please choose what you are registering as.');
      return;
    }

    const isOtherCompany = contractorId === OTHER_COMPANY;

    const errors: FieldErrors = {};
    if (!fullName.trim()) errors.full_name = true;
    if (!mobile || !isValidPhoneNumber(mobile)) errors.mobile = true;
    if (isLabourer && !contractorId) errors.contractor_id = true;
    if (isLabourer && isOtherCompany && !newCompanyName.trim()) errors.new_contractor_name = true;
    if (isGuest && !hostName.trim()) errors.host_name = true;
    if (isGuest && (!hostMobile || !isValidPhoneNumber(hostMobile))) errors.host_mobile = true;
    if (isGuest && stayType === 'short' && !checkInDate) errors.check_in_date = true;
    if (isGuest && stayType === 'short' && !checkOutDate) errors.check_out_date = true;
    if (isGuest && stayType === 'short' && checkInDate && checkOutDate && checkOutDate < checkInDate) errors.check_out_date = true;
    if (isVolunteer && !deptId) errors.dept_id = true;
    if (isVolunteer && !checkInDate) errors.check_in_date = true;
    if (isVolunteer && !checkOutDate) errors.check_out_date = true;
    if (isVolunteer && checkInDate && checkOutDate && checkOutDate < checkInDate) errors.check_out_date = true;

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await registrationApi.registerStaff({
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        gender,
        person_type: isLabourer ? labourerType : (selectedType as StaffRegPersonType),
        contractor_id: isLabourer && !isOtherCompany ? contractorId : undefined,
        new_contractor_name: isLabourer && isOtherCompany ? newCompanyName.trim() : undefined,
        camp_location: isLabourer ? campLocation : undefined,
        dept_id: isVolunteer ? deptId : undefined,
        notes: notes.trim() || undefined,
        host_name: isGuest ? hostName.trim() : undefined,
        host_mobile: isGuest ? hostMobile.trim() : undefined,
        stay_type: isGuest ? stayType : undefined,
        check_in_date: isGuest && stayType === 'short' ? checkInDate : isVolunteer ? checkInDate : undefined,
        check_out_date: isGuest && stayType === 'short' ? checkOutDate : isVolunteer ? checkOutDate : undefined,
      });
      setSuccess({ full_name: fullName.trim(), mobile: mobile.trim() });
    } catch (err) {
      setBannerError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`theme-public ${styles.page}`}>
      <div className={styles.header}>
        <p>Volunteer &middot; Contractor &middot; Vendor Registration</p>
      </div>

      <div className={styles.container}>
        {!success && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Register with GEV</div>
            <div className={styles.sectionSub}>
              For volunteers offering seva, contractor labourers, vendors/suppliers, brahmachari &amp;
              varishtha vaishnava joining the ashram, and guests staying with a resident. Your details go
              to our team for approval — you'll be notified once your pass is ready.
            </div>

            {bannerError && <div className={styles.bannerError}>{bannerError}</div>}

            <div className={styles.fieldLabel}>
              I am registering as <span className={styles.req}>*</span>
            </div>
            <div className={styles.typeGrid}>
              {TYPE_CARDS.map((card) => (
                <div
                  key={card.type}
                  className={`${styles.typeCard} ${selectedType === card.type ? styles.selected : ''}`}
                  onClick={() => selectType(card.type)}
                >
                  <div className={styles.typeCheck} />
                  <div className={styles.typeBody}>
                    <div className={styles.typeName}>{card.name}</div>
                    <div className={styles.typeDesc}>{card.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className={`${styles.field} ${fieldErrors.full_name ? styles.invalid : ''}`}>
              <div className={styles.fieldLabel}>
                Full Name <span className={styles.req}>*</span>
              </div>
              <input
                type="text"
                placeholder="As per ID proof"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              {fieldErrors.full_name && <div className={styles.fieldError}>Please enter your full name.</div>}
            </div>

            <div className={`${styles.field} ${fieldErrors.mobile ? styles.invalid : ''}`}>
              <div className={styles.fieldLabel}>
                Mobile Number <span className={styles.req}>*</span>
              </div>
              <div className={styles.phoneField}>
                <PhoneInput
                  international
                  limitMaxLength
                  defaultCountry="IN"
                  countryCallingCodeEditable={false}
                  value={mobile}
                  onChange={(value) => setMobile(value || '')}
                />
              </div>
              <div className={styles.fieldNote}>We'll send your approval status and QR pass here via WhatsApp.</div>
              {fieldErrors.mobile && <div className={styles.fieldError}>Please enter a valid mobile number.</div>}
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>Gender</div>
              <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option value="not_specified">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {isLabourer && (
              <div className={styles.labourerFields}>
                <div className={`${styles.field} ${fieldErrors.contractor_id ? styles.invalid : ''}`}>
                  <div className={styles.fieldLabel}>
                    Contractor Company <span className={styles.req}>*</span>
                  </div>
                  <select value={contractorId} onChange={(e) => setContractorId(e.target.value)}>
                    <option value="">
                      {contractors === null && !contractorsError ? 'Loading companies…' : 'Select company…'}
                    </option>
                    {contractors?.map((c) => (
                      <option key={c.contractor_id} value={c.contractor_id}>
                        {c.company_name}
                      </option>
                    ))}
                    <option value={OTHER_COMPANY}>Company not listed / Other</option>
                  </select>
                  <div className={styles.fieldNote}>
                    {contractorsError
                      ? "Could not load the company list — you can still pick \"Other\" and type your company's name."
                      : "Don't see your company? Pick \"Other\" and type its name below."}
                  </div>
                  {fieldErrors.contractor_id && <div className={styles.fieldError}>Please select your contractor company.</div>}
                </div>

                {contractorId === OTHER_COMPANY && (
                  <div className={`${styles.field} ${fieldErrors.new_contractor_name ? styles.invalid : ''}`}>
                    <div className={styles.fieldLabel}>
                      Company Name <span className={styles.req}>*</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Your contractor company's name"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                    />
                    <div className={styles.fieldNote}>We'll add it as pending — our team will confirm it shortly.</div>
                    {fieldErrors.new_contractor_name && <div className={styles.fieldError}>Please enter your company's name.</div>}
                  </div>
                )}
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>
                    Labourer Type <span className={styles.req}>*</span>
                  </div>
                  <select value={labourerType} onChange={(e) => setLabourerType(e.target.value as StaffRegPersonType)}>
                    {LABOURER_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <div className={styles.fieldLabel}>
                    Staying Arrangement <span className={styles.req}>*</span>
                  </div>
                  <select value={campLocation} onChange={(e) => setCampLocation(e.target.value as CampLocation)}>
                    {CAMP_LOCATION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {isGuest && (
              <div className={styles.labourerFields}>
                <div className={`${styles.field} ${fieldErrors.host_name ? styles.invalid : ''}`}>
                  <div className={styles.fieldLabel}>
                    Who are you staying with? (Host's Full Name) <span className={styles.req}>*</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Resident / staff member's name"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                  />
                  {fieldErrors.host_name && <div className={styles.fieldError}>Please enter your host's name.</div>}
                </div>

                <div className={`${styles.field} ${fieldErrors.host_mobile ? styles.invalid : ''}`}>
                  <div className={styles.fieldLabel}>
                    Host's Mobile Number <span className={styles.req}>*</span>
                  </div>
                  <div className={styles.phoneField}>
                    <PhoneInput
                      international
                      limitMaxLength
                      defaultCountry="IN"
                      countryCallingCodeEditable={false}
                      value={hostMobile}
                      onChange={(value) => setHostMobile(value || '')}
                    />
                  </div>
                  <div className={styles.fieldNote}>Helps our team confirm your stay with the resident you're visiting.</div>
                  {fieldErrors.host_mobile && <div className={styles.fieldError}>Please enter a valid mobile number.</div>}
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldLabel}>
                    Duration of Stay <span className={styles.req}>*</span>
                  </div>
                  <div className={styles.typeGrid} style={{ gap: 10, marginBottom: 0 }}>
                    <div
                      className={`${styles.typeCard} ${stayType === 'short' ? styles.selected : ''}`}
                      style={{ padding: '12px 14px' }}
                      onClick={() => setStayType('short')}
                    >
                      <div className={styles.typeCheck} />
                      <div className={styles.typeBody}>
                        <div className={styles.typeName}>Short Stay</div>
                        <div className={styles.typeDesc}>Specific arrival and departure dates.</div>
                      </div>
                    </div>
                    <div
                      className={`${styles.typeCard} ${stayType === 'long' ? styles.selected : ''}`}
                      style={{ padding: '12px 14px' }}
                      onClick={() => setStayType('long')}
                    >
                      <div className={styles.typeCheck} />
                      <div className={styles.typeBody}>
                        <div className={styles.typeName}>Long Stay</div>
                        <div className={styles.typeDesc}>Extended / indefinite — no fixed departure date yet.</div>
                      </div>
                    </div>
                  </div>
                </div>

                {stayType === 'short' ? (
                  <>
                    <div className={`${styles.field} ${fieldErrors.check_in_date ? styles.invalid : ''}`}>
                      <div className={styles.fieldLabel}>
                        Check-in Date <span className={styles.req}>*</span>
                      </div>
                      <input
                        type="date"
                        min={todayStr}
                        value={checkInDate}
                        onChange={(e) => {
                          setCheckInDate(e.target.value);
                          if (checkOutDate && checkOutDate < e.target.value) setCheckOutDate('');
                        }}
                      />
                      {fieldErrors.check_in_date && <div className={styles.fieldError}>Please select your check-in date.</div>}
                    </div>
                    <div className={`${styles.field} ${fieldErrors.check_out_date ? styles.invalid : ''}`}>
                      <div className={styles.fieldLabel}>
                        Check-out Date <span className={styles.req}>*</span>
                      </div>
                      <input
                        type="date"
                        min={checkInDate || todayStr}
                        value={checkOutDate}
                        onChange={(e) => setCheckOutDate(e.target.value)}
                      />
                      {fieldErrors.check_out_date && <div className={styles.fieldError}>Please select a valid check-out date.</div>}
                    </div>
                  </>
                ) : (
                  <div className={styles.fieldNote} style={{ marginTop: -8, marginBottom: 18 }}>
                    ℹ️ No dates needed — you're registering for an extended stay. Our team will confirm the duration with your host.
                  </div>
                )}
              </div>
            )}

            {isVolunteer && (
              <div className={styles.labourerFields}>
                <div className={`${styles.field} ${fieldErrors.dept_id ? styles.invalid : ''}`}>
                  <div className={styles.fieldLabel}>
                    Department <span className={styles.req}>*</span>
                  </div>
                  <select value={deptId} onChange={(e) => setDeptId(e.target.value)}>
                    <option value="">
                      {departments === null && !departmentsError ? 'Loading departments…' : 'Select department…'}
                    </option>
                    {departments?.map((d) => (
                      <option key={d.dept_id} value={d.dept_id}>
                        {d.dept_name}
                      </option>
                    ))}
                  </select>
                  {departmentsError && (
                    <div className={styles.fieldNote}>Could not load the department list — please refresh and try again.</div>
                  )}
                  {fieldErrors.dept_id && <div className={styles.fieldError}>Please select a department.</div>}
                </div>

                <div className={`${styles.field} ${fieldErrors.check_in_date ? styles.invalid : ''}`}>
                  <div className={styles.fieldLabel}>
                    Seva Start Date <span className={styles.req}>*</span>
                  </div>
                  <input
                    type="date"
                    min={todayStr}
                    value={checkInDate}
                    onChange={(e) => {
                      setCheckInDate(e.target.value);
                      if (checkOutDate && checkOutDate < e.target.value) setCheckOutDate('');
                    }}
                  />
                  {fieldErrors.check_in_date && <div className={styles.fieldError}>Please select your seva start date.</div>}
                </div>

                <div className={`${styles.field} ${fieldErrors.check_out_date ? styles.invalid : ''}`}>
                  <div className={styles.fieldLabel}>
                    Seva End Date <span className={styles.req}>*</span>
                  </div>
                  <input
                    type="date"
                    min={checkInDate || todayStr}
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                  />
                  {fieldErrors.check_out_date && <div className={styles.fieldError}>Please select a valid seva end date.</div>}
                </div>
              </div>
            )}

            <div className={styles.field}>
              <div className={styles.fieldLabel}>{(selectedType && NOTES_LABEL[selectedType]) || 'Notes'}</div>
              <textarea
                placeholder="Optional — e.g. seva department, service offered, or referring devotee"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button className={styles.btnPrimary} disabled={submitting} onClick={submit}>
              {submitting ? 'Submitting…' : 'Submit for Approval'}
            </button>
          </div>
        )}

        {success && (
          <div className={styles.successScreen}>
            <div className={styles.successTitle}>Hare Krishna</div>
            <div className={styles.successThank}>Registration submitted</div>
            <div className={styles.successSub}>
              Our team will review your details. Once approved, your QR pass will be sent to your WhatsApp number.
            </div>
            <div className={styles.successDetails}>
              <div>
                <strong>Name:</strong> {success.full_name}
              </div>
              <div>
                <strong>Mobile:</strong> {success.mobile}
              </div>
              <div>
                <strong>Status:</strong> Pending approval
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
