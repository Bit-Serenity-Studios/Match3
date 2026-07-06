/**
 * Apprentice's Oath — monthly subscription stub.
 *
 *   Removes interstitials
 *   Delivers a daily gem drip (claimed via a per-day cooldown)
 *   Unlocks a cosmetic nameplate flag (surfaces in profile UI)
 *
 * Real subscription lifecycle (renewal, receipt validation) is handled by
 * the real MonetizationProvider — this module only exposes the derived
 * state a screen needs to render.
 */

export const DAILY_GEM_DRIP = 5;
export const SUBSCRIPTION_PERIOD_DAYS = 30;
export const SUBSCRIPTION_PERIOD_MS =
  SUBSCRIPTION_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface SubscriptionState {
  active: boolean;
  expiresAt: number;
  /** Epoch ms of the last claimed daily drip. 0 means never claimed. */
  lastDailyDripAt: number;
  cosmeticNameplate: boolean;
}

export const initSubscription = (): SubscriptionState => ({
  active: false,
  expiresAt: 0,
  lastDailyDripAt: 0,
  cosmeticNameplate: false,
});

export function isActive(state: SubscriptionState, now: number): boolean {
  return state.active && state.expiresAt > now;
}

export function activate(
  state: SubscriptionState,
  now: number,
): SubscriptionState {
  const base = Math.max(now, state.expiresAt);
  return {
    active: true,
    expiresAt: base + SUBSCRIPTION_PERIOD_MS,
    lastDailyDripAt: state.lastDailyDripAt,
    cosmeticNameplate: true,
  };
}

/** Can the player claim today's gem drip? Simple 24h cooldown from the
 *  last claim. */
export function canClaimDailyDrip(
  state: SubscriptionState,
  now: number,
): boolean {
  if (!isActive(state, now)) return false;
  return now - state.lastDailyDripAt >= 24 * 60 * 60 * 1000;
}

export function claimDailyDrip(
  state: SubscriptionState,
  now: number,
): { grantGems: number; next: SubscriptionState } | null {
  if (!canClaimDailyDrip(state, now)) return null;
  return {
    grantGems: DAILY_GEM_DRIP,
    next: { ...state, lastDailyDripAt: now },
  };
}
