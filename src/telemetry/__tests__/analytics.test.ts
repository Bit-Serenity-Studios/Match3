import { Analytics } from '../analytics';
import { EventQueue, MemoryStorage } from '../queue';
import { MemoryTransport } from '../transport';
import type { TelemetryEvent } from '../types';

function makeAnalytics(): { a: Analytics; t: MemoryTransport } {
  const t = new MemoryTransport();
  const a = new Analytics({
    queue: new EventQueue(new MemoryStorage()),
    transport: t,
    sessionId: 's-test',
    appVersion: '0.5.0',
  });
  return { a, t };
}

function ev(type: TelemetryEvent['type'], ts = 1): TelemetryEvent {
  const base: any = { type, ts, sessionId: 's-test' };
  if (type === 'session_start') {
    base.appVersion = '0.5.0';
  } else if (type === 'session_end') {
    base.durationMs = 1000;
  } else if (type === 'level_started') {
    Object.assign(base, {
      levelId: 'level-001',
      archetype: 'tutorial',
      attemptNumber: 1,
      streak: 0,
      companionId: null,
      difficultyMod: 0,
    });
  } else if (type === 'level_finished') {
    Object.assign(base, {
      levelId: 'level-001',
      result: 'won',
      attempts: 1,
      movesRemained: 5,
      score: 1200,
      turns: 10,
      boostersUsed: 0,
      continuePurchased: false,
    });
  } else if (type === 'ad_requested' || type === 'ad_completed') {
    base.placement = 'coinDouble';
    if (type === 'ad_completed') base.rewarded = true;
  }
  return base;
}

describe('analytics facade', () => {
  test('track enqueues events', async () => {
    const { a } = makeAnalytics();
    a.track(ev('level_started'));
    a.track(ev('level_finished'));
    const all = await a.allEvents();
    expect(all).toHaveLength(2);
  });

  test('flush drops sent events on success', async () => {
    const { a, t } = makeAnalytics();
    for (let i = 0; i < 3; i++) a.track(ev('ad_requested', i));
    const r = await a.flush();
    expect(r.sent).toBe(3);
    expect(r.remaining).toBe(0);
    expect(t.received).toHaveLength(3);
    expect(await a.allEvents()).toHaveLength(0);
  });

  test('flush keeps events on transport failure', async () => {
    const { a, t } = makeAnalytics();
    a.track(ev('ad_requested', 1));
    t.failOnce();
    const r = await a.flush();
    expect(r.sent).toBe(0);
    expect(r.remaining).toBe(1);
    // Next flush succeeds and drops it.
    const r2 = await a.flush();
    expect(r2.sent).toBe(1);
  });

  test('exportJson round-trip returns queued events verbatim', async () => {
    const { a } = makeAnalytics();
    const e1 = ev('level_started', 100);
    a.track(e1);
    const s = await a.exportJson();
    const parsed = JSON.parse(s);
    expect(parsed).toEqual([e1]);
  });

  test('clear empties the queue', async () => {
    const { a } = makeAnalytics();
    a.track(ev('level_started'));
    await a.clear();
    expect(await a.allEvents()).toHaveLength(0);
  });

  test('newSession changes sessionId', () => {
    const { a } = makeAnalytics();
    const prev = a.getSessionId();
    const next = a.newSession(999);
    expect(next).not.toBe(prev);
    expect(a.getSessionId()).toBe(next);
  });
});
