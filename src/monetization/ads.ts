import type { AdPlacement } from './types';

/**
 * Ad frequency + cap policy. Every placement is capped daily. Interstitials
 * are only shown on return-to-hub transitions, never between retries, and
 * are fully suppressed for anyone who has made any purchase — that's the
 * `everPurchased` flag on the profile.
 */

export const DAILY_CAPS: Record<AdPlacement, number> = {
  outOfLivesRescue: 2,
  coinDoublePostLevel: 3,
  mysteryBoxDaily: 1,
  interstitialHubReturn: 4,
};

/** Minimum time between interstitials (ms). */
export const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;

export interface AdCounters {
  /** YYYY-MM-DD in device local time. Rotates the counters. */
  dayKey: string;
  perPlacement: Partial<Record<AdPlacement, number>>;
  /** Last interstitial epoch ms (used for the gap check). */
  lastInterstitialAt: number;
}

export const initAdCounters = (): AdCounters => ({
  dayKey: '',
  perPlacement: {},
  lastInterstitialAt: 0,
});

export function dayKeyFor(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Rotate counters if the day has changed. Idempotent. */
export function rotateDay(state: AdCounters, now: number): AdCounters {
  const k = dayKeyFor(now);
  if (state.dayKey === k) return state;
  return {
    dayKey: k,
    perPlacement: {},
    lastInterstitialAt: state.lastInterstitialAt,
  };
}

export function canShow(
  state: AdCounters,
  placement: AdPlacement,
  now: number,
  opts: { everPurchased?: boolean; subscribed?: boolean } = {},
): { allowed: boolean; reason?: string } {
  if (placement === 'interstitialHubReturn') {
    if (opts.everPurchased) return { allowed: false, reason: 'has_purchases' };
    if (opts.subscribed) return { allowed: false, reason: 'subscribed' };
    if (now - state.lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) {
      return { allowed: false, reason: 'gap_too_short' };
    }
  }
  const rotated = rotateDay(state, now);
  const cap = DAILY_CAPS[placement];
  const used = rotated.perPlacement[placement] ?? 0;
  if (used >= cap) return { allowed: false, reason: 'daily_cap' };
  return { allowed: true };
}

/** Register a successful ad view — increments counter, rotates if needed. */
export function noteShown(
  state: AdCounters,
  placement: AdPlacement,
  now: number,
): AdCounters {
  const rotated = rotateDay(state, now);
  const used = rotated.perPlacement[placement] ?? 0;
  const next: AdCounters = {
    dayKey: rotated.dayKey,
    perPlacement: { ...rotated.perPlacement, [placement]: used + 1 },
    lastInterstitialAt:
      placement === 'interstitialHubReturn' ? now : rotated.lastInterstitialAt,
  };
  return next;
}
