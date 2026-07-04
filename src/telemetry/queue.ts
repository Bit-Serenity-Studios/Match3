import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TelemetryEvent } from './types';

/**
 * Persistent FIFO queue backed by a single AsyncStorage key. In-memory ring
 * is the source of truth during a session; every mutation asynchronously
 * snapshots to storage. On boot we hydrate from storage.
 *
 * Bounded to prevent runaway growth if a transport is broken for a long
 * time. Oldest events drop first when we hit the cap.
 */
const STORAGE_KEY = 'moonpetal.telemetry.queue.v1';
const DEFAULT_CAPACITY = 2000;

export interface QueueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** In-memory backend, used in tests. */
export class MemoryStorage implements QueueBackend {
  private store = new Map<string, string>();
  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }
  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export class EventQueue {
  private events: TelemetryEvent[] = [];
  private readonly backend: QueueBackend;
  private readonly capacity: number;
  private hydrated = false;
  private pendingSave: Promise<void> | null = null;

  constructor(
    backend: QueueBackend = AsyncStorage as unknown as QueueBackend,
    capacity: number = DEFAULT_CAPACITY,
  ) {
    this.backend = backend;
    this.capacity = capacity;
  }

  async hydrate(): Promise<void> {
    if (this.hydrated) return;
    const raw = await this.backend.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as TelemetryEvent[];
        if (Array.isArray(parsed)) this.events = parsed;
      } catch {
        // Malformed — start fresh but don't crash.
        this.events = [];
      }
    }
    this.hydrated = true;
  }

  size(): number {
    return this.events.length;
  }

  peek(n: number): TelemetryEvent[] {
    return this.events.slice(0, n);
  }

  snapshot(): TelemetryEvent[] {
    return this.events.slice();
  }

  push(event: TelemetryEvent): void {
    this.events.push(event);
    if (this.events.length > this.capacity) {
      this.events.splice(0, this.events.length - this.capacity);
    }
    this.scheduleSave();
  }

  /** Drop the first `n` events (after a successful transport send). */
  drop(n: number): void {
    if (n <= 0) return;
    this.events.splice(0, Math.min(n, this.events.length));
    this.scheduleSave();
  }

  clear(): void {
    this.events = [];
    this.scheduleSave();
  }

  /** Coalesced save: multiple mutations in a tick share one write. */
  private scheduleSave(): void {
    if (this.pendingSave) return;
    this.pendingSave = Promise.resolve().then(async () => {
      const snapshot = JSON.stringify(this.events);
      this.pendingSave = null;
      try {
        await this.backend.setItem(STORAGE_KEY, snapshot);
      } catch {
        // Swallow — the next successful save will catch up.
      }
    });
  }

  /** Wait for the current pending save to finish, if any. Used in tests. */
  async flushWrites(): Promise<void> {
    if (this.pendingSave) await this.pendingSave;
  }
}
