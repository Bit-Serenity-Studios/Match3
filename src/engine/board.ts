import type { BoardSnapshot, CellPos, Tile, TileColor } from './types';
import { seedFrom, pickWeighted } from './rng';
import { TILE_COLORS } from '../config/tiles';

export const idx = (w: number, r: number, c: number): number => r * w + c;

export function inBounds(b: BoardSnapshot, p: CellPos): boolean {
  return p.row >= 0 && p.row < b.height && p.col >= 0 && p.col < b.width;
}

export function isPlayable(b: BoardSnapshot, p: CellPos): boolean {
  if (!inBounds(b, p)) return false;
  return b.mask[idx(b.width, p.row, p.col)] === true;
}

export function getTile(b: BoardSnapshot, p: CellPos): Tile | null {
  if (!inBounds(b, p)) return null;
  const t = b.tiles[idx(b.width, p.row, p.col)];
  return t ?? null;
}

export function setTile(
  b: BoardSnapshot,
  p: CellPos,
  tile: Tile | null,
): BoardSnapshot {
  const tiles = b.tiles.slice();
  tiles[idx(b.width, p.row, p.col)] = tile;
  return { ...b, tiles };
}

export function cloneBoard(b: BoardSnapshot): BoardSnapshot {
  return {
    ...b,
    mask: b.mask.slice(),
    tiles: b.tiles.map((t) => (t ? { ...t, blocker: t.blocker ? { ...t.blocker } : undefined } : null)),
  };
}

/** True if two positions are 4-way adjacent AND both playable. */
export function areAdjacent(
  b: BoardSnapshot,
  a: CellPos,
  c: CellPos,
): boolean {
  if (!isPlayable(b, a) || !isPlayable(b, c)) return false;
  const dr = Math.abs(a.row - c.row);
  const dc = Math.abs(a.col - c.col);
  return dr + dc === 1;
}

/** Immutable swap of two tiles in the board. */
export function swapTiles(
  b: BoardSnapshot,
  a: CellPos,
  c: CellPos,
): BoardSnapshot {
  const ai = idx(b.width, a.row, a.col);
  const ci = idx(b.width, c.row, c.col);
  const tiles = b.tiles.slice();
  const tmp = tiles[ai] ?? null;
  tiles[ai] = tiles[ci] ?? null;
  tiles[ci] = tmp;
  return { ...b, tiles };
}

/**
 * Fill any null (but playable) cells with fresh tiles drawn from the RNG
 * stream. Colors that would form an immediate 3-in-a-row with already-placed
 * tiles (up or left) are excluded — the starting board is guaranteed
 * match-free by construction. Advances rngState.
 */
export function fillEmptyCells(
  b: BoardSnapshot,
  weights: Record<TileColor, number>,
): BoardSnapshot {
  let state = b.rngState;
  const tiles = b.tiles.slice();
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const i = idx(b.width, r, c);
      if (!b.mask[i]) continue;
      if (tiles[i]) continue;
      const excluded = new Set<TileColor>();
      // Horizontal: two same-color tiles immediately to the left.
      if (c >= 2) {
        const t1 = tiles[idx(b.width, r, c - 1)];
        const t2 = tiles[idx(b.width, r, c - 2)];
        if (t1?.color && t1.color === t2?.color) excluded.add(t1.color);
      }
      // Vertical: two same-color tiles immediately above.
      if (r >= 2) {
        const t1 = tiles[idx(b.width, r - 1, c)];
        const t2 = tiles[idx(b.width, r - 2, c)];
        if (t1?.color && t1.color === t2?.color) excluded.add(t1.color);
      }
      const ws = TILE_COLORS.map((col) =>
        excluded.has(col) ? 0 : (weights[col] ?? 0),
      );
      const pick = pickWeighted(state, TILE_COLORS, ws);
      state = pick.state;
      tiles[i] = { color: pick.value };
    }
  }
  return { ...b, tiles, rngState: state };
}

export function createBoard(
  width: number,
  height: number,
  mask: boolean[] | undefined,
  seed: number,
  startingLayout: (Tile | null)[] | undefined,
): BoardSnapshot {
  const size = width * height;
  const m = mask && mask.length === size ? mask.slice() : new Array(size).fill(true);
  const t: (Tile | null)[] =
    startingLayout && startingLayout.length === size
      ? startingLayout.map((tile) =>
          tile ? { ...tile, blocker: tile.blocker ? { ...tile.blocker } : undefined } : null,
        )
      : new Array(size).fill(null);
  return {
    width,
    height,
    mask: m,
    tiles: t,
    rngState: seedFrom(seed),
    ivyStepsSinceSpread: 0,
  };
}
