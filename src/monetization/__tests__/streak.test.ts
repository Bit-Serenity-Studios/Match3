import {
  STREAK_TIERS,
  applyStreakBoosters,
  currentTier,
  winsToNext,
} from '../streak';
import type { GameState } from '../../engine/types';

function makeState(): GameState {
  return {
    levelId: 'test',
    board: {
      width: 3,
      height: 3,
      mask: new Array(9).fill(true),
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
    },
    movesRemaining: 10,
    score: 0,
    progress: [],
    status: 'active',
    difficultyMod: 0,
    objectives: [],
    dropWeights: {
      moonpetal: 1,
      vial: 1,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    },
    turn: 0,
  };
}

describe('streak system', () => {
  test('below threshold, no tier active', () => {
    expect(currentTier(0)).toBeNull();
    expect(currentTier(2)).toBeNull();
  });

  test('tier 1 activates at 3 wins', () => {
    expect(currentTier(3)?.label).toBe('Kindled');
  });

  test('tier 2 at 5, tier 3 at 7, and above stays at top', () => {
    expect(currentTier(5)?.label).toBe('Simmering');
    expect(currentTier(7)?.label).toBe('Roaring');
    expect(currentTier(30)?.label).toBe('Roaring');
  });

  test('winsToNext counts down correctly', () => {
    expect(winsToNext(0)).toBe(3);
    expect(winsToNext(3)).toBe(2);
    expect(winsToNext(5)).toBe(2);
    expect(winsToNext(7)).toBeNull();
  });

  test('applyStreakBoosters at streak 0 is a no-op', () => {
    const s = makeState();
    const out = applyStreakBoosters(s, 0, 1);
    expect(out).toEqual(s);
  });

  test('tier 1 grants extraMoves only', () => {
    const s = makeState();
    const out = applyStreakBoosters(s, 3, 1);
    expect(out.movesRemaining).toBe(10 + STREAK_TIERS[0]!.extraMoves);
    // no specials expected at tier 1
    for (const t of out.board.tiles) {
      expect(t?.special).toBeUndefined();
    }
  });

  test('tier 2 grants extraMoves + a freeSpecial', () => {
    const s = makeState();
    const out = applyStreakBoosters(s, 5, 42);
    expect(out.movesRemaining).toBe(10 + STREAK_TIERS[1]!.extraMoves);
    const specials = out.board.tiles.filter((t) => t?.special).length;
    expect(specials).toBe(1);
    const kind = out.board.tiles.find((t) => t?.special)?.special;
    expect(kind).toBe(STREAK_TIERS[1]!.freeSpecial);
  });

  test('deterministic under fixed seed', () => {
    const a = applyStreakBoosters(makeState(), 7, 99);
    const b = applyStreakBoosters(makeState(), 7, 99);
    expect(a.board.tiles).toEqual(b.board.tiles);
  });
});
