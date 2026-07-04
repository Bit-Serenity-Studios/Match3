import type { TileColor } from '../engine/types';

/**
 * Currency & product shapes for the monetization layer. Kept plain-data so
 * the engine, store, and screens all speak the same nouns.
 */

export type BoosterId =
  | 'plusFiveMoves'
  | 'colorBomb'
  | 'preLevelHammer'
  | 'preLevelShuffle'
  | 'preLevelExtraMoves';

/** Non-currency grants that a purchase or reward can hand out. */
export interface Grants {
  coins?: number;
  gems?: number;
  embers?: number;
  boosters?: Partial<Record<BoosterId, number>>;
  /** Extra moves granted mid-level (only from the continue screen). */
  extraMoves?: number;
  /** Fraction added to a completed level's coin reward (0.5 = +50%). */
  coinMultiplierBonus?: number;
  /** Life count granted (capped at LIVES_MAX). */
  lives?: number;
  /** Days of Apprentice's Oath subscription added. */
  subscriptionDays?: number;
}

export type ProductKind =
  | 'gems'
  | 'starterBundle'
  | 'piggyUnlock'
  | 'segmentedOffer'
  | 'subscription'
  | 'battlePass';

export interface ProductDef {
  sku: string;
  kind: ProductKind;
  /** Price in USD cents. Mock provider ignores this; real IAP looks up store-side. */
  priceUsdCents: number;
  /** Human display fallback if the real store hasn't loaded prices yet. */
  displayPrice: string;
  title: string;
  subtitle?: string;
  /** Contents delivered on successful purchase. */
  grants: Grants;
  /** One-shot (can be bought only once). Starter bundle + piggy unlock use this. */
  oneShot?: boolean;
  /** Optional tag drawn as a corner badge — "Best Value", "Popular", "Decoy". */
  badge?: 'best_value' | 'popular' | 'anchor';
}

export type AdPlacement =
  | 'outOfLivesRescue'
  | 'coinDoublePostLevel'
  | 'mysteryBoxDaily'
  | 'interstitialHubReturn';

export interface AdRewardResult {
  placement: AdPlacement;
  grants: Grants;
}

export interface PurchaseResult {
  sku: string;
  success: boolean;
  grants: Grants;
  /** Non-null on the error path. Real providers map SDK error codes here. */
  reason?: string;
  /** Real store transaction id for restore; mock synthesizes one. */
  txId: string;
}

export interface SubscriptionStatus {
  active: boolean;
  /** Epoch ms — the current period end. 0 if not subscribed. */
  expiresAt: number;
}

/** Placement-specific context passed into showRewardedAd. Kept optional so
 *  the mock provider can be exercised with a bare placement. */
export interface AdContext {
  /** For coinDoublePostLevel — the base reward we're doubling. */
  baseCoins?: number;
  /** For mysteryBoxDaily — a seed for the deterministic loot roll. */
  seed?: number;
}

/** Fine-grained blocker taxonomy used by the segmented offer engine to
 *  pick boosters that counter the level's dominant obstacle.  */
export type BlockerSignal =
  | { kind: 'blockerHeavy'; color?: TileColor }
  | { kind: 'objectiveColor'; color: TileColor }
  | { kind: 'scoreGap' };
