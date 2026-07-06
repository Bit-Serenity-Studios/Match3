import {
  GEM_PACKAGES,
  PIGGY_UNLOCK,
  PRODUCTS,
  STARTER_BUNDLE,
  SUBSCRIPTION,
  gemsPerDollar,
  getProduct,
} from '../catalog';

describe('gem catalog decoy anchoring', () => {
  test('all gem packages are registered in PRODUCTS', () => {
    for (const p of GEM_PACKAGES) {
      expect(PRODUCTS).toContain(p);
    }
  });

  test('best_value SKU has the best gems-per-dollar rate among gems', () => {
    const rates = GEM_PACKAGES.map((p) => ({ sku: p.sku, rate: gemsPerDollar(p.sku) }));
    const best = rates.reduce((a, b) => (b.rate > a.rate ? b : a));
    const badgedBest = GEM_PACKAGES.find((p) => p.badge === 'best_value');
    expect(badgedBest).toBeDefined();
    expect(badgedBest!.sku).toBe(best.sku);
  });

  test('anchor SKU is priced above best_value but at a worse gems-per-dollar', () => {
    const anchor = GEM_PACKAGES.find((p) => p.badge === 'anchor')!;
    const best = GEM_PACKAGES.find((p) => p.badge === 'best_value')!;
    expect(anchor.priceUsdCents).toBeGreaterThan(best.priceUsdCents);
    expect(gemsPerDollar(anchor.sku)).toBeLessThan(gemsPerDollar(best.sku));
  });

  test('starter bundle is one-shot with gems + coins + boosters', () => {
    expect(STARTER_BUNDLE.oneShot).toBe(true);
    expect(STARTER_BUNDLE.grants.gems).toBeGreaterThan(0);
    expect(STARTER_BUNDLE.grants.coins).toBeGreaterThan(0);
    expect(Object.keys(STARTER_BUNDLE.grants.boosters ?? {}).length).toBeGreaterThan(0);
  });

  test('piggy unlock and subscription are on the catalog', () => {
    expect(getProduct(PIGGY_UNLOCK.sku)).not.toBeNull();
    expect(getProduct(SUBSCRIPTION.sku)).not.toBeNull();
  });

  test('subscription bundles a gem drip payload', () => {
    expect(SUBSCRIPTION.grants.gems).toBeGreaterThan(0);
    expect(SUBSCRIPTION.grants.subscriptionDays).toBeGreaterThan(0);
  });
});
