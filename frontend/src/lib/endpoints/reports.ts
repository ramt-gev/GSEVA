import { api, apiUrl, getToken, qs } from '../api';
import type { Gate, PersonType } from '../types';

export interface HourlyStat {
  hour: number;
  entries: number;
  denials: number;
}

export async function hourlyGateStats(): Promise<HourlyStat[]> {
  const res = await api<{ data: HourlyStat[] }>('/api/reports/hourly');
  return res.data;
}

// Note: occupancy/gate/meals are NOT wrapped in {data} — flat response,
// unlike /hourly and most other endpoints. Confirmed against
// reportsController.js; don't assume one generic unwrap works everywhere.
export interface OccupancyReport {
  date: string;
  total: number;
  by_type: { person_type: PersonType; count: number }[];
  gate: { entries: number; denials: number };
}

export function occupancyReport(date?: string): Promise<OccupancyReport> {
  return api<OccupancyReport>(`/api/reports/occupancy${qs({ date })}`);
}

export interface GateActivityReport {
  date: string;
  totals: { entries: number; denials: number; overrides: number };
  events: {
    event_id: string; gate: Gate; result: 'allowed' | 'denied' | 'manual_override';
    deny_reason: string | null; scanned_at: string; is_batch_count: boolean; batch_count: number | null;
    full_name: string | null; person_type: PersonType | null; scanned_by_name: string | null;
  }[];
}

export function gateActivity(params: { date?: string; gate?: Gate; limit?: number; offset?: number } = {}) {
  return api<GateActivityReport>(`/api/reports/gate${qs(params)}`);
}

export interface MealConsumptionReport {
  date: string;
  registered_served: { meal_type: string; count: number }[];
  free_tap_counts: { meal_type: string; total: number }[];
}

export function mealConsumption(date?: string): Promise<MealConsumptionReport> {
  return api<MealConsumptionReport>(`/api/reports/meals${qs({ date })}`);
}

export interface PoliceReportRecord {
  person_id: string;
  full_name: string;
  person_type: PersonType;
  mobile: string;
  gender: string;
  date_of_birth: string | null;
  id_proof_type: string | null;
  id_proof_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  dept_name: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  stay_type: string | null;
  contractor_name: string | null;
}

export function policeReportJson(year?: number, month?: number) {
  return api<{ month: string; total: number; records: PoliceReportRecord[] }>(
    `/api/reports/police${qs({ year, month })}`
  );
}

// window.open()/<a href> can't set an Authorization header — the route
// accepts ?token= as a fallback, copied server-side into the header before
// requireAuth runs (see routes/reports.js).
export function policeReportPdfUrl(year?: number, month?: number): string {
  const token = getToken();
  return apiUrl(`/api/reports/police${qs({ format: 'pdf', year, month, token })}`);
}

export interface CafeRevenueSummary {
  month: string;
  total_revenue: number;
  breakdown: { cafe_code: string | null; meal_type: string | null; payment_count: number; total_persons: number; total_revenue: number }[];
}

export async function cafeRevenueSummary(params: { month?: number; year?: number } = {}): Promise<CafeRevenueSummary> {
  const res = await api<{ data: CafeRevenueSummary }>(`/api/reports/cafe-revenue${qs(params)}`);
  return res.data;
}

export type VisitorCategory =
  | 'Room Guests' | 'Day Visitors' | 'Staff & Family' | 'Volunteers/Students' | 'Labourers' | 'Ashram' | 'Others';

export interface RegistrationsReport {
  from: string;
  to: string;
  trend: { date: string; category: VisitorCategory; count: number }[];
  totals: { category: VisitorCategory; count: number }[];
  rows: {
    person_id: string;
    full_name: string;
    mobile: string;
    person_type: PersonType;
    category: VisitorCategory;
    status: string;
    dept_name: string | null;
    created_at: string;
  }[];
  total: number;
  page: number;
  limit: number;
}

export function registrationsReport(params: {
  from?: string; to?: string; category?: string; search?: string; page?: number; limit?: number;
} = {}): Promise<RegistrationsReport> {
  return api<RegistrationsReport>(`/api/reports/registrations${qs(params)}`);
}
