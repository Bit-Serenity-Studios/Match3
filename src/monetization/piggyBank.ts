/**
 * Piggy Bank — soft-lock accumulation.
 *
 * Gems trickle in from qualifying play actions (level wins, expedition
 * claim jackpots) into a locked bank. Balance is capped at MAX. A one-time
 * "Crack the Piggy" IAP transfers the balance into the main gem wallet
 * and resets the bank for the next fill cycle.
 */

export const PIGGY_MAX_GEMS = 250;

/** Base gems dripped into the piggy per event. */
export const PIGGY_DRIP = {
  levelWin: 1,
  hardLevelWin: 3,
  expeditionClaim: 2,
} as const;

export interface PiggyState {
  gems: number;
  totalEverEarned: number;
  cycleId: number;
}

export const initPiggy = (): PiggyState => ({
  gems: 0,
  totalEverEarned: 0,
  cycleId: 1,
});

export function drip(state: PiggyState, amount: number): PiggyState {
  if (amount <= 0) return state;
  const next = Math.min(PIGGY_MAX_GEMS, state.gems + amount);
  const added = next - state.gems;
  return {
    gems: next,
    totalEverEarned: state.totalEverEarned + added,
    cycleId: state.cycleId,
  };
}

export function crack(state: PiggyState): { grantGems: number; next: PiggyState } {
  const grant = state.gems;
  return {
    grantGems: grant,
    next: {
      gems: 0,
      totalEverEarned: state.totalEverEarned,
      cycleId: state.cycleId + 1,
    },
  };
}

export function isFull(state: PiggyState): boolean {
  return state.gems >= PIGGY_MAX_GEMS;
}
