import type { BoardEvent, CellPos, GameState } from '../../src/engine/types';
import { applySwap } from '../../src/engine/engine';
import { areAdjacent, getTile, swapTiles } from '../../src/engine/board';
import { findMatches } from '../../src/engine/match';
import { next as rngNext, seedFrom } from '../../src/engine/rng';

/**
 * A myopic-but-competent heuristic bot. On each turn it enumerates every
 * adjacent swap and scores it based on the IMMEDIATE matches created —
 * without simulating the full cascade. This mimics realistic human play:
 * the player sees the direct match but doesn't perfectly foresee the
 * cascade chain. Ties break by a seeded RNG so replays over the same
 * level use different swap sequences (this is what gives the sim its
 * meaningful APS spread).
 *
 * Set `lookahead: true` for expert-level play (used for regression tests
 * that need deterministic best-effort behavior).
 */
export interface BotDecision {
  a: CellPos;
  b: CellPos;
  score: number;
}

export interface BotOptions {
  /** If true, simulate the full cascade for each candidate — expert bot.
   *  Default false (myopic realistic bot). */
  lookahead?: boolean;
  /** Seed for the tie-break RNG. Default derived from the game turn. */
  rngSeed?: number;
}

export function chooseSwap(
  state: GameState,
  opts: BotOptions = {},
): BotDecision | null {
  const b = state.board;
  const scored: (BotDecision & { rand: number })[] = [];
  let rng = seedFrom(opts.rngSeed ?? state.turn * 2654435769);
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const from = { row: r, col: c };
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const to = { row: r + dr, col: c + dc };
        if (!areAdjacent(b, from, to)) continue;
        const score = opts.lookahead
          ? scoreWithLookahead(state, from, to)
          : scoreMyopic(state, from, to);
        if (score <= 0) continue;
        const r0 = rngNext(rng);
        rng = r0.state;
        scored.push({ a: from, b: to, score, rand: r0.value });
      }
    }
  }
  if (scored.length === 0) return null;
  // Break score ties with a small random jitter so different runs of the
  // same board occasionally take different top swaps.
  scored.sort((x, y) => y.score + y.rand * 0.5 - (x.score + x.rand * 0.5));
  return scored[0]!;
}

/** Score just the immediate match footprint of a swap (no cascade). */
function scoreMyopic(
  state: GameState,
  a: CellPos,
  b: CellPos,
): number {
  const board = state.board;
  const ta = getTile(board, a);
  const tb = getTile(board, b);
  if (!ta || !tb) return 0;
  const swapped = swapTiles(board, a, b);
  const matches = findMatches(swapped);
  const isSpecialSwap =
    (ta.special === 'prism' && !!tb.color) ||
    (tb.special === 'prism' && !!ta.color) ||
    (!!ta.special && !!tb.special);
  if (matches.length === 0 && !isSpecialSwap) return 0;

  let score = 0;
  for (const m of matches) {
    score += m.cells.length;
    if (m.length === 4) score += 3;
    if (m.length >= 5) score += 8;
    if (m.shape !== 'line') score += 5; // L/T -> bomb
    // Objective progress hint: matches of a color the level cares about
    // score higher, so the bot prioritizes objective-relevant swaps.
    for (const o of state.objectives) {
      if (o.kind === 'collectColor' && o.color === m.color) {
        const p = state.progress[state.objectives.indexOf(o)];
        if (p && !p.done) {
          const remaining = Math.max(1, p.target - p.progress);
          const contribution = Math.min(m.cells.length, remaining);
          score += (contribution / remaining) * 5;
        }
      }
    }
  }
  // Blockers adjacent to the match get a small bonus.
  for (const m of matches) {
    for (const cell of m.cells) {
      for (const [dr, dc] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ] as const) {
        const np = { row: cell.row + dr, col: cell.col + dc };
        const nt = getTile(board, np);
        if (nt?.blocker) score += 1.2;
      }
    }
  }
  if (isSpecialSwap) score += 6;
  return score;
}

function scoreWithLookahead(
  state: GameState,
  a: CellPos,
  b: CellPos,
): number {
  const result = applySwap(state, a, b);
  if (!result.accepted) return 0;
  return scoreEvents(result.events, state, result.next);
}

function scoreEvents(
  events: BoardEvent[],
  before: GameState,
  after: GameState,
): number {
  let score = 0;
  let cascadeDepth = 0;
  for (const e of events) {
    switch (e.t) {
      case 'clear':
        score += e.cells.length * 1;
        break;
      case 'specialCreated':
        score += 5;
        break;
      case 'specialActivated':
        score += e.cleared.length * 0.5;
        break;
      case 'blockerHit':
        score += e.cleared ? 4 : 2;
        break;
      case 'cascade':
        cascadeDepth = Math.max(cascadeDepth, e.step);
        break;
      default:
        break;
    }
  }
  score += cascadeDepth * 3;
  // Objective progress delta.
  for (let i = 0; i < after.progress.length; i++) {
    const beforeP = before.progress[i]?.progress ?? 0;
    const afterP = after.progress[i]?.progress ?? 0;
    const target = after.progress[i]?.target ?? 1;
    const delta = afterP - beforeP;
    if (delta > 0) {
      // Weight progress on the objective with the least remaining, so we
      // don't stall focused on one.
      const remaining = Math.max(1, target - beforeP);
      score += (delta / remaining) * 15;
    }
  }
  // Reward wins strongly; penalize losses lightly.
  if (after.status === 'won') score += 200;
  return score;
}

/**
 * Play a level to completion or forfeit. Returns the final state and the
 * per-turn decision log for debugging.
 */
export function playToEnd(
  initial: GameState,
  maxTurns = 200,
  opts: BotOptions = {},
): { final: GameState; turns: BotDecision[] } {
  let s = initial;
  const turns: BotDecision[] = [];
  for (let i = 0; i < maxTurns && s.status === 'active'; i++) {
    const decision = chooseSwap(s, {
      ...opts,
      rngSeed: (opts.rngSeed ?? 1) + i * 1000003,
    });
    if (!decision) break;
    const res = applySwap(s, decision.a, decision.b);
    if (!res.accepted) break;
    turns.push(decision);
    s = res.next;
  }
  return { final: s, turns };
}
