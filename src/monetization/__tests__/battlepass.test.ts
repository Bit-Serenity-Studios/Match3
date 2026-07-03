import {
  PASS_DURATION_MS,
  PASS_TIERS,
  addXp,
  currentTier,
  isExpired,
  msRemaining,
  newPass,
  pendingClaimSummary,
  rewardAt,
  xpToNextTier,
  xpToReach,
} from '../battlepass';

const T0 = 1_700_000_000_000;

describe('battle pass', () => {
  test('newPass starts at tier 0 with 0 xp', () => {
    const p = newPass('s1', T0);
    expect(p.xp).toBe(0);
    expect(p.claimedFree).toBe(0);
    expect(p.premiumOwned).toBe(false);
  });

  test('currentTier is monotonic with xp', () => {
    let prev = 0;
    for (let xp = 0; xp <= xpToReach(PASS_TIERS); xp += 50) {
      const t = currentTier(xp);
      expect(t).toBeGreaterThanOrEqual(prev);
      prev = t;
    }
  });

  test('xpToNextTier grows linearly', () => {
    expect(xpToNextTier(0)).toBeLessThan(xpToNextTier(1));
    expect(xpToNextTier(1)).toBeLessThan(xpToNextTier(5));
  });

  test('addXp accumulates', () => {
    const p = addXp(newPass('s1', T0), 500);
    expect(p.xp).toBe(500);
    expect(currentTier(p.xp)).toBeGreaterThan(0);
  });

  test('pass expires after 14 days', () => {
    const p = newPass('s1', T0);
    expect(isExpired(p, T0)).toBe(false);
    expect(isExpired(p, T0 + PASS_DURATION_MS)).toBe(true);
    expect(msRemaining(p, T0 + 1)).toBe(PASS_DURATION_MS - 1);
  });

  test('rewardAt returns positive rewards on both tracks', () => {
    const r = rewardAt(5);
    expect(r.free.coins).toBeGreaterThan(0);
    expect(r.premium.gems).toBeGreaterThan(0);
  });

  test('pendingClaimSummary lists unclaimed tiers on both tracks', () => {
    let p = newPass('s1', T0);
    p = addXp(p, xpToReach(3));
    p = { ...p, premiumOwned: true };
    const s = pendingClaimSummary(p);
    expect(s.freeTiers.length).toBe(3);
    expect(s.premiumTiers.length).toBe(3);
  });

  test('premium tiers only shown when premium owned', () => {
    let p = newPass('s1', T0);
    p = addXp(p, xpToReach(2));
    const s = pendingClaimSummary(p);
    expect(s.freeTiers.length).toBe(2);
    expect(s.premiumTiers.length).toBe(0);
  });
});
