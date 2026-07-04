import { MYSTERY_BOX_TABLE, MockProvider, rollMysteryBox } from '../provider';
import { STARTER_BUNDLE, SUBSCRIPTION } from '../catalog';

describe('MockProvider', () => {
  test('successful purchase returns grants matching the catalog', async () => {
    const p = new MockProvider(() => 1);
    const r = await p.purchase(STARTER_BUNDLE.sku);
    expect(r.success).toBe(true);
    expect(r.grants).toEqual(STARTER_BUNDLE.grants);
    expect(p.log.some((e) => e.action === 'purchase')).toBe(true);
  });

  test('unknown sku fails cleanly', async () => {
    const p = new MockProvider();
    const r = await p.purchase('gems.nope');
    expect(r.success).toBe(false);
    expect(r.reason).toBe('unknown_sku');
  });

  test('subscribe only succeeds for subscription SKUs', async () => {
    const p = new MockProvider();
    const ok = await p.subscribe(SUBSCRIPTION.sku);
    expect(ok.success).toBe(true);
    const bad = await p.subscribe('gems.small');
    expect(bad.success).toBe(false);
  });

  test('showRewardedAd for coin double returns coins == baseCoins', async () => {
    const p = new MockProvider();
    const r = await p.showRewardedAd('coinDoublePostLevel', { baseCoins: 90 });
    expect(r?.grants.coins).toBe(90);
  });

  test('rescue ad grants a life', async () => {
    const p = new MockProvider();
    const r = await p.showRewardedAd('outOfLivesRescue');
    expect(r?.grants.lives).toBe(1);
  });
});

describe('mystery box odds', () => {
  test('table weights sum to a positive total', () => {
    expect(MYSTERY_BOX_TABLE.reduce((s, e) => s + e.weight, 0)).toBeGreaterThan(0);
  });

  test('rolls are deterministic given seed', () => {
    for (let seed = 1; seed < 20; seed++) {
      const a = rollMysteryBox(seed);
      const b = rollMysteryBox(seed);
      expect(a).toEqual(b);
    }
  });

  test('jackpot happens but is rare over a broad sample', () => {
    let jackpots = 0;
    let smalls = 0;
    const N = 5000;
    for (let s = 1; s <= N; s++) {
      const r = rollMysteryBox(s * 7919);
      if (r.label === 'jackpot_gems') jackpots++;
      if (r.label === 'small_coins') smalls++;
    }
    // Jackpot weight is 2 out of 100 → ~2% expected. LCG-driven sampling
    // is not uniform in the statistical sense, so we give a generous band.
    expect(jackpots).toBeGreaterThan(0);
    expect(jackpots).toBeLessThan(N * 0.05);
    expect(smalls).toBeGreaterThan(N * 0.4);
  });
});
