import type { ExpeditionDuration, ExpeditionRewards } from './types';
import { EXPEDITION_MINUTES } from './types';
import { nextInt, seedFrom } from '../engine/rng';
import { getCompanion } from '../companions/catalog';
import type { Rarity } from '../companions/types';

/** Base reward tables per duration. Tunable — the design lever for time-value
 *  of expeditions. */
export const BASE_REWARDS: Record<ExpeditionDuration, ExpeditionRewards> = {
  short: { coins: 30, embers: 1, shards: 0, gems: 0 },
  medium: { coins: 120, embers: 5, shards: 0, gems: 0 },
  long: { coins: 500, embers: 20, shards: 1, gems: 0 },
};

/** Rarity multiplier on reward output. Higher-rarity companions bring back more. */
const RARITY_MULT: Record<Rarity, number> = {
  common: 1.0,
  rare: 1.2,
  epic: 1.5,
  legendary: 2.0,
};

/** Long expeditions have a small chance to return premium gems. */
const GEM_CHANCE: Record<ExpeditionDuration, number> = {
  short: 0,
  medium: 0.02,
  long: 0.1,
};

/**
 * Compute the rewards for a completed expedition. Deterministic given seed +
 * companionId + duration. Small random variance (±20% on coins) so the same
 * companion + duration doesn't feel identical each run.
 */
export function computeRewards(
  companionId: string,
  duration: ExpeditionDuration,
  seed: number,
): ExpeditionRewards {
  const base = BASE_REWARDS[duration];
  const companion = getCompanion(companionId);
  const mult = companion ? RARITY_MULT[companion.rarity] : 1;
  let rng = seedFrom(seed);
  const jitter = nextInt(rng, 41); // 0..40
  rng = jitter.state;
  const jitterFactor = 0.8 + jitter.value / 100; // 0.80..1.20
  const coins = Math.round(base.coins * mult * jitterFactor);
  const embers = Math.round(base.embers * mult);
  const shards = Math.round(base.shards * mult);
  const gemsRoll = nextInt(rng, 1000);
  rng = gemsRoll.state;
  const gems = gemsRoll.value / 1000 < GEM_CHANCE[duration] ? 1 : 0;
  return { coins, embers, shards, gems };
}

/** Duration of an expedition in ms. */
export function durationMs(d: ExpeditionDuration): number {
  return EXPEDITION_MINUTES[d] * 60 * 1000;
}

/** Milliseconds remaining until an expedition finishes; 0 if already done. */
export function msRemaining(endsAt: number, now: number): number {
  return Math.max(0, endsAt - now);
}

export function isReady(endsAt: number, now: number): boolean {
  return now >= endsAt;
}
