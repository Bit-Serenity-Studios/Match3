/**
 * Lives with 30-minute regen. Pure functions — the profile holds a
 * (lives, regenAt) pair and every read materializes the current lives
 * by projecting stored values forward against `Date.now()`.
 *
 * Invariants:
 *  - lives ∈ [0, MAX_LIVES]
 *  - regenAt is null iff lives == MAX_LIVES
 *  - consuming a life while at MAX_LIVES stamps regenAt = now
 *  - adding a life while at (MAX_LIVES-1) with regenAt < now stamps
 *    regenAt = null once we hit MAX_LIVES again
 */
export const MAX_LIVES = 5;
export const LIFE_REGEN_MS = 30 * 60 * 1000;

export interface LivesState {
  lives: number;
  /** ms epoch: the timestamp at which the NEXT life will be earned.
   *  null when at max lives (no regen needed). */
  regenAt: number | null;
}

/** Project stored state forward to "now" and return the materialized
 *  lives count plus the (possibly-updated) regenAt. */
export function materializeLives(s: LivesState, now: number): LivesState {
  if (s.lives >= MAX_LIVES) return { lives: MAX_LIVES, regenAt: null };
  if (s.regenAt == null) {
    // Malformed input: below max but no regen scheduled. Recover.
    return { lives: s.lives, regenAt: now + LIFE_REGEN_MS };
  }
  if (now < s.regenAt) return s;
  // Compute how many full regen ticks have elapsed.
  const elapsedTicks = 1 + Math.floor((now - s.regenAt) / LIFE_REGEN_MS);
  const gained = Math.min(MAX_LIVES - s.lives, elapsedTicks);
  const newLives = s.lives + gained;
  if (newLives >= MAX_LIVES) return { lives: MAX_LIVES, regenAt: null };
  return {
    lives: newLives,
    regenAt: s.regenAt + gained * LIFE_REGEN_MS,
  };
}

/** Decrement one life. If we were at max, stamp regenAt = now + full window. */
export function consumeLife(s: LivesState, now: number): LivesState {
  const proj = materializeLives(s, now);
  if (proj.lives <= 0) return proj;
  const nextLives = proj.lives - 1;
  if (nextLives === 0) {
    return { lives: 0, regenAt: now + LIFE_REGEN_MS };
  }
  // If we were at max, no regen was scheduled; start it.
  const regenAt = proj.regenAt ?? now + LIFE_REGEN_MS;
  return { lives: nextLives, regenAt };
}

/** Add lives — from ad rescue, IAP, or fixture bonus. Caps at MAX_LIVES.
 *  If addition reaches max, clears regenAt. */
export function grantLives(
  s: LivesState,
  n: number,
  now: number,
): LivesState {
  const proj = materializeLives(s, now);
  const nextLives = Math.min(MAX_LIVES, proj.lives + n);
  if (nextLives >= MAX_LIVES) return { lives: MAX_LIVES, regenAt: null };
  return { lives: nextLives, regenAt: proj.regenAt ?? now + LIFE_REGEN_MS };
}

export function msUntilNextLife(s: LivesState, now: number): number {
  if (s.lives >= MAX_LIVES || s.regenAt == null) return 0;
  return Math.max(0, s.regenAt - now);
}
