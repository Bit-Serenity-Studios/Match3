/**
 * 14-day Mini-Pass. Free and premium tracks. Daily and weekly challenges
 * feed pass XP; every tier crosses a small XP threshold and unlocks two
 * reward stacks (one on each track). Premium track requires the pass IAP.
 *
 * Pure logic: caller passes wall-clock times, we tell it which tier is
 * active, whether the pass has expired, and which rewards await claim.
 */

export const PASS_DURATION_MS = 14 * 24 * 3600 * 1000;
export const PASS_PRICE_USD_CENTS = 499;
export const PASS_TIERS = 14;
/** XP earned per fully-completed daily and weekly challenge. */
export const DAILY_CHALLENGE_XP = 60;
export const WEEKLY_CHALLENGE_XP = 240;
/** XP required per tier (linearly rising so the last tier is a stretch). */
export function xpToNextTier(tier: number): number {
  return 100 + tier * 25;
}

export interface BattlePassState {
  seasonId: string; // e.g. "s1" — bumped when a season starts
  startedAt: number; // ms epoch
  premiumOwned: boolean;
  xp: number;
  claimedFree: number; // highest tier claimed on free track
  claimedPremium: number; // highest tier claimed on premium track (0 if not owned)
}

export interface PassReward {
  free: { coins: number; embers: number };
  premium: { coins: number; embers: number; gems: number };
}

/** Reward at a given (1-indexed) tier. Tuned so the premium track pays for
 *  itself around tier 8, and both tracks scale toward the finale. */
export function rewardAt(tier: number): PassReward {
  const scale = 1 + tier * 0.25;
  return {
    free: {
      coins: Math.round(60 * scale),
      embers: Math.round(3 * scale),
    },
    premium: {
      coins: Math.round(150 * scale),
      embers: Math.round(8 * scale),
      gems: tier % 3 === 0 ? 25 : 10,
    },
  };
}

export function newPass(seasonId: string, now: number): BattlePassState {
  return {
    seasonId,
    startedAt: now,
    premiumOwned: false,
    xp: 0,
    claimedFree: 0,
    claimedPremium: 0,
  };
}

/** Cumulative XP to reach the START of `tier` (0-indexed: tier 0 requires 0). */
export function xpToReach(tier: number): number {
  let sum = 0;
  for (let i = 0; i < tier; i++) sum += xpToNextTier(i);
  return sum;
}

/** Highest fully-earned tier (1-indexed) given cumulative XP. */
export function currentTier(xp: number): number {
  let tier = 0;
  while (tier < PASS_TIERS && xp >= xpToReach(tier + 1)) tier++;
  return tier;
}

/** ms remaining until the pass season ends. */
export function msRemaining(s: BattlePassState, now: number): number {
  return Math.max(0, s.startedAt + PASS_DURATION_MS - now);
}

export function isExpired(s: BattlePassState, now: number): boolean {
  return now >= s.startedAt + PASS_DURATION_MS;
}

export function addXp(s: BattlePassState, amount: number): BattlePassState {
  return { ...s, xp: s.xp + amount };
}

/** Sum of unclaimed rewards across both tracks (premium included only if
 *  premiumOwned). Useful for the "N rewards await" nudge. */
export function pendingClaimSummary(s: BattlePassState): {
  freeTiers: number[];
  premiumTiers: number[];
} {
  const tier = currentTier(s.xp);
  const freeTiers: number[] = [];
  for (let t = s.claimedFree + 1; t <= tier; t++) freeTiers.push(t);
  const premiumTiers: number[] = [];
  if (s.premiumOwned) {
    for (let t = s.claimedPremium + 1; t <= tier; t++) premiumTiers.push(t);
  }
  return { freeTiers, premiumTiers };
}

// ── Daily/weekly challenges ─────────────────────────────────────
export type ChallengeKind =
  | 'winLevels'
  | 'clearBlockers'
  | 'triggerCascades'
  | 'runExpedition';

export interface DailyChallenge {
  id: string;
  kind: ChallengeKind;
  target: number;
  progress: number;
  done: boolean;
}

/** Rotating daily set — one from each of a few categories. Regenerate every
 *  UTC day using the day key as seed. Kept pure for testing. */
export function makeDailyChallenges(dayKey: string): DailyChallenge[] {
  const salt = dayKey.charCodeAt(0) * 7 + dayKey.charCodeAt(9);
  return [
    {
      id: `daily-${dayKey}-win`,
      kind: 'winLevels',
      target: 3,
      progress: 0,
      done: false,
    },
    {
      id: `daily-${dayKey}-cascade`,
      kind: 'triggerCascades',
      target: 20,
      progress: 0,
      done: false,
    },
    {
      id: `daily-${dayKey}-blocker`,
      kind: 'clearBlockers',
      target: 5 + (salt % 5),
      progress: 0,
      done: false,
    },
  ];
}

export function makeWeeklyChallenges(weekKey: string): DailyChallenge[] {
  return [
    {
      id: `weekly-${weekKey}-win`,
      kind: 'winLevels',
      target: 15,
      progress: 0,
      done: false,
    },
    {
      id: `weekly-${weekKey}-exp`,
      kind: 'runExpedition',
      target: 5,
      progress: 0,
      done: false,
    },
  ];
}
