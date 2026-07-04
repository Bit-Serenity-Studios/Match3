import {
  SEGMENTED_OFFER_TRIGGER_FAILS,
  SEGMENTED_OFFER_TTL_MS,
  buildOfferProduct,
  detectDominantObstacle,
  mintOffer,
  purgeExpired,
  shouldTriggerOffer,
} from '../offers';
import type { LevelDef, Tile } from '../../engine/types';

const emptyMask = (w: number, h: number): boolean[] =>
  Array(w * h).fill(true) as boolean[];

const level = (patch: Partial<LevelDef>): LevelDef =>
  ({
    id: 'level-018',
    width: 6,
    height: 7,
    mask: emptyMask(6, 7),
    startingLayout: Array(6 * 7).fill(null),
    dropWeights: { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 },
    objectives: [{ kind: 'score', target: 5000 }],
    moves: 22,
    archetype: 'hard',
    ...patch,
  }) as LevelDef;

describe('segmented offers', () => {
  test('shouldTriggerOffer requires 3 fails and no active offer', () => {
    expect(shouldTriggerOffer(SEGMENTED_OFFER_TRIGGER_FAILS - 1, false)).toBe(false);
    expect(shouldTriggerOffer(SEGMENTED_OFFER_TRIGGER_FAILS, false)).toBe(true);
    expect(shouldTriggerOffer(SEGMENTED_OFFER_TRIGGER_FAILS + 5, true)).toBe(false);
  });

  test('dominant obstacle picks up a heavy blocker', () => {
    const tiles: (Tile | null)[] = Array(6 * 7).fill(null);
    for (let i = 0; i < 10; i++) {
      tiles[i] = { color: 'vial', blocker: { kind: 'frostGlass', layers: 1 } };
    }
    const obstacle = detectDominantObstacle(level({ startingLayout: tiles }));
    expect(obstacle.blockerKind).toBe('frostGlass');
    expect(obstacle.reason).toMatch(/frostGlass/);
  });

  test('dominant obstacle falls back to objective color when no blocker dominates', () => {
    const obstacle = detectDominantObstacle(
      level({ objectives: [{ kind: 'collectColor', color: 'moonpetal', count: 40 }] }),
    );
    expect(obstacle.color).toBe('moonpetal');
  });

  test('offer product boosters counter frost glass', () => {
    const product = buildOfferProduct(level({}), {
      reason: 'Melt frost',
      blockerKind: 'frostGlass',
    });
    expect(product.grants.boosters?.colorBomb).toBeGreaterThanOrEqual(1);
    expect(product.grants.boosters?.preLevelHammer).toBeGreaterThanOrEqual(1);
    expect(product.kind).toBe('segmentedOffer');
    expect(product.oneShot).toBe(true);
  });

  test('offer product for color objective includes color bomb', () => {
    const product = buildOfferProduct(level({}), {
      reason: 'Vials!',
      color: 'vial',
    });
    expect(product.grants.boosters?.colorBomb).toBeGreaterThanOrEqual(1);
    expect((product.grants.boosters?.preLevelExtraMoves ?? 0)).toBeGreaterThanOrEqual(3);
  });

  test('mintOffer stamps 15-min TTL', () => {
    const now = 1_700_000_000_000;
    const offer = mintOffer({ levelId: 'level-018', level: level({}), now });
    expect(offer.expiresAt - offer.createdAt).toBe(SEGMENTED_OFFER_TTL_MS);
    expect(offer.levelId).toBe('level-018');
  });

  test('purgeExpired removes only the expired ones', () => {
    const now = 1_700_000_000_000;
    const fresh = mintOffer({ levelId: 'level-018', level: level({}), now });
    const stale = mintOffer({
      levelId: 'level-036',
      level: level({}),
      now: now - SEGMENTED_OFFER_TTL_MS - 1,
    });
    const left = purgeExpired([fresh, stale], now);
    expect(left).toEqual([fresh]);
  });
});
