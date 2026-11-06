// Shared enums/types, hand-derived from backend-mysql's actual Sequelize
// models (not the prototypes' JS, which drifted from the real schema in
// several places — see the build plan's "gotchas" section).

export const PERSON_TYPES = [
  'room_guest', 'free_day_visitor', 'paid_day_visitor', 'course_student',
  'volunteer_seva', 'sustainability_intern', 'resident_staff', 'staff_dependant',
  'brahmachari', 'varishtha_vaishnava', 'weekly_labourer_local',
  'weekly_labourer_outstation', 'construction_labourer', 'vendor_supplier',
  'corporate_tour_group', 'vip_dignitary',
] as const;
export type PersonType = (typeof PERSON_TYPES)[number];

export const STAFF_REG_PERSON_TYPES = [
  'volunteer_seva', 'vendor_supplier', 'brahmachari', 'varishtha_vaishnava',
  'construction_labourer', 'weekly_labourer_local', 'weekly_labourer_outstation',
  'room_guest',
] as const;
export type StaffRegPersonType = (typeof STAFF_REG_PERSON_TYPES)[number];

export type Gender = 'male' | 'female' | 'other' | 'not_specified';
export type IdProofType = 'aadhaar' | 'passport' | 'driving_licence' | 'voter_id' | 'pan_card' | 'other';
export type PersonStatus = 'pre_registered' | 'on_campus' | 'departed' | 'suspended' | 'archived';
export type SystemRole =
  | 'super_admin' | 'management' | 'module_admin' | 'dept_manager' | 'operator'
  | 'kitchen_supervisor' | 'kitchen_hod' | 'kitchen_collection_distribution';
export type PassType = 'permanent' | 'stay_pass' | 'day_pass' | 'festival_pass' | 'temp_cafe_pass' | 'tour_pass';
export type Zone = 'zone1' | 'zone2' | 'zone3' | 'zone4';
export type Gate = 'main_gate' | 'gate_7' | 'sbt_gate' | 'exit_gate';
export type CampLocation = 'camp_a_inside' | 'camp_b_outside' | 'not_staying';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'deactivated';
export type MealSlot = 'breakfast' | 'khichadi_am' | 'free_lunch' | 'khichadi_pm' | 'dinner';
export type MealPaymentMethod =
  | 'salary_deduction' | 'dept_sponsored' | 'free_welfare' | 'ashram_covered' | 'rent_included' | 'self_paid';

export interface CurrentUser {
  user_id: string;
  username: string;
  role: SystemRole;
  module_access: string[];
  dept_id: string | null;
  full_name: string;
  mobile: string | null;
  google_linked: boolean;
}

export interface Department {
  dept_id: string;
  dept_name: string;
}

export interface GroupMemberSummary {
  member_id: string;
  member_number: number;
  full_name: string;
  age: number | null;
  gender: Gender | null;
  relation_to_leader: string | null;
}

export interface QrPassSummary {
  qr_id: string;
  valid_until: string | null;
  zone_access: Zone[];
  is_active: boolean;
  group_size?: number;
  group_members?: GroupMemberSummary[];
}

// Gate/meals "person" response shapes are intentionally distinct structs
// (see gate.ts/meals.ts) — the real API returns different fields for each,
// not one shared Person type.
