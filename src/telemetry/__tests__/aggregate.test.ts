import {
  eventCounts,
  funnel,
  levelStats,
  meanSessionDurationMs,
} from '../aggregate';
import type { TelemetryEvent } from '../types';

function make(events: Partial<TelemetryEvent>[]): TelemetryEvent[] {
  return events.map(
    (e, i) => ({ ts: i, sessionId: 's', ...e }) as TelemetryEvent,
  );
}

const start = (levelId: string, archetype = 'wow') =>
  ({
    type: 'level_started',
    levelId,
    archetype,
    attemptNumber: 1,
    streak: 0,
    companionId: null,
    difficultyMod: 0,
  }) as const;

const finish = (
  levelId: string,
  result: 'won' | 'lost',
  movesRemained: number,
  continuePurchased = false,
) => ({
  type: 'level_finished' as const,
  levelId,
  result,
  attempts: 1,
  movesRemained,
  score: 1000,
  turns: 8,
  boostersUsed: 0,
  continuePurchased,
});

const fail = (levelId: string, margins: number[]) => ({
  type: 'level_failed' as const,
  levelId,
  failMarginPerObjective: margins,
});

describe('telemetry aggregate', () => {
  test('eventCounts histograms by type', () => {
    const events = make([
      { type: 'session_start', appVersion: '0.1.0' } as any,
      { type: 'session_start', appVersion: '0.1.0' } as any,
      { type: 'ad_requested', placement: 'coinDouble' } as any,
    ]);
    const c = eventCounts(events);
    expect(c.session_start).toBe(2);
    expect(c.ad_requested).toBe(1);
  });

  test('levelStats computes APS, moves-remaining median, continue purchases', () => {
    const events = make([
      start('level-006', 'wow') as any,
      finish('level-006', 'won', 4) as any,
      start('level-006', 'wow') as any,
      finish('level-006', 'won', 6) as any,
      start('level-006', 'wow') as any,
      finish('level-006', 'won', 2, true) as any,
      start('level-006', 'wow') as any,
      finish('level-006', 'lost', 0) as any,
      fail('level-006', [0.2, 0.4]) as any,
    ]);
    const stats = levelStats(events);
    expect(stats).toHaveLength(1);
    const s = stats[0]!;
    expect(s.wins).toBe(3);
    expect(s.losses).toBe(1);
    expect(s.starts).toBe(4);
    expect(s.aps).toBeCloseTo(4 / 3, 3);
    expect(s.medianMovesRemainingOnWin).toBe(4);
    expect(s.continuePurchases).toBe(1);
    expect(s.medianFailMarginPerObjective).toBeCloseTo(0.3, 3);
  });

  test('funnel produces expected counts', () => {
    const events = make([
      { type: 'session_start', appVersion: '0.1.0' } as any,
      start('level-001') as any,
      finish('level-001', 'won', 5) as any,
      { type: 'store_open', source: 'hub_tab' } as any,
      { type: 'offer_shown', skuId: 'starter' } as any,
      { type: 'offer_purchased', skuId: 'starter', priceUsdCents: 199 } as any,
      { type: 'ad_requested', placement: 'coinDouble' } as any,
      { type: 'ad_completed', placement: 'coinDouble', rewarded: true } as any,
      { type: 'gacha_pull', companionId: 'lumen-moth', rarity: 'common', isNew: true, shardsAwarded: 0, pityCounter: 1 } as any,
    ]);
    const f = funnel(events);
    expect(f.levelStarts).toBe(1);
    expect(f.levelWins).toBe(1);
    expect(f.storeOpens).toBe(1);
    expect(f.offersShown).toBe(1);
    expect(f.offersPurchased).toBe(1);
    expect(f.adsRequested).toBe(1);
    expect(f.adsCompleted).toBe(1);
    expect(f.gachaPulls).toBe(1);
    expect(f.sessions).toBe(1);
  });

  test('meanSessionDurationMs averages session_end durations', () => {
    const events = make([
      { type: 'session_end', durationMs: 1000 } as any,
      { type: 'session_end', durationMs: 3000 } as any,
    ]);
    expect(meanSessionDurationMs(events)).toBe(2000);
  });
});
