import type { CompanionDef, OwnedCompanion, PassiveEffect } from './types';
import { getCompanion } from './catalog';

/**
 * Add XP to an owned companion, cascading level-ups as long as the XP
 * threshold for the next level fits. Pure. Never mutates its input.
 * Level is capped at xpCurve.length + 1 (so the last curve entry is the
 * XP required to reach the max level).
 */
export function addXp(
  owned: OwnedCompanion,
  amount: number,
): OwnedCompanion {
  const def = getCompanion(owned.id);
  if (!def || amount <= 0) return owned;
  let xp = owned.xp + amount;
  let level = owned.level;
  const maxLevel = def.xpCurve.length + 1;
  while (level < maxLevel) {
    const need = def.xpCurve[level - 1] ?? Infinity;
    if (xp < need) break;
    xp -= need;
    level++;
  }
  if (level >= maxLevel) xp = 0;
  return { ...owned, xp, level };
}

export interface EvolveResult {
  owned: OwnedCompanion;
  evolved: boolean;
  reason?: 'ok' | 'levelTooLow' | 'notEnoughShards' | 'maxTier';
}

/**
 * Attempt to evolve a companion to the next tier. Requires both the level
 * threshold and shard cost per `def.evolutionAt` / `def.evolutionShards`.
 * Pure.
 */
export function evolve(owned: OwnedCompanion): EvolveResult {
  const def = getCompanion(owned.id);
  if (!def) return { owned, evolved: false, reason: 'ok' };
  const nextTier = owned.tier + 1;
  if (nextTier > def.passives.length) {
    return { owned, evolved: false, reason: 'maxTier' };
  }
  const requiredLevel = def.evolutionAt[owned.tier - 1] ?? Infinity;
  const requiredShards = def.evolutionShards[owned.tier - 1] ?? Infinity;
  if (owned.level < requiredLevel) {
    return { owned, evolved: false, reason: 'levelTooLow' };
  }
  if (owned.shards < requiredShards) {
    return { owned, evolved: false, reason: 'notEnoughShards' };
  }
  return {
    owned: {
      ...owned,
      tier: nextTier,
      shards: owned.shards - requiredShards,
    },
    evolved: true,
    reason: 'ok',
  };
}

/** The passive effect currently active for a companion, based on its tier. */
export function currentPassive(
  owned: OwnedCompanion,
  def: CompanionDef,
): PassiveEffect | null {
  const idx = Math.min(owned.tier, def.passives.length) - 1;
  return def.passives[idx] ?? null;
}

/**
 * Fraction 0..1 toward the next level. When at max level, returns 1.
 * Useful for progress bars.
 */
export function xpProgress(owned: OwnedCompanion): {
  fraction: number;
  need: number;
} {
  const def = getCompanion(owned.id);
  if (!def) return { fraction: 0, need: 0 };
  const maxLevel = def.xpCurve.length + 1;
  if (owned.level >= maxLevel) return { fraction: 1, need: 0 };
  const need = def.xpCurve[owned.level - 1] ?? Infinity;
  return { fraction: Math.min(1, owned.xp / need), need };
}
