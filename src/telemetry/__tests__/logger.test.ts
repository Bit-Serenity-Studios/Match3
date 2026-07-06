import { useTelemetry, _resetSessionCounter } from '../logger';

beforeEach(() => {
  _resetSessionCounter();
  useTelemetry.getState().clear();
  useTelemetry.setState({
    sessionId: '',
    sessionStartedAt: 0,
    lastFlushAt: 0,
    droppedEvents: 0,
  });
});

describe('telemetry logger', () => {
  test('startSession seeds a session id and emits session_start', () => {
    const s = useTelemetry.getState();
    s.startSession(1000, '0.4.0');
    const after = useTelemetry.getState();
    expect(after.sessionId).not.toBe('');
    expect(after.queue.length).toBe(1);
    expect(after.queue[0]!.type).toBe('session_start');
  });

  test('logEvent auto-opens a session when caller forgot', () => {
    const s = useTelemetry.getState();
    s.logEvent(
      'level_started',
      {
        levelId: 'L1',
        archetype: 'tutorial',
        attempt: 1,
        seed: 1,
        difficultyMod: 0,
        boostersUsed: {},
        companionId: null,
      },
      500,
    );
    const q = useTelemetry.getState().queue;
    expect(q[0]!.type).toBe('session_start');
    expect(q[1]!.type).toBe('level_started');
  });

  test('exportJson emits a valid JSON string with the queue', () => {
    const s = useTelemetry.getState();
    s.startSession(1, 'v');
    const json = s.exportJson();
    const parsed = JSON.parse(json);
    expect(parsed.queue.length).toBeGreaterThan(0);
    expect(parsed.sessionId).toBeDefined();
  });

  test('clear empties the queue and drop counter', () => {
    const s = useTelemetry.getState();
    s.startSession(1, 'v');
    useTelemetry.setState({ droppedEvents: 5 });
    s.clear();
    expect(useTelemetry.getState().queue.length).toBe(0);
    expect(useTelemetry.getState().droppedEvents).toBe(0);
  });

  test('countByType groups queue by event type', () => {
    const s = useTelemetry.getState();
    s.startSession(1, 'v');
    s.logEvent('store_open', { source: 'hub' }, 2);
    s.logEvent('store_open', { source: 'game' }, 3);
    const c = s.countByType();
    expect(c.byType.store_open).toBe(2);
    expect(c.byType.session_start).toBe(1);
  });
});
