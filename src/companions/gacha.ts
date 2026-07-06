import type { CompanionDef, OwnedCompanion, Rarity } from './types';
import { COMPANIONS, companionsByRarity } from './catalog';
import { pickWeighted, next as rngNext, seedFrom } from '../engine/rng';

export const PULL_COST_EMBERS = 100;

/** Base gacha rates (must sum to 1). Tunable. */
export const BASE_RATES: Record<Rarity, number> = {
  common: 0.7,
  rare: 0.22,
  epic: 0.065,
  legendary: 0.015,
};

/** Shards awarded when a pull returns a companion the player already owns. */
export const DUPLICATE_SHARDS: Record<Rarity, number> = {
  common: 1,
  rare: 3,
  epic: 10,
  legendary: 50,
};

/** Pity system: after this many pulls without an epic+, force an epic+ pull. */
export const EPIC_PITY_AFTER = 30;
/** After this many pulls without a legendary, force a legendary. */
export const LEGENDARY_PITY_AFTER = 90;

export interface PityState {
  pullsSinceEpicOrBetter: number;
  pullsSinceLegendary: number;
  rngState: number;
}

export interface PullOutcome {
  companion: CompanionDef;
  isNew: boolean;
  shardsAwarded: number;
}

export function initPity(seed: number): PityState {
  return {
    pullsSinceEpicOrBetter: 0,
    pullsSinceLegendary: 0,
    rngState: seedFrom(seed),
  };
}

/**
 * Perform a single pull. Given the current pity state and the set of owned
 * companion ids (used to decide dup→shards), returns which companion was
 * pulled, whether it's a new addition, and how many shards were awarded on
 * duplicates. Pure — advances rngState + pity counters in the returned state.
 */
export function pull(
  pity: PityState,
  ownedIds: ReadonlySet<string>,
): { outcome: PullOutcome; pity: PityState } {
  let state = pity.rngState;
  let pullsSinceEpic = pity.pullsSinceEpicOrBetter + 1;
  let pullsSinceLegend = pity.pullsSinceLegendary + 1;

  // Decide rarity.
  let rarity: Rarity;
  if (pullsSinceLegend > LEGENDARY_PITY_AFTER) {
    rarity = 'legendary';
  } else if (pullsSinceEpic > EPIC_PITY_AFTER) {
    // Roll between epic and legendary weighted by their base rates.
    const r = rngNext(state);
    state = r.state;
    const total = BASE_RATES.epic + BASE_RATES.legendary;
    rarity = r.value < BASE_RATES.legendary / total ? 'legendary' : 'epic';
  } else {
    const rarities: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
    const weights = rarities.map((r) => BASE_RATES[r]);
    const p = pickWeighted(state, rarities, weights);
    state = p.state;
    rarity = p.value;
  }

  // Reset pity counters when hitting the tier.
  if (rarity === 'legendary') {
    pullsSinceLegend = 0;
    pullsSinceEpic = 0;
  } else if (rarity === 'epic') {
    pullsSinceEpic = 0;
  }

  // Pick a companion of that rarity.
  const pool = companionsByRarity(rarity);
  if (pool.length === 0) throw new Error(`no companions for rarity ${rarity}`);
  const p2 = pickWeighted(state, pool, pool.map(() => 1));
  state = p2.state;
  const companion = p2.value;

  const isNew = !ownedIds.has(companion.id);
  const shardsAwarded = isNew ? 0 : DUPLICATE_SHARDS[rarity];

  return {
    outcome: { companion, isNew, shardsAwarded },
    pity: {
      pullsSinceEpicOrBetter: pullsSinceEpic,
      pullsSinceLegendary: pullsSinceLegend,
      rngState: state,
    },
  };
}

/** Convenience: initialize a fresh owned companion record. */
export function ownFresh(id: string, now: number): OwnedCompanion {
  return {
    id,
    xp: 0,
    level: 1,
    tier: 1,
    shards: 0,
    acquiredAt: now,
  };
}

/** Debug helper: expected rate summary for tests / balance docs. */
export function ratesSummary(): { rarity: Rarity; rate: number }[] {
  return (Object.keys(BASE_RATES) as Rarity[]).map((r) => ({
    rarity: r,
    rate: BASE_RATES[r],
  }));
}
