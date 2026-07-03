import {
  activate,
  claimDrip,
  emptySubscription,
  isActive,
  pendingDripGems,
  SUB_DRIP_MS,
} from '../subscription';

const T0 = 1_700_000_000_000;

describe('subscription', () => {
  test('empty is inactive, no drip', () => {
    const s = emptySubscription();
    expect(isActive(s, T0)).toBe(false);
    expect(pendingDripGems(s, T0)).toBe(0);
  });

  test('activate turns it on for the duration', () => {
    const s = activate(emptySubscription(), T0, 30);
    expect(isActive(s, T0)).toBe(true);
    expect(isActive(s, T0 + 30 * SUB_DRIP_MS - 1)).toBe(true);
    expect(isActive(s, T0 + 30 * SUB_DRIP_MS)).toBe(false);
  });

  test('drip pays out one day at a time', () => {
    const s = activate(emptySubscription(), T0, 30);
    expect(pendingDripGems(s, T0)).toBe(0);
    expect(pendingDripGems(s, T0 + SUB_DRIP_MS)).toBeGreaterThan(0);
    expect(pendingDripGems(s, T0 + 3 * SUB_DRIP_MS)).toBeGreaterThan(
      pendingDripGems(s, T0 + SUB_DRIP_MS),
    );
  });

  test('claimDrip stamps time and returns pending gems', () => {
    let s = activate(emptySubscription(), T0, 30);
    const c1 = claimDrip(s, T0 + 3 * SUB_DRIP_MS);
    expect(c1.gems).toBeGreaterThan(0);
    // After stamping, another claim at the same moment yields 0.
    const c2 = claimDrip(c1.state, T0 + 3 * SUB_DRIP_MS);
    expect(c2.gems).toBe(0);
  });

  test('re-activating an active sub extends the end date', () => {
    let s = activate(emptySubscription(), T0, 30);
    const originalEnd = s.activeUntil!;
    s = activate(s, T0 + 5 * SUB_DRIP_MS, 30);
    expect(s.activeUntil!).toBeGreaterThan(originalEnd);
  });
});
