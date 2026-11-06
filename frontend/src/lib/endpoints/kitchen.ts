import { api } from '../api';

export type KitchenUnit = 'KG' | 'G' | 'PIECE' | 'GARLAND' | 'LITRE' | 'PACKET';
export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER';

export interface KitchenDepartment {
  dept_id: string;
  dept_name: string;
  dept_code: string;
}
export interface KitchenCatalogItem {
  catalog_item_id: string;
  item_name: string;
  default_unit: KitchenUnit;
}

export function departments() {
  return api<{ data: KitchenDepartment[] }>('/api/kitchen/departments').then((r) => r.data);
}
export function catalogItems() {
  return api<{ data: KitchenCatalogItem[] }>('/api/kitchen/catalog-items').then((r) => r.data);
}

// ---------- Overview ----------

export interface KitchenOverview {
  today: { date: string; total: number };
  yesterday: { date: string; total: number };
  weather: { date: string; condition_text: string; temp_c: number; rain_mm: number } | null;
  event: { date: string; name: string; expected_attendance: number | null } | null;
}
export function overview() {
  return api<{ data: KitchenOverview }>('/api/kitchen/overview').then((r) => r.data);
}
export function historical(date: string) {
  return api<{ data: { date: string; total: number; event: string | null } }>(`/api/kitchen/historical?date=${date}`).then((r) => r.data);
}

// ---------- Meeting ----------

export interface KitchenMeeting {
  for_date: string;
  convened_at: string | null;
  prasadam_taker_estimate: number | null;
  quantity_notes: string | null;
  machinery_status_note: string | null;
  status: 'IN_PROGRESS' | 'FINALIZED' | null;
  created_by_name: string | null;
  finalized_by_name: string | null;
  finalized_at: string | null;
}
export function getMeeting() {
  return api<{ data: KitchenMeeting }>('/api/kitchen/meeting').then((r) => r.data);
}
export function saveMeeting(body: { prasadam_taker_estimate?: number; quantity_notes?: string; machinery_status_note?: string }) {
  return api<{ data: KitchenMeeting }>('/api/kitchen/meeting', { method: 'POST', body }).then((r) => r.data);
}
export function finalizeMeeting() {
  return api<{ data: KitchenMeeting }>('/api/kitchen/meeting/finalize', { method: 'POST', body: {} }).then((r) => r.data);
}
export interface MeetingSummary { pending_special_requests: number; bld_rows_logged: number; locked_total_people: number }
export function meetingSummary() {
  return api<{ data: MeetingSummary }>('/api/kitchen/meeting/summary').then((r) => r.data);
}

// ---------- Menu ----------

export interface MenuCycle {
  cycle_id: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;
}
export function menuCycle() {
  return api<{ data: MenuCycle }>('/api/kitchen/menu/cycle').then((r) => r.data);
}

export interface MenuRow {
  for_date: string;
  department: string;
  meal_type: MealType;
  item: string;
  created_by: string;
}
export function menuList(params: { dept_id?: string; meal_type?: MealType } = {}) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString();
  return api<{ data: MenuRow[] }>(`/api/kitchen/menu${qs ? `?${qs}` : ''}`).then((r) => r.data);
}

export interface MenuSection { meal_type: MealType; for_date: string; rows: { department: string; item: string }[] }
export function menuSections() {
  return api<{ data: MenuSection[] }>('/api/kitchen/menu/sections').then((r) => r.data);
}
export function addMenu(body: { for_date: string; dept_id: string; meal_type: MealType; catalog_item_id: string }) {
  return api('/api/kitchen/menu', { method: 'POST', body });
}
export function lockMenu() {
  return api<{ data: MenuCycle }>('/api/kitchen/menu/lock', { method: 'POST', body: {} }).then((r) => r.data);
}

// ---------- BLD ----------

export interface BldRow { department: string; item: string; people_count: number; total_item_amount: number; unit: KitchenUnit; source: string }
export interface BldSection { meal_type: MealType; for_date: string; locked: boolean; rows: BldRow[] }
export function bldSections() {
  return api<{ data: BldSection[] }>('/api/kitchen/bld/sections').then((r) => r.data);
}

export interface DeptSummaryRow { department: string; dinner: number; lunch: number; breakfast: number; total: number }
export interface DeptSummary { dinner_date: string; lunch_date: string; breakfast_date: string; rows: DeptSummaryRow[] }
export function deptSummary() {
  return api<{ data: DeptSummary }>('/api/kitchen/bld/dept-summary').then((r) => r.data);
}
export function addBld(body: {
  for_date: string; dept_id: string; meal_type: MealType; catalog_item_id: string;
  people_count: number; total_item_amount: number; unit: KitchenUnit; source: string;
}) {
  return api('/api/kitchen/bld', { method: 'POST', body });
}

// ---------- Storage / Wastage ----------

export interface TransactionRow {
  entry_date: string; item: string; quantity: number; unit: KitchenUnit;
  status: 'HELD' | 'PARTIALLY_RESOLVED' | 'CLOSED' | null; remarks: string | null; reason: string | null; recorded_by: string;
}
export function storageList() {
  return api<{ data: TransactionRow[] }>('/api/kitchen/storage').then((r) => r.data);
}
export function addStorage(body: { catalog_item_id: string; quantity: number; unit: KitchenUnit; status: string; remarks?: string }) {
  return api('/api/kitchen/storage', { method: 'POST', body });
}
export function wastageList() {
  return api<{ data: TransactionRow[] }>('/api/kitchen/wastage').then((r) => r.data);
}
export function addWastage(body: { catalog_item_id: string; quantity: number; unit: KitchenUnit; reason?: string }) {
  return api('/api/kitchen/wastage', { method: 'POST', body });
}

// ---------- Special Requests ----------

export interface SpecialRequestRow {
  request_id: string; for_date: string; department: string; item: string; amount: number; unit: KitchenUnit;
  requested_by: string; status: 'REQUESTED' | 'APPROVED' | 'REJECTED'; approved_by: string | null; approved_at: string | null;
}
export function specialList() {
  return api<{ data: SpecialRequestRow[] }>('/api/kitchen/special-requests').then((r) => r.data);
}
export function specialDecide(request_id: string, decision: 'APPROVED' | 'REJECTED') {
  return api(`/api/kitchen/special-requests/${request_id}/decide`, { method: 'POST', body: { decision } });
}

// ---------- Preaching Programs ----------

export interface PreachingRow { for_date: string; preacher_name: string; people_count: number; item: string }
export function preachList() {
  return api<{ data: PreachingRow[] }>('/api/kitchen/preaching').then((r) => r.data);
}
export function addPreaching(body: { for_date: string; preacher_name: string; people_count: number; catalog_item_id: string }) {
  return api('/api/kitchen/preaching', { method: 'POST', body });
}

// ---------- Khichdi ----------

export interface KhichdiRow { for_date: string; morning_amount: number; evening_amount: number; unit: KitchenUnit }
export function khichdiList() {
  return api<{ data: KhichdiRow[] }>('/api/kitchen/khichdi').then((r) => r.data);
}
export function saveKhichdi(body: { for_date: string; morning_amount: number; evening_amount: number; unit: KitchenUnit }) {
  return api('/api/kitchen/khichdi', { method: 'POST', body });
}

// ---------- CPD Procurement ----------

export interface ProcurementRow {
  request_date: string; item: string; quantity: number; unit: KitchenUnit;
  is_supplementary: boolean; is_adhoc: boolean; status: string;
}
export function procurementList() {
  return api<{ data: ProcurementRow[] }>('/api/kitchen/procurement').then((r) => r.data);
}
export function addProcurement(body: { catalog_item_id: string; quantity: number; unit: KitchenUnit; is_supplementary: boolean; is_adhoc: boolean }) {
  return api('/api/kitchen/procurement', { method: 'POST', body });
}

export interface CpdCandidate { catalog_item_id: string; item: string; unit: KitchenUnit; context: string; suggested_qty: number }
export interface CpdCandidates { menu_candidates: CpdCandidate[]; storage_candidates: CpdCandidate[] }
export function cpdCandidates() {
  return api<{ data: CpdCandidates }>('/api/kitchen/procurement/cpd-candidates').then((r) => r.data);
}
export function cpdSendBatch(selections: { catalog_item_id: string; quantity: number; unit: KitchenUnit; source: 'menu' | 'storage' }[]) {
  return api<{ data: { created: number } }>('/api/kitchen/procurement/cpd-send', { method: 'POST', body: { selections } }).then((r) => r.data);
}

// ---------- Distribution board (Collection/Distribution role) ----------

export interface DistributionItem {
  bld_id: string; department: string; item: string; people_count: number; total_item_amount: number; unit: KitchenUnit;
  status: 'PENDING' | 'COLLECTED' | 'DELIVERED'; collected_at: string | null; delivered_at: string | null;
}
export interface DistributionBoard {
  finalized: boolean;
  finalized_by: string | null;
  finalized_at: string | null;
  dept_summary: DeptSummary;
  sections: { meal_type: MealType; for_date: string; rows: DistributionItem[] }[];
  khichdi: { morning_amount: number; evening_amount: number; unit: KitchenUnit } | null;
  preaching: { preacher_name: string; people_count: number; item: string }[];
}
export function distributionBoard() {
  return api<{ data: DistributionBoard }>('/api/kitchen/distribution/board').then((r) => r.data);
}

export interface CollectionStatusRow { bld_id: string; item_label: string; department: string; status: 'PENDING' | 'COLLECTED' | 'DELIVERED' }
export function collectionStatus() {
  return api<{ data: CollectionStatusRow[] }>('/api/kitchen/distribution/collection-status').then((r) => r.data);
}
export function markDistributionStage(bldId: string, stage: 'COLLECTED' | 'DELIVERED') {
  return api(`/api/kitchen/distribution/${bldId}/stage`, { method: 'POST', body: { stage } });
}

// ---------- Final Distribution Count ----------

export interface FinalCountRow { bld_id: string; item_label: string; expected: string; actual: number | null; submitted: boolean }
export function finalCounts() {
  return api<{ data: FinalCountRow[] }>('/api/kitchen/final-counts').then((r) => r.data);
}
export function submitFinalCount(bldId: string, actual_amount: number) {
  return api(`/api/kitchen/final-counts/${bldId}`, { method: 'POST', body: { actual_amount } });
}
