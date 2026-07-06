import type { BoosterId } from './types';

/**
 * Consecutive-win streak with 3 / 5 / 7 tiers. The tier grants free
 * pre-level boosters and is prominently surfaced on the continue-screen
 * ("Keep your 5-win streak alive?"). Losing ends the streak; buying the
 * +5-moves continue preserves it.
 */

export interface StreakState {
  count: number;
  best: number;
  lastWinLevelId: string | null;
}

export const initStreak = (): StreakState => ({
  count: 0,
  best: 0,
  lastWinLevelId: null,
});

/** Per-tier pre-level booster grants — applied at the start of the next
 *  level once the streak has reached the tier threshold. Small numbers,
 *  intentional: streaks nudge play, they don't trivialize it. */
export const STREAK_TIERS = [
  { at: 3, name: 'Warming', boosters: { preLevelExtraMoves: 1 } },
  { at: 5, name: 'Glowing', boosters: { preLevelHammer: 1, preLevelExtraMoves: 1 } },
  { at: 7, name: 'Radiant', boosters: { preLevelHammer: 1, preLevelShuffle: 1, preLevelExtraMoves: 2 } },
] as const;

export type StreakTier = (typeof STREAK_TIERS)[number];

/** Current tier for a streak count — the highest whose threshold is met. */
export function tierFor(count: number): StreakTier | null {
  let hit: StreakTier | null = null;
  for (const t of STREAK_TIERS) {
    if (count >= t.at) hit = t;
  }
  return hit;
}

/** Register a level win — increments the streak, bumps best. */
export function onWin(state: StreakState, levelId: string): StreakState {
  const next = state.count + 1;
  return {
    count: next,
    best: Math.max(state.best, next),
    lastWinLevelId: levelId,
  };
}

/** Register a level loss when the player gives up (didn't buy continue). */
export function onLossFinal(state: StreakState): StreakState {
  return { count: 0, best: state.best, lastWinLevelId: state.lastWinLevelId };
}

/** Register a paid continue — keeps the streak. Reason encoded for tests. */
export function onContinueUsed(state: StreakState): StreakState {
  return state;
}

/** Free pre-level booster grants for the current streak. Empty if below
 *  the first tier. */
export function preLevelBoosters(
  state: StreakState,
): Partial<Record<BoosterId, number>> {
  const t = tierFor(state.count);
  if (!t) return {};
  return { ...t.boosters };
}
