import {
  QUEUE_CAP,
  NullTransport,
  appendEvent,
  computeApsFromPlay,
  computeFailMargins,
  count,
  funnelCounts,
} from '../queue';
import type {
  AnyEvent,
  LevelFailed,
  LevelFinished,
  LevelStarted,
  OfferPurchased,
  OfferShown,
  SessionStart,
  StoreOpen,
} from '../events';

const start = (levelId: string, at = 1): LevelStarted => ({
  type: 'level_started',
  at,
  sessionId: 'sess',
  payload: {
    levelId,
    archetype: 'hard',
    attempt: 1,
    seed: 1,
    difficultyMod: 0,
    boostersUsed: {},
    companionId: null,
  },
});

const finished = (
  levelId: string,
  result: 'won' | 'lost',
  extras: Partial<LevelFinished['payload']> = {},
  at = 1,
): LevelFinished => ({
  type: 'level_finished',
  at,
  sessionId: 'sess',
  payload: {
    levelId,
    result,
    score: 100,
    turnsTaken: 10,
    movesRemained: 0,
    boostersUsed: {},
    attempts: 1,
    continuePurchased: false,
    ...extras,
  },
});

const failed = (
  levelId: string,
  margins: number[],
  at = 1,
): LevelFailed => ({
  type: 'level_failed',
  at,
  sessionId: 'sess',
  payload: {
    levelId,
    failMarginPerObjective: margins.map((m, i) => ({ index: i, margin: m })),
    score: 100,
    turnsTaken: 20,
  },
});

describe('queue', () => {
  test('appendEvent adds; caps at QUEUE_CAP', () => {
    let q: AnyEvent[] = [];
    for (let i = 0; i < QUEUE_CAP + 200; i++) {
      q = appendEvent(q, start(`L${i}`));
    }
    expect(q.length).toBe(QUEUE_CAP);
    // Oldest events were dropped; last event survives.
    expect((q[q.length - 1]! as LevelStarted).payload.levelId).toBe(
      `L${QUEUE_CAP + 199}`,
    );
  });

  test('count summarizes by type', () => {
    const q = [
      start('L1'),
      start('L2'),
      finished('L1', 'won'),
      finished('L2', 'lost'),
    ];
    const c = count(q);
    expect(c.total).toBe(4);
    expect(c.byType.level_started).toBe(2);
    expect(c.byType.level_finished).toBe(2);
  });

  test('NullTransport captures sent events without side effects', async () => {
    const t = new NullTransport();
    await t.send([start('L1')]);
    expect(t.sent.length).toBe(1);
  });
});

describe('computeApsFromPlay', () => {
  test('computes APS = attempts/wins per level', () => {
    const q = [
      finished('L1', 'lost'),
      finished('L1', 'lost'),
      finished('L1', 'won'),
      finished('L2', 'won'),
      finished('L2', 'won'),
    ];
    const aps = computeApsFromPlay(q);
    expect(aps.L1?.attempts).toBe(3);
    expect(aps.L1?.wins).toBe(1);
    expect(aps.L1?.aps).toBeCloseTo(3);
    expect(aps.L2?.aps).toBeCloseTo(1);
  });

  test('never-won level reports Infinity APS', () => {
    const q = [finished('L1', 'lost'), finished('L1', 'lost')];
    expect(computeApsFromPlay(q).L1?.aps).toBe(Infinity);
  });
});

describe('computeFailMargins', () => {
  test('median across per-objective mean margins', () => {
    const q = [
      failed('L1', [0.1, 0.2]),
      failed('L1', [0.6, 0.4]),
      failed('L1', [0.3, 0.3]),
    ];
    // Per-fail means: 0.15, 0.5, 0.3 → sort → 0.15, 0.3, 0.5 → median 0.3
    expect(computeFailMargins(q).L1).toBeCloseTo(0.3);
  });

  test('empty result when no fails logged', () => {
    expect(Object.keys(computeFailMargins([])).length).toBe(0);
  });
});

describe('funnelCounts', () => {
  test('counts the standard journey', () => {
    const q: AnyEvent[] = [
      {
        type: 'session_start',
        at: 1,
        sessionId: 'x',
        payload: { device: 'test', version: '1' },
      } as SessionStart,
      start('L1'),
      finished('L1', 'won', { continuePurchased: true }),
      {
        type: 'store_open',
        at: 1,
        sessionId: 'x',
        payload: { source: 'hub' },
      } as StoreOpen,
      {
        type: 'offer_shown',
        at: 1,
        sessionId: 'x',
        payload: { sku: 'x', levelId: 'L2', reason: 'r' },
      } as OfferShown,
      {
        type: 'offer_purchased',
        at: 1,
        sessionId: 'x',
        payload: { sku: 'x', levelId: 'L2' },
      } as OfferPurchased,
    ];
    const f = funnelCounts(q);
    expect(f.sessions).toBe(1);
    expect(f.levelStarts).toBe(1);
    expect(f.levelWins).toBe(1);
    expect(f.continuesPurchased).toBe(1);
    expect(f.storeOpens).toBe(1);
    expect(f.offersShown).toBe(1);
    expect(f.offersPurchased).toBe(1);
  });
});
