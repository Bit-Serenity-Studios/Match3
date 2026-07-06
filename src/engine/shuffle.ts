import type { BoardSnapshot, CellPos } from './types';
import { getTile, idx, isPlayable, swapTiles } from './board';
import { hasAnyMatch } from './match';
import { ENGINE_CONFIG } from '../config/engine';
import { nextInt } from './rng';

/**
 * True if the board has at least one swap that creates a match.
 * Ignores immovable stone-rune cells.
 */
export function hasValidMove(b: BoardSnapshot): boolean {
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const p = { row: r, col: c };
      if (!swappable(b, p)) continue;
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const q = { row: r + dr, col: c + dc };
        if (!swappable(b, q)) continue;
        const nb = swapTiles(b, p, q);
        if (hasAnyMatch(nb)) return true;
      }
    }
  }
  return false;
}

function swappable(b: BoardSnapshot, p: CellPos): boolean {
  if (!isPlayable(b, p)) return false;
  const t = getTile(b, p);
  if (!t) return false;
  if (t.blocker?.kind === 'stoneRune') return false;
  if (!t.color && !t.special) return false;
  return true;
}

/**
 * Reshuffle: permute the movable-tile positions (Fisher-Yates using the RNG)
 * until the board has a valid move but no immediate matches. Deterministic.
 */
export function reshuffle(b: BoardSnapshot): BoardSnapshot {
  let state = b.rngState;
  const positions: CellPos[] = [];
  const movable: (typeof b.tiles) = [];
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const i = idx(b.width, r, c);
      if (!b.mask[i]) continue;
      const t = b.tiles[i];
      if (!t) continue;
      if (t.blocker) continue; // don't shuffle blocker-locked cells
      positions.push({ row: r, col: c });
      movable.push(t);
    }
  }
  const maxAttempts = ENGINE_CONFIG.shuffle.maxAttempts;
  let attempt = 0;
  let best: BoardSnapshot = b;
  let foundValid = false;
  while (attempt < maxAttempts) {
    // Shuffle a copy of movable.
    const perm = movable.slice();
    for (let i = perm.length - 1; i > 0; i--) {
      const p = nextInt(state, i + 1);
      state = p.state;
      const j = p.value;
      const tmp = perm[i]!;
      perm[i] = perm[j]!;
      perm[j] = tmp;
    }
    const tiles = b.tiles.slice();
    for (let k = 0; k < positions.length; k++) {
      const pos = positions[k]!;
      tiles[idx(b.width, pos.row, pos.col)] = perm[k]!;
    }
    const candidate: BoardSnapshot = { ...b, tiles, rngState: state };
    if (!hasAnyMatch(candidate) && hasValidMove(candidate)) {
      return candidate;
    }
    // Prefer candidates that at least have a valid move.
    if (!foundValid && hasValidMove(candidate)) {
      best = candidate;
      foundValid = true;
    }
    attempt++;
  }
  return { ...best, rngState: state };
}
