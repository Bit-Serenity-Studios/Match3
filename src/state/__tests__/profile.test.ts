import { difficultyEaseFor, MAX_DIFFICULTY_EASE } from '../profile';

describe('difficultyEaseFor', () => {
  test('no ease below threshold', () => {
    for (let i = 0; i < 4; i++) {
      expect(difficultyEaseFor(i)).toBe(0);
    }
  });

  test('ease kicks in at 4 consecutive fails', () => {
    expect(difficultyEaseFor(4)).toBeGreaterThan(0);
  });

  test('ease is bounded', () => {
    for (let i = 4; i < 100; i++) {
      const e = difficultyEaseFor(i);
      expect(e).toBeGreaterThan(0);
      expect(e).toBeLessThanOrEqual(MAX_DIFFICULTY_EASE);
    }
  });

  test('ease is monotonically non-decreasing', () => {
    let prev = 0;
    for (let i = 0; i < 20; i++) {
      const e = difficultyEaseFor(i);
      expect(e).toBeGreaterThanOrEqual(prev);
      prev = e;
    }
  });
});
