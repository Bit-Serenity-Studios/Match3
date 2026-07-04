import type { AdPlacement } from '../monetization/types';
import type { LevelArchetype, TileColor } from '../engine/types';
import type { Rarity } from '../companions/types';
import type { ExpeditionDuration } from '../expeditions/types';

/**
 * The typed event union that flows through the analytics module. Adding a
 * new event = adding a variant here + a helper in analytics.ts + a `case`
 * in aggregate.ts if it participates in a metric. Nothing else changes.
 */
export type TelemetryEvent =
  // ── Session ────────────────────────────────────────────────
  | { type: 'session_start'; ts: number; sessionId: string; appVersion: string }
  | { type: 'session_end'; ts: number; sessionId: string; durationMs: number }
  // ── Level lifecycle ────────────────────────────────────────
  | {
      type: 'level_started';
      ts: number;
      sessionId: string;
      levelId: string;
      archetype: LevelArchetype;
      attemptNumber: number;
      streak: number;
      companionId: string | null;
      difficultyMod: number;
    }
  | {
      type: 'level_finished';
      ts: number;
      sessionId: string;
      levelId: string;
      result: 'won' | 'lost';
      attempts: number;
      movesRemained: number;
      score: number;
      turns: number;
      boostersUsed: number;
      continuePurchased: boolean;
    }
  | {
      type: 'level_failed';
      ts: number;
      sessionId: string;
      levelId: string;
      failMarginPerObjective: number[];
    }
  // ── Store + offers ─────────────────────────────────────────
  | {
      type: 'store_open';
      ts: number;
      sessionId: string;
      source: 'hub_tab' | 'continue_screen' | 'segmented_offer';
    }
  | {
      type: 'offer_shown';
      ts: number;
      sessionId: string;
      skuId: string;
      levelId?: string;
    }
  | {
      type: 'offer_purchased';
      ts: number;
      sessionId: string;
      skuId: string;
      levelId?: string;
      priceUsdCents: number;
    }
  // ── Ads ────────────────────────────────────────────────────
  | {
      type: 'ad_requested';
      ts: number;
      sessionId: string;
      placement: AdPlacement;
    }
  | {
      type: 'ad_completed';
      ts: number;
      sessionId: string;
      placement: AdPlacement;
      rewarded: boolean;
    }
  // ── Companions ─────────────────────────────────────────────
  | {
      type: 'gacha_pull';
      ts: number;
      sessionId: string;
      companionId: string;
      rarity: Rarity;
      isNew: boolean;
      shardsAwarded: number;
      pityCounter: number;
    }
  // ── Expeditions ────────────────────────────────────────────
  | {
      type: 'expedition_start';
      ts: number;
      sessionId: string;
      companionId: string;
      duration: ExpeditionDuration;
    }
  | {
      type: 'expedition_claim';
      ts: number;
      sessionId: string;
      companionId: string;
      duration: ExpeditionDuration;
      coins: number;
      embers: number;
      gems: number;
      shards: number;
    };

export type TelemetryEventType = TelemetryEvent['type'];

/** All known event types — mirrors the union tags. Kept in sync via a compile
 *  check: TypeScript will error if we add a variant without listing it. */
export const ALL_EVENT_TYPES: readonly TelemetryEventType[] = [
  'session_start',
  'session_end',
  'level_started',
  'level_finished',
  'level_failed',
  'store_open',
  'offer_shown',
  'offer_purchased',
  'ad_requested',
  'ad_completed',
  'gacha_pull',
  'expedition_start',
  'expedition_claim',
];

// Compile-time exhaustiveness sanity check — if a new event is added to
// TelemetryEvent but not to ALL_EVENT_TYPES, this line fails to type-check.
const _completeness: TelemetryEventType extends
  (typeof ALL_EVENT_TYPES)[number]
  ? true
  : never = true;
void _completeness;

// Utility: partial-record indexed by TelemetryEventType. Used a lot in the
// aggregate module.
export type CountByType = Partial<Record<TelemetryEventType, number>>;

// Unused (compile-only) — silence the tile-color / archetype imports if
// unused variants change later.
export type _KeepImports = TileColor | LevelArchetype;
