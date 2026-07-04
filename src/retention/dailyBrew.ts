import { LEVELS } from '../levels/catalog';
import type { LevelDef } from '../engine/types';
import { startOfUTCDay } from './calendar';
import type { Grants } from '../monetization/types';

/**
 * Daily Brew challenge — every player faces the same seeded level once
 * per UTC day. A bonus reward gates on clear. Level pool is a subset of
 * shipped levels; seed is derived from the UTC day so it's shared across
 * all players without a backend.
 */

/** Daily Brew rewards on first-clear-of-the-day. */
export const DAILY_BREW_REWARDS: Grants = {
  coins: 200,
  gems: 10,
  embers: 15,
};

/** Pool of levels that are eligible for the Daily Brew. Skip the
 *  tutorial (levels 1-5) — they're not compelling as a daily. */
export const DAILY_BREW_POOL = LEVELS.filter(
  (l) => l.archetype !== 'tutorial',
);

export interface DailyBrewState {
  /** UTC day (ms since epoch) of the last claimed brew. 0 = never. */
  lastClaimedDay: number;
  /** UTC day of the last brew the player just STARTED (win/loss both count). */
  lastPlayedDay: number;
  /** Wins in a row on the daily. Cosmetic — surfaces as a headline. */
  streak: number;
}

export const initDailyBrew = (): DailyBrewState => ({
  lastClaimedDay: 0,
  lastPlayedDay: 0,
  streak: 0,
});

/** Deterministic level pick for a UTC day.  */
export function levelForDay(dayMs: number): LevelDef {
  const idx = Math.abs(hashDay(dayMs)) % DAILY_BREW_POOL.length;
  const level = DAILY_BREW_POOL[idx];
  if (!level) return LEVELS[0]!;
  // Fresh seed so today's daily doesn't play identically to the same
  // level in campaign mode.
  return { ...level, seed: hashDay(dayMs) ^ level.seed };
}

/** Simple 32-bit hash from day-epoch. Stable across processes. */
export function hashDay(dayMs: number): number {
  let h = dayMs & 0xffffffff;
  h = (h ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return h | 0;
}

export function canClaimBrew(state: DailyBrewState, now: number): boolean {
  const today = startOfUTCDay(now);
  return state.lastClaimedDay !== today;
}

export function claimBrew(
  state: DailyBrewState,
  now: number,
  won: boolean,
): { grants: Grants; next: DailyBrewState } | null {
  if (!canClaimBrew(state, now)) return null;
  const today = startOfUTCDay(now);
  const kept = won;
  const next: DailyBrewState = {
    lastClaimedDay: today,
    lastPlayedDay: today,
    streak: kept ? state.streak + 1 : 0,
  };
  if (!won) return { grants: {}, next };
  return { grants: DAILY_BREW_REWARDS, next };
}

/** Called when the player STARTS the daily brew (regardless of outcome). */
export function notePlayed(
  state: DailyBrewState,
  now: number,
): DailyBrewState {
  const today = startOfUTCDay(now);
  return { ...state, lastPlayedDay: today };
}
