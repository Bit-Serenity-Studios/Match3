import {
  GEM_PACKS,
  STARTER_BUNDLE,
  PIGGY_BANK_UNLOCK,
  SUBSCRIPTION_MONTHLY,
  ALL_SKUS,
  getSku,
} from '../catalog';
import { accrue, claim, emptyPiggy, isRipe, PIGGY_CAP_GEMS } from '../piggyBank';

describe('store catalog', () => {
  test('gem packs exist across four tiers', () => {
    expect(GEM_PACKS).toHaveLength(4);
  });

  test('decoy is priced-per-gem worse than mid-tier value', () => {
    const mid = GEM_PACKS.find((p) => p.tag === 'value')!;
    const decoy = GEM_PACKS.find((p) => p.tag === 'decoy')!;
    const midRatio = mid.priceUsdCents / mid.reward.gems;
    const decoyRatio = decoy.priceUsdCents / decoy.reward.gems;
    // Decoy MUST cost more per gem than the "value" pack — that's the point.
    expect(decoyRatio).toBeGreaterThan(midRatio);
  });

  test('starter bundle is marked and gives lives + gems + coins', () => {
    expect(STARTER_BUNDLE.tag).toBe('starter');
    expect(STARTER_BUNDLE.reward.lives).toBeGreaterThan(0);
    expect(STARTER_BUNDLE.reward.gems).toBeGreaterThan(0);
    expect(STARTER_BUNDLE.reward.coins).toBeGreaterThan(0);
  });

  test('subscription has a duration', () => {
    expect(SUBSCRIPTION_MONTHLY.subDurationDays).toBe(30);
  });

  test('getSku finds each SKU', () => {
    for (const s of ALL_SKUS) {
      expect(getSku(s.id)?.id).toBe(s.id);
    }
    expect(getSku('does-not-exist')).toBeNull();
  });

  test('PIGGY_BANK_UNLOCK has its own SKU', () => {
    expect(PIGGY_BANK_UNLOCK.kind).toBe('piggyBankUnlock');
  });
});

describe('piggy bank', () => {
  test('accrue increments balance and lifetime', () => {
    const r = accrue(emptyPiggy(), 100);
    expect(r.state.balance).toBeGreaterThan(0);
    expect(r.state.lifetime).toBe(r.state.balance);
  });

  test('accrue caps at PIGGY_CAP_GEMS and reports spillage', () => {
    let s = emptyPiggy();
    for (let i = 0; i < 20; i++) {
      s = accrue(s, 1000).state;
    }
    expect(s.balance).toBe(PIGGY_CAP_GEMS);
    const final = accrue(s, 1000);
    expect(final.spilled).toBeGreaterThan(0);
    expect(final.state.balance).toBe(PIGGY_CAP_GEMS);
  });

  test('claim empties balance and grants gems', () => {
    let s = emptyPiggy();
    s = accrue(s, 200).state;
    const before = s.balance;
    const r = claim(s);
    expect(r.gemsGranted).toBe(before);
    expect(r.state.balance).toBe(0);
    expect(r.state.claimsCount).toBe(1);
  });

  test('isRipe fires near cap', () => {
    let s = emptyPiggy();
    for (let i = 0; i < 15; i++) s = accrue(s, 1000).state;
    expect(isRipe(s)).toBe(true);
    expect(isRipe(emptyPiggy())).toBe(false);
  });
});
