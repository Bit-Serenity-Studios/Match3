import {
  bumpCount,
  canShow,
  dayKey,
  MYSTERY_TABLE,
  prune,
  rollMystery,
  todayCount,
} from '../ads';
import { AD_DAILY_CAPS } from '../types';

const T0 = Date.UTC(2026, 6, 3, 12, 0, 0);
const T_TOMORROW = T0 + 24 * 3600 * 1000;

describe('ad caps', () => {
  test('empty counters → count is 0, can show', () => {
    expect(todayCount({}, 'coinDouble', T0)).toBe(0);
    expect(canShow({}, 'coinDouble', T0)).toBe(true);
  });

  test('bumpCount + canShow honor caps', () => {
    let c = {};
    for (let i = 0; i < AD_DAILY_CAPS.coinDouble; i++) {
      c = bumpCount(c, 'coinDouble', T0);
    }
    expect(canShow(c, 'coinDouble', T0)).toBe(false);
  });

  test('day flip resets counters (per-day dict, not per-count)', () => {
    let c = bumpCount({}, 'mysteryBox', T0);
    expect(canShow(c, 'mysteryBox', T0)).toBe(false);
    expect(canShow(c, 'mysteryBox', T_TOMORROW)).toBe(true);
  });

  test('prune drops old day entries', () => {
    let c: Record<string, any> = {};
    c[dayKey(T0 - 10 * 24 * 3600 * 1000)] = { coinDouble: 3 };
    c[dayKey(T0)] = { coinDouble: 1 };
    const pruned = prune(c, T0);
    expect(pruned[dayKey(T0)]).toBeDefined();
    expect(pruned[dayKey(T0 - 10 * 24 * 3600 * 1000)]).toBeUndefined();
  });
});

describe('mystery box', () => {
  test('rollMystery returns a real table entry', () => {
    const r = rollMystery(42);
    expect(MYSTERY_TABLE).toContain(r);
  });

  test('common outcomes dominate over jackpots in a large sample', () => {
    const counts: Record<string, number> = {};
    for (let seed = 0; seed < 500; seed++) {
      const r = rollMystery(seed);
      counts[r.label] = (counts[r.label] ?? 0) + 1;
    }
    // Small payout should appear far more than the jackpot.
    expect(counts['A few coins']!).toBeGreaterThan((counts['The Rare Draught'] ?? 0) * 5);
  });
});
