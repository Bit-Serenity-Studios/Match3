/**
 * 14-day Mini-Pass. Two tracks (free + premium), daily/weekly challenges
 * feed pass XP. Seasons rotate by index — deterministic given launch
 * epoch + season length so we don't need a backend to sync clients.
 */

export const SEASON_LENGTH_DAYS = 14;
export const SEASON_LENGTH_MS = SEASON_LENGTH_DAYS * 24 * 60 * 60 * 1000;
/** Anchor epoch for seasons — Sun 2025-01-05T00:00:00Z (a Sunday). */
export const SEASON_ANCHOR_MS = 1735948800000;
export const XP_PER_LEVEL = 100;
export const PASS_LEVELS = 30;

export type ChallengeCadence = 'daily' | 'weekly';
export type ChallengeKind =
  | 'winLevels'
  | 'clearBlockers'
  | 'useCompanionAbility'
  | 'earnCoins'
  | 'completeExpeditions'
  | 'streakReach';

export interface ChallengeDef {
  id: string;
  cadence: ChallengeCadence;
  kind: ChallengeKind;
  target: number;
  xp: number;
  title: string;
}

/** The rotating challenge pool. Real season generation would sample from a
 *  larger pool; for MVP we fix a small set. */
export const CHALLENGES: ChallengeDef[] = [
  { id: 'daily.win3', cadence: 'daily', kind: 'winLevels', target: 3, xp: 40, title: 'Win 3 levels' },
  { id: 'daily.clear10', cadence: 'daily', kind: 'clearBlockers', target: 10, xp: 40, title: 'Clear 10 blockers' },
  { id: 'daily.ability1', cadence: 'daily', kind: 'useCompanionAbility', target: 1, xp: 30, title: 'Cast a companion ability' },
  { id: 'weekly.win15', cadence: 'weekly', kind: 'winLevels', target: 15, xp: 150, title: 'Win 15 levels this week' },
  { id: 'weekly.coins500', cadence: 'weekly', kind: 'earnCoins', target: 500, xp: 120, title: 'Earn 500 coins' },
  { id: 'weekly.expeditions4', cadence: 'weekly', kind: 'completeExpeditions', target: 4, xp: 130, title: 'Complete 4 expeditions' },
  { id: 'weekly.streak5', cadence: 'weekly', kind: 'streakReach', target: 5, xp: 200, title: 'Reach a 5-win streak' },
];

export interface PassRewardEntry {
  level: number;
  free?: { coins?: number; embers?: number; gems?: number };
  premium?: { coins?: number; embers?: number; gems?: number };
}

/** Track rewards. Free track is stingy (drip of coins/embers); premium
 *  weaves in gems on every ~5th level. */
export const PASS_REWARDS: PassRewardEntry[] = Array.from(
  { length: PASS_LEVELS },
  (_, i) => {
    const level = i + 1;
    const isMilestone = level % 5 === 0;
    return {
      level,
      free: { coins: isMilestone ? 100 : 40, embers: isMilestone ? 5 : 2 },
      premium: {
        coins: isMilestone ? 250 : 80,
        embers: isMilestone ? 10 : 4,
        gems: isMilestone ? 25 : 3,
      },
    };
  },
);

export interface PassProgress {
  seasonId: number;
  xp: number;
  claimedFree: number[];
  claimedPremium: number[];
  premiumUnlocked: boolean;
  challengeProgress: Record<string, number>;
  challengesCompleted: string[];
}

export const initPass = (seasonId: number): PassProgress => ({
  seasonId,
  xp: 0,
  claimedFree: [],
  claimedPremium: [],
  premiumUnlocked: false,
  challengeProgress: {},
  challengesCompleted: [],
});

export function seasonIdFor(now: number): number {
  if (now < SEASON_ANCHOR_MS) return 0;
  return Math.floor((now - SEASON_ANCHOR_MS) / SEASON_LENGTH_MS);
}

export function seasonWindow(seasonId: number): { startsAt: number; endsAt: number } {
  const startsAt = SEASON_ANCHOR_MS + seasonId * SEASON_LENGTH_MS;
  return { startsAt, endsAt: startsAt + SEASON_LENGTH_MS };
}

export function passLevelFor(xp: number): number {
  return Math.min(PASS_LEVELS, Math.floor(xp / XP_PER_LEVEL) + 1);
}

/** Roll the season over if the anchor has advanced. Clears challenges + xp
 *  but preserves the premium-unlocked flag ONLY for the current active
 *  season — a new season needs a fresh premium purchase. */
export function rolloverIfNeeded(
  state: PassProgress,
  now: number,
): PassProgress {
  const currentSeason = seasonIdFor(now);
  if (currentSeason === state.seasonId) return state;
  return initPass(currentSeason);
}

/** Advance a challenge counter and, if complete, add its xp to the pass. */
export function progressChallenge(
  state: PassProgress,
  challengeId: string,
  delta: number,
): PassProgress {
  const def = CHALLENGES.find((c) => c.id === challengeId);
  if (!def) return state;
  if (state.challengesCompleted.includes(challengeId)) return state;
  const current = state.challengeProgress[challengeId] ?? 0;
  const next = Math.min(def.target, current + delta);
  const progressNext = { ...state.challengeProgress, [challengeId]: next };
  if (next < def.target) {
    return { ...state, challengeProgress: progressNext };
  }
  return {
    ...state,
    challengeProgress: progressNext,
    challengesCompleted: [...state.challengesCompleted, challengeId],
    xp: state.xp + def.xp,
  };
}

/** Claim a specific track+level reward. Returns null if not yet unlocked
 *  or already claimed. */
export function claimReward(
  state: PassProgress,
  track: 'free' | 'premium',
  level: number,
): { grants: NonNullable<PassRewardEntry['free']>; next: PassProgress } | null {
  if (level < 1 || level > PASS_LEVELS) return null;
  if (passLevelFor(state.xp) < level) return null;
  if (track === 'premium' && !state.premiumUnlocked) return null;
  const claimed = track === 'free' ? state.claimedFree : state.claimedPremium;
  if (claimed.includes(level)) return null;
  const entry = PASS_REWARDS[level - 1];
  const grants = entry?.[track] ?? {};
  const nextClaimed = [...claimed, level].sort((a, b) => a - b);
  return {
    grants,
    next: {
      ...state,
      claimedFree: track === 'free' ? nextClaimed : state.claimedFree,
      claimedPremium: track === 'premium' ? nextClaimed : state.claimedPremium,
    },
  };
}

export function unlockPremium(state: PassProgress): PassProgress {
  return { ...state, premiumUnlocked: true };
}
