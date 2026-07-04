import type { TileColor } from '../engine/types';
import type { AdPlacement, BoosterId } from '../monetization/types';

/**
 * Local-first event schema. Every event has:
 *   - `type` — discriminator
 *   - `at` — wall-clock ms when logged
 *   - `sessionId` — set on session_start, replayed onto every subsequent
 *     event so we can partition the queue post-hoc
 *   - `payload` — event-specific
 *
 * Payloads use string enums instead of TS unions where possible so the
 * exported JSON is self-describing for a data analyst without a schema.
 */

export interface BaseEvent<T extends string, P> {
  type: T;
  at: number;
  sessionId: string;
  payload: P;
}

/* ---------- Level events ------------------------------------------------ */

export type LevelStarted = BaseEvent<'level_started', {
  levelId: string;
  archetype: string;
  attempt: number;
  seed: number;
  difficultyMod: number;
  boostersUsed: Partial<Record<BoosterId, number>>;
  companionId: string | null;
}>;

export type LevelFinished = BaseEvent<'level_finished', {
  levelId: string;
  result: 'won' | 'lost';
  score: number;
  turnsTaken: number;
  movesRemained: number;
  boostersUsed: Partial<Record<BoosterId, number>>;
  attempts: number;
  continuePurchased: boolean;
}>;

export type LevelFailed = BaseEvent<'level_failed', {
  levelId: string;
  /** Per-objective fail margin: 0 = complete, 1 = untouched. */
  failMarginPerObjective: Array<{ index: number; margin: number }>;
  score: number;
  turnsTaken: number;
}>;

/* ---------- Store / offers ---------------------------------------------- */

export type StoreOpen = BaseEvent<'store_open', {
  source: 'hub' | 'game' | 'continue' | 'offer' | 'pass';
}>;

export type OfferShown = BaseEvent<'offer_shown', {
  sku: string;
  levelId: string;
  reason: string;
}>;

export type OfferPurchased = BaseEvent<'offer_purchased', {
  sku: string;
  levelId: string;
}>;

/* ---------- Ads --------------------------------------------------------- */

export type AdRequested = BaseEvent<'ad_requested', {
  placement: AdPlacement;
}>;

export type AdCompleted = BaseEvent<'ad_completed', {
  placement: AdPlacement;
  grants: Record<string, number>;
}>;

/* ---------- Gacha + expeditions ---------------------------------------- */

export type GachaPull = BaseEvent<'gacha_pull', {
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  companionId: string;
  isNew: boolean;
  shardsAwarded: number;
  cost: number;
}>;

export type ExpeditionStart = BaseEvent<'expedition_start', {
  companionId: string;
  duration: 'short' | 'medium' | 'long';
}>;

export type ExpeditionClaim = BaseEvent<'expedition_claim', {
  companionId: string;
  duration: 'short' | 'medium' | 'long';
  coins: number;
  embers: number;
  gems: number;
  shards: number;
}>;

/* ---------- Session ----------------------------------------------------- */

export type SessionStart = BaseEvent<'session_start', {
  device: 'expo' | 'test';
  version: string;
}>;

export type SessionEnd = BaseEvent<'session_end', {
  durationMs: number;
  eventsInSession: number;
}>;

/* ---------- Misc -------------------------------------------------------- */

export type CurrencySpend = BaseEvent<'currency_spend', {
  currency: 'coins' | 'gems' | 'embers';
  amount: number;
  reason: string;
}>;

export type StreakChanged = BaseEvent<'streak_changed', {
  from: number;
  to: number;
  cause: 'win' | 'loss' | 'continue';
}>;

export type AnyEvent =
  | LevelStarted
  | LevelFinished
  | LevelFailed
  | StoreOpen
  | OfferShown
  | OfferPurchased
  | AdRequested
  | AdCompleted
  | GachaPull
  | ExpeditionStart
  | ExpeditionClaim
  | SessionStart
  | SessionEnd
  | CurrencySpend
  | StreakChanged;

export type EventType = AnyEvent['type'];
