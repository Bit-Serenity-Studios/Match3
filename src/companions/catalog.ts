import type { CompanionDef } from './types';

/**
 * Hand-authored companion roster. Numbers here are all tunables — think of
 * this file as the game-design source of truth for meta-progression pacing.
 *
 * Distribution: 4 common / 3 rare / 2 epic / 1 legendary. This matches the
 * gacha odds table (see gacha.ts) so pulls feel varied but bounded.
 */
export const COMPANIONS: readonly CompanionDef[] = [
  // ── Common ────────────────────────────────────────────────
  {
    id: 'lumen-moth',
    name: 'Lumen Moth',
    rarity: 'common',
    affinityColor: 'moonpetal',
    passives: [
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.06 },
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.15 },
    ],
    active: { kind: 'spawnPrism', cost: 22 },
    xpCurve: [8, 20, 40, 75, 120],
    evolutionAt: [3, 5],
    evolutionShards: [8, 25],
    flavor: 'Drawn to lamplight and to any word half-remembered.',
  },
  {
    id: 'marsh-toad',
    name: 'Marsh Toad',
    rarity: 'common',
    affinityColor: 'vial',
    passives: [
      { kind: 'chargedDropBoost', color: 'vial', boost: 0.06 },
      { kind: 'chargedDropBoost', color: 'vial', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'vial', boost: 0.15 },
    ],
    active: { kind: 'spawnBomb', cost: 18 },
    xpCurve: [8, 20, 40, 75, 120],
    evolutionAt: [3, 5],
    evolutionShards: [8, 25],
    flavor: 'Blinks slow. Swallows secrets.',
  },
  {
    id: 'slate-newt',
    name: 'Slate Newt',
    rarity: 'common',
    affinityColor: 'runestone',
    passives: [
      { kind: 'chargedDropBoost', color: 'runestone', boost: 0.06 },
      { kind: 'chargedDropBoost', color: 'runestone', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'runestone', boost: 0.15 },
    ],
    active: { kind: 'spawnBomb', cost: 20 },
    xpCurve: [8, 20, 40, 75, 120],
    evolutionAt: [3, 5],
    evolutionShards: [8, 25],
    flavor: 'Curls around the warm side of a stone.',
  },
  {
    id: 'reed-sparrow',
    name: 'Reed Sparrow',
    rarity: 'common',
    affinityColor: 'mushroom',
    passives: [
      { kind: 'chargedDropBoost', color: 'mushroom', boost: 0.06 },
      { kind: 'chargedDropBoost', color: 'mushroom', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'mushroom', boost: 0.15 },
    ],
    active: { kind: 'spawnPrism', cost: 24 },
    xpCurve: [8, 20, 40, 75, 120],
    evolutionAt: [3, 5],
    evolutionShards: [8, 25],
    flavor: 'Keeps a small hoard of dried petals.',
  },
  // ── Rare ──────────────────────────────────────────────────
  {
    id: 'emberling-fox',
    name: 'Emberling Fox',
    rarity: 'rare',
    affinityColor: 'resin',
    passives: [
      { kind: 'chargedDropBoost', color: 'resin', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'resin', boost: 0.15 },
      { kind: 'chargedDropBoost', color: 'resin', boost: 0.2 },
    ],
    active: { kind: 'spawnBomb', cost: 15 },
    xpCurve: [12, 30, 60, 110, 180],
    evolutionAt: [4, 7],
    evolutionShards: [15, 40],
    flavor: 'Warms its paws on the kettle. Nobody minds.',
  },
  {
    id: 'crescent-owl',
    name: 'Crescent Owl',
    rarity: 'rare',
    affinityColor: 'runestone',
    passives: [
      { kind: 'chargedDropBoost', color: 'runestone', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'runestone', boost: 0.15 },
      { kind: 'chargedDropBoost', color: 'runestone', boost: 0.22 },
    ],
    active: { kind: 'shuffleBoard', cost: 30 },
    xpCurve: [12, 30, 60, 110, 180],
    evolutionAt: [4, 7],
    evolutionShards: [15, 40],
    flavor: 'Reads by starlight; never learned the letters.',
  },
  {
    id: 'ivy-cat',
    name: 'Ivy Cat',
    rarity: 'rare',
    affinityColor: 'moonpetal',
    passives: [
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.1 },
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.15 },
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.22 },
    ],
    active: { kind: 'spawnPrism', cost: 18 },
    xpCurve: [12, 30, 60, 110, 180],
    evolutionAt: [4, 7],
    evolutionShards: [15, 40],
    flavor: 'The plants are hers, actually. She lets you keep them.',
  },
  // ── Epic ──────────────────────────────────────────────────
  {
    id: 'astral-toad',
    name: 'Astral Toad',
    rarity: 'epic',
    affinityColor: 'vial',
    passives: [
      { kind: 'chargedDropBoost', color: 'vial', boost: 0.15 },
      { kind: 'chargedDropBoost', color: 'vial', boost: 0.22 },
      { kind: 'chargedDropBoost', color: 'vial', boost: 0.3 },
    ],
    active: { kind: 'spawnPrism', cost: 12 },
    xpCurve: [18, 45, 90, 160, 260],
    evolutionAt: [5, 9],
    evolutionShards: [30, 90],
    flavor: 'Old enough to remember the moon in daylight.',
  },
  {
    id: 'widowmoth',
    name: 'Widowmoth',
    rarity: 'epic',
    affinityColor: 'moonpetal',
    passives: [
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.15 },
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.22 },
      { kind: 'chargedDropBoost', color: 'moonpetal', boost: 0.3 },
    ],
    active: { kind: 'spawnBomb', cost: 10 },
    xpCurve: [18, 45, 90, 160, 260],
    evolutionAt: [5, 9],
    evolutionShards: [30, 90],
    flavor: 'Left a note. Nobody has read it yet.',
  },
  // ── Legendary ─────────────────────────────────────────────
  {
    id: 'moonchild-spirit',
    name: 'Moonchild Fox Spirit',
    rarity: 'legendary',
    affinityColor: 'resin',
    passives: [
      { kind: 'globalDropBoost', boost: 0.05 },
      { kind: 'globalDropBoost', boost: 0.08 },
      { kind: 'globalDropBoost', boost: 0.12 },
    ],
    active: { kind: 'spawnPrism', cost: 8 },
    xpCurve: [30, 80, 160, 280, 450],
    evolutionAt: [6, 11],
    evolutionShards: [50, 150],
    flavor: 'Nine tails, one candle. Not a metaphor.',
  },
];

export function getCompanion(id: string): CompanionDef | null {
  return COMPANIONS.find((c) => c.id === id) ?? null;
}

export function companionsByRarity(
  r: CompanionDef['rarity'],
): readonly CompanionDef[] {
  return COMPANIONS.filter((c) => c.rarity === r);
}
