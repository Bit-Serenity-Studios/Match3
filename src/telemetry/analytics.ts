import type { TelemetryEvent } from './types';
import { EventQueue } from './queue';
import { NoopTransport, type Transport } from './transport';

/**
 * Analytics facade. One process-wide instance; call `track(event)` from
 * anywhere. Events land in the persistent queue immediately (fire-and-forget)
 * and are drained by `flush()` — the caller decides when to flush (typically
 * on session-end, background, or a periodic tick).
 *
 * Transport is pluggable via `setTransport`. Default is NoopTransport, so
 * turning telemetry on in prod is a one-line change.
 */
export class Analytics {
  private queue: EventQueue;
  private transport: Transport;
  private sessionId: string;
  private appVersion: string;
  private hydrated: Promise<void>;

  constructor(opts: {
    queue?: EventQueue;
    transport?: Transport;
    appVersion?: string;
    sessionId?: string;
  } = {}) {
    this.queue = opts.queue ?? new EventQueue();
    this.transport = opts.transport ?? new NoopTransport();
    this.appVersion = opts.appVersion ?? '0.1.0';
    this.sessionId = opts.sessionId ?? makeSessionId(Date.now());
    this.hydrated = this.queue.hydrate();
  }

  setTransport(t: Transport): void {
    this.transport = t;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  newSession(now: number): string {
    this.sessionId = makeSessionId(now);
    return this.sessionId;
  }

  /** Enqueue an event. Non-blocking. */
  track(event: TelemetryEvent): void {
    this.queue.push(event);
  }

  /** Send everything queued to the transport. Successful sends drop from
   *  the queue; failures leave events in place for retry. */
  async flush(batchSize = 100): Promise<{ sent: number; remaining: number }> {
    await this.hydrated;
    const size = this.queue.size();
    if (size === 0) return { sent: 0, remaining: 0 };
    const batch = this.queue.peek(batchSize);
    const r = await this.transport.send(batch);
    if (r.accepted) {
      const n = r.acceptedCount ?? batch.length;
      this.queue.drop(n);
      return { sent: n, remaining: this.queue.size() };
    }
    return { sent: 0, remaining: this.queue.size() };
  }

  /** Export the full queued log as JSON. Used by the dev dashboard. */
  async exportJson(): Promise<string> {
    await this.hydrated;
    return JSON.stringify(this.queue.snapshot(), null, 2);
  }

  async allEvents(): Promise<TelemetryEvent[]> {
    await this.hydrated;
    return this.queue.snapshot();
  }

  async clear(): Promise<void> {
    await this.hydrated;
    this.queue.clear();
  }
}

function makeSessionId(now: number): string {
  const noise = (now.toString(36) + Math.floor(now / 1000).toString(36)).slice(-8);
  return `s-${noise}`;
}

// ── Process-wide singleton ─────────────────────────────────────
let ACTIVE: Analytics | null = null;

export function getAnalytics(): Analytics {
  if (!ACTIVE) ACTIVE = new Analytics();
  return ACTIVE;
}

export function setAnalytics(a: Analytics): void {
  ACTIVE = a;
}

// Distributive Omit — preserves discriminated-union narrowing when stripping
// the common `ts` / `sessionId` fields.
type DistOmit<T, K extends keyof any> = T extends unknown ? Omit<T, K> : never;

/** Convenience helper that stamps `ts` + `sessionId` for callers. */
export function trackEvent(
  event: DistOmit<TelemetryEvent, 'ts' | 'sessionId'>,
): void {
  const a = getAnalytics();
  const full = {
    ...(event as object),
    ts: Date.now(),
    sessionId: a.getSessionId(),
  } as TelemetryEvent;
  a.track(full);
}
