import {
  BASE_REWARDS,
  computeRewards,
  durationMs,
  isReady,
  msRemaining,
} from '../rewards';

describe('expedition rewards', () => {
  test('common companion short expedition returns base rewards ±20%', () => {
    const r = computeRewards('lumen-moth', 'short', 1);
    expect(r.coins).toBeGreaterThanOrEqual(Math.floor(BASE_REWARDS.short.coins * 0.8));
    expect(r.coins).toBeLessThanOrEqual(Math.ceil(BASE_REWARDS.short.coins * 1.2));
    expect(r.embers).toBe(BASE_REWARDS.short.embers);
  });

  test('epic companion returns more than common at the same duration', () => {
    // Compare across many seeds to average out jitter.
    let epicTotal = 0;
    let commonTotal = 0;
    for (let seed = 1; seed < 40; seed++) {
      epicTotal += computeRewards('astral-toad', 'medium', seed).coins;
      commonTotal += computeRewards('marsh-toad', 'medium', seed).coins;
    }
    expect(epicTotal).toBeGreaterThan(commonTotal);
  });

  test('long expedition sometimes drops a gem', () => {
    let gemsSeen = 0;
    for (let seed = 0; seed < 400; seed++) {
      const r = computeRewards('emberling-fox', 'long', seed);
      gemsSeen += r.gems;
    }
    // 400 pulls at ~10% chance ≈ 40 expected. Broad tolerance.
    expect(gemsSeen).toBeGreaterThan(15);
    expect(gemsSeen).toBeLessThan(90);
  });

  test('durations map to correct ms values', () => {
    expect(durationMs('short')).toBe(30 * 60 * 1000);
    expect(durationMs('medium')).toBe(120 * 60 * 1000);
    expect(durationMs('long')).toBe(480 * 60 * 1000);
  });

  test('msRemaining + isReady', () => {
    expect(msRemaining(100, 90)).toBe(10);
    expect(msRemaining(100, 200)).toBe(0);
    expect(isReady(100, 100)).toBe(true);
    expect(isReady(100, 99)).toBe(false);
  });

  test('same seed → identical rewards', () => {
    const a = computeRewards('lumen-moth', 'medium', 555);
    const b = computeRewards('lumen-moth', 'medium', 555);
    expect(a).toEqual(b);
  });
});
