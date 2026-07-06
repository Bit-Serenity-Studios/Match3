import type { BoardEvent, BoardSnapshot, Tile, TileColor } from './types';
import { idx } from './board';
import { TILE_COLORS } from '../config/tiles';
import { pickWeighted } from './rng';

/**
 * Apply gravity: any playable cell with a null tile pulls the nearest tile
 * above it down (blockers with 'stoneRune' are immovable). Returns new board
 * and a 'gravity' event describing every move.
 *
 * Convention: rows go top (0) to bottom (height-1). Gravity is downward.
 */
export function applyGravity(b: BoardSnapshot): {
  board: BoardSnapshot;
  event: BoardEvent | null;
} {
  const tiles = b.tiles.slice();
  const moves: { from: { row: number; col: number }; to: { row: number; col: number } }[] = [];
  for (let c = 0; c < b.width; c++) {
    // For each column, walk bottom-up looking for empty cells, pull from above.
    let writeRow = b.height - 1;
    for (let r = b.height - 1; r >= 0; r--) {
      const i = idx(b.width, r, c);
      if (!b.mask[i]) {
        // Non-playable — gravity resets past this cell for airborne pieces
        // above, but tiles can't fall THROUGH holes: reset writeRow to r-1
        // so pieces above stack on top of the hole boundary.
        writeRow = r - 1;
        continue;
      }
      const t = tiles[i];
      if (t?.blocker?.kind === 'stoneRune') {
        // Immovable. Reset write pointer to above.
        writeRow = r - 1;
        continue;
      }
      // We want to fill writeRow. If writeRow already has a fixed tile, skip up.
      if (r === writeRow) {
        if (t) writeRow--;
        continue;
      }
      if (t) {
        const wi = idx(b.width, writeRow, c);
        tiles[wi] = t;
        tiles[i] = null;
        moves.push({ from: { row: r, col: c }, to: { row: writeRow, col: c } });
        writeRow--;
      }
    }
  }
  const board: BoardSnapshot = { ...b, tiles };
  if (moves.length === 0) return { board, event: null };
  return { board, event: { t: 'gravity', moves } };
}

/**
 * Refill: fill every playable null cell with a fresh random tile drawn from
 * the RNG stream weighted by dropWeights (adjusted by difficultyMod).
 */
export function applyRefill(
  b: BoardSnapshot,
  weights: Record<TileColor, number>,
  difficultyMod: number,
  favorable: TileColor | null,
): { board: BoardSnapshot; event: BoardEvent | null } {
  const drops: { at: { row: number; col: number }; tile: Tile }[] = [];
  const tiles = b.tiles.slice();
  let state = b.rngState;
  const adjusted = adjustWeights(weights, difficultyMod, favorable);
  const ws = TILE_COLORS.map((c) => adjusted[c] ?? 0);
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const i = idx(b.width, r, c);
      if (!b.mask[i]) continue;
      if (tiles[i]) continue;
      const pick = pickWeighted(state, TILE_COLORS, ws);
      state = pick.state;
      const tile: Tile = { color: pick.value };
      tiles[i] = tile;
      drops.push({ at: { row: r, col: c }, tile });
    }
  }
  const board: BoardSnapshot = { ...b, tiles, rngState: state };
  if (drops.length === 0) return { board, event: null };
  return { board, event: { t: 'refill', drops } };
}

function adjustWeights(
  weights: Record<TileColor, number>,
  mod: number,
  favorable: TileColor | null,
): Record<TileColor, number> {
  if (!favorable || mod === 0) return weights;
  const factor = 1 + Math.max(-0.9, Math.min(0.9, mod));
  const out: Record<TileColor, number> = { ...weights };
  out[favorable] = (weights[favorable] ?? 0) * factor;
  return out;
}
