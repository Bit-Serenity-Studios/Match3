/**
 * Phase-4 feature flags. All monetization surfaces are gated behind these
 * flags so a build can ship any combination — or none. Real deployments
 * would source values from a remote config; for now, static + overridable.
 */

export interface FeatureFlags {
  gemStore: boolean;
  livesSystem: boolean;
  continueScreen: boolean;
  streakBoosters: boolean;
  segmentedOffers: boolean;
  piggyBank: boolean;
  rewardedAds: boolean;
  interstitials: boolean;
  battlePass: boolean;
  subscription: boolean;
  starterBundle: boolean;
  /** Phase-5 dev dashboard (long-press version number). */
  devDashboard: boolean;
  /** Phase-6 flags — reserved so callers can share the same struct. */
  dailyLoginCalendar: boolean;
  pushNotifications: boolean;
  dailyBrew: boolean;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  gemStore: true,
  livesSystem: true,
  continueScreen: true,
  streakBoosters: true,
  segmentedOffers: true,
  piggyBank: true,
  rewardedAds: true,
  interstitials: true,
  battlePass: true,
  subscription: true,
  starterBundle: true,
  devDashboard: true,
  dailyLoginCalendar: true,
  pushNotifications: true,
  dailyBrew: true,
};

let currentFlags: FeatureFlags = { ...DEFAULT_FLAGS };

export function getFlags(): FeatureFlags {
  return currentFlags;
}

export function setFlags(patch: Partial<FeatureFlags>): void {
  currentFlags = { ...currentFlags, ...patch };
}

export function resetFlags(): void {
  currentFlags = { ...DEFAULT_FLAGS };
}
