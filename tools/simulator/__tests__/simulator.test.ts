import { simulateLevel } from '../runner';
import { LEVELS, getLevel } from '../../../src/levels/catalog';

describe('simulator', () => {
  test('deterministic under fixed seed stride 0', () => {
    const level = getLevel('level-001')!;
    const a = simulateLevel(level, { attemptsPerLevel: 3, seedStride: 0 });
    const b = simulateLevel(level, { attemptsPerLevel: 3, seedStride: 0 });
    expect(a.wins).toBe(b.wins);
    expect(a.aps).toBe(b.aps);
    expect(a.meanMovesRemaining).toBe(b.meanMovesRemaining);
    expect(a.medianFailMargin).toBe(b.medianFailMargin);
  });

  test('sanity: at least the first tutorial has APS ~1 with 6 attempts', () => {
    const level = getLevel('level-001')!;
    const r = simulateLevel(level, { attemptsPerLevel: 6 });
    expect(r.wins).toBe(r.attempts);
    expect(r.aps).toBe(1);
  });

  test('hard level runs to completion under the bot without hanging', () => {
    const level = LEVELS.find((l) => l.archetype === 'hard');
    if (!level) return;
    const r = simulateLevel(level, { attemptsPerLevel: 3 });
    expect(r.attempts).toBe(3);
    expect(r.duration_ms).toBeLessThan(30000);
  });
});
