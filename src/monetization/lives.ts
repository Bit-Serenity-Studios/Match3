/**
 * Lives system — 5 max, 30-min regeneration.
 *
 * State model: `count` (current) + `refillAt` (epoch ms of the next
 * incoming life if count < max). Time-based, so it survives cold start —
 * we recompute count from `now` on every read via `sync`. This lets us
 * be honest about local-clock cheating without dedicated storage.
 */

export const LIVES_MAX = 5;
export const LIFE_REGEN_MINUTES = 30;
export const LIFE_REGEN_MS = LIFE_REGEN_MINUTES * 60 * 1000;

export interface LivesState {
  count: number;
  /** Epoch ms of the next life delivery. 0 means "full — no timer". */
  refillAt: number;
}

export function initLives(now: number): LivesState {
  return { count: LIVES_MAX, refillAt: 0 };
}

/** Reconcile stored lives against wall-clock `now`. Adds any regenerated
 *  lives that have accrued while the app was closed and recomputes the
 *  next refill target. Idempotent. */
export function sync(state: LivesState, now: number): LivesState {
  if (state.count >= LIVES_MAX) return { count: LIVES_MAX, refillAt: 0 };
  if (state.refillAt === 0) {
    return { count: state.count, refillAt: now + LIFE_REGEN_MS };
  }
  if (now < state.refillAt) return state;
  const overflow = now - state.refillAt;
  const extra = 1 + Math.floor(overflow / LIFE_REGEN_MS);
  const nextCount = Math.min(LIVES_MAX, state.count + extra);
  if (nextCount >= LIVES_MAX) {
    return { count: LIVES_MAX, refillAt: 0 };
  }
  const consumed = nextCount - state.count;
  const nextRefill = state.refillAt + consumed * LIFE_REGEN_MS;
  return { count: nextCount, refillAt: nextRefill };
}

/** Spend one life on a level start. Returns null if none available. */
export function spendLife(state: LivesState, now: number): LivesState | null {
  const s = sync(state, now);
  if (s.count <= 0) return null;
  const wasFull = s.count === LIVES_MAX;
  return {
    count: s.count - 1,
    refillAt: wasFull ? now + LIFE_REGEN_MS : s.refillAt,
  };
}

/** Grant `n` lives (from a rewarded ad rescue, purchase, or refill IAP).
 *  Capped at LIVES_MAX. */
export function grantLives(
  state: LivesState,
  n: number,
  now: number,
): LivesState {
  const s = sync(state, now);
  const nextCount = Math.min(LIVES_MAX, s.count + n);
  if (nextCount >= LIVES_MAX) return { count: LIVES_MAX, refillAt: 0 };
  return { count: nextCount, refillAt: s.refillAt };
}

/** Milliseconds until next life arrives. 0 if full. */
export function msUntilNextLife(state: LivesState, now: number): number {
  const s = sync(state, now);
  if (s.count >= LIVES_MAX) return 0;
  return Math.max(0, s.refillAt - now);
}
