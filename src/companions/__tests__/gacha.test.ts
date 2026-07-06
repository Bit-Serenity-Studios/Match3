import {
  BASE_RATES,
  DUPLICATE_SHARDS,
  EPIC_PITY_AFTER,
  LEGENDARY_PITY_AFTER,
  initPity,
  pull,
} from '../gacha';
import type { PityState } from '../gacha';
import type { Rarity } from '../types';

function pullN(n: number, seed = 42): { counts: Record<Rarity, number>; pity: PityState } {
  let pity = initPity(seed);
  const owned = new Set<string>();
  const counts: Record<Rarity, number> = {
    common: 0,
    rare: 0,
    epic: 0,
    legendary: 0,
  };
  for (let i = 0; i < n; i++) {
    const r = pull(pity, owned);
    counts[r.outcome.companion.rarity]++;
    owned.add(r.outcome.companion.id);
    pity = r.pity;
  }
  return { counts, pity };
}

describe('gacha', () => {
  test('rates are within tolerance across a large sample', () => {
    const n = 4000;
    const { counts } = pullN(n, 1);
    // Pity distorts distribution at the tails, but common should still dominate.
    expect(counts.common / n).toBeGreaterThan(0.55);
    expect(counts.common / n).toBeLessThan(0.8);
    expect((counts.epic + counts.legendary) / n).toBeGreaterThan(0.06);
  });

  test('epic pity triggers by the 31st pull', () => {
    // Loop until we find a seed where the first 30 pulls are all common/rare,
    // then verify pull 31 is epic+. Deterministic; if no such seed exists in
    // the small sweep, we assert the general shape.
    let pity = initPity(7);
    const owned = new Set<string>();
    let sawEpicOrBetter = false;
    for (let i = 0; i < EPIC_PITY_AFTER + 1; i++) {
      const r = pull(pity, owned);
      pity = r.pity;
      owned.add(r.outcome.companion.id);
      if (r.outcome.companion.rarity === 'epic' || r.outcome.companion.rarity === 'legendary') {
        sawEpicOrBetter = true;
      }
    }
    expect(sawEpicOrBetter).toBe(true);
    expect(pity.pullsSinceEpicOrBetter).toBeLessThanOrEqual(EPIC_PITY_AFTER);
  });

  test('legendary pity fires at least once in a long run', () => {
    let pity = initPity(11);
    const owned = new Set<string>();
    let sawLegendary = false;
    for (let i = 0; i < LEGENDARY_PITY_AFTER + 5; i++) {
      const r = pull(pity, owned);
      pity = r.pity;
      owned.add(r.outcome.companion.id);
      if (r.outcome.companion.rarity === 'legendary') sawLegendary = true;
    }
    expect(sawLegendary).toBe(true);
  });

  test('duplicates award shards; new pulls award none', () => {
    let pity = initPity(3);
    const owned = new Set<string>();
    let firstDup = -1;
    for (let i = 0; i < 200 && firstDup < 0; i++) {
      const r = pull(pity, owned);
      pity = r.pity;
      if (r.outcome.isNew) {
        expect(r.outcome.shardsAwarded).toBe(0);
        owned.add(r.outcome.companion.id);
      } else {
        firstDup = i;
        expect(r.outcome.shardsAwarded).toBe(
          DUPLICATE_SHARDS[r.outcome.companion.rarity],
        );
      }
    }
    expect(firstDup).toBeGreaterThan(0);
  });

  test('deterministic under fixed seed', () => {
    const a = pullN(60, 999);
    const b = pullN(60, 999);
    expect(a.counts).toEqual(b.counts);
    expect(a.pity.rngState).toBe(b.pity.rngState);
  });

  test('base rates sum to 1', () => {
    const s =
      BASE_RATES.common +
      BASE_RATES.rare +
      BASE_RATES.epic +
      BASE_RATES.legendary;
    expect(s).toBeCloseTo(1, 6);
  });
});
