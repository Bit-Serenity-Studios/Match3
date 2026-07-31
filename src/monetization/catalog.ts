import type { ProductDef } from './types';

/**
 * The gem-store catalog. Follows the classic decoy-anchor pattern:
 *
 *  Small     — cheap entry SKU that anchors "gems per dollar" downward
 *  Medium    — the intended sale (badged "Popular")
 *  Large     — better $/gem, badged "Best Value"
 *  Whale     — a large-priced SKU with an okay-but-not-great per-gem rate;
 *              its role is to make LARGE look like a bargain by contrast.
 *              Labelled "anchor" internally so we know why it exists.
 *
 * All grants are pure data — the store screen doesn't care about pricing
 * strategy, only about what gems land in the wallet.
 */
export const GEM_PACKAGES: ProductDef[] = [
  {
    sku: 'gems.small',
    kind: 'gems',
    priceUsdCents: 99,
    displayPrice: '$0.99',
    title: 'Pouch of Stars',
    subtitle: '20 stars',
    grants: { gems: 20 },
  },
  {
    sku: 'gems.medium',
    kind: 'gems',
    priceUsdCents: 499,
    displayPrice: '$4.99',
    title: 'Handful of Stars',
    subtitle: '120 stars',
    grants: { gems: 120 },
    badge: 'popular',
  },
  {
    sku: 'gems.large',
    kind: 'gems',
    priceUsdCents: 999,
    displayPrice: '$9.99',
    title: 'Bag of Stars',
    subtitle: '260 stars (+20 bonus)',
    grants: { gems: 260 },
    badge: 'best_value',
  },
  {
    sku: 'gems.whale',
    kind: 'gems',
    priceUsdCents: 4999,
    displayPrice: '$49.99',
    title: 'Vault of Stars',
    subtitle: '1200 stars',
    grants: { gems: 1200 },
    badge: 'anchor',
  },
];

export const STARTER_BUNDLE: ProductDef = {
  sku: 'bundle.starter',
  kind: 'starterBundle',
  priceUsdCents: 299,
  displayPrice: '$2.99',
  title: 'Apothecary Starter Kit',
  subtitle: 'One-time offer',
  grants: {
    gems: 80,
    coins: 500,
    embers: 40,
    boosters: {
      preLevelExtraMoves: 2,
      preLevelHammer: 2,
      preLevelShuffle: 2,
    },
  },
  oneShot: true,
  badge: 'best_value',
};

export const PIGGY_UNLOCK: ProductDef = {
  sku: 'piggy.unlock',
  kind: 'piggyUnlock',
  priceUsdCents: 299,
  displayPrice: '$2.99',
  title: 'Crack the Piggy',
  subtitle: 'Claim your saved stars',
  grants: {},
  oneShot: false,
};

export const SUBSCRIPTION: ProductDef = {
  sku: 'sub.apprentice_oath',
  kind: 'subscription',
  priceUsdCents: 499,
  displayPrice: '$4.99/mo',
  title: 'Apprentice’s Oath',
  subtitle: 'Ad-free play · 5 Stars every day · Exclusive nameplate',
  grants: {
    subscriptionDays: 30,
    gems: 5,
  },
};

export const BATTLE_PASS: ProductDef = {
  sku: 'pass.mini14.premium',
  kind: 'battlePass',
  priceUsdCents: 499,
  displayPrice: '$4.99',
  title: 'Mini-Pass Premium',
  subtitle: 'Unlocks premium track for this season',
  grants: {},
};

export const PRODUCTS: ProductDef[] = [
  ...GEM_PACKAGES,
  STARTER_BUNDLE,
  PIGGY_UNLOCK,
  SUBSCRIPTION,
  BATTLE_PASS,
];

export function getProduct(sku: string): ProductDef | null {
  return PRODUCTS.find((p) => p.sku === sku) ?? null;
}

/** Sanity check exposed for tests — asserts the decoy actually anchors. */
export function gemsPerDollar(sku: string): number {
  const p = getProduct(sku);
  if (!p || p.kind !== 'gems') return 0;
  const gems = p.grants.gems ?? 0;
  const dollars = p.priceUsdCents / 100;
  return gems / dollars;
}
