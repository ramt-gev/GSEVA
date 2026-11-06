import { useCallback, useEffect, useState } from 'react';
import * as gateApi from '../../lib/endpoints/gate';
import type { GateScanPerson, GateScanResult } from '../../lib/endpoints/gate';
import * as registrationApi from '../../lib/endpoints/registration';
import { openCheckout } from '../../lib/razorpay';
import type { Gate } from '../../lib/types';

export interface GateOption {
  id: Gate;
  name: string;
  icon: string;
  sub: string;
}

export const GATE_OPTIONS: GateOption[] = [
  { id: 'main_gate', name: 'Main Gate', icon: '🚧', sub: 'Campus Entry' },
  { id: 'gate_7', name: 'Gate No. 7', icon: '🌳', sub: 'Vrindavan Forest' },
  { id: 'sbt_gate', name: 'SBT Gate', icon: '🏠', sub: 'Guest Area · Zone 3' },
  { id: 'exit_gate', name: 'Exit Gate', icon: '🚪', sub: 'Campus Exit' },
];

const GATE_STORAGE_KEY = 'gev_icms_gate';

export interface GateEventEntry {
  type: 'a' | 'd';
  name: string;
  sub: string;
  time: string;
}

export type UpgradeState =
  | { phase: 'offer'; person: GateScanPerson; groupSize: number; pricePerPerson: number; total: number; cafeAvailable: number | null }
  | { phase: 'processing'; person: GateScanPerson; groupSize: number; total: number }
  | { phase: 'success'; person: GateScanPerson; groupSize: number; total: number };

function nowTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function useGateSession() {
  const [gate, setGateState] = useState<GateOption>(() => {
    const saved = localStorage.getItem(GATE_STORAGE_KEY);
    if (saved) {
      const found = GATE_OPTIONS.find((g) => g.id === saved);
      if (found) return found;
    }
    return GATE_OPTIONS[0];
  });
  const [stats, setStats] = useState({ allowed: 0, denied: 0, lastScanTime: null as string | null });
  const [events, setEvents] = useState<GateEventEntry[]>([]);
  const [lastResult, setLastResult] = useState<GateScanResult | null>(null);
  const [upgrade, setUpgrade] = useState<UpgradeState | null>(null);

  function selectGate(g: GateOption) {
    setGateState(g);
    localStorage.setItem(GATE_STORAGE_KEY, g.id);
  }

  function addEvent(type: 'a' | 'd', name: string, sub: string) {
    setEvents((prev) => [{ type, name, sub, time: nowTime() }, ...prev].slice(0, 30));
  }

  const scan = useCallback(
    async (input: { qr_id?: string; mobile?: string }): Promise<GateScanResult> => {
      const res = await gateApi.scanGate({ ...input, gate: gate.id });
      const t = nowTime();

      // Zone-3-upgrade eligibility is signalled by a DENY result's `action`
      // field at sbt_gate (real backend signal) — not an allow-branch
      // heuristic on the person-type label, which is what the original
      // prototype used and which doesn't match the real API's response shape.
      if (res.result === 'deny' && gate.id === 'sbt_gate' && res.action && res.person) {
        const groupSize = res.person.group_size || 1;
        let cafeAvailable: number | null = null;
        let pricePerPerson = 350;
        try {
          const [cfg, cap] = await Promise.all([
            registrationApi.publicConfig(),
            registrationApi.cafeCapacity('GGA', 'lunch'),
          ]);
          if (cfg.zone3_cafe_price) pricePerPerson = parseInt(cfg.zone3_cafe_price, 10);
          cafeAvailable = cap.available;
        } catch {
          // fall back to defaults above
        }
        setUpgrade({
          phase: 'offer',
          person: res.person,
          groupSize,
          pricePerPerson,
          total: pricePerPerson * groupSize,
          cafeAvailable,
        });
        setLastResult(res);
        return res;
      }

      setLastResult(res);
      if (res.result === 'allow') {
        setStats((s) => ({ ...s, allowed: s.allowed + 1, lastScanTime: t }));
        addEvent('a', res.person?.name || 'Unknown', `${res.person?.type || ''} - ${gate.name}`);
      } else {
        setStats((s) => ({ ...s, denied: s.denied + 1, lastScanTime: t }));
        addEvent('d', res.person?.name || 'Unknown', `${res.deny_reason || 'Denied'} - ${gate.name}`);
      }
      return res;
    },
    [gate]
  );

  async function confirmUpgrade() {
    if (!upgrade || upgrade.phase !== 'offer') return;
    const { person, groupSize, total } = upgrade;
    setUpgrade({ phase: 'processing', person, groupSize, total });
    try {
      const order = await registrationApi.createPayment({
        amount: total,
        purpose: 'zone3_upgrade',
        person_name: person.name,
        mobile: person.mobile,
      });

      await openCheckout({
        order,
        name: 'Govardhan EcoVillage',
        description: `Zone 3 Upgrade — ${groupSize} person${groupSize > 1 ? 's' : ''}`,
        prefill: { name: person.name, contact: person.mobile },
        onSuccess: async (response) => {
          const result = await gateApi.zone3Upgrade({
            qr_id: person.qr_id,
            persons_count: groupSize,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          });
          setUpgrade({ phase: 'success', person, groupSize, total: result.total_amount });
          setStats((s) => ({ ...s, allowed: s.allowed + 1, lastScanTime: nowTime() }));
          addEvent('a', person.name, `Zone 3 upgrade ₹${result.total_amount} - ${gate.name}`);
        },
        onDismiss: () => setUpgrade({ phase: 'offer', person, groupSize, pricePerPerson: total / groupSize, total, cafeAvailable: null }),
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upgrade failed');
      setUpgrade(null);
    }
  }

  function dismissUpgrade() {
    setUpgrade(null);
  }

  function resetForLogout() {
    setStats({ allowed: 0, denied: 0, lastScanTime: null });
    setEvents([]);
    setLastResult(null);
    setUpgrade(null);
  }

  return { gate, selectGate, stats, events, lastResult, scan, upgrade, confirmUpgrade, dismissUpgrade, resetForLogout };
}

export function useClock() {
  const [time, setTime] = useState(nowTime());
  useEffect(() => {
    const id = setInterval(() => setTime(nowTime()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}
