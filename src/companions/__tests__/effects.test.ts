import {
  applyDropMultipliers,
  chargeFromEvents,
  passiveDropMultipliers,
  castAbility,
} from '../effects';
import { getCompanion } from '../catalog';
import { ownFresh } from '../gacha';
import type { BoardEvent, BoardSnapshot } from '../../engine/types';
import { getTile } from '../../engine/board';

describe('companion passive effects', () => {
  test('no companion → identity multipliers', () => {
    const m = passiveDropMultipliers(null, null);
    expect(m).toEqual({
      moonpetal: 1,
      vial: 1,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    });
  });

  test('common companion boosts only its affinity color', () => {
    const def = getCompanion('lumen-moth')!;
    const owned = ownFresh('lumen-moth', 0);
    const m = passiveDropMultipliers(owned, def);
    expect(m.moonpetal).toBeCloseTo(1 + def.passives[0]!.boost);
    expect(m.vial).toBe(1);
  });

  test('legendary companion boosts all colors', () => {
    const def = getCompanion('moonchild-spirit')!;
    const owned = ownFresh('moonchild-spirit', 0);
    const m = passiveDropMultipliers(owned, def);
    for (const c of Object.keys(m) as (keyof typeof m)[]) {
      expect(m[c]).toBeGreaterThan(1);
    }
  });

  test('applyDropMultipliers composes correctly', () => {
    const base = {
      moonpetal: 1,
      vial: 2,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    };
    const mult = {
      moonpetal: 1.2,
      vial: 1,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    };
    expect(applyDropMultipliers(base, mult)).toEqual({
      moonpetal: 1.2,
      vial: 2,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    });
  });
});

describe('active-ability charge tracking', () => {
  test('chargeFromEvents counts affinity-color match cells only', () => {
    const events: BoardEvent[] = [
      { t: 'match', cells: [{ row: 0, col: 0 }, { row: 0, col: 1 }], length: 3, shape: 'line', color: 'moonpetal' },
      { t: 'match', cells: [{ row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }], length: 3, shape: 'line', color: 'vial' },
    ];
    expect(chargeFromEvents(events, 'moonpetal')).toBe(2);
    expect(chargeFromEvents(events, 'vial')).toBe(3);
    expect(chargeFromEvents(events, 'resin')).toBe(0);
  });
});

describe('active-ability cast', () => {
  const board: BoardSnapshot = {
    width: 3,
    height: 3,
    mask: [true, true, true, true, true, true, true, true, true],
    tiles: [
      { color: 'moonpetal' },
      { color: 'vial' },
      { color: 'runestone' },
      { color: 'resin' },
      { color: 'mushroom' },
      { color: 'moonpetal' },
      { color: 'vial' },
      { color: 'runestone' },
      { color: 'resin' },
    ],
    rngState: 1,
    ivyStepsSinceSpread: 0,
  };
  const state = { board } as any;

  test('spawnPrism transforms one tile to a prism special', () => {
    const b = castAbility(state, { kind: 'spawnPrism', cost: 1 }, 42);
    let prisms = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (getTile(b, { row: r, col: c })?.special === 'prism') prisms++;
      }
    }
    expect(prisms).toBe(1);
  });

  test('shuffleBoard produces a valid re-shuffled board', () => {
    const b = castAbility(state, { kind: 'shuffleBoard', cost: 1 }, 42);
    expect(b.width).toBe(3);
    expect(b.height).toBe(3);
  });

  test('deterministic under same seed', () => {
    const a = castAbility(state, { kind: 'spawnBomb', cost: 1 }, 7);
    const b = castAbility(state, { kind: 'spawnBomb', cost: 1 }, 7);
    expect(a.tiles).toEqual(b.tiles);
  });
});
