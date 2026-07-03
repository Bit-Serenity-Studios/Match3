import type {
  AdPlacement,
  AdResult,
  MonetizationProvider,
  PurchaseResult,
  Sku,
} from './types';

/**
 * Deterministic mock provider. Instant success unless configured to fail.
 * Every call is logged so a QA build shows the full monetization trace in
 * the dev dashboard (Phase 5).
 *
 * Real providers (RevenueCat, AdMob) drop in behind the same interface —
 * only the constructor call changes.
 */
export interface MockProviderOptions {
  /** Fraction of purchases that fail. Default 0. */
  purchaseFailRate?: number;
  /** Fraction of rewarded ads the user dismisses. Default 0.05 (5%). */
  adDismissRate?: number;
  /** If provided, called for every event. Useful for tests and dev dashboards. */
  onLog?: (kind: 'purchase' | 'rewarded' | 'interstitial', payload: unknown) => void;
  /** Rng seed for deterministic fail sampling. */
  seed?: number;
}

export class MockProvider implements MonetizationProvider {
  readonly name = 'mock';
  private rng: number;
  private readonly failRate: number;
  private readonly dismissRate: number;
  private readonly onLog?: (
    kind: 'purchase' | 'rewarded' | 'interstitial',
    payload: unknown,
  ) => void;

  constructor(opts: MockProviderOptions = {}) {
    this.failRate = opts.purchaseFailRate ?? 0;
    this.dismissRate = opts.adDismissRate ?? 0.05;
    this.rng = opts.seed ?? 1;
    this.onLog = opts.onLog;
  }

  private nextRandom(): number {
    // Simple LCG; adequate for probability sampling in tests/mocks.
    this.rng = (this.rng * 1664525 + 1013904223) >>> 0;
    return this.rng / 0x100000000;
  }

  async purchase(sku: Sku): Promise<PurchaseResult> {
    const roll = this.nextRandom();
    const ok = roll >= this.failRate;
    const result: PurchaseResult = ok
      ? {
          ok: true,
          sku: sku.id,
          transactionId: `mock-${sku.id}-${Math.floor(this.rng)}`,
        }
      : { ok: false, sku: sku.id, error: 'mock:userCancelled' };
    this.onLog?.('purchase', { sku: sku.id, ok, result });
    return result;
  }

  async showRewardedAd(placement: AdPlacement): Promise<AdResult> {
    const roll = this.nextRandom();
    const rewarded = roll >= this.dismissRate;
    const result: AdResult = { ok: true, placement, rewarded };
    this.onLog?.('rewarded', { placement, rewarded });
    return result;
  }

  async showInterstitial(placement: AdPlacement): Promise<AdResult> {
    const result: AdResult = { ok: true, placement, rewarded: false };
    this.onLog?.('interstitial', { placement });
    return result;
  }

  async isPurchaseAvailable(): Promise<boolean> {
    return true;
  }

  async isAdAvailable(_placement: AdPlacement): Promise<boolean> {
    return true;
  }
}

/** Process-wide default provider. Swap the constructor here (or expose a
 *  setter) once RevenueCat/AdMob adapters exist. */
let ACTIVE: MonetizationProvider = new MockProvider();

export function getProvider(): MonetizationProvider {
  return ACTIVE;
}

export function setProvider(p: MonetizationProvider): void {
  ACTIVE = p;
}
