import type {
  BoardEvent,
  CellPos,
  GameState,
  LevelDef,
  SpecialKind,
  TileColor,
} from './types';
import {
  areAdjacent,
  cloneBoard,
  createBoard,
  fillEmptyCells,
  getTile,
  swapTiles,
} from './board';
import { findMatches, hasAnyMatch } from './match';
import { hasValidMove, reshuffle } from './shuffle';
import { resolveCascade } from './resolve';
import { comboClears, specialOn } from './specials';
import { allDone, initProgress } from './objectives';
import { favorableColorFor, withDifficulty } from './difficulty';

export function newGame(level: LevelDef): GameState {
  let board = createBoard(
    level.width,
    level.height,
    level.mask,
    level.seed,
    level.startingLayout,
  );
  board = fillEmptyCells(board, level.dropWeights);
  // Ensure starting board has no active matches and has a valid move.
  while (hasAnyMatch(board)) {
    board = reshuffle(board);
  }
  if (!hasValidMove(board)) {
    board = reshuffle(board);
  }
  return {
    levelId: level.id,
    board,
    movesRemaining: level.moves,
    score: 0,
    progress: initProgress(level.objectives),
    status: 'active',
    difficultyMod: 0,
    objectives: level.objectives,
    dropWeights: { ...level.dropWeights },
    turn: 0,
  };
}

export function applySwap(
  state: GameState,
  a: CellPos,
  b: CellPos,
): { next: GameState; events: BoardEvent[]; accepted: boolean } {
  if (state.status !== 'active') {
    return { next: state, events: [], accepted: false };
  }
  if (!areAdjacent(state.board, a, b)) {
    return {
      next: state,
      events: [{ t: 'swap', a, b, invalid: true }],
      accepted: false,
    };
  }
  const ta = getTile(state.board, a);
  const tb = getTile(state.board, b);
  if (!ta || !tb) {
    return {
      next: state,
      events: [{ t: 'swap', a, b, invalid: true }],
      accepted: false,
    };
  }
  if (ta.blocker?.kind === 'stoneRune' || tb.blocker?.kind === 'stoneRune') {
    return {
      next: state,
      events: [{ t: 'swap', a, b, invalid: true }],
      accepted: false,
    };
  }

  const swapped = swapTiles(state.board, a, b);

  const sa = specialOn(ta);
  const sb = specialOn(tb);
  const activations: {
    at: CellPos;
    kind: SpecialKind;
    color: TileColor | null;
  }[] = [];
  let comboCells: CellPos[] = [];
  let acceptedBySpecial = false;

  if (sa && sb) {
    // special+special combo
    comboCells = comboClears(
      swapped,
      { at: b, kind: sa, color: ta.color },
      { at: a, kind: sb, color: tb.color },
    );
    acceptedBySpecial = true;
  } else if (sa) {
    // sa moved from a -> b; activation happens at b IF the swap makes a match
    // OR the special is a prism (which activates on any swap).
    if (sa === 'prism') {
      activations.push({ at: b, kind: sa, color: tb.color });
      acceptedBySpecial = true;
    }
  } else if (sb) {
    if (sb === 'prism') {
      activations.push({ at: a, kind: sb, color: ta.color });
      acceptedBySpecial = true;
    }
  }

  const makesMatch = hasAnyMatch(swapped);
  if (!makesMatch && !acceptedBySpecial) {
    // Reject.
    return {
      next: state,
      events: [{ t: 'swap', a, b, invalid: true }],
      accepted: false,
    };
  }

  const events: BoardEvent[] = [{ t: 'swap', a, b }];
  const favorable = favorableColorFor(state.objectives);
  const cascade = resolveCascade(
    { ...state },
    swapped,
    activations,
    favorable,
    comboCells,
  );
  events.push(...cascade.events);

  const movesRemaining = Math.max(0, state.movesRemaining - 1);
  const score = state.score + cascade.scoreDelta;
  let status: GameState['status'] = 'active';
  if (allDone(cascade.progress)) {
    status = 'won';
    events.push({ t: 'gameEnd', result: 'won' });
  } else if (movesRemaining === 0) {
    status = 'lost';
    events.push({ t: 'gameEnd', result: 'lost' });
  }

  const next: GameState = {
    ...state,
    board: cascade.board,
    movesRemaining,
    score,
    progress: cascade.progress,
    status,
    turn: state.turn + 1,
  };
  return { next, events, accepted: true };
}

/** Suggest one valid swap the player could make. Deterministic (scans in row/col
 *  order). Returns null if no move exists (caller should reshuffle). */
export function hint(state: GameState): [CellPos, CellPos] | null {
  const b = state.board;
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      const p = { row: r, col: c };
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
      ] as const) {
        const q = { row: r + dr, col: c + dc };
        if (!areAdjacent(b, p, q)) continue;
        const nb = swapTiles(b, p, q);
        if (hasAnyMatch(nb)) return [p, q];
      }
    }
  }
  return null;
}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  return JSON.parse(json) as GameState;
}

export { withDifficulty };
