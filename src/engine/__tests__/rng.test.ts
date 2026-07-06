import { next, nextInt, pickWeighted, seedFrom } from '../rng';

describe('rng', () => {
  test('seedFrom(0) does not stall', () => {
    const s = seedFrom(0);
    expect(s).not.toBe(0);
    const r = next(s);
    expect(r.value).toBeGreaterThanOrEqual(0);
    expect(r.value).toBeLessThan(1);
    expect(r.state).not.toBe(s);
  });

  test('same seed produces identical sequences across runs', () => {
    const seedA = seedFrom(42);
    const seedB = seedFrom(42);
    let a = seedA;
    let b = seedB;
    for (let i = 0; i < 100; i++) {
      const ra = next(a);
      const rb = next(b);
      expect(ra.value).toBe(rb.value);
      expect(ra.state).toBe(rb.state);
      a = ra.state;
      b = rb.state;
    }
  });

  test('nextInt is in range', () => {
    let s = seedFrom(7);
    for (let i = 0; i < 200; i++) {
      const r = nextInt(s, 10);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(10);
      s = r.state;
    }
  });

  test('pickWeighted respects weights approximately', () => {
    let s = seedFrom(3);
    const counts = { A: 0, B: 0 };
    const items = ['A', 'B'] as const;
    const weights = [3, 1];
    for (let i = 0; i < 4000; i++) {
      const p = pickWeighted(s, items, weights);
      counts[p.value]++;
      s = p.state;
    }
    // Expected ratio ~3:1. Allow some variance.
    expect(counts.A / counts.B).toBeGreaterThan(2.4);
    expect(counts.A / counts.B).toBeLessThan(3.8);
  });

  test('pickWeighted falls back gracefully when all weights zero', () => {
    let s = seedFrom(11);
    for (let i = 0; i < 20; i++) {
      const p = pickWeighted(s, ['A', 'B', 'C'], [0, 0, 0]);
      expect(['A', 'B', 'C']).toContain(p.value);
      s = p.state;
    }
  });
});
