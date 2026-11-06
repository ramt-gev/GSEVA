import { api, qs } from '../api';
import type {
  ApprovalStatus, CampLocation, Department, Gender,
  PersonStatus, PersonType, QrPassSummary, SystemRole, Zone,
} from '../types';

export interface DashboardSummary {
  population: {
    room_guests: number; day_visitors: number; staff: number;
    volunteers_students: number; labourers: number; ashram: number; total: number;
  };
  gate: { entries: number; denials: number };
  meals: { meal_type: string; served: number }[];
  pending_approvals: number;
}

export async function dashboardSummary(): Promise<DashboardSummary> {
  const res = await api<{ data: DashboardSummary }>('/api/admin/dashboard');
  return res.data;
}

export interface AdminPersonRow {
  person_id: string;
  full_name: string;
  mobile: string;
  person_type: PersonType;
  status: PersonStatus;
  gender: Gender;
  dept_id: string | null;
  created_at: string;
  department: { dept_name: string } | null;
  qr_passes: QrPassSummary[];
  stays: {
    check_in_date: string | null; check_out_date: string | null; booking_source: string | null;
    accommodation_block: string | null; room_number: string | null;
  }[];
  // Person-level fields — populated directly by the GreytHR sync for staff
  // (who don't have a PersonStay; that's for guest/seva check-in periods).
  accommodation_block: string | null;
  room_number: string | null;
  greythr_id: string | null;
  meal_registrations: { meal_type: string; payment_method: string }[];
  present_today: boolean;
}

export interface PersonsByTypeResult {
  data: AdminPersonRow[];
  count: number;
  total: number;
  page: number;
  limit: number;
}

// `type`/`status` accept comma-separated lists (Phase 0 extension) — e.g.
// type: 'room_guest,free_day_visitor,paid_day_visitor,corporate_tour_group,vip_dignitary'
export function personsByType(params: {
  type?: string; status?: string; page?: number; limit?: number; search?: string;
}): Promise<PersonsByTypeResult> {
  return api<PersonsByTypeResult>(`/api/admin/persons${qs(params)}`);
}

export interface PendingApproval {
  person_id: string;
  full_name: string;
  person_type: PersonType;
  mobile: string;
  created_at: string;
  dept_id: string | null;
  dept_name: string | null;
  cl_id: string | null;
  camp_location: CampLocation | null;
  annakshetra_bd_opted: boolean | null;
  contractor_name: string | null;
  source: 'contractor_labourer' | 'staff_registration';
}

export async function pendingApprovals(): Promise<PendingApproval[]> {
  const res = await api<{ data: PendingApproval[] }>('/api/admin/pending-approvals');
  return res.data;
}

export function approvePerson(
  person_id: string,
  input: { valid_from?: string; valid_until?: string; group_size?: number } = {}
) {
  return api<{ success: true; qr_id: string; message: string }>(`/api/admin/approve/${person_id}`, {
    method: 'POST',
    body: input,
  });
}

// Same authorization boundary as approving a volunteer (super_admin, or a
// dept_manager scoped to 'seva'). 'extend' pushes the end date later and
// leaves the person on_campus with an active pass; 'close' pulls it earlier
// (or to today), deactivates the stay, revokes/shortens the QR pass, and
// marks the person departed.
function updateVolunteerSevaPeriod(person_id: string, new_end_date: string, action: 'extend' | 'close', remarks?: string) {
  return api<{ success: true; person_id: string; new_end_date: string; action: string }>(`/api/admin/seva-period/${person_id}`, {
    method: 'POST',
    body: { new_end_date, action, remarks },
  });
}

export function extendVolunteerSeva(person_id: string, new_end_date: string) {
  return updateVolunteerSevaPeriod(person_id, new_end_date, 'extend');
}

export function reduceAndCloseVolunteer(person_id: string, new_end_date: string, remarks?: string) {
  return updateVolunteerSevaPeriod(person_id, new_end_date, 'close', remarks);
}

// Manual entry — not sourced from Greythr (its API has no accommodation or
// meal-enrollment fields at all). `meals` omitted leaves enrollment as-is.
export function updateAccommodationMeals(
  person_id: string,
  input: { accommodation_block: string; room_number: string; meals?: ('breakfast' | 'dinner')[] }
) {
  return api<{ success: true; person_id: string }>(`/api/admin/persons/${person_id}/accommodation-meals`, {
    method: 'PUT',
    body: input,
  });
}

// A non-2xx response (Greythr unreachable / not configured) makes `api()`
// throw an ApiError with the backend's `error` message rather than resolve
// — so a resolved value here always means success: true.
export interface GreythrSyncResult {
  success: true;
  created: number;
  updated: number;
  deactivated: number;
  departmentsCreated: number;
  skippedNoMobile: number;
  skippedNoDept: number;
  skippedError: number;
}

export interface GreythrAttendanceSyncResult {
  success: true;
  present: number;
  total: number;
}

// These normally run on their own cron schedule (6 AM staff sync, hourly
// attendance) — manual trigger for on-demand testing/refresh from the UI.
export function syncGreythrStaff() {
  return api<GreythrSyncResult>('/api/admin/greythr/sync-staff', { method: 'POST' });
}

export function syncGreythrAttendance() {
  return api<GreythrAttendanceSyncResult>('/api/admin/greythr/sync-attendance', { method: 'POST' });
}

export interface AuditLogRow {
  audit_id: string;
  action: string;
  module: string;
  table_name: string;
  record_id: string | null;
  new_value: unknown;
  old_value: unknown;
  created_at: string;
  user: { username: string; person: { full_name: string } | null } | null;
}

export async function auditTrail(params: { page?: number; limit?: number; user_id?: string; module?: string } = {}) {
  const res = await api<{ data: AuditLogRow[] }>(`/api/admin/audit${qs(params)}`);
  return res.data;
}

export interface SystemUserRow {
  user_id: string;
  username: string;
  role: SystemRole;
  module_access: string[];
  dept_id: string | null;
  is_active: boolean;
  is_locked: boolean;
  last_login: string | null;
  person: { full_name: string; mobile: string } | null;
}

export async function listUsers(): Promise<SystemUserRow[]> {
  const res = await api<{ data: SystemUserRow[] }>('/api/admin/users');
  return res.data;
}

export interface CreateUserInput {
  person_id: string;
  username: string;
  password: string;
  role: SystemRole;
  module_access?: string[];
  dept_id?: string;
}

export async function createUser(input: CreateUserInput) {
  const res = await api<{ data: { user_id: string; username: string; role: SystemRole; module_access: string[] } }>(
    '/api/admin/users',
    { method: 'POST', body: input }
  );
  return res.data;
}

export async function listDepartments(): Promise<Department[]> {
  const res = await api<{ data: Department[] }>('/api/admin/departments');
  return res.data;
}

export interface CreateSevakInput {
  full_name: string;
  mobile: string;
  gender?: Gender;
  dept_id?: string;
  zone_access?: Zone[];
  meal_access?: boolean;
  meal_payment?: string;
  valid_days?: number;
  create_login?: boolean;
  username?: string;
  password?: string;
  login_role?: SystemRole;
  module_access?: string[];
}

export function createSevak(input: CreateSevakInput) {
  return api<{ success: true; person_id: string; qr_id: string; user: { user_id: string; username: string; role: SystemRole } | null }>(
    '/api/admin/sevak',
    { method: 'POST', body: input }
  );
}

export interface SevakRow {
  person_id: string;
  full_name: string;
  mobile: string;
  status: PersonStatus;
  created_at: string;
  dept_id: string | null;
  department: { dept_name: string } | null;
  qr_passes: QrPassSummary[];
  system_user: { username: string; is_active: boolean } | null;
}

export async function listSevaks(params: { dept_id?: string; page?: number; limit?: number } = {}) {
  return api<{ data: SevakRow[]; total: number }>(`/api/admin/sevaks${qs(params)}`);
}

// --- system_config ---

export async function getConfig(): Promise<Record<string, string>> {
  const res = await api<{ data: Record<string, string> }>('/api/admin/config');
  return res.data;
}

export function updateConfig(values: Record<string, string>) {
  return api<{ success: true; message: string }>('/api/admin/config', { method: 'PUT', body: values });
}

// --- Phase 0 additions ---

export interface Festival {
  festival_id: string;
  festival_name: string;
  festival_date: string;
  festival_end_date: string | null;
  expected_footfall: number | null;
  festival_mode_on: boolean;
  is_ekadashi: boolean;
  is_grain_free: boolean;
  pre_reg_opens_at: string | null;
  notes: string | null;
}

export async function festivalsList(): Promise<Festival[]> {
  const res = await api<{ data: Festival[] }>('/api/admin/festivals');
  return res.data;
}

export async function toggleFestivalMode(festival_id: string, festival_mode_on: boolean): Promise<Festival> {
  const res = await api<{ data: Festival }>(`/api/admin/festivals/${festival_id}`, {
    method: 'PUT',
    body: { festival_mode_on },
  });
  return res.data;
}

export interface GacMember {
  gac_id: string;
  gac_member_name: string;
  gac_position: string | null;
  is_active: boolean;
}

export async function gacMembersList(): Promise<GacMember[]> {
  const res = await api<{ data: GacMember[] }>('/api/admin/gac-members');
  return res.data;
}

export interface DeptHod {
  hod_id: string;
  dept_code: string;
  hod_name: string;
  gac_member: string | null;
  project_contact: string | null;
  department: { dept_id: string; dept_name: string } | null;
}

export async function deptHodsList(): Promise<DeptHod[]> {
  const res = await api<{ data: DeptHod[] }>('/api/admin/dept-hods');
  return res.data;
}

export interface CafeCapacityRow {
  capacity_id: string;
  cafe_code: string;
  capacity_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner';
  threshold: number;
  booked_count: number;
  declared_by: string | null;
  declared_at: string;
  notes: string | null;
}

export async function cafeCapacityList(date?: string): Promise<CafeCapacityRow[]> {
  const res = await api<{ data: CafeCapacityRow[] }>(`/api/admin/cafe-capacity${qs({ date })}`);
  return res.data;
}

export function declareCafeCapacity(input: {
  cafe_code: string; capacity_date: string; meal_type: 'breakfast' | 'lunch' | 'dinner';
  threshold: number; notes?: string;
}) {
  return api<{ data: CafeCapacityRow }>('/api/admin/cafe-capacity', { method: 'POST', body: input });
}

export interface AdminVfSlot {
  slot_id: string;
  tour_date: string;
  slot_time: string;
  capacity: number;
  booked_count: number;
  available: number;
  tour_type: 'free' | 'paid';
}

export async function vfSlotsListAdmin(date?: string): Promise<AdminVfSlot[]> {
  const res = await api<{ data: AdminVfSlot[] }>(`/api/admin/vf-slots${qs({ date })}`);
  return res.data;
}

export function upsertVfSlot(input: { tour_date: string; slot_time: string; capacity: number; tour_type?: 'free' | 'paid' }) {
  return api<{ data: AdminVfSlot }>('/api/admin/vf-slots', { method: 'POST', body: input });
}

export function deleteVfSlot(slot_id: string) {
  return api<{ success: true }>(`/api/admin/vf-slots/${slot_id}`, { method: 'DELETE' });
}

export interface Zone3UpgradesToday {
  date: string;
  count: number;
  total_revenue: number;
  total_persons: number;
  payments: {
    upgrade_id: string;
    full_name: string | null;
    mobile: string | null;
    gate_name: string;
    persons_count: number;
    total_amount: number;
    cafe_code: string | null;
    meal_type: string | null;
    paid_at: string | null;
  }[];
}

export async function zone3UpgradesToday(date?: string): Promise<Zone3UpgradesToday> {
  const res = await api<{ data: Zone3UpgradesToday }>(`/api/admin/zone3-upgrades${qs({ date })}`);
  return res.data;
}

export interface AdminContractor {
  contractor_id: string;
  company_name: string;
  poc_name: string;
  poc_mobile: string;
  contract_type: string;
  dept_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: ApprovalStatus;
  worker_count: number;
}

export async function contractorsListAdmin(): Promise<AdminContractor[]> {
  const res = await api<{ data: AdminContractor[] }>('/api/admin/contractors');
  return res.data;
}

export interface RegisterPersonInput {
  full_name: string;
  mobile: string;
  person_type: PersonType;
  gender?: Gender;
  dept_id?: string;
  id_proof_type?: string;
  id_proof_number?: string;
  date_of_birth?: string;
  perm_address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  campus_location?: string;
  check_in_date?: string;
  check_out_date?: string;
  zone_access?: Zone[];
  valid_days?: number;
  register_bd?: boolean;
  bd_payment_method?: string;
}

export function registerPerson(input: RegisterPersonInput) {
  return api<{ success: true; person_id: string; qr_id: string }>('/api/admin/register-person', {
    method: 'POST',
    body: input,
  });
}

export interface RosterRow {
  full_name: string;
  mobile: string;
  gender?: string;
  date_of_birth?: string;
  campus_location?: string;
}

export interface BulkImportResult {
  success: true;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; name: string; reason: string }[];
}

// Upserts by mobile — an existing person with that mobile gets updated,
// a new one gets created with a permanent QR pass. See adminService.js's
// ashramBulkImport for the exact matching/creation logic.
export function ashramBulkImport(person_type: 'brahmachari' | 'varishtha_vaishnava', rows: RosterRow[]) {
  return api<BulkImportResult>('/api/admin/ashram/bulk-import', {
    method: 'POST',
    body: { person_type, rows },
  });
}

export interface PendingContractor {
  contractor_id: string;
  company_name: string;
  poc_name: string;
  poc_mobile: string;
  contract_type: string;
  created_at: string;
  worker_count: number;
}

// Companies auto-created when a labourer picks "Company not listed" on the
// public staff-registration form — see registrationService.registerStaff.
export async function pendingContractors(): Promise<PendingContractor[]> {
  const res = await api<{ data: PendingContractor[] }>('/api/admin/contractors/pending');
  return res.data;
}

export function approveContractor(contractor_id: string) {
  return api<{ success: true; contractor_id: string; company_name: string }>(`/api/admin/contractors/${contractor_id}/approve`, {
    method: 'POST',
  });
}
