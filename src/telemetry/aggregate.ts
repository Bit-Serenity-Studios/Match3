import type { TelemetryEvent, CountByType } from './types';

/**
 * Pure aggregators over a stream of TelemetryEvents. Every function takes an
 * array and returns a plain object. Kept dependency-free so the dev dashboard
 * or an offline analysis script can call them without wiring.
 */

export interface LevelStats {
  levelId: string;
  archetype: string;
  starts: number;
  wins: number;
  losses: number;
  aps: number; // attempts per success
  medianMovesRemainingOnWin: number;
  medianFailMarginPerObjective: number;
  continuePurchases: number;
}

/** Per-level APS + fail-margin + attempt count from real play. Complements
 *  the Phase 2 simulator: same units, but based on real events. */
export function levelStats(events: readonly TelemetryEvent[]): LevelStats[] {
  const groups = new Map<
    string,
    {
      archetype: string;
      starts: number;
      wins: number;
      losses: number;
      movesRemainingOnWin: number[];
      failMargins: number[];
      continuePurchases: number;
    }
  >();
  const ensure = (levelId: string, archetype = 'unknown') => {
    let g = groups.get(levelId);
    if (!g) {
      g = {
        archetype,
        starts: 0,
        wins: 0,
        losses: 0,
        movesRemainingOnWin: [],
        failMargins: [],
        continuePurchases: 0,
      };
      groups.set(levelId, g);
    }
    // Refine archetype if we learn it later.
    if (g.archetype === 'unknown' && archetype !== 'unknown') {
      g.archetype = archetype;
    }
    return g;
  };
  for (const e of events) {
    switch (e.type) {
      case 'level_started':
        ensure(e.levelId, e.archetype).starts++;
        break;
      case 'level_finished': {
        const g = ensure(e.levelId);
        if (e.result === 'won') {
          g.wins++;
          g.movesRemainingOnWin.push(e.movesRemained);
        } else {
          g.losses++;
        }
        if (e.continuePurchased) g.continuePurchases++;
        break;
      }
      case 'level_failed': {
        const g = ensure(e.levelId);
        if (e.failMarginPerObjective.length > 0) {
          const mean =
            e.failMarginPerObjective.reduce((a, b) => a + b, 0) /
            e.failMarginPerObjective.length;
          g.failMargins.push(mean);
        }
        break;
      }
      default:
        break;
    }
  }
  const out: LevelStats[] = [];
  for (const [levelId, g] of groups) {
    out.push({
      levelId,
      archetype: g.archetype,
      starts: g.starts,
      wins: g.wins,
      losses: g.losses,
      aps: g.wins > 0 ? (g.starts || g.wins + g.losses) / g.wins : Infinity,
      medianMovesRemainingOnWin: median(g.movesRemainingOnWin),
      medianFailMarginPerObjective: median(g.failMargins),
      continuePurchases: g.continuePurchases,
    });
  }
  out.sort((a, b) => a.levelId.localeCompare(b.levelId));
  return out;
}

/** Simple event-type histogram — the funnel core. */
export function eventCounts(events: readonly TelemetryEvent[]): CountByType {
  const out: CountByType = {};
  for (const e of events) {
    out[e.type] = (out[e.type] ?? 0) + 1;
  }
  return out;
}

export interface FunnelCounts {
  levelStarts: number;
  levelWins: number;
  levelLosses: number;
  storeOpens: number;
  offersShown: number;
  offersPurchased: number;
  adsRequested: number;
  adsCompleted: number;
  gachaPulls: number;
  expeditionsStarted: number;
  expeditionsClaimed: number;
  sessions: number;
}

export function funnel(events: readonly TelemetryEvent[]): FunnelCounts {
  const c = eventCounts(events);
  return {
    levelStarts: c.level_started ?? 0,
    levelWins: events.filter(
      (e) => e.type === 'level_finished' && e.result === 'won',
    ).length,
    levelLosses: events.filter(
      (e) => e.type === 'level_finished' && e.result === 'lost',
    ).length,
    storeOpens: c.store_open ?? 0,
    offersShown: c.offer_shown ?? 0,
    offersPurchased: c.offer_purchased ?? 0,
    adsRequested: c.ad_requested ?? 0,
    adsCompleted: c.ad_completed ?? 0,
    gachaPulls: c.gacha_pull ?? 0,
    expeditionsStarted: c.expedition_start ?? 0,
    expeditionsClaimed: c.expedition_claim ?? 0,
    sessions: c.session_start ?? 0,
  };
}

/** Average session duration in ms, computed from paired session_start / _end
 *  events. Sessions without an _end are excluded. */
export function meanSessionDurationMs(events: readonly TelemetryEvent[]): number {
  const durations: number[] = [];
  for (const e of events) {
    if (e.type === 'session_end') durations.push(e.durationMs);
  }
  if (durations.length === 0) return 0;
  return durations.reduce((a, b) => a + b, 0) / durations.length;
}

function median(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  const sorted = xs.slice().sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}
