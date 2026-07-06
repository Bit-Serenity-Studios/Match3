import type { BlockerKind, BoardEvent, BoardSnapshot, CellPos, Tile } from './types';
import { getTile, idx, isPlayable, setTile } from './board';
import { ENGINE_CONFIG } from '../config/engine';
import { next as rngNext, nextInt } from './rng';

const NEIGHBORS: readonly [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

/** True if a blocker of this kind takes damage from an *adjacent* clear
 *  (rather than needing to be cleared directly). */
function damagedByAdjacent(kind: BlockerKind): boolean {
  return kind === 'vine' || kind === 'stoneRune';
}

/** True if a blocker of this kind is damaged by being *matched through* directly. */
function damagedByDirect(kind: BlockerKind): boolean {
  return kind === 'frostGlass' || kind === 'ivy';
}

/**
 * Apply blocker damage from a set of just-cleared cells. Returns the new board
 * plus the events that describe what happened. `directHits` are cells that were
 * cleared by matching them directly; `adjacentBlastCells` are cells cleared by
 * a special's blast (they hit both direct + adjacent blockers).
 */
export function applyBlockerDamage(
  b: BoardSnapshot,
  directHits: readonly CellPos[],
  adjacentBlastCells: readonly CellPos[],
): { board: BoardSnapshot; events: BoardEvent[] } {
  let board = b;
  const events: BoardEvent[] = [];
  const damaged = new Set<string>();

  // Direct hits: damage blockers ON those cells that are damagedByDirect.
  for (const p of directHits) {
    const t = getTile(board, p);
    if (!t?.blocker) continue;
    if (!damagedByDirect(t.blocker.kind)) continue;
    const key = `d:${p.row},${p.col}`;
    if (damaged.has(key)) continue;
    damaged.add(key);
    const res = damageAt(board, p);
    board = res.board;
    events.push(res.event);
  }

  // Adjacent-damage from clears (direct + blast). Only 'vine' and 'stoneRune'.
  const source = new Set<string>();
  for (const p of directHits) source.add(`${p.row},${p.col}`);
  for (const p of adjacentBlastCells) source.add(`${p.row},${p.col}`);
  for (const key of source) {
    const [r, c] = key.split(',').map(Number) as [number, number];
    for (const [dr, dc] of NEIGHBORS) {
      const np = { row: r + dr, col: c + dc };
      if (!isPlayable(board, np)) continue;
      const t = getTile(board, np);
      if (!t?.blocker) continue;
      if (!damagedByAdjacent(t.blocker.kind)) continue;
      const dkey = `a:${np.row},${np.col}`;
      if (damaged.has(dkey)) continue;
      damaged.add(dkey);
      const res = damageAt(board, np);
      board = res.board;
      events.push(res.event);
    }
  }

  // Stone runes hit by a blast (adjacentBlastCells that ARE stone runes)
  for (const p of adjacentBlastCells) {
    const t = getTile(board, p);
    if (!t?.blocker) continue;
    if (t.blocker.kind !== 'stoneRune') continue;
    const key = `d:${p.row},${p.col}`;
    if (damaged.has(key)) continue;
    damaged.add(key);
    const res = damageAt(board, p);
    board = res.board;
    events.push(res.event);
  }

  return { board, events };
}

function damageAt(b: BoardSnapshot, p: CellPos): { board: BoardSnapshot; event: BoardEvent } {
  const t = getTile(b, p);
  if (!t?.blocker) throw new Error('damageAt: no blocker');
  const layers = t.blocker.layers - 1;
  if (layers <= 0) {
    // Cleared. If frost glass, unlock the tile; else remove entirely.
    let cleared: Tile | null = null;
    if (t.blocker.kind === 'frostGlass') {
      cleared = { color: t.color };
    } else {
      cleared = t.color ? { color: t.color } : null;
    }
    return {
      board: setTile(b, p, cleared),
      event: {
        t: 'blockerHit',
        at: p,
        kind: t.blocker.kind,
        layersLeft: 0,
        cleared: true,
      },
    };
  }
  const nt: Tile = { ...t, blocker: { ...t.blocker, layers } };
  return {
    board: setTile(b, p, nt),
    event: {
      t: 'blockerHit',
      at: p,
      kind: t.blocker.kind,
      layersLeft: layers,
      cleared: false,
    },
  };
}

/**
 * Ivy spreads at end-of-turn: pick one adjacent empty-color playable cell for
 * each ivy tile that isn't yet spread this turn. Deterministic via RNG state.
 * Capped by ENGINE_CONFIG.blockers.ivy.maxCells.
 */
export function spreadIvy(b: BoardSnapshot): {
  board: BoardSnapshot;
  events: BoardEvent[];
} {
  const cfg = ENGINE_CONFIG.blockers.ivy;
  const events: BoardEvent[] = [];
  if (b.ivyStepsSinceSpread + 1 < cfg.spreadEveryNTurns) {
    return { board: { ...b, ivyStepsSinceSpread: b.ivyStepsSinceSpread + 1 }, events };
  }
  const ivyCells: CellPos[] = [];
  let count = 0;
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const t = getTile(b, { row: r, col: c });
      if (t?.blocker?.kind === 'ivy') {
        ivyCells.push({ row: r, col: c });
        count++;
      }
    }
  }
  if (count >= cfg.maxCells) {
    return { board: { ...b, ivyStepsSinceSpread: 0 }, events };
  }
  let board = b;
  let state = board.rngState;
  for (const p of ivyCells) {
    if (count >= cfg.maxCells) break;
    const candidates: CellPos[] = [];
    for (const [dr, dc] of NEIGHBORS) {
      const np = { row: p.row + dr, col: p.col + dc };
      if (!isPlayable(board, np)) continue;
      const nt = getTile(board, np);
      if (!nt) continue;
      if (nt.blocker) continue; // don't overwrite blockers
      if (nt.special) continue; // don't consume specials
      candidates.push(np);
    }
    if (candidates.length === 0) continue;
    const pick = nextInt(state, candidates.length);
    state = pick.state;
    const target = candidates[pick.value]!;
    const targetTile = getTile(board, target)!;
    const newTile: Tile = {
      color: targetTile.color,
      blocker: { kind: 'ivy', layers: 1 },
    };
    board = setTile(board, target, newTile);
    events.push({ t: 'ivySpread', from: p, to: target });
    count++;
  }
  board = { ...board, rngState: state, ivyStepsSinceSpread: 0 };
  return { board, events };
}

export { idx };
export { rngNext };
