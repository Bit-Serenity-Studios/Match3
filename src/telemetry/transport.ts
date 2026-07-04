import type { TelemetryEvent } from './types';

/**
 * The transport interface. All events accumulate in a persistent queue and
 * are handed to a transport in batches. A successful send lets the queue
 * drop those events; a failed send keeps them for retry.
 *
 * Real transports (a backend API, an analytics vendor SDK) drop in here.
 * The default `NoopTransport` never fails, never actually sends anywhere.
 */
export interface TransportResult {
  /** true if the transport accepted the batch and it can be dropped from
   *  the queue. */
  accepted: boolean;
  /** Number of events accepted (from the head of the batch). Only used
   *  when a transport partially succeeds. Defaults to all. */
  acceptedCount?: number;
  error?: string;
}

export interface Transport {
  readonly name: string;
  send(events: readonly TelemetryEvent[]): Promise<TransportResult>;
}

/** Default. Silently drops events — useful when no backend is configured. */
export class NoopTransport implements Transport {
  readonly name = 'noop';
  async send(_events: readonly TelemetryEvent[]): Promise<TransportResult> {
    return { accepted: true };
  }
}

/** Logs events to the console — used in dev builds so the dev dashboard
 *  isn't the only view into the pipeline. */
export class ConsoleTransport implements Transport {
  readonly name = 'console';
  async send(events: readonly TelemetryEvent[]): Promise<TransportResult> {
    for (const e of events) {
      // eslint-disable-next-line no-console
      console.log(`[telemetry] ${e.type}`, e);
    }
    return { accepted: true };
  }
}

/** Test helper: captures every batch it's handed. */
export class MemoryTransport implements Transport {
  readonly name = 'memory';
  readonly received: TelemetryEvent[] = [];
  private failNext = false;
  failOnce(): void {
    this.failNext = true;
  }
  async send(events: readonly TelemetryEvent[]): Promise<TransportResult> {
    if (this.failNext) {
      this.failNext = false;
      return { accepted: false, error: 'test:failNext' };
    }
    this.received.push(...events);
    return { accepted: true };
  }
}
