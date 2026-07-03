import type { AdPlacement } from './types';
import { AD_DAILY_CAPS } from './types';

/**
 * Per-day per-placement ad allowance tracker. The profile persists a small
 * dictionary: dayKey (e.g. "2026-07-03") → placement → count. Any calendar
 * flip resets counters. All predicates are pure.
 */
export type AdCountersByDay = Record<string, Partial<Record<AdPlacement, number>>>;

export function dayKey(now: number): string {
  const d = new Date(now);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayCount(
  counters: AdCountersByDay,
  placement: AdPlacement,
  now: number,
): number {
  return counters[dayKey(now)]?.[placement] ?? 0;
}

/** True if the placement can still show today. Rewarded ads honor their
 *  per-placement cap; interstitials honor theirs. Purchasers are handled
 *  separately at the caller — this helper is purely count-based. */
export function canShow(
  counters: AdCountersByDay,
  placement: AdPlacement,
  now: number,
): boolean {
  const cap = AD_DAILY_CAPS[placement];
  return todayCount(counters, placement, now) < cap;
}

export function bumpCount(
  counters: AdCountersByDay,
  placement: AdPlacement,
  now: number,
): AdCountersByDay {
  const key = dayKey(now);
  const day = counters[key] ?? {};
  const c = day[placement] ?? 0;
  return {
    ...counters,
    [key]: { ...day, [placement]: c + 1 },
  };
}

/** Prune counters older than 3 days to bound persisted state size. */
export function prune(
  counters: AdCountersByDay,
  now: number,
): AdCountersByDay {
  const cutoff = dayKey(now - 3 * 24 * 3600 * 1000);
  const out: AdCountersByDay = {};
  for (const k of Object.keys(counters)) {
    if (k >= cutoff) out[k] = counters[k]!;
  }
  return out;
}

/** Mystery Box payout table — used by the daily rewarded spin. Values ~20-30% of the equivalent gems/coins IAP for the tier. */
export interface MysteryReward {
  weight: number;
  coins: number;
  gems: number;
  embers: number;
  label: string;
}

export const MYSTERY_TABLE: readonly MysteryReward[] = [
  { weight: 55, coins: 100, gems: 0, embers: 5, label: 'A few coins' },
  { weight: 30, coins: 300, gems: 0, embers: 15, label: 'A handful of coins' },
  { weight: 12, coins: 800, gems: 5, embers: 30, label: 'A gem in the pouch' },
  { weight: 3, coins: 2000, gems: 25, embers: 60, label: 'The Rare Draught' },
];

import { pickWeighted, seedFrom } from '../engine/rng';

export function rollMystery(seed: number): MysteryReward {
  const items = MYSTERY_TABLE.slice();
  const weights = items.map((m) => m.weight);
  const pick = pickWeighted(seedFrom(seed), items, weights);
  return pick.value;
}
