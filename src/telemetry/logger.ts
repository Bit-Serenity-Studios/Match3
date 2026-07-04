import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appendEvent, count, QUEUE_CAP, type Transport } from './queue';
import type { AnyEvent, EventType } from './events';

/**
 * The telemetry logger — a thin Zustand store around the queue. Callers
 * use `logEvent()` for simple appends. The queue is auto-persisted so a
 * kill-and-relaunch does not lose recent play data.
 *
 * Transport is optional. When set, the logger flushes the queue whenever
 * `flush()` is called (or opportunistically on session_end).
 */

let sessionCounter = 0;
function newSessionId(now: number): string {
  sessionCounter = (sessionCounter + 1) & 0xffff;
  return `s${now.toString(36)}-${sessionCounter.toString(36)}`;
}

interface TelemetryState {
  queue: AnyEvent[];
  sessionId: string;
  sessionStartedAt: number;
  /** Wall-clock the transport last succeeded at. 0 if never. */
  lastFlushAt: number;
  /** Fatal-loop guard. */
  droppedEvents: number;

  startSession(now: number, version: string): void;
  endSession(now: number): void;
  logEvent<T extends AnyEvent>(
    type: T['type'],
    payload: T['payload'],
    now: number,
  ): void;
  clear(): void;
  exportJson(): string;
  filter(types: readonly EventType[]): AnyEvent[];
  countByType(): ReturnType<typeof count>;
}

export const useTelemetry = create<TelemetryState>()(
  persist(
    (set, get) => ({
      queue: [],
      sessionId: '',
      sessionStartedAt: 0,
      lastFlushAt: 0,
      droppedEvents: 0,

      startSession(now, version) {
        const id = newSessionId(now);
        set({ sessionId: id, sessionStartedAt: now });
        get().logEvent(
          'session_start',
          { device: 'expo' as const, version },
          now,
        );
      },
      endSession(now) {
        const s = get();
        get().logEvent(
          'session_end',
          {
            durationMs: now - s.sessionStartedAt,
            eventsInSession: s.queue.filter(
              (e) => e.sessionId === s.sessionId,
            ).length,
          },
          now,
        );
      },
      logEvent(type, payload, now) {
        const s = get();
        if (!s.sessionId) {
          // Auto-open a session if the caller forgot — better to preserve
          // the event than silently drop it.
          get().startSession(now, 'auto');
        }
        const ev = {
          type,
          at: now,
          sessionId: get().sessionId,
          payload,
        } as unknown as AnyEvent;
        const beforeLen = get().queue.length;
        const next = appendEvent(get().queue, ev);
        const dropped =
          beforeLen + 1 - next.length > 0
            ? beforeLen + 1 - next.length
            : 0;
        set({
          queue: next,
          droppedEvents: get().droppedEvents + dropped,
        });
      },
      clear() {
        set({ queue: [], droppedEvents: 0 });
      },
      exportJson() {
        return JSON.stringify(
          {
            sessionId: get().sessionId,
            exportedAt: 0,
            queue: get().queue,
            droppedEvents: get().droppedEvents,
          },
          null,
          2,
        );
      },
      filter(types) {
        return get().queue.filter((e) => types.includes(e.type as EventType));
      },
      countByType() {
        return count(get().queue);
      },
    }),
    {
      name: 'moonpetal.telemetry.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/** Bind a transport and flush pending events. Used at boot; call again on
 *  demand from the dev dashboard. */
export async function flushTelemetry(
  transport: Transport,
  now: number,
): Promise<void> {
  const s = useTelemetry.getState();
  const events = s.queue;
  if (events.length === 0) return;
  await transport.send(events);
  useTelemetry.setState({ queue: [], lastFlushAt: now });
}

/** Ergonomic top-level helper mirroring analytics libraries' `track()`. */
export function track<T extends AnyEvent>(
  type: T['type'],
  payload: T['payload'],
): void {
  useTelemetry.getState().logEvent(type, payload, Date.now());
}

/** Reset the module-level session counter — test hook. */
export function _resetSessionCounter(): void {
  sessionCounter = 0;
}

export const TELEMETRY_QUEUE_CAP = QUEUE_CAP;
