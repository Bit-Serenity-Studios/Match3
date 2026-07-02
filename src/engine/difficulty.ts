import type { GameState, Objective, TileColor } from './types';

/** Compute which color to favor for drop-weight nudging, given the objectives.
 *  Returns null if the level has no color-collection objective. */
export function favorableColorFor(
  objectives: readonly Objective[],
): TileColor | null {
  const collect = objectives.find((o) => o.kind === 'collectColor');
  if (collect && collect.kind === 'collectColor') return collect.color;
  const drop = objectives.find((o) => o.kind === 'dropIngredients');
  if (drop && drop.kind === 'dropIngredients') return drop.tile;
  return null;
}

/** Clamp difficulty modifier to [-1, 1]. */
export function clampMod(m: number): number {
  if (Number.isNaN(m)) return 0;
  return Math.max(-1, Math.min(1, m));
}

export function withDifficulty(state: GameState, mod: number): GameState {
  return { ...state, difficultyMod: clampMod(mod) };
}
