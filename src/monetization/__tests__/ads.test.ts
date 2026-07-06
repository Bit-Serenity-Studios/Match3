import {
  DAILY_CAPS,
  INTERSTITIAL_MIN_GAP_MS,
  canShow,
  dayKeyFor,
  initAdCounters,
  noteShown,
  rotateDay,
} from '../ads';

const day1 = new Date('2026-01-01T12:00:00Z').getTime();
const day2 = new Date('2026-01-02T00:30:00Z').getTime();

describe('ads: daily caps + interstitial policy', () => {
  test('rotateDay clears counters on day change', () => {
    let s = noteShown(initAdCounters(), 'coinDoublePostLevel', day1);
    s = noteShown(s, 'coinDoublePostLevel', day1);
    expect(s.perPlacement.coinDoublePostLevel).toBe(2);
    const rotated = rotateDay(s, day2);
    expect(rotated.dayKey).not.toBe(s.dayKey);
    expect(rotated.perPlacement.coinDoublePostLevel).toBeUndefined();
  });

  test('canShow enforces daily cap per placement', () => {
    let s = initAdCounters();
    const cap = DAILY_CAPS.coinDoublePostLevel;
    for (let i = 0; i < cap; i++) {
      expect(canShow(s, 'coinDoublePostLevel', day1).allowed).toBe(true);
      s = noteShown(s, 'coinDoublePostLevel', day1 + i * 1000);
    }
    expect(canShow(s, 'coinDoublePostLevel', day1 + 60_000).allowed).toBe(false);
    expect(canShow(s, 'coinDoublePostLevel', day2).allowed).toBe(true);
  });

  test('interstitials blocked for purchasers', () => {
    const s = initAdCounters();
    const forbid = canShow(s, 'interstitialHubReturn', day1, { everPurchased: true });
    expect(forbid.allowed).toBe(false);
    expect(forbid.reason).toBe('has_purchases');
  });

  test('interstitials blocked for subscribers', () => {
    const s = initAdCounters();
    const forbid = canShow(s, 'interstitialHubReturn', day1, { subscribed: true });
    expect(forbid.allowed).toBe(false);
    expect(forbid.reason).toBe('subscribed');
  });

  test('interstitials enforce minimum gap', () => {
    let s = noteShown(initAdCounters(), 'interstitialHubReturn', day1);
    const soon = canShow(s, 'interstitialHubReturn', day1 + 1000);
    expect(soon.allowed).toBe(false);
    expect(soon.reason).toBe('gap_too_short');
    const later = canShow(s, 'interstitialHubReturn', day1 + INTERSTITIAL_MIN_GAP_MS + 1000);
    expect(later.allowed).toBe(true);
  });

  test('rescue placement obeys own daily cap independent of others', () => {
    let s = initAdCounters();
    const rescueCap = DAILY_CAPS.outOfLivesRescue;
    for (let i = 0; i < rescueCap; i++) {
      s = noteShown(s, 'outOfLivesRescue', day1);
    }
    expect(canShow(s, 'outOfLivesRescue', day1).allowed).toBe(false);
    expect(canShow(s, 'coinDoublePostLevel', day1).allowed).toBe(true);
  });

  test('dayKeyFor is stable within one day', () => {
    const a = dayKeyFor(day1);
    const b = dayKeyFor(day1 + 60 * 60 * 1000);
    expect(a).toBe(b);
  });
});
