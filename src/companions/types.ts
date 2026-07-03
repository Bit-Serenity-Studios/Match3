import type { TileColor } from '../engine/types';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type PassiveEffect =
  | {
      kind: 'chargedDropBoost';
      color: TileColor;
      /** Additive drop-weight boost, e.g. 0.15 = +15%. */
      boost: number;
    }
  | {
      kind: 'globalDropBoost';
      /** Boost applied to every color. Legendary-tier effect. */
      boost: number;
    };

export type ActiveAbility =
  | {
      kind: 'spawnPrism';
      /** Number of affinity-color matches needed to charge. */
      cost: number;
    }
  | {
      kind: 'spawnBomb';
      cost: number;
    }
  | {
      kind: 'shuffleBoard';
      cost: number;
    };

export interface CompanionDef {
  id: string;
  name: string;
  rarity: Rarity;
  affinityColor: TileColor;
  /** Per-tier passive effects (index 0 = base, 1 = evolved, 2 = ascended). */
  passives: PassiveEffect[];
  active: ActiveAbility;
  /** XP required to reach level N (index 0 = to reach lvl 2). */
  xpCurve: number[];
  /** Level required to unlock each evolution tier (index 0 = tier 2). */
  evolutionAt: number[];
  /** Shards required at each evolution step (index 0 = tier 1→2). */
  evolutionShards: number[];
  /** Short flavor line shown in the collection UI. */
  flavor: string;
}

export interface OwnedCompanion {
  id: string;
  xp: number;
  level: number;
  tier: number; // 1..3
  shards: number;
  acquiredAt: number; // ms epoch
}
