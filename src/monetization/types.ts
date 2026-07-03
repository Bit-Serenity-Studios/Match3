/**
 * Types shared across the monetization layer. Kept engine-free so a Node
 * simulator or a headless test can exercise them.
 */

// ── SKUs ──────────────────────────────────────────────────────────────
export type SkuKind =
  | 'gems' // pure gem pack
  | 'bundle' // gems + coins + extras (starter, segmented offer, etc.)
  | 'subscription' // Apprentice's Oath
  | 'piggyBankUnlock'; // one-time claim of the piggy bank balance

export interface Sku {
  id: string;
  kind: SkuKind;
  title: string;
  priceUsdCents: number; // for reference / decoy anchoring
  /** Contents delivered on purchase. Piggy Bank unlocks and subs override this. */
  reward: {
    gems: number;
    coins: number;
    embers: number;
    lives: number;
  };
  /** Marketing accents. */
  tag?: 'value' | 'decoy' | 'starter' | 'limited';
  /** Duration in days for subscriptions. */
  subDurationDays?: number;
}

// ── Ads ───────────────────────────────────────────────────────────────
export type AdPlacement =
  | 'rescueLife' // out-of-lives rescue
  | 'coinDouble' // post-level 2x coin multiplier
  | 'mysteryBox' // daily spin
  | 'extraMoves' // one-per-day rescue for out-of-moves
  | 'interstitialReturnToHub';

// Placement caps (per calendar day). Rewarded ads have small caps by design.
export const AD_DAILY_CAPS: Record<AdPlacement, number> = {
  rescueLife: 3,
  coinDouble: 5,
  mysteryBox: 1,
  extraMoves: 1, // strictly one per day per brief
  interstitialReturnToHub: 6,
};

// ── Provider results ──────────────────────────────────────────────────
export interface PurchaseResult {
  ok: boolean;
  sku: string;
  transactionId?: string;
  error?: string;
}

export interface AdResult {
  ok: boolean;
  placement: AdPlacement;
  /** true if the user watched the ad to completion (rewarded); false if they
   *  dismissed early. Interstitials always resolve ok=true. */
  rewarded: boolean;
  error?: string;
}

// ── The provider interface ────────────────────────────────────────────
export interface MonetizationProvider {
  readonly name: string;
  purchase(sku: Sku): Promise<PurchaseResult>;
  showRewardedAd(placement: AdPlacement): Promise<AdResult>;
  showInterstitial(placement: AdPlacement): Promise<AdResult>;
  isPurchaseAvailable(): Promise<boolean>;
  isAdAvailable(placement: AdPlacement): Promise<boolean>;
}
