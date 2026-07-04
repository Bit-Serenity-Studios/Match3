import type { AnyEvent, EventType } from './events';

/**
 * Local-first event queue. Owns:
 *   - The in-memory ring
 *   - The exportable JSON format
 *   - A pluggable transport for a later remote sink (POST-and-drop-on-success)
 *
 * We do not batch to disk on every event — the persist middleware on the
 * telemetry store handles that. This module is pure logic so tests don't
 * need a Zustand harness.
 */

export const QUEUE_CAP = 5000;

export interface Transport {
  send(events: readonly AnyEvent[]): Promise<void>;
}

/** Drop-in no-op transport used in tests / local dev. */
export class NullTransport implements Transport {
  readonly sent: AnyEvent[] = [];
  async send(events: readonly AnyEvent[]): Promise<void> {
    this.sent.push(...events);
  }
}

export function appendEvent(
  queue: AnyEvent[],
  ev: AnyEvent,
  cap = QUEUE_CAP,
): AnyEvent[] {
  const next = queue.length + 1 > cap ? queue.slice(-(cap - 1)) : queue.slice();
  next.push(ev);
  return next;
}

export interface CountersByType {
  total: number;
  byType: Partial<Record<EventType, number>>;
}

export function count(queue: readonly AnyEvent[]): CountersByType {
  const byType: Partial<Record<EventType, number>> = {};
  for (const ev of queue) {
    byType[ev.type] = (byType[ev.type] ?? 0) + 1;
  }
  return { total: queue.length, byType };
}

/** Compute APS-from-real-play per level from the queue. APS = attempts /
 *  wins. Levels never won return Infinity so the dashboard can tag them. */
export function computeApsFromPlay(
  queue: readonly AnyEvent[],
): Record<string, { attempts: number; wins: number; aps: number }> {
  const acc: Record<string, { attempts: number; wins: number }> = {};
  for (const ev of queue) {
    if (ev.type !== 'level_finished') continue;
    const levelId = ev.payload.levelId;
    if (!acc[levelId]) acc[levelId] = { attempts: 0, wins: 0 };
    acc[levelId]!.attempts += 1;
    if (ev.payload.result === 'won') acc[levelId]!.wins += 1;
  }
  const out: Record<string, { attempts: number; wins: number; aps: number }> = {};
  for (const [k, v] of Object.entries(acc)) {
    out[k] = {
      attempts: v.attempts,
      wins: v.wins,
      aps: v.wins === 0 ? Infinity : v.attempts / v.wins,
    };
  }
  return out;
}

/** Median fail margin per level from real play. */
export function computeFailMargins(
  queue: readonly AnyEvent[],
): Record<string, number> {
  const acc: Record<string, number[]> = {};
  for (const ev of queue) {
    if (ev.type !== 'level_failed') continue;
    const list = acc[ev.payload.levelId] ?? [];
    const avg =
      ev.payload.failMarginPerObjective.length === 0
        ? 0
        : ev.payload.failMarginPerObjective.reduce((s, o) => s + o.margin, 0) /
          ev.payload.failMarginPerObjective.length;
    list.push(avg);
    acc[ev.payload.levelId] = list;
  }
  const out: Record<string, number> = {};
  for (const [k, arr] of Object.entries(acc)) {
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    out[k] =
      sorted.length % 2 === 0
        ? (sorted[mid - 1]! + sorted[mid]!) / 2
        : sorted[mid]!;
  }
  return out;
}

/** Funnel counts for the standard "session → level start → level win →
 *  store open → offer shown → offer purchased" journey. */
export function funnelCounts(queue: readonly AnyEvent[]): {
  sessions: number;
  levelStarts: number;
  levelWins: number;
  storeOpens: number;
  offersShown: number;
  offersPurchased: number;
  continuesPurchased: number;
  adCompletions: number;
} {
  let sessions = 0,
    levelStarts = 0,
    levelWins = 0,
    storeOpens = 0,
    offersShown = 0,
    offersPurchased = 0,
    continuesPurchased = 0,
    adCompletions = 0;
  for (const ev of queue) {
    switch (ev.type) {
      case 'session_start':
        sessions++;
        break;
      case 'level_started':
        levelStarts++;
        break;
      case 'level_finished':
        if (ev.payload.result === 'won') levelWins++;
        if (ev.payload.continuePurchased) continuesPurchased++;
        break;
      case 'store_open':
        storeOpens++;
        break;
      case 'offer_shown':
        offersShown++;
        break;
      case 'offer_purchased':
        offersPurchased++;
        break;
      case 'ad_completed':
        adCompletions++;
        break;
    }
  }
  return {
    sessions,
    levelStarts,
    levelWins,
    storeOpens,
    offersShown,
    offersPurchased,
    continuesPurchased,
    adCompletions,
  };
}
