import type { GameState } from '../engine/types';

/**
 * Continue-screen pricing. Called from the fail-state overlay:
 *   priceForContinue(currentAttemptIndex) → gems
 *
 * Retry attempts on the same level get progressively more expensive so
 * players who are stuck on a wall shift toward the segmented offer or
 * a genuine give-up. Tunable, not linear.
 */

export const CONTINUE_EXTRA_MOVES = 5;

/** Escalating gem cost per continue used within the same level session.
 *  0-based index: first continue is index 0. */
export const CONTINUE_PRICE_GEMS = [40, 65, 95];

export function priceForContinue(attempt: number): number {
  if (attempt < 0) return CONTINUE_PRICE_GEMS[0]!;
  const capped = Math.min(attempt, CONTINUE_PRICE_GEMS.length - 1);
  return CONTINUE_PRICE_GEMS[capped]!;
}

/**
 * How close was the player when they ran out of moves? For each objective
 * still open we report the count still needed. The screen uses this to
 * craft the "Only N vials left!" copy that lifts continue-purchase rates.
 */
export interface ContinueSummary {
  levelId: string;
  remainingByObjective: Array<{ label: string; needed: number }>;
  totalStillNeeded: number;
}

export function summarizeFail(
  state: GameState,
  labelFor: (i: number) => string,
): ContinueSummary {
  const remainingByObjective: Array<{ label: string; needed: number }> = [];
  state.progress.forEach((p, i) => {
    if (p.done) return;
    const needed = Math.max(0, p.target - p.progress);
    if (needed <= 0) return;
    remainingByObjective.push({ label: labelFor(i), needed });
  });
  return {
    levelId: state.levelId,
    remainingByObjective,
    totalStillNeeded: remainingByObjective.reduce((s, o) => s + o.needed, 0),
  };
}
