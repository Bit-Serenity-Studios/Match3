import {
  FAIL_TRIGGER,
  OFFER_DURATION_MS,
  isExpired,
  msRemaining,
  offerFor,
  shouldTrigger,
} from '../segmentedOffers';
import { getLevel } from '../../levels/catalog';

describe('segmented offers', () => {
  test('triggers only at the fail-count threshold', () => {
    for (let n = 0; n < FAIL_TRIGGER; n++) {
      expect(shouldTrigger('level-018', n, false)).toBe(false);
    }
    expect(shouldTrigger('level-018', FAIL_TRIGGER, false)).toBe(true);
  });

  test('does not re-trigger while an offer is active', () => {
    expect(shouldTrigger('level-018', FAIL_TRIGGER, true)).toBe(false);
  });

  test('does not trigger past the threshold (one-shot per streak)', () => {
    expect(shouldTrigger('level-018', FAIL_TRIGGER + 1, false)).toBe(false);
    expect(shouldTrigger('level-018', FAIL_TRIGGER + 5, false)).toBe(false);
  });

  test('offer contents lean into level blockers', () => {
    const l = getLevel('level-018')!; // hard checkpoint with vines
    const o = offerFor(l, 1_700_000_000_000);
    expect(o.sku.reward.embers).toBeGreaterThanOrEqual(30);
    expect(o.sku.tag).toBe('limited');
    expect(o.levelId).toBe('level-018');
    expect(o.endsAt - o.startedAt).toBe(OFFER_DURATION_MS);
  });

  test('isExpired + msRemaining respect the timer', () => {
    const l = getLevel('level-018')!;
    const now = 100_000;
    const o = offerFor(l, now);
    expect(isExpired(o, now)).toBe(false);
    expect(isExpired(o, now + OFFER_DURATION_MS)).toBe(true);
    expect(msRemaining(o, now + 5000)).toBe(OFFER_DURATION_MS - 5000);
  });
});
