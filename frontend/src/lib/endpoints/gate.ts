import { api, apiUrl } from '../api';
import type { Gate, PassType, PersonType, Zone } from '../types';

// gateService.buildPersonResponse's exact shape — distinct from the
// meals-scan person shape (no person_id here, has stay/pass_type/mobile/
// zones/group_size instead).
export interface GateScanPerson {
  qr_id: string;
  name: string;
  type: PersonType;
  dept: string;
  stay: string; // localized date string, or "Permanent"
  pass_type: PassType;
  mobile: string;
  zones: Zone[];
  group_size: number;
}

export interface GateScanResult {
  result: 'allow' | 'deny';
  person: GateScanPerson | null;
  deny_reason: string | null;
  action: string | null;
}

// POST /api/gate/scan always returns HTTP 200 — branch on `result`, never on
// status code. Accepts either qr_id (camera scan) or mobile (manual search
// fallback, Phase 0 addition) — send exactly one.
export function scanGate(input: { qr_id?: string; mobile?: string; gate: Gate }) {
  return api<GateScanResult>('/api/gate/scan', { method: 'POST', body: input });
}

export interface GateStatRow {
  gate: Gate;
  allowed: number;
  denied: number;
  last_scan: string | null;
}

export async function gateStats(): Promise<GateStatRow[]> {
  const res = await api<{ data: GateStatRow[] }>('/api/gate/stats');
  return res.data;
}

export function batchEntry(input: { gate: Gate; count: number; note?: string }) {
  return api<{ success: true; message: string }>('/api/gate/batch', { method: 'POST', body: input });
}

// Restricted to super_admin/module_admin server-side — the Gate app hides
// this action entirely for operator-role logins rather than calling it and
// handling a 403.
export function gateOverride(input: { gate: Gate; person_id?: string; reason: string }) {
  return api<{ success: true; message: string }>('/api/gate/override', { method: 'POST', body: input });
}

export interface Zone3UpgradeResult {
  success: true;
  qr_id: string;
  zones: Zone[];
  total_amount: number;
  persons_count: number;
}

// Grants Zone 3 on an already-issued pass after an at-gate café upgrade
// payment (Phase 0 addition — nothing else in the system extends an
// existing pass's zone_access post-issuance).
export function zone3Upgrade(input: {
  qr_id: string; persons_count: number; razorpay_payment_id?: string; razorpay_order_id?: string;
}) {
  return api<Zone3UpgradeResult>('/api/gate/zone3-upgrade', { method: 'POST', body: input });
}

export function qrImageUrl(qr_id: string): string {
  return apiUrl(`/api/gate/image/${qr_id}`);
}

export function passPdfUrl(qr_id: string): string {
  return apiUrl(`/api/gate/pass/${qr_id}`);
}
