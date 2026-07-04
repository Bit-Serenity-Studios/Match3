import {
  CALENDAR_CYCLE_DAYS,
  CALENDAR_REWARDS,
  canClaimToday,
  claim,
  currentDayIndex,
  daysBetween,
  decayOnMiss,
  initCalendar,
  startOfUTCDay,
} from '../calendar';

const T0 = Date.UTC(2026, 0, 5, 0, 0, 0); // Mon
const DAY = 24 * 60 * 60 * 1000;

describe('calendar math', () => {
  test('startOfUTCDay is idempotent within a day', () => {
    const a = startOfUTCDay(T0);
    const b = startOfUTCDay(T0 + 12 * 60 * 60 * 1000);
    expect(a).toBe(b);
  });

  test('daysBetween is a non-negative integer', () => {
    expect(daysBetween(T0, T0)).toBe(0);
    expect(daysBetween(T0, T0 + DAY - 1)).toBe(0);
    expect(daysBetween(T0, T0 + DAY)).toBe(1);
    expect(daysBetween(T0, T0 + 3.5 * DAY)).toBe(3);
    expect(daysBetween(T0 + DAY, T0)).toBe(0);
  });

  test('currentDayIndex advances one per day', () => {
    const c = initCalendar(T0);
    expect(currentDayIndex(c, T0)).toBe(0);
    expect(currentDayIndex(c, T0 + DAY)).toBe(1);
    expect(currentDayIndex(c, T0 + 6 * DAY)).toBe(6);
    expect(currentDayIndex(c, T0 + 8 * DAY)).toBe(1);
  });
});

describe('calendar claim', () => {
  test('grants day-1 rewards on first claim', () => {
    const s = initCalendar(T0);
    const r = claim(s, T0);
    expect(r).not.toBeNull();
    expect(r!.grants).toEqual(CALENDAR_REWARDS[0]);
    expect(r!.next.lastClaimedDayIndex).toBe(0);
  });

  test('cannot claim twice in the same day', () => {
    const s = claim(initCalendar(T0), T0)!.next;
    expect(canClaimToday(s, T0)).toBe(false);
    expect(claim(s, T0 + 60_000)).toBeNull();
  });

  test('day 2 tomorrow grants day-2 rewards', () => {
    const s = claim(initCalendar(T0), T0)!.next;
    const day2 = claim(s, T0 + DAY);
    expect(day2).not.toBeNull();
    expect(day2!.grants).toEqual(CALENDAR_REWARDS[1]);
    expect(day2!.next.lastClaimedDayIndex).toBe(1);
  });

  test('day 7 completion starts a new cycle', () => {
    let s = initCalendar(T0);
    for (let i = 0; i < CALENDAR_CYCLE_DAYS; i++) {
      const r = claim(s, T0 + i * DAY);
      expect(r).not.toBeNull();
      s = r!.next;
    }
    expect(s.completedCycles).toBe(1);
    expect(s.lastClaimedDayIndex).toBe(-1);
    // Next day still claimable, giving day 1 again
    const r = claim(s, T0 + CALENDAR_CYCLE_DAYS * DAY);
    expect(r!.grants).toEqual(CALENDAR_REWARDS[0]);
  });
});

describe('calendar decay', () => {
  test('missing 2+ days resets cycle', () => {
    const claimed = claim(initCalendar(T0), T0)!.next;
    const decayed = decayOnMiss(claimed, T0 + 3 * DAY);
    expect(decayed.lastClaimedDayIndex).toBe(-1);
    expect(decayed.cycleStartAt).toBe(startOfUTCDay(T0 + 3 * DAY));
  });

  test('missing 1 day keeps you on track', () => {
    const claimed = claim(initCalendar(T0), T0)!.next;
    const decayed = decayOnMiss(claimed, T0 + DAY);
    expect(decayed).toBe(claimed);
  });
});
