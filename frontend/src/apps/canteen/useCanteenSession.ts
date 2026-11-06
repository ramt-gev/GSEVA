import { useCallback, useState } from 'react';
import * as mealsApi from '../../lib/endpoints/meals';
import type { ScanMealSlot } from '../../lib/endpoints/meals';

export interface CurrentMeal {
  id: ScanMealSlot;
  name: string;
  time: string;
  mode: 'scan_only' | 'scan_tap';
  type: 'billing' | 'free';
}

const DEFAULT_MEAL: CurrentMeal = { id: 'free_lunch', name: 'Free Lunch Prasad', time: '12:45–2:30 PM', mode: 'scan_tap', type: 'free' };

export function isKhichadi(id: string): boolean {
  return id === 'khichadi_am' || id === 'khichadi_pm';
}

export type ResultKind = 'served' | 'already' | 'denied' | 'free';

export interface ResultData {
  kind: ResultKind;
  status: string;
  name: string;
  type: string;
  detail: string;
  groupSize?: number;
}

export function useCanteenSession() {
  const [currentMeal, setCurrentMeal] = useState<CurrentMeal>(DEFAULT_MEAL);
  const [tapCount, setTapCount] = useState(0);
  const [scanCount, setScanCount] = useState(0);
  const [result, setResult] = useState<ResultData | null>(null);

  const loadTodayStats = useCallback(async (mealId: ScanMealSlot) => {
    try {
      const stats = await mealsApi.mealsToday();
      const cur = stats.slot_counts.find((s) => s.meal_type === mealId);
      const curTap = stats.tap_counts.find((t) => t.meal_slot === mealId);
      setScanCount(cur?.scanned || 0);
      setTapCount(curTap?.tapped || 0);
    } catch {
      // silent — stale counts shown
    }
  }, []);

  function selectMeal(meal: CurrentMeal) {
    setCurrentMeal(meal);
  }

  async function startMealService() {
    await loadTodayStats(currentMeal.id);
  }

  async function performMealScan(qrId: string) {
    if (!qrId.trim()) return;
    try {
      const res = await mealsApi.scanMeal({ qr_id: qrId.trim(), meal_type: currentMeal.id });
      const isFreeMeal = currentMeal.mode !== 'scan_only';

      if (res.result === 'served') {
        setScanCount((c) => c + (res.person.group_size || 1));
        if (isFreeMeal) {
          setResult({
            kind: 'free',
            status: `${currentMeal.name.toUpperCase()} ✓`,
            name: res.person.name,
            type: res.person.type,
            detail: `${res.meal} · Recorded`,
            groupSize: res.person.group_size,
          });
        } else {
          setResult({
            kind: 'served',
            status: 'SERVED',
            name: res.person.name,
            type: `${res.person.type} · ${res.person.dept}`,
            detail: `${res.meal} · Token recorded`,
            groupSize: res.person.group_size,
          });
        }
        loadTodayStats(currentMeal.id);
      } else if (res.result === 'already_served') {
        setResult({ kind: 'already', status: 'ALREADY SERVED', name: res.person.name, type: res.person.type, detail: res.message });
      } else {
        setResult({
          kind: 'denied',
          status: 'NOT REGISTERED',
          name: res.person?.name || 'Unknown Visitor',
          type: res.person?.type || 'Day Visitor',
          detail: res.reason,
        });
      }
    } catch (err) {
      console.error('Scan error:', err);
    }
  }

  async function changeTap(delta: number) {
    if (delta > 0) {
      try {
        // Only called for non-billing meals (tap-section/khichadi panel are
        // hidden for scan_only meals) — safe to narrow at the call site.
        const res = await mealsApi.tapMeal({ meal_type: currentMeal.id as mealsApi.FreeMealSlot, count: 1 });
        setTapCount(res.total_today);
        return;
      } catch {
        // fall through to optimistic local update
      }
    }
    setTapCount((c) => Math.max(0, c + delta));
  }

  function changeKpCount(delta: number) {
    setTapCount((c) => Math.max(0, c + delta));
  }

  function dismissResult() {
    setResult(null);
  }

  return {
    currentMeal, selectMeal, startMealService,
    tapCount, scanCount, changeTap, changeKpCount,
    result, performMealScan, dismissResult,
    loadTodayStats,
  };
}
