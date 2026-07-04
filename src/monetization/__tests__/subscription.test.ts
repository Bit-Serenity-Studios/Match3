import {
  SUBSCRIPTION_PERIOD_MS,
  activate,
  canClaimDailyDrip,
  claimDailyDrip,
  initSubscription,
  isActive,
} from '../subscription';

const T0 = 1_700_000_000_000;

describe('subscription', () => {
  test('starts inactive', () => {
    const s = initSubscription();
    expect(s.active).toBe(false);
    expect(isActive(s, T0)).toBe(false);
  });

  test('activate stamps 30 days out', () => {
    const s = activate(initSubscription(), T0);
    expect(s.active).toBe(true);
    expect(s.expiresAt).toBe(T0 + SUBSCRIPTION_PERIOD_MS);
    expect(s.cosmeticNameplate).toBe(true);
  });

  test('daily drip can be claimed once per 24h', () => {
    const s = activate(initSubscription(), T0);
    const first = claimDailyDrip(s, T0);
    expect(first?.grantGems).toBeGreaterThan(0);
    const soon = claimDailyDrip(first!.next, T0 + 60_000);
    expect(soon).toBeNull();
    const nextDay = claimDailyDrip(first!.next, T0 + 25 * 60 * 60 * 1000);
    expect(nextDay?.grantGems).toBeGreaterThan(0);
  });

  test('canClaim returns false when not active', () => {
    expect(canClaimDailyDrip(initSubscription(), T0)).toBe(false);
  });

  test('expires after the period', () => {
    const s = activate(initSubscription(), T0);
    expect(isActive(s, T0 + SUBSCRIPTION_PERIOD_MS + 1)).toBe(false);
  });
});
