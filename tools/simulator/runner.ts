import type { LevelDef, LevelArchetype } from '../../src/engine/types';
import { newGame } from '../../src/engine/engine';
import { playToEnd } from './bot';

export interface LevelSimResult {
  levelId: string;
  archetype: LevelArchetype;
  attempts: number;
  wins: number;
  aps: number; // attempts per success (= attempts / wins, or Infinity)
  meanMovesRemaining: number;
  medianFailMargin: number; // avg over objectives, remaining need / target
  failMarginSamples: number[]; // per-fail values (mean of per-objective remaining/target)
  duration_ms: number;
}

export interface SimRunOptions {
  attemptsPerLevel: number;
  /** Seed offset added to level seed to vary per-attempt starting conditions
   *  (deterministic but different runs sample different starts). Set to 0
   *  to always play the same starting board. */
  seedStride?: number;
}

export function simulateLevel(
  level: LevelDef,
  opts: SimRunOptions,
): LevelSimResult {
  const start = Date.now();
  let wins = 0;
  const remaining: number[] = [];
  const failMargins: number[] = [];
  const stride = opts.seedStride ?? 1;
  for (let i = 0; i < opts.attemptsPerLevel; i++) {
    const lv: LevelDef = {
      ...level,
      seed: level.seed + i * stride,
      dropWeights: { ...level.dropWeights },
      mask: level.mask.slice(),
      startingLayout: level.startingLayout.map((t) =>
        t ? { ...t, blocker: t.blocker ? { ...t.blocker } : undefined } : null,
      ),
      objectives: level.objectives.slice(),
    };
    const state = newGame(lv);
    const { final } = playToEnd(state, 200, { rngSeed: level.seed + i * 7 });
    if (final.status === 'won') {
      wins++;
      remaining.push(final.movesRemaining);
    } else {
      // Fail margin: average remaining need per objective, normalized 0..1.
      let sum = 0;
      let count = 0;
      for (const p of final.progress) {
        if (!p.done) {
          sum += Math.max(0, p.target - p.progress) / Math.max(1, p.target);
          count++;
        }
      }
      failMargins.push(count === 0 ? 0 : sum / count);
    }
  }
  const attempts = opts.attemptsPerLevel;
  const aps = wins === 0 ? Infinity : attempts / wins;
  const meanRemaining =
    remaining.length === 0
      ? 0
      : remaining.reduce((s, x) => s + x, 0) / remaining.length;
  const sortedMargins = failMargins.slice().sort((a, b) => a - b);
  const median =
    sortedMargins.length === 0
      ? 0
      : sortedMargins.length % 2 === 1
        ? sortedMargins[(sortedMargins.length - 1) / 2]!
        : (sortedMargins[sortedMargins.length / 2 - 1]! +
            sortedMargins[sortedMargins.length / 2]!) /
          2;
  return {
    levelId: level.id,
    archetype: level.archetype,
    attempts,
    wins,
    aps,
    meanMovesRemaining: meanRemaining,
    medianFailMargin: median,
    failMarginSamples: failMargins,
    duration_ms: Date.now() - start,
  };
}

export interface OutlierFlags {
  apsTooHigh: boolean; // level harder than archetype target
  apsTooLow: boolean; // level easier than archetype target
  failMarginTooLarge: boolean; // hard levels fail by wide margins (blowouts)
}

export const APS_TARGETS: Record<
  LevelArchetype,
  { min: number; max: number }
> = {
  tutorial: { min: 1.0, max: 1.15 },
  wow: { min: 1.0, max: 1.4 },
  procrastinating: { min: 1.4, max: 3.5 },
  hard: { min: 6, max: 18 },
};

export function flagOutliers(r: LevelSimResult): OutlierFlags {
  const target = APS_TARGETS[r.archetype];
  const apsTooHigh = r.aps > target.max;
  const apsTooLow = r.aps < target.min;
  const failMarginTooLarge =
    r.archetype === 'hard' && r.medianFailMargin > 0.35;
  return { apsTooHigh, apsTooLow, failMarginTooLarge };
}
