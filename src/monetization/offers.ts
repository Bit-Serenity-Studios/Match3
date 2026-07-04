import type { LevelDef, TileColor, BlockerKind } from '../engine/types';
import type { BoosterId, Grants, ProductDef } from './types';

/**
 * Segmented offers: when the same level is failed 3 times in a row, a
 * 15-minute limited offer is triggered whose booster contents are picked
 * to counter that level's dominant obstacle.
 *
 *   blocker-heavy → hammer + shuffle
 *   ivy present   → hammer + extra moves
 *   frost glass   → color bomb + hammer
 *   score-gated   → extra moves + coin bomb
 *   collect a specific color → color bomb of that color + extra moves
 */

export const SEGMENTED_OFFER_TRIGGER_FAILS = 3;
export const SEGMENTED_OFFER_TTL_MS = 15 * 60 * 1000;

export interface ActiveOffer {
  sku: string;
  levelId: string;
  createdAt: number;
  expiresAt: number;
  reason: string;
  product: ProductDef;
}

export interface OfferInputs {
  levelId: string;
  level: LevelDef;
  now: number;
}

/** Public analyser — returns the offer descriptor if we should mint one. */
export function shouldTriggerOffer(
  fails: number,
  hasActive: boolean,
): boolean {
  return !hasActive && fails >= SEGMENTED_OFFER_TRIGGER_FAILS;
}

/** Dominant obstacle heuristic — read the level definition and vote. */
export function detectDominantObstacle(level: LevelDef): {
  reason: string;
  blockerKind?: BlockerKind;
  color?: TileColor;
} {
  let blockerCounts: Partial<Record<BlockerKind, number>> = {};
  for (const t of level.startingLayout) {
    if (t?.blocker) {
      blockerCounts[t.blocker.kind] =
        (blockerCounts[t.blocker.kind] ?? 0) + 1;
    }
  }
  const dominantBlocker = (Object.entries(blockerCounts) as Array<
    [BlockerKind, number]
  >)
    .sort((a, b) => b[1] - a[1])
    .find(([, n]) => n > 0);

  if (dominantBlocker && dominantBlocker[1] >= 6) {
    return {
      reason: `Melt through those ${dominantBlocker[0]}!`,
      blockerKind: dominantBlocker[0],
    };
  }

  const collectObj = level.objectives.find(
    (o) => o.kind === 'collectColor',
  );
  if (collectObj && collectObj.kind === 'collectColor') {
    return {
      reason: `Collect ${collectObj.color} in a snap.`,
      color: collectObj.color,
    };
  }

  const scoreObj = level.objectives.find((o) => o.kind === 'score');
  if (scoreObj) {
    return { reason: 'Close the score gap.' };
  }

  return { reason: 'One good round should do it.' };
}

/** Build the product SKU + contents for the offer. Pricing anchored below
 *  gems.medium so it feels like real value. */
export function buildOfferProduct(
  level: LevelDef,
  obstacle: ReturnType<typeof detectDominantObstacle>,
): ProductDef {
  const boosters: Partial<Record<BoosterId, number>> = {
    preLevelExtraMoves: 3,
  };
  if (obstacle.blockerKind === 'vine' || obstacle.blockerKind === 'ivy') {
    boosters.preLevelHammer = 3;
  } else if (obstacle.blockerKind === 'frostGlass') {
    boosters.colorBomb = 2;
    boosters.preLevelHammer = 2;
  } else if (obstacle.blockerKind === 'stoneRune') {
    boosters.preLevelHammer = 3;
    boosters.preLevelShuffle = 1;
  } else if (obstacle.color) {
    boosters.colorBomb = 2;
    boosters.preLevelExtraMoves = 5;
  } else {
    boosters.preLevelShuffle = 2;
  }
  const grants: Grants = { boosters, gems: 40 };
  return {
    sku: `offer.stuck.${level.id}`,
    kind: 'segmentedOffer',
    priceUsdCents: 199,
    displayPrice: '$1.99',
    title: 'A Little Help',
    subtitle: obstacle.reason,
    grants,
    oneShot: true,
    badge: 'popular',
  };
}

export function mintOffer(inputs: OfferInputs): ActiveOffer {
  const obstacle = detectDominantObstacle(inputs.level);
  const product = buildOfferProduct(inputs.level, obstacle);
  return {
    sku: product.sku,
    levelId: inputs.levelId,
    createdAt: inputs.now,
    expiresAt: inputs.now + SEGMENTED_OFFER_TTL_MS,
    reason: obstacle.reason,
    product,
  };
}

export function purgeExpired(
  offers: ActiveOffer[],
  now: number,
): ActiveOffer[] {
  return offers.filter((o) => o.expiresAt > now);
}
