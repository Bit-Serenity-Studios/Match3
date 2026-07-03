import type { Sku } from './types';

/**
 * Storefront catalog. Order matters for the decoy anchor: the largest gem
 * pack (`decoy`) is intentionally overpriced-per-gem so the mid-tier looks
 * like the obvious value pick. Do not remove `decoy` — it's the anchor.
 *
 * Prices are in USD cents; conversion to store-formatted strings is a
 * platform-provider concern.
 */
export const GEM_PACKS: readonly Sku[] = [
  {
    id: 'gems-small',
    kind: 'gems',
    title: 'A pinch of stardust',
    priceUsdCents: 99,
    reward: { gems: 80, coins: 0, embers: 0, lives: 0 },
  },
  {
    id: 'gems-mid',
    kind: 'gems',
    title: 'A vial of stardust',
    priceUsdCents: 499,
    reward: { gems: 550, coins: 0, embers: 0, lives: 0 },
    tag: 'value',
  },
  {
    id: 'gems-large',
    kind: 'gems',
    title: 'A cauldron of stardust',
    priceUsdCents: 1999,
    reward: { gems: 2400, coins: 0, embers: 0, lives: 0 },
  },
  {
    id: 'gems-decoy',
    kind: 'gems',
    title: "A dragon's hoard",
    priceUsdCents: 9999,
    reward: { gems: 9500, coins: 0, embers: 0, lives: 0 },
    tag: 'decoy', // exists to anchor mid-tier as the value pick
  },
];

/** One-time SKU shown once per player, gated by `starterBundleClaimed`. */
export const STARTER_BUNDLE: Sku = {
  id: 'bundle-starter',
  kind: 'bundle',
  title: "Apprentice's Kit",
  priceUsdCents: 199,
  reward: { gems: 300, coins: 1500, embers: 50, lives: 5 },
  tag: 'starter',
};

/** Piggy Bank claim: player must hold the piggy full/partial balance and
 *  pay this SKU once to unlock. Balance transfers to gems on purchase. */
export const PIGGY_BANK_UNLOCK: Sku = {
  id: 'piggy-unlock',
  kind: 'piggyBankUnlock',
  title: 'Break the piggy',
  priceUsdCents: 299,
  reward: { gems: 0, coins: 0, embers: 0, lives: 0 }, // gems delivered from balance
};

/** Monthly subscription: no interstitials, daily gem drip, cosmetic accents. */
export const SUBSCRIPTION_MONTHLY: Sku = {
  id: 'sub-monthly',
  kind: 'subscription',
  title: "Apprentice's Oath",
  priceUsdCents: 499,
  reward: { gems: 30, coins: 0, embers: 0, lives: 0 }, // day-1 gems
  subDurationDays: 30,
};

export const DAILY_SUB_GEMS = 30;

/** Full flat catalog for iteration. */
export const ALL_SKUS: readonly Sku[] = [
  ...GEM_PACKS,
  STARTER_BUNDLE,
  PIGGY_BANK_UNLOCK,
  SUBSCRIPTION_MONTHLY,
];

export function getSku(id: string): Sku | null {
  return ALL_SKUS.find((s) => s.id === id) ?? null;
}
