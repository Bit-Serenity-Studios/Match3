/**
 * Piggy Bank: passively accumulates a fraction of every gem/coin the player
 * would have earned into a locked balance. Player pays a one-time IAP to
 * unlock and claim, then the piggy resets and starts filling again.
 *
 * Cap prevents the piggy from becoming a whale trap: once full, further
 * earnings simply don't accrue (a "spill" event that the UI surfaces as a
 * conversion nudge).
 */
export const PIGGY_CAP_GEMS = 500;
/** Fraction of hard-currency earnings (level wins, expeditions) that drip
 *  into the piggy — separate from what the player pockets directly. */
export const PIGGY_ACCRUE_RATE = 0.35;

export interface PiggyState {
  balance: number;
  /** Number of times the player has unlocked. Used for offer cadence. */
  claimsCount: number;
  /** Total accrued over lifetime — analytics + segmented-offer input. */
  lifetime: number;
}

export function emptyPiggy(): PiggyState {
  return { balance: 0, claimsCount: 0, lifetime: 0 };
}

/** Accrue a fraction of `earnedGems` into the piggy. Returns the new state
 *  and the amount that spilled (dropped because the cap was hit). */
export function accrue(
  s: PiggyState,
  earnedGems: number,
): { state: PiggyState; spilled: number } {
  if (earnedGems <= 0) return { state: s, spilled: 0 };
  const dripped = Math.round(earnedGems * PIGGY_ACCRUE_RATE);
  const nextBalance = Math.min(PIGGY_CAP_GEMS, s.balance + dripped);
  const actuallyStored = nextBalance - s.balance;
  const spilled = dripped - actuallyStored;
  return {
    state: {
      balance: nextBalance,
      claimsCount: s.claimsCount,
      lifetime: s.lifetime + dripped,
    },
    spilled,
  };
}

/** Called after a successful piggy-unlock IAP. Returns (state, gemsGranted). */
export function claim(s: PiggyState): { state: PiggyState; gemsGranted: number } {
  const gemsGranted = s.balance;
  return {
    state: {
      balance: 0,
      claimsCount: s.claimsCount + 1,
      lifetime: s.lifetime,
    },
    gemsGranted,
  };
}

/** True if the piggy is "worth" unlocking now (>= 80% of cap). Used by the
 *  UI to draw attention. */
export function isRipe(s: PiggyState): boolean {
  return s.balance >= PIGGY_CAP_GEMS * 0.8;
}
