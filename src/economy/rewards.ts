import type { GameState } from '../engine/types';
import type { LevelRewards } from '../state/profile';

/**
 * Base per-level-win rewards. Tunable — this is where you tighten the
 * economy pacing later. Values chosen so that:
 * - A tutorial (score ~1500) grants ~50 coins + 3 embers + 6 xp
 * - A hard-level clutch win (score ~8000) grants ~140 coins + 8 embers + 15 xp
 * - Companion at level 1 needs ~2 wins to reach level 2 (see xpCurve).
 */
export const REWARD_TUNING = {
  coinBase: 40,
  coinPerScore: 0.012,
  emberBase: 2,
  emberPerCascade: 0.6,
  xpBase: 5,
  xpPerScore: 0.001,
} as const;

/** Compute the raw (pre-fixture-bonus) rewards for a winning game state.
 *  Loss returns zeros. */
export function rewardsFor(finalState: GameState): LevelRewards {
  if (finalState.status !== 'won') {
    return { coins: 0, embers: 0, xp: 0 };
  }
  const t = REWARD_TUNING;
  const coins = Math.round(t.coinBase + t.coinPerScore * finalState.score);
  const embers = Math.max(
    1,
    Math.round(t.emberBase + t.emberPerCascade * finalState.turn),
  );
  const xp = Math.round(t.xpBase + t.xpPerScore * finalState.score);
  return { coins, embers, xp };
}
