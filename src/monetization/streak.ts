/**
 * Streak system: consecutive wins escalate the player through 3/5/7 tiers,
 * each granting a free pre-level booster. Losing ends the streak *unless*
 * the player pays to continue (see continueScreen flow).
 *
 * Boosters modify the starting GameState — currently: extra moves and a
 * spawn of a special tile at newGame time. Real Phase 5 additions might
 * include area clears, color specials, etc.
 */
import type { GameState, SpecialKind } from '../engine/types';
import { getTile, isPlayable, setTile } from '../engine/board';
import { nextInt, seedFrom } from '../engine/rng';

export interface StreakTier {
  threshold: number; // streak wins to activate this tier
  extraMoves: number;
  freeSpecial?: SpecialKind;
  label: string;
}

/** Tiers indexed 0..2 → 3/5/7 wins. */
export const STREAK_TIERS: readonly StreakTier[] = [
  { threshold: 3, extraMoves: 2, label: 'Kindled' },
  { threshold: 5, extraMoves: 3, freeSpecial: 'lineH', label: 'Simmering' },
  { threshold: 7, extraMoves: 4, freeSpecial: 'bomb', label: 'Roaring' },
];

/** Return the highest tier the player has met, or null. */
export function currentTier(streak: number): StreakTier | null {
  let out: StreakTier | null = null;
  for (const t of STREAK_TIERS) {
    if (streak >= t.threshold) out = t;
  }
  return out;
}

/** How many more wins to reach the next tier. */
export function winsToNext(streak: number): number | null {
  for (const t of STREAK_TIERS) {
    if (streak < t.threshold) return t.threshold - streak;
  }
  return null; // already at top
}

/** Apply the streak-tier bonuses to a freshly-created GameState. Pure. */
export function applyStreakBoosters(
  state: GameState,
  streak: number,
  seed: number,
): GameState {
  const tier = currentTier(streak);
  if (!tier) return state;
  let board = state.board;
  if (tier.freeSpecial) {
    board = spawnSpecial(board, tier.freeSpecial, seed);
  }
  return {
    ...state,
    movesRemaining: state.movesRemaining + tier.extraMoves,
    board,
  };
}

function spawnSpecial(
  board: GameState['board'],
  kind: SpecialKind,
  seed: number,
): GameState['board'] {
  const candidates: { row: number; col: number }[] = [];
  for (let r = 0; r < board.height; r++) {
    for (let c = 0; c < board.width; c++) {
      const p = { row: r, col: c };
      if (!isPlayable(board, p)) continue;
      const t = getTile(board, p);
      if (!t?.color) continue;
      if (t.blocker) continue;
      if (t.special) continue;
      candidates.push(p);
    }
  }
  if (candidates.length === 0) return board;
  const pick = nextInt(seedFrom(seed), candidates.length);
  const target = candidates[pick.value]!;
  const existing = getTile(board, target)!;
  return setTile(board, target, { color: existing.color, special: kind });
}
