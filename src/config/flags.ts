/**
 * Feature flags. All monetization surfaces read from here so we can ship
 * every UI slot but keep the actual purchase/ad providers off until real
 * SDKs (RevenueCat / AdMob) are wired in. Flip a flag to true to enable
 * a surface end-to-end against the mock provider.
 *
 * These are hard-coded for Phase 4. Wire a remote-config plugin in Phase 5
 * so we can flip in prod without a release.
 */
export const FEATURE_FLAGS = {
  iapEnabled: true, // gem packs, starter bundle, piggy bank unlock, sub
  adsEnabled: true, // rewarded ads + interstitials
  battlePassEnabled: true,
  piggyBankEnabled: true,
  segmentedOffersEnabled: true,
  subscriptionEnabled: true,
  /** If true, interstitials never show. Set by the profile once a purchase
   *  or an active subscription is detected — but exposed here as an
   *  override in case an internal user wants to disable them globally. */
  suppressInterstitialsOverride: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] === true;
}
