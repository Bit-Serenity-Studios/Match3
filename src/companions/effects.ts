import type { BoardEvent, BoardSnapshot, GameState, TileColor } from '../engine/types';
import type { CompanionDef, OwnedCompanion, ActiveAbility } from './types';
import { currentPassive } from './progression';
import { getTile, isPlayable, setTile } from '../engine/board';
import { reshuffle } from '../engine/shuffle';
import { nextInt, seedFrom } from '../engine/rng';
import { TILE_COLORS } from '../config/tiles';

/**
 * Multiplicative drop-weight modifiers from the equipped companion's passive.
 * Returns 1.0 for every color if no companion is equipped or the effect
 * doesn't apply. Applied on top of level.dropWeights when calling newGame.
 */
export function passiveDropMultipliers(
  owned: OwnedCompanion | null,
  def: CompanionDef | null,
): Record<TileColor, number> {
  const out: Record<TileColor, number> = {
    moonpetal: 1,
    vial: 1,
    runestone: 1,
    resin: 1,
    mushroom: 1,
  };
  if (!owned || !def) return out;
  const passive = currentPassive(owned, def);
  if (!passive) return out;
  if (passive.kind === 'chargedDropBoost') {
    out[passive.color] = 1 + passive.boost;
  } else if (passive.kind === 'globalDropBoost') {
    for (const c of TILE_COLORS) out[c] = 1 + passive.boost;
  }
  return out;
}

/** Apply per-color multipliers to a base drop-weight table. */
export function applyDropMultipliers(
  base: Record<TileColor, number>,
  mult: Record<TileColor, number>,
): Record<TileColor, number> {
  return {
    moonpetal: base.moonpetal * mult.moonpetal,
    vial: base.vial * mult.vial,
    runestone: base.runestone * mult.runestone,
    resin: base.resin * mult.resin,
    mushroom: base.mushroom * mult.mushroom,
  };
}

/** How many affinity-color tiles were matched in these events. */
export function chargeFromEvents(
  events: readonly BoardEvent[],
  color: TileColor,
): number {
  let n = 0;
  for (const e of events) {
    if (e.t === 'match' && e.color === color) n += e.cells.length;
  }
  return n;
}

/**
 * Cast the companion's active ability on the current state. Returns the new
 * board snapshot; the caller is responsible for wrapping it in a new
 * GameState. Deterministic given a seed.
 */
export function castAbility(
  state: GameState,
  ability: ActiveAbility,
  seed: number,
): BoardSnapshot {
  const board = state.board;
  switch (ability.kind) {
    case 'spawnPrism':
    case 'spawnBomb': {
      const target = pickPlayableColoredCell(board, seed);
      if (!target) return board;
      const t = getTile(board, target)!;
      const kind = ability.kind === 'spawnPrism' ? 'prism' : 'bomb';
      return setTile(board, target, { color: t.color, special: kind });
    }
    case 'shuffleBoard':
      return reshuffle(board);
  }
}

function pickPlayableColoredCell(
  board: BoardSnapshot,
  seed: number,
): { row: number; col: number } | null {
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
  if (candidates.length === 0) return null;
  const pick = nextInt(seedFrom(seed), candidates.length);
  return candidates[pick.value]!;
}
