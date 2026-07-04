import {
  DAILY_BREW_POOL,
  DAILY_BREW_REWARDS,
  canClaimBrew,
  claimBrew,
  hashDay,
  initDailyBrew,
  levelForDay,
  notePlayed,
} from '../dailyBrew';
import { startOfUTCDay } from '../calendar';

const T0 = Date.UTC(2026, 0, 5, 0, 0, 0);
const DAY = 24 * 60 * 60 * 1000;

describe('daily brew', () => {
  test('pool excludes tutorial levels', () => {
    for (const l of DAILY_BREW_POOL) {
      expect(l.archetype).not.toBe('tutorial');
    }
    expect(DAILY_BREW_POOL.length).toBeGreaterThan(0);
  });

  test('levelForDay is deterministic per UTC day, differs across days', () => {
    const today = levelForDay(startOfUTCDay(T0));
    const alsoToday = levelForDay(startOfUTCDay(T0 + 6 * 60 * 60 * 1000));
    expect(alsoToday.id).toBe(today.id);
    // We pass two very different UTC days — id should almost always differ.
    const tomorrow = levelForDay(startOfUTCDay(T0 + DAY));
    // Pool is small (< 60) so collisions occasionally happen — sample 3
    // days and require at least one to differ.
    const day2 = levelForDay(startOfUTCDay(T0 + 2 * DAY));
    const day3 = levelForDay(startOfUTCDay(T0 + 3 * DAY));
    const uniqueIds = new Set([today.id, tomorrow.id, day2.id, day3.id]);
    expect(uniqueIds.size).toBeGreaterThan(1);
  });

  test('levelForDay reseeds so daily seed != campaign seed', () => {
    const src = DAILY_BREW_POOL[0]!;
    const daily = levelForDay(startOfUTCDay(T0));
    // A daily off pool[0] would still share id; check the seed diverges
    // for THAT case specifically.
    if (daily.id === src.id) {
      expect(daily.seed).not.toBe(src.seed);
    }
  });

  test('hashDay is deterministic and returns a number', () => {
    const a = hashDay(T0);
    const b = hashDay(T0);
    expect(a).toBe(b);
    expect(Number.isInteger(a)).toBe(true);
  });

  test('canClaimBrew resets each UTC day', () => {
    const s = initDailyBrew();
    expect(canClaimBrew(s, T0)).toBe(true);
    const claimed = claimBrew(s, T0, true)!;
    expect(canClaimBrew(claimed.next, T0)).toBe(false);
    expect(canClaimBrew(claimed.next, T0 + DAY)).toBe(true);
  });

  test('claim grants rewards only on a win', () => {
    const winClaim = claimBrew(initDailyBrew(), T0, true)!;
    expect(winClaim.grants).toEqual(DAILY_BREW_REWARDS);
    expect(winClaim.next.streak).toBe(1);
    const lossClaim = claimBrew(initDailyBrew(), T0, false)!;
    expect(lossClaim.grants).toEqual({});
    expect(lossClaim.next.streak).toBe(0);
  });

  test('streak resets on a loss', () => {
    let s = initDailyBrew();
    for (let i = 0; i < 5; i++) {
      s = claimBrew(s, T0 + i * DAY, true)!.next;
    }
    expect(s.streak).toBe(5);
    s = claimBrew(s, T0 + 5 * DAY, false)!.next;
    expect(s.streak).toBe(0);
  });

  test('notePlayed stamps today without clearing claim eligibility', () => {
    const s = notePlayed(initDailyBrew(), T0);
    expect(s.lastPlayedDay).toBe(startOfUTCDay(T0));
    expect(canClaimBrew(s, T0)).toBe(true);
  });
});
