/**
 * Apothecary hub fixtures. Fixed slots — no inventory management, no
 * placement puzzles. The player unlocks a slot with coins, then upgrades
 * each fixture through three tiers. Every tier grants a small permanent
 * meta bonus, so the hub feels like it's paying rent.
 */

export type FixtureId = 'cauldron' | 'herbWall' | 'teaCorner';

export interface FixtureDef {
  id: FixtureId;
  name: string;
  slot: number; // display order; 0-based
  maxLevel: number;
  /** Coin cost to reach level `n` from level `n-1`. Index 0 = unlock (0→1). */
  costPerLevel: number[];
  /** Effect at each level. Level 0 = not built (no effect). */
  effects: FixtureEffect[];
  flavor: string;
}

export type FixtureEffect =
  | { kind: 'coinBonus'; percent: number } // % boost to coins earned per level win
  | { kind: 'emberBonus'; percent: number } // % boost to embers earned per level win
  | { kind: 'expeditionSpeedup'; percent: number }; // % reduction in expedition duration

export const FIXTURES: readonly FixtureDef[] = [
  {
    id: 'cauldron',
    name: 'Brass Cauldron',
    slot: 0,
    maxLevel: 3,
    costPerLevel: [200, 500, 1200],
    effects: [
      { kind: 'emberBonus', percent: 0 },
      { kind: 'emberBonus', percent: 15 },
      { kind: 'emberBonus', percent: 30 },
      { kind: 'emberBonus', percent: 50 },
    ],
    flavor: 'Always warm. Never boils over.',
  },
  {
    id: 'herbWall',
    name: 'Hanging Herb Wall',
    slot: 1,
    maxLevel: 3,
    costPerLevel: [300, 800, 1800],
    effects: [
      { kind: 'coinBonus', percent: 0 },
      { kind: 'coinBonus', percent: 15 },
      { kind: 'coinBonus', percent: 30 },
      { kind: 'coinBonus', percent: 50 },
    ],
    flavor: 'Bunches of thyme, lavender, and one thing you can\'t identify.',
  },
  {
    id: 'teaCorner',
    name: 'Reading Tea Corner',
    slot: 2,
    maxLevel: 3,
    costPerLevel: [400, 1000, 2500],
    effects: [
      { kind: 'expeditionSpeedup', percent: 0 },
      { kind: 'expeditionSpeedup', percent: 5 },
      { kind: 'expeditionSpeedup', percent: 12 },
      { kind: 'expeditionSpeedup', percent: 20 },
    ],
    flavor: 'A companion always finds their way here before you notice.',
  },
];

export function getFixture(id: FixtureId): FixtureDef | null {
  return FIXTURES.find((f) => f.id === id) ?? null;
}

/** Coin cost to upgrade from `currentLevel` to `currentLevel + 1`. Returns
 *  null if already at max. */
export function upgradeCost(id: FixtureId, currentLevel: number): number | null {
  const f = getFixture(id);
  if (!f) return null;
  if (currentLevel >= f.maxLevel) return null;
  return f.costPerLevel[currentLevel] ?? null;
}

/** Sum of active effects across all fixtures at their current levels. */
export function computeFixtureBonuses(
  levels: Partial<Record<FixtureId, number>>,
): { coinBonusPct: number; emberBonusPct: number; expeditionSpeedupPct: number } {
  let coin = 0;
  let ember = 0;
  let speed = 0;
  for (const f of FIXTURES) {
    const lv = levels[f.id] ?? 0;
    const eff = f.effects[lv];
    if (!eff) continue;
    if (eff.kind === 'coinBonus') coin += eff.percent;
    else if (eff.kind === 'emberBonus') ember += eff.percent;
    else if (eff.kind === 'expeditionSpeedup') speed += eff.percent;
  }
  return {
    coinBonusPct: coin,
    emberBonusPct: ember,
    expeditionSpeedupPct: speed,
  };
}
