import { api } from '../api';
import type { MealPaymentMethod, PersonType } from '../types';

export const BILLING_MEAL_SLOTS = ['breakfast', 'dinner'] as const;
export const FREE_MEAL_SLOTS = ['khichadi_am', 'free_lunch', 'khichadi_pm'] as const;
export type BillingMealSlot = (typeof BILLING_MEAL_SLOTS)[number];
export type FreeMealSlot = (typeof FREE_MEAL_SLOTS)[number];
export type ScanMealSlot = BillingMealSlot | FreeMealSlot;

// mealsService.buildMealPersonResponse's shape — distinct from the gate
// scan's person shape (has person_id, no stay/pass_type/mobile/zones).
export interface MealScanPerson {
  name: string;
  type: PersonType;
  dept: string;
  person_id: string;
  group_size: number;
}

export type MealScanResult =
  | { result: 'deny'; reason: string; person?: undefined }
  | { result: 'deny'; person: MealScanPerson; reason: string }
  | { result: 'already_served'; person: MealScanPerson; message: string }
  | { result: 'served'; person: MealScanPerson; meal: string };

// POST /api/meals/scan always returns HTTP 200 — branch on `result`.
export function scanMeal(input: { qr_id: string; meal_type: ScanMealSlot }) {
  return api<MealScanResult>('/api/meals/scan', { method: 'POST', body: input });
}

export function tapMeal(input: { meal_type: FreeMealSlot; count?: number }) {
  return api<{ success: true; meal_type: string; tap_count: number; total_today: number }>('/api/meals/tap', {
    method: 'POST',
    body: input,
  });
}

export interface MealsTodayStats {
  slot_counts: { meal_type: ScanMealSlot; scanned: number; bd_scanned: number; free_scanned: number }[];
  tap_counts: { meal_slot: FreeMealSlot; tapped: number }[];
  registered_bd: { person_type: PersonType; count: number }[];
  // Day visitors who ticked "Annakshetra Free Lunch" on Smart Registration today —
  // a planning number, distinct from slot_counts' free_lunch (actually served).
  lunch_indicated_today: number;
  date: string;
}

export async function mealsToday(): Promise<MealsTodayStats> {
  const res = await api<{ data: MealsTodayStats }>('/api/meals/today');
  return res.data;
}

export interface RegisteredDiner {
  full_name: string;
  person_type: PersonType;
  mobile: string;
  dept_name: string | null;
  payment_method: MealPaymentMethod;
  served_today: boolean;
}

export async function registeredList(meal_type: BillingMealSlot): Promise<RegisteredDiner[]> {
  const res = await api<{ data: RegisteredDiner[]; count: number }>(`/api/meals/registered?meal_type=${meal_type}`);
  return res.data;
}

export interface BillingRow {
  dept_name: string | null;
  dept_code: string | null;
  hod_name: string | null;
  contractor_id: string | null;
  contractor_company: string | null;
  payment_method: MealPaymentMethod;
  registered_persons: number;
  bd_registered: number;
  monthly_amount_to_recover: number;
  report_month: string;
}

export async function contractorBilling(): Promise<BillingRow[]> {
  const res = await api<{ data: BillingRow[] }>('/api/meals/billing');
  return res.data;
}
