import { api } from '../api';
import type { CampLocation, Gender, IdProofType, StaffRegPersonType, Zone } from '../types';

// All values come back as raw strings (system_config.config_value is TEXT) —
// parse client-side, and a key is simply absent if not seeded (never null).
export interface PublicConfig {
  max_group_size?: string;
  zone3_cafe_price?: string;
  paid_day_visit_price?: string;
  day_pass_valid_until?: string;
  vf_slot_capacity?: string;
  registration_open?: string;
}

export async function publicConfig(): Promise<PublicConfig> {
  const res = await api<{ data: PublicConfig }>('/api/register/public-config');
  return res.data;
}

export interface VfTourSlot {
  slot_id: string;
  tour_date: string;
  slot_time: string;
  capacity: number;
  booked_count: number;
  available: number;
  tour_type: 'free' | 'paid';
}

export async function vfSlots(): Promise<VfTourSlot[]> {
  const res = await api<{ data: VfTourSlot[] }>('/api/register/vf-slots');
  return res.data;
}

export interface CafeCapacityAvailability {
  cafe_code: string;
  meal_type: string;
  capacity: number;
  booked_count: number;
  available: number;
  capacity_date?: string;
}

export async function cafeCapacity(cafe = 'GGA', meal = 'lunch'): Promise<CafeCapacityAvailability> {
  const res = await api<{ data: CafeCapacityAvailability }>(
    `/api/register/cafe-capacity?cafe=${encodeURIComponent(cafe)}&meal=${encodeURIComponent(meal)}`
  );
  return res.data;
}

export interface RegisterContractor {
  contractor_id: string;
  company_name: string;
  contract_type: string;
}

export async function contractors(): Promise<RegisterContractor[]> {
  const res = await api<{ data: RegisterContractor[] }>('/api/register/contractors');
  return res.data;
}

export interface RegisterDepartment {
  dept_id: string;
  dept_name: string;
}

export async function departments(): Promise<RegisterDepartment[]> {
  const res = await api<{ data: RegisterDepartment[] }>('/api/register/departments');
  return res.data;
}

export interface GroupMemberInput {
  name: string;
  age: number;
  gender: Gender;
  relation?: string;
}

export interface RegisterVisitorInput {
  full_name: string;
  mobile: string;
  person_type: 'free_day_visitor' | 'paid_day_visitor';
  group_size: number;
  members: GroupMemberInput[];
  visit_date?: string;
  vf_slot_id?: string;
  lunch_indicated?: boolean;
  khichadi_indicated?: boolean;
  zone3_upgrade?: boolean;
  cafe_code?: 'GGA' | 'DHAN'; // which Zone 3 café — only meaningful when zone3_upgrade is true
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
}

export interface RegisterVisitorResult {
  person_id: string;
  qr_id: string;
  qr_url: string;
  zones: Zone[];
  valid_until: string;
}

export async function registerVisitor(input: RegisterVisitorInput): Promise<RegisterVisitorResult> {
  const res = await api<{ success: true; message: string; data: RegisterVisitorResult }>('/api/register/visitor', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export interface RegisterStaffInput {
  full_name: string;
  mobile: string;
  gender?: Gender;
  person_type: StaffRegPersonType;
  dept_id?: string;
  contractor_id?: string;
  new_contractor_name?: string; // set instead of contractor_id when "Company not listed" is chosen
  camp_location?: CampLocation;
  id_proof_type?: IdProofType;
  id_proof_number?: string;
  notes?: string;
  // Guest of Residence only (person_type === 'room_guest')
  host_name?: string;
  host_mobile?: string;
  stay_type?: 'short' | 'long';
  // Guest of Residence (short stay) and Volunteer (Seva) both use these —
  // for a volunteer this is their seva service period, both required.
  check_in_date?: string; // YYYY-MM-DD
  check_out_date?: string; // YYYY-MM-DD — guest long stay is open-ended, so omitted there
}

export async function registerStaff(input: RegisterStaffInput): Promise<{ person_id: string }> {
  const res = await api<{ success: true; message: string; data: { person_id: string } }>('/api/register/staff', {
    method: 'POST',
    body: input,
  });
  return res.data;
}

export interface CreatePaymentInput {
  amount: number; // rupees
  purpose: string;
  person_name?: string;
  mobile?: string;
}

export interface CreatePaymentResult {
  order_id: string;
  amount: number; // rupees — Razorpay Checkout.js needs paise, see lib/razorpay.ts
  currency: string;
  key_id: string;
  test_mode?: boolean;
}

export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const res = await api<{ data: CreatePaymentResult }>('/api/register/payment/create', {
    method: 'POST',
    body: input,
  });
  return res.data;
}
