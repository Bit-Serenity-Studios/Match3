import type {
  BoardEvent,
  BoardSnapshot,
  CellPos,
  GameState,
  Objective,
  ObjectiveProgress,
  TileColor,
} from './types';
import { getTile, isPlayable } from './board';

export function initProgress(objectives: Objective[]): ObjectiveProgress[] {
  return objectives.map((o) => ({
    progress: 0,
    target: targetFor(o),
    done: false,
  }));
}

function targetFor(o: Objective): number {
  switch (o.kind) {
    case 'collectColor':
      return o.count;
    case 'clearBlockers':
      return 1; // resolved via boardHasBlockers check at end
    case 'dropIngredients':
      return o.count;
    case 'score':
      return o.target;
  }
}

/**
 * Update objective progress from a set of cells that were just cleared (with
 * their prior color) and an optional score delta. Returns new progress array
 * plus per-objective events.
 */
export function applyClearsToProgress(
  state: GameState,
  boardBefore: BoardSnapshot,
  clearedCells: readonly CellPos[],
  scoreDelta: number,
  ingredientsReachedBottom: readonly { color: TileColor }[],
): { progress: ObjectiveProgress[]; events: BoardEvent[] } {
  const progress = state.progress.map((p) => ({ ...p }));
  const events: BoardEvent[] = [];
  const objs = state.objectives;

  // Precompute cleared colors.
  const clearedColors: Partial<Record<TileColor, number>> = {};
  const clearedBlockers: Partial<Record<string, number>> = {};
  for (const p of clearedCells) {
    const t = getTile(boardBefore, p);
    if (!t) continue;
    if (t.color) {
      clearedColors[t.color] = (clearedColors[t.color] ?? 0) + 1;
    }
    if (t.blocker) {
      clearedBlockers[t.blocker.kind] =
        (clearedBlockers[t.blocker.kind] ?? 0) + 1;
    }
  }

  for (let i = 0; i < objs.length; i++) {
    const obj = objs[i]!;
    const p = progress[i]!;
    if (p.done) continue;
    let delta = 0;
    switch (obj.kind) {
      case 'collectColor':
        delta = clearedColors[obj.color] ?? 0;
        break;
      case 'dropIngredients':
        delta = ingredientsReachedBottom.filter((x) => x.color === obj.tile)
          .length;
        break;
      case 'score':
        delta = scoreDelta;
        break;
      case 'clearBlockers':
        // Progress tracked via helper below (after all clears applied).
        delta = 0;
        break;
    }
    if (delta > 0) {
      p.progress = Math.min(p.target, p.progress + delta);
      if (p.progress >= p.target) p.done = true;
      events.push({
        t: 'objectiveProgress',
        index: i,
        progress: p.progress,
        done: p.done,
      });
    }
  }
  return { progress, events };
}

/** After a turn, if a 'clearBlockers' objective exists, check whether the board
 *  is free of the required blockers and mark done. */
export function reconcileBlockerObjectives(
  state: GameState,
  board: BoardSnapshot,
): { progress: ObjectiveProgress[]; events: BoardEvent[] } {
  const progress = state.progress.map((p) => ({ ...p }));
  const events: BoardEvent[] = [];
  for (let i = 0; i < state.objectives.length; i++) {
    const obj = state.objectives[i]!;
    const p = progress[i]!;
    if (obj.kind !== 'clearBlockers' || p.done) continue;
    let anyLeft = false;
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        const t = getTile(board, { row: r, col: c });
        if (!t?.blocker) continue;
        if (!obj.blocker || t.blocker.kind === obj.blocker) {
          anyLeft = true;
          break;
        }
      }
      if (anyLeft) break;
    }
    if (!anyLeft) {
      p.progress = p.target;
      p.done = true;
      events.push({ t: 'objectiveProgress', index: i, progress: p.progress, done: true });
    }
  }
  return { progress, events };
}

export function allDone(progress: readonly ObjectiveProgress[]): boolean {
  return progress.every((p) => p.done);
}

export { isPlayable };
