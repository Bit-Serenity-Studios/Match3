import type {
  BoardEvent,
  BoardSnapshot,
  CellPos,
  DetectedMatch,
  GameState,
  SpecialKind,
  Tile,
  TileColor,
} from './types';
import { getTile, idx, isPlayable, setTile } from './board';
import { findMatches } from './match';
import { applyGravity, applyRefill } from './gravity';
import { applyBlockerDamage, spreadIvy } from './blockers';
import {
  cellsClearedByActivation,
  comboClears,
  specialOn,
} from './specials';
import { ENGINE_CONFIG } from '../config/engine';
import {
  allDone,
  applyClearsToProgress,
  reconcileBlockerObjectives,
} from './objectives';
import { hasValidMove, reshuffle } from './shuffle';

interface CascadeResult {
  board: BoardSnapshot;
  events: BoardEvent[];
  progress: GameState['progress'];
  scoreDelta: number;
}

/**
 * The heart of the engine: resolve one swap into a full cascade.
 * The caller has already validated adjacency and updated the board with the
 * swapped tiles. `initialActivations` covers the case where the swap itself
 * activates a special (e.g. a lineH tile is swapped anywhere) or triggers a
 * special+special combo.
 */
export function resolveCascade(
  state: GameState,
  boardAfterSwap: BoardSnapshot,
  initialActivations: {
    at: CellPos;
    kind: SpecialKind;
    color: TileColor | null;
  }[],
  favorableColor: TileColor | null,
  comboCells?: CellPos[],
): CascadeResult {
  let board = boardAfterSwap;
  const events: BoardEvent[] = [];
  let progress = state.progress;
  let step = 0;
  let scoreDelta = 0;
  const pendingActivations: {
    at: CellPos;
    kind: SpecialKind;
    color: TileColor | null;
  }[] = [...initialActivations];
  const activated = new Set<string>();
  let comboPreCleared: CellPos[] = comboCells ?? [];

  while (true) {
    if (step >= ENGINE_CONFIG.cascade.maxCascadeSteps) break;

    // 1. Determine cells cleared this step (from matches + specials).
    const boardBefore = board;
    const matches = findMatches(board);
    if (matches.length === 0 && pendingActivations.length === 0 && comboPreCleared.length === 0) {
      break;
    }

    // 2. Determine specials to be created from matches. Their cells are the
    //    origin cell — that cell is EXEMPT from clearing.
    const created: {
      at: CellPos;
      kind: SpecialKind;
      color: TileColor;
    }[] = [];
    const clearedFromMatches: CellPos[] = [];
    for (const m of matches) {
      events.push({
        t: 'match',
        cells: m.cells.slice(),
        length: m.length,
        shape: m.shape,
        color: m.color,
      });
      let originCell: CellPos | null = null;
      if (m.special && m.origin) {
        originCell = m.origin;
        created.push({ at: m.origin, kind: m.special, color: m.color });
      }
      for (const cell of m.cells) {
        if (
          originCell &&
          cell.row === originCell.row &&
          cell.col === originCell.col
        ) {
          continue;
        }
        clearedFromMatches.push(cell);
      }
    }

    // 3. Any specials that were on cleared cells become pending activations.
    for (const cell of clearedFromMatches) {
      const t = getTile(board, cell);
      const sk = specialOn(t);
      if (!sk) continue;
      const key = `${cell.row},${cell.col}`;
      if (activated.has(key)) continue;
      pendingActivations.push({ at: cell, kind: sk, color: t?.color ?? null });
    }

    // 4. Resolve pending activations transitively.
    const activationClears: CellPos[] = [];
    while (pendingActivations.length > 0) {
      const act = pendingActivations.shift()!;
      const key = `${act.at.row},${act.at.col}`;
      if (activated.has(key)) continue;
      activated.add(key);
      // partnerColor for prism: prefer paired match color; fallback tile color
      const cleared = cellsClearedByActivation(board, act.at, act.kind, act.color ?? undefined);
      events.push({
        t: 'specialActivated',
        at: act.at,
        kind: act.kind,
        cleared: cleared.slice(),
      });
      for (const c of cleared) {
        activationClears.push(c);
        const ct = getTile(board, c);
        const sk = specialOn(ct);
        if (!sk) continue;
        const ck = `${c.row},${c.col}`;
        if (activated.has(ck)) continue;
        pendingActivations.push({ at: c, kind: sk, color: ct?.color ?? null });
      }
    }

    // 5. Consolidate all clears for this step.
    const combined = new Map<string, CellPos>();
    for (const c of clearedFromMatches) combined.set(`${c.row},${c.col}`, c);
    for (const c of activationClears) combined.set(`${c.row},${c.col}`, c);
    for (const c of comboPreCleared) combined.set(`${c.row},${c.col}`, c);
    const blastCells: CellPos[] = [];
    for (const c of activationClears) blastCells.push(c);
    for (const c of comboPreCleared) blastCells.push(c);
    comboPreCleared = [];
    const stepClears: CellPos[] = [];
    for (const c of combined.values()) stepClears.push(c);

    // 6. Apply blocker damage (blastCells trigger adjacent-damage on vines/runes).
    const blockerRes = applyBlockerDamage(board, stepClears, blastCells);
    board = blockerRes.board;
    events.push(...blockerRes.events);

    // 7. Actually null-out cleared tiles (respecting blockers still standing).
    for (const c of stepClears) {
      const t = getTile(board, c);
      if (!t) continue;
      if (t.blocker && t.blocker.layers > 0) {
        // Blocker still absorbing hits (e.g. vine still has layers). Don't clear the tile.
        continue;
      }
      // Frost glass that was cleared this step was already unlocked by applyBlockerDamage.
      // Now we clear the tile itself unless it's a stone rune that survived.
      if (t.blocker?.kind === 'stoneRune') continue;
      board = setTile(board, c, null);
    }
    // Also place created specials (must survive the clear).
    for (const cr of created) {
      const tile: Tile = { color: cr.color, special: cr.kind };
      board = setTile(board, cr.at, tile);
      events.push({
        t: 'specialCreated',
        at: cr.at,
        kind: cr.kind,
        color: cr.color,
      });
    }

    events.push({ t: 'clear', cells: stepClears.slice() });

    // 8. Score.
    const stepScore = scoreForStep(matches, stepClears.length, step);
    scoreDelta += stepScore;
    const mult = ENGINE_CONFIG.cascade.stepMultiplier(step);
    events.push({
      t: 'cascade',
      step,
      multiplier: mult,
      scoreDelta: stepScore,
    });

    // 9. Objective progress from this step's clears.
    const objRes = applyClearsToProgress(
      { ...state, progress },
      boardBefore,
      stepClears,
      stepScore,
      [], // dropIngredients handled after gravity
    );
    progress = objRes.progress;
    events.push(...objRes.events);

    // 10. Gravity + refill.
    const grav = applyGravity(board);
    board = grav.board;
    if (grav.event) events.push(grav.event);

    const refill = applyRefill(
      board,
      state.dropWeights,
      state.difficultyMod,
      favorableColor,
    );
    board = refill.board;
    if (refill.event) events.push(refill.event);

    step++;
  }

  // End-of-turn: reconcile clearBlockers objectives.
  const rec = reconcileBlockerObjectives({ ...state, progress }, board);
  progress = rec.progress;
  events.push(...rec.events);

  // Ivy spread.
  const ivy = spreadIvy(board);
  board = ivy.board;
  events.push(...ivy.events);

  // Shuffle if no valid moves.
  if (!hasValidMove(board)) {
    board = reshuffle(board);
    events.push({ t: 'shuffle', reason: 'noMoves' });
  }

  return { board, events, progress, scoreDelta };
}

function scoreForStep(
  matches: DetectedMatch[],
  clears: number,
  step: number,
): number {
  const cfg = ENGINE_CONFIG.cascade;
  let base = clears * cfg.baseScore;
  for (const m of matches) {
    if (m.length === 4) base += cfg.match4Bonus;
    else if (m.length >= 5) base += cfg.match5Bonus;
    if (m.shape !== 'line') base += cfg.shapeBonus;
  }
  return Math.round(base * cfg.stepMultiplier(step));
}

export { idx, isPlayable };
