import { EventQueue, MemoryStorage } from '../queue';
import type { TelemetryEvent } from '../types';

function ev(i: number): TelemetryEvent {
  return {
    type: 'ad_requested',
    ts: i,
    sessionId: 's-x',
    placement: 'coinDouble',
  };
}

describe('event queue', () => {
  test('hydrate is idempotent', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.hydrate();
    await q.hydrate();
    expect(q.size()).toBe(0);
  });

  test('push + drop advance FIFO', async () => {
    const q = new EventQueue(new MemoryStorage(), 100);
    await q.hydrate();
    q.push(ev(1));
    q.push(ev(2));
    q.push(ev(3));
    expect(q.size()).toBe(3);
    q.drop(2);
    expect(q.size()).toBe(1);
    expect(q.peek(1)[0]!.ts).toBe(3);
  });

  test('capacity enforces oldest-drop first', async () => {
    const q = new EventQueue(new MemoryStorage(), 3);
    await q.hydrate();
    for (let i = 1; i <= 5; i++) q.push(ev(i));
    expect(q.size()).toBe(3);
    const s = q.snapshot();
    expect(s[0]!.ts).toBe(3);
    expect(s[2]!.ts).toBe(5);
  });

  test('persist across a new queue instance', async () => {
    const store = new MemoryStorage();
    const q1 = new EventQueue(store);
    await q1.hydrate();
    q1.push(ev(7));
    q1.push(ev(8));
    await q1.flushWrites();

    const q2 = new EventQueue(store);
    await q2.hydrate();
    expect(q2.size()).toBe(2);
    expect(q2.peek(2).map((e) => e.ts)).toEqual([7, 8]);
  });

  test('clear empties queue', async () => {
    const q = new EventQueue(new MemoryStorage());
    await q.hydrate();
    q.push(ev(1));
    q.push(ev(2));
    q.clear();
    expect(q.size()).toBe(0);
  });
});
