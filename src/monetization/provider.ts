import type {
  AdContext,
  AdPlacement,
  AdRewardResult,
  ProductDef,
  PurchaseResult,
  SubscriptionStatus,
} from './types';
import { PRODUCTS, getProduct } from './catalog';

/**
 * Adapter contract for real IAP + ad SDKs (RevenueCat, AdMob, etc.). Every
 * call is Promise-based even where synchronous — the real SDKs are all
 * async and the mock mirrors that so screens don't need a swap when the
 * real provider drops in.
 */
export interface MonetizationProvider {
  init(): Promise<void>;

  /** Full catalog (mock returns the local list; real providers filter by
   *  the store's price-loaded set). */
  listProducts(): Promise<ProductDef[]>;

  purchase(sku: string): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult[]>;

  subscribe(sku: string): Promise<PurchaseResult>;
  querySubscription(sku: string): Promise<SubscriptionStatus>;

  loadRewardedAd(placement: AdPlacement): Promise<void>;
  showRewardedAd(
    placement: AdPlacement,
    ctx?: AdContext,
  ): Promise<AdRewardResult | null>;

  loadInterstitial(): Promise<void>;
  showInterstitial(): Promise<boolean>;
}

/** Log line captured by MockProvider. Real code should never depend on the
 *  format — this is telemetry-into-memory for the dev dashboard. */
export interface MockLogEntry {
  at: number;
  action: string;
  detail: Record<string, unknown>;
}

/** Deterministic seeded roll for a Mystery Box payout. Rare jackpot is
 *  strictly capped by table weights and by the daily placement cap set in
 *  the ads config; keeps the ad economy from mints inflating past the IAP
 *  benchmark (~20-30% of an IAP dollar). */
export const MYSTERY_BOX_TABLE: ReadonlyArray<{
  weight: number;
  label: string;
  grants: { coins?: number; gems?: number; embers?: number };
}> = [
  { weight: 55, label: 'small_coins', grants: { coins: 40 } },
  { weight: 25, label: 'medium_coins', grants: { coins: 120 } },
  { weight: 12, label: 'embers', grants: { embers: 8 } },
  { weight: 6, label: 'medium_gems', grants: { gems: 3 } },
  { weight: 2, label: 'jackpot_gems', grants: { gems: 25 } },
];

/**
 * Deterministic mystery-box roll. Exposed for the ad provider AND for
 * tests / the dashboard preview. Simple weighted table — sum of weights
 * defines the denominator, seed is a 32-bit int.
 */
export function rollMysteryBox(seed: number): {
  label: string;
  grants: { coins?: number; gems?: number; embers?: number };
} {
  const total = MYSTERY_BOX_TABLE.reduce((s, e) => s + e.weight, 0);
  // Small deterministic LCG step so we don't depend on the engine's RNG here.
  const x = (seed * 1103515245 + 12345) & 0x7fffffff;
  const roll = x % total;
  let acc = 0;
  for (const entry of MYSTERY_BOX_TABLE) {
    acc += entry.weight;
    if (roll < acc) return { label: entry.label, grants: entry.grants };
  }
  const last = MYSTERY_BOX_TABLE[MYSTERY_BOX_TABLE.length - 1]!;
  return { label: last.label, grants: last.grants };
}

/** Grants awarded per rewarded-ad placement. `coinDoublePostLevel` and
 *  `mysteryBoxDaily` compute grants dynamically; the rescue is fixed. */
export const REWARDED_AD_GRANTS: Record<AdPlacement, { lives?: number }> = {
  outOfLivesRescue: { lives: 1 },
  coinDoublePostLevel: {},
  mysteryBoxDaily: {},
  interstitialHubReturn: {},
};

/**
 * MockProvider — instant-success, logged. Suitable for Expo Go dev + jest.
 * Real providers replace this at App boot.
 */
export class MockProvider implements MonetizationProvider {
  readonly log: MockLogEntry[] = [];
  private readonly clock: () => number;
  private txCounter = 1;

  constructor(clock: () => number = () => Date.now()) {
    this.clock = clock;
  }

  private note(action: string, detail: Record<string, unknown> = {}): void {
    this.log.push({ at: this.clock(), action, detail });
  }

  private nextTx(): string {
    return `mock-tx-${this.txCounter++}`;
  }

  async init(): Promise<void> {
    this.note('init');
  }

  async listProducts(): Promise<ProductDef[]> {
    return PRODUCTS.slice();
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    const p = getProduct(sku);
    if (!p) {
      this.note('purchase_failed', { sku, reason: 'unknown_sku' });
      return { sku, success: false, grants: {}, reason: 'unknown_sku', txId: this.nextTx() };
    }
    this.note('purchase', { sku, priceCents: p.priceUsdCents });
    return { sku, success: true, grants: p.grants, txId: this.nextTx() };
  }

  async restore(): Promise<PurchaseResult[]> {
    this.note('restore');
    return [];
  }

  async subscribe(sku: string): Promise<PurchaseResult> {
    const p = getProduct(sku);
    if (!p || p.kind !== 'subscription') {
      this.note('subscribe_failed', { sku });
      return { sku, success: false, grants: {}, reason: 'unknown_sub', txId: this.nextTx() };
    }
    this.note('subscribe', { sku });
    return { sku, success: true, grants: p.grants, txId: this.nextTx() };
  }

  async querySubscription(sku: string): Promise<SubscriptionStatus> {
    this.note('query_subscription', { sku });
    return { active: false, expiresAt: 0 };
  }

  async loadRewardedAd(placement: AdPlacement): Promise<void> {
    this.note('rewarded_load', { placement });
  }

  async showRewardedAd(
    placement: AdPlacement,
    ctx: AdContext = {},
  ): Promise<AdRewardResult | null> {
    this.note('rewarded_shown', { placement, ctx });
    if (placement === 'coinDoublePostLevel') {
      const base = ctx.baseCoins ?? 0;
      return { placement, grants: { coins: base } };
    }
    if (placement === 'mysteryBoxDaily') {
      const seed = ctx.seed ?? this.clock();
      const roll = rollMysteryBox(seed);
      return { placement, grants: roll.grants };
    }
    const fixed = REWARDED_AD_GRANTS[placement];
    return { placement, grants: fixed };
  }

  async loadInterstitial(): Promise<void> {
    this.note('interstitial_load');
  }

  async showInterstitial(): Promise<boolean> {
    this.note('interstitial_shown');
    return true;
  }
}
