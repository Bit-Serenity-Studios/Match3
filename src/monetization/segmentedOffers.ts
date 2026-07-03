/**
 * Segmented offers: when a player fails the same level 3+ times, we surface
 * a limited-time bundle whose contents are tuned to that level's blockers.
 * 15-minute countdown; only one offer per player at a time.
 *
 * The brief calls this out as a churn-prevention lever — the offer is a
 * legitimate value drop, not a manipulation prompt. Contents cost less than
 * their component gem value.
 */
import type { LevelDef, Objective, BlockerKind } from '../engine/types';
import type { Sku } from './types';

export const FAIL_TRIGGER = 3;
export const OFFER_DURATION_MS = 15 * 60 * 1000;

export interface ActiveOffer {
  sku: Sku;
  levelId: string;
  startedAt: number; // ms epoch
  endsAt: number;
}

/** True if the player has just crossed the failure threshold on `levelId`. */
export function shouldTrigger(
  levelId: string,
  consecutiveFailsOnLevel: number,
  hasActiveOffer: boolean,
): boolean {
  if (hasActiveOffer) return false;
  return consecutiveFailsOnLevel === FAIL_TRIGGER;
}

/** Compose the offer SKU for the given level. Contents lean into whatever
 *  blockers appear in the level's starting layout. */
export function offerFor(level: LevelDef, now: number): ActiveOffer {
  const blockers = collectBlockers(level);
  const has = (k: BlockerKind) => blockers.has(k);

  // Base offer: 200 gems + 5 lives + a starter set of "moves" credit.
  const reward = {
    gems: 200,
    coins: 800,
    embers: 30,
    lives: 5,
  };
  // Bias toward what the level punishes.
  if (has('ivy') || has('vine')) reward.embers += 20;
  if (has('stoneRune')) reward.coins += 400;
  if (has('frostGlass')) reward.gems += 100;

  const sku: Sku = {
    id: `bundle-offer-${level.id}`,
    kind: 'bundle',
    title: `${prettyLevel(level.id)} — Kettle's Aid`,
    priceUsdCents: 199,
    reward,
    tag: 'limited',
  };
  return {
    sku,
    levelId: level.id,
    startedAt: now,
    endsAt: now + OFFER_DURATION_MS,
  };
}

export function isExpired(offer: ActiveOffer, now: number): boolean {
  return now >= offer.endsAt;
}

export function msRemaining(offer: ActiveOffer, now: number): number {
  return Math.max(0, offer.endsAt - now);
}

function collectBlockers(level: LevelDef): Set<BlockerKind> {
  const out = new Set<BlockerKind>();
  for (const t of level.startingLayout) {
    if (t?.blocker) out.add(t.blocker.kind);
  }
  // Also read `clearBlockers` objectives, since a level may not seed a blocker
  // in its layout but still have one grow (ivy).
  for (const o of level.objectives) {
    if (o.kind === 'clearBlockers' && o.blocker) out.add(o.blocker);
  }
  return out;
}

function prettyLevel(id: string): string {
  return id.replace(/^level-0*/, 'Level ');
}
