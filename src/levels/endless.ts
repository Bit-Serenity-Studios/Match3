import type {
  BlockerKind,
  LevelDef,
  Objective,
  Tile,
  TileColor,
} from '../engine/types';

/**
 * Endless-mode level generator. Called for any level index >= LEVELS.length
 * (i.e. past the 60 authored levels). Deterministic given the level index —
 * players who reach the same "level 87" get the same board layout.
 *
 * Difficulty ramps continuously along the index:
 *   - move budget slowly shrinks
 *   - primary objective scales up (more tiles to collect)
 *   - blocker density grows and rotates through kinds
 *   - a score sub-objective appears past level 80
 *
 * Uses a small deterministic LCG so we don't perturb the engine's RNG
 * (which is seeded per-play by level.seed).
 */

const CANDIDATE_COLORS: readonly TileColor[] = [
  'moonpetal',
  'vial',
  'runestone',
  'resin',
  'mushroom',
];

const BLOCKER_ROTATION: readonly BlockerKind[] = [
  'vine',
  'frostGlass',
  'stoneRune',
  'ivy',
];

/** Simple integer LCG. */
function lcg(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) | 0;
    return (state >>> 0) / 0x100000000;
  };
}

export interface EndlessTuning {
  baseMoves: number;
  minMoves: number;
  movesDropEvery: number;
  baseCollect: number;
  collectStep: number;
  scoreGateStartsAtRank: number;
  scoreBase: number;
  scorePerRank: number;
  maxBlockerDensity: number;
}

export const ENDLESS_TUNING: EndlessTuning = {
  baseMoves: 24,
  minMoves: 18,
  movesDropEvery: 8,
  baseCollect: 22,
  collectStep: 2,
  scoreGateStartsAtRank: 20,
  scoreBase: 4000,
  scorePerRank: 250,
  maxBlockerDensity: 0.22,
};

/**
 * Generate the endless level for a given campaign index (0-based).
 * `authoredCount` = LEVELS.length; must be strictly less than `index`
 * for endless generation (otherwise callers should return the authored
 * level).
 */
export function generateEndlessLevel(
  index: number,
  authoredCount: number,
  tuning: EndlessTuning = ENDLESS_TUNING,
): LevelDef {
  const rank = Math.max(1, index - authoredCount + 1);
  const rng = lcg(0xa55c00d ^ index);

  const moves = Math.max(
    tuning.minMoves,
    tuning.baseMoves - Math.floor(rank / tuning.movesDropEvery),
  );

  const primaryColor = CANDIDATE_COLORS[Math.floor(rng() * CANDIDATE_COLORS.length)]!;
  const collectCount = tuning.baseCollect + rank * tuning.collectStep;

  const width = 6;
  const height = 7;
  const size = width * height;
  const mask = new Array<boolean>(size).fill(true);

  const objectives: Objective[] = [
    { kind: 'collectColor', color: primaryColor, count: collectCount },
  ];

  const blockerKind = BLOCKER_ROTATION[Math.floor(rng() * BLOCKER_ROTATION.length)]!;
  const density = Math.min(
    tuning.maxBlockerDensity,
    0.04 + rank * 0.012,
  );
  const blockerCount = Math.round(size * density);
  if (blockerCount > 0) {
    objectives.push({ kind: 'clearBlockers', blocker: blockerKind });
  }

  if (rank >= tuning.scoreGateStartsAtRank) {
    objectives.push({
      kind: 'score',
      target: tuning.scoreBase + rank * tuning.scorePerRank,
    });
  }

  const layout: (Tile | null)[] = new Array(size).fill(null);
  const blockerLayers = rank >= 40 ? 2 : 1;
  let placed = 0;
  while (placed < blockerCount) {
    const cell = Math.floor(rng() * size);
    if (layout[cell]) continue;
    // Seed a base color under the blocker so gravity has something to work
    // with when the blocker clears.
    const color = CANDIDATE_COLORS[Math.floor(rng() * CANDIDATE_COLORS.length)]!;
    layout[cell] = {
      color,
      blocker: { kind: blockerKind, layers: blockerLayers },
    };
    placed++;
  }

  const dropWeights: Record<TileColor, number> = {
    moonpetal: 1,
    vial: 1,
    runestone: 1,
    resin: 1,
    mushroom: 1,
  };
  // Slight bias toward the primary color so the collect objective stays feasible.
  dropWeights[primaryColor] = 1.25;

  return {
    id: `endless-${String(index + 1).padStart(4, '0')}`,
    width,
    height,
    mask,
    startingLayout: layout,
    dropWeights,
    objectives,
    moves,
    archetype: 'hard',
    seed: (0xdeadbeef ^ index) >>> 0,
  };
}
