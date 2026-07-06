import {
  initStreak,
  onContinueUsed,
  onLossFinal,
  onWin,
  preLevelBoosters,
  tierFor,
  STREAK_TIERS,
} from '../streak';

describe('streak', () => {
  test('starts at zero, no tier', () => {
    const s = initStreak();
    expect(s.count).toBe(0);
    expect(tierFor(s.count)).toBeNull();
  });

  test('onWin increments count and best', () => {
    let s = initStreak();
    for (let i = 1; i <= 8; i++) {
      s = onWin(s, `L${i}`);
      expect(s.count).toBe(i);
      expect(s.best).toBe(i);
    }
  });

  test('onLossFinal resets count but keeps best', () => {
    let s = initStreak();
    for (let i = 1; i <= 5; i++) s = onWin(s, `L${i}`);
    const after = onLossFinal(s);
    expect(after.count).toBe(0);
    expect(after.best).toBe(5);
  });

  test('onContinueUsed preserves the streak', () => {
    let s = initStreak();
    for (let i = 1; i <= 4; i++) s = onWin(s, `L${i}`);
    expect(onContinueUsed(s).count).toBe(4);
  });

  test('tierFor returns the correct tier at 3/5/7', () => {
    expect(tierFor(2)).toBeNull();
    expect(tierFor(3)?.at).toBe(3);
    expect(tierFor(4)?.at).toBe(3);
    expect(tierFor(5)?.at).toBe(5);
    expect(tierFor(6)?.at).toBe(5);
    expect(tierFor(7)?.at).toBe(7);
    expect(tierFor(100)?.at).toBe(7);
  });

  test('preLevelBoosters grants nothing below tier 3', () => {
    expect(preLevelBoosters({ count: 2, best: 2, lastWinLevelId: null })).toEqual({});
  });

  test('preLevelBoosters escalates by tier', () => {
    const at3 = preLevelBoosters({ count: 3, best: 3, lastWinLevelId: null });
    const at5 = preLevelBoosters({ count: 5, best: 5, lastWinLevelId: null });
    const at7 = preLevelBoosters({ count: 7, best: 7, lastWinLevelId: null });
    expect(Object.keys(at3).length).toBeLessThan(Object.keys(at7).length);
    expect((at7.preLevelExtraMoves ?? 0)).toBeGreaterThanOrEqual((at3.preLevelExtraMoves ?? 0));
  });

  test('STREAK_TIERS thresholds are 3/5/7 as specified', () => {
    expect(STREAK_TIERS.map((t) => t.at)).toEqual([3, 5, 7]);
  });
});
