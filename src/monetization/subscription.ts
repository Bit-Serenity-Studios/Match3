/**
 * "Apprentice's Oath" — the monthly subscription stub.
 *
 * Effects:
 *  - Removes interstitial ads
 *  - Daily gem drip (30 gems / day, per DAILY_SUB_GEMS in catalog.ts)
 *  - Cosmetic nameplate accent (visual-only)
 *
 * Storage: profile holds (activeUntil, lastDripAt). Pure predicates and
 * drip logic here; the real store integration talks to the provider.
 */
import { DAILY_SUB_GEMS } from './catalog';

export const SUB_DRIP_MS = 24 * 3600 * 1000;

export interface SubscriptionState {
  /** ms epoch: when the current cycle ends. null if never bought. */
  activeUntil: number | null;
  /** ms epoch of the last drip claim. */
  lastDripAt: number | null;
}

export function emptySubscription(): SubscriptionState {
  return { activeUntil: null, lastDripAt: null };
}

export function isActive(s: SubscriptionState, now: number): boolean {
  return s.activeUntil !== null && now < s.activeUntil;
}

/** Compute how many drip payouts are due since `lastDripAt`. Caps at the
 *  number of full days between lastDripAt and min(now, activeUntil). */
export function pendingDripGems(
  s: SubscriptionState,
  now: number,
): number {
  if (!isActive(s, now)) return 0;
  const anchor = s.lastDripAt ?? s.activeUntil! - 30 * SUB_DRIP_MS;
  const upTo = Math.min(now, s.activeUntil!);
  if (upTo <= anchor) return 0;
  const days = Math.floor((upTo - anchor) / SUB_DRIP_MS);
  return Math.max(0, days) * DAILY_SUB_GEMS;
}

/** Stamp a claim happening now. */
export function claimDrip(
  s: SubscriptionState,
  now: number,
): { state: SubscriptionState; gems: number } {
  const gems = pendingDripGems(s, now);
  return {
    state: { ...s, lastDripAt: gems > 0 ? now : s.lastDripAt },
    gems,
  };
}

/** Activate on successful purchase. */
export function activate(
  s: SubscriptionState,
  now: number,
  durationDays: number,
): SubscriptionState {
  const durationMs = durationDays * 24 * 3600 * 1000;
  const base = isActive(s, now) ? (s.activeUntil ?? now) : now;
  return {
    activeUntil: base + durationMs,
    lastDripAt: s.lastDripAt ?? now,
  };
}
