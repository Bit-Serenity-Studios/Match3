import type { Grants } from '../monetization/types';

/**
 * Daily login calendar — an escalating 7-day cycle that repeats.
 *
 * State model: `cycleStartAt` (epoch ms of day 1 boot), `dayClaimed`
 * (array of 1..7 booleans for the current cycle). `syncCalendar(state,
 * now)` reconciles day rotation — if the local calendar day has ticked
 * over since last claim, we advance the pointer.
 *
 * The cycle uses UTC-day boundaries to survive timezone shuffling.
 */

export interface CalendarState {
  /** Epoch ms of "day 1" of the current 7-day cycle. */
  cycleStartAt: number;
  /** Index (0..6) of the day the player last successfully claimed. -1 = none yet. */
  lastClaimedDayIndex: number;
  /** Epoch ms of the last claim. Used to enforce one-per-day. */
  lastClaimedAt: number;
  /** How many full cycles have completed. Cosmetic — surfaces as "streak weeks". */
  completedCycles: number;
}

export const CALENDAR_CYCLE_DAYS = 7;

export const CALENDAR_REWARDS: Grants[] = [
  { coins: 60 },
  { coins: 80, embers: 5 },
  { coins: 100, gems: 5 },
  { coins: 120, embers: 8 },
  { coins: 150, gems: 8 },
  { coins: 200, embers: 12 },
  { coins: 250, gems: 25, embers: 15 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function initCalendar(now: number): CalendarState {
  return {
    cycleStartAt: startOfUTCDay(now),
    lastClaimedDayIndex: -1,
    lastClaimedAt: 0,
    completedCycles: 0,
  };
}

/** UTC-midnight of the given time. */
export function startOfUTCDay(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** How many UTC days have elapsed between two timestamps (>=0). */
export function daysBetween(a: number, b: number): number {
  return Math.max(0, Math.floor((startOfUTCDay(b) - startOfUTCDay(a)) / DAY_MS));
}

/** The 0..6 index the player is currently on. Once the 7th claim lands
 *  we roll over the cycle. */
export function currentDayIndex(state: CalendarState, now: number): number {
  const elapsed = daysBetween(state.cycleStartAt, now);
  if (elapsed >= CALENDAR_CYCLE_DAYS) {
    return elapsed % CALENDAR_CYCLE_DAYS;
  }
  return elapsed;
}

/** Can the player claim today's reward? */
export function canClaimToday(state: CalendarState, now: number): boolean {
  const idx = currentDayIndex(state, now);
  const alreadyClaimedToday =
    startOfUTCDay(state.lastClaimedAt) === startOfUTCDay(now);
  if (alreadyClaimedToday) return false;
  return idx !== state.lastClaimedDayIndex || state.lastClaimedAt === 0;
}

/** Claim today's reward. Rolls over to a new cycle when day 7 lands. */
export function claim(
  state: CalendarState,
  now: number,
): { grants: Grants; next: CalendarState } | null {
  if (!canClaimToday(state, now)) return null;
  const idx = currentDayIndex(state, now);
  const grants = CALENDAR_REWARDS[idx] ?? {};
  const willComplete = idx === CALENDAR_CYCLE_DAYS - 1;
  const next: CalendarState = willComplete
    ? {
        cycleStartAt: startOfUTCDay(now) + DAY_MS,
        lastClaimedDayIndex: -1,
        lastClaimedAt: now,
        completedCycles: state.completedCycles + 1,
      }
    : {
        cycleStartAt: state.cycleStartAt,
        lastClaimedDayIndex: idx,
        lastClaimedAt: now,
        completedCycles: state.completedCycles,
      };
  return { grants, next };
}

/** A player who skips a day loses their pointer position — resets the
 *  cycle so tomorrow is a fresh day 1. */
export function decayOnMiss(
  state: CalendarState,
  now: number,
): CalendarState {
  const missed = daysBetween(state.lastClaimedAt || state.cycleStartAt, now);
  if (missed >= 2 && state.lastClaimedAt > 0) {
    return {
      cycleStartAt: startOfUTCDay(now),
      lastClaimedDayIndex: -1,
      lastClaimedAt: state.lastClaimedAt,
      completedCycles: state.completedCycles,
    };
  }
  return state;
}
