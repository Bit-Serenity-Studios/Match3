import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  initLives,
  sync as syncLives,
  spendLife,
  grantLives,
  type LivesState,
} from '../monetization/lives';
import {
  initStreak,
  onWin as streakWin,
  onLossFinal,
  onContinueUsed,
  preLevelBoosters,
  type StreakState,
} from '../monetization/streak';
import {
  initPiggy,
  drip as piggyDrip,
  crack as piggyCrack,
  PIGGY_DRIP,
  type PiggyState,
} from '../monetization/piggyBank';
import {
  initAdCounters,
  canShow,
  noteShown,
  type AdCounters,
} from '../monetization/ads';
import type { AdPlacement } from '../monetization/types';
import {
  initPass,
  progressChallenge,
  claimReward,
  unlockPremium,
  rolloverIfNeeded,
  seasonIdFor,
  passLevelFor,
  type PassProgress,
} from '../monetization/battlePass';
import {
  initSubscription,
  activate as subActivate,
  isActive as subActive,
  claimDailyDrip,
  type SubscriptionState,
} from '../monetization/subscription';
import {
  mintOffer,
  purgeExpired,
  shouldTriggerOffer,
  type ActiveOffer,
} from '../monetization/offers';
import type { LevelDef } from '../engine/types';
import type { BoosterId, Grants, ProductDef } from '../monetization/types';

export interface MonetizationSlice {
  lives: LivesState;
  streak: StreakState;
  piggy: PiggyState;
  adCounters: AdCounters;
  pass: PassProgress;
  subscription: SubscriptionState;

  /** Consumable boosters — spent at level-start or mid-level. */
  boosters: Partial<Record<BoosterId, number>>;

  /** SKUs the player has purchased at least once (drives ad-free + oneShot). */
  purchasedSkus: string[];
  everPurchased: boolean;

  /** Active segmented offers (usually 0-1 at a time). */
  activeOffers: ActiveOffer[];

  /** Continue-attempts used on the current level session — clears on level advance. */
  continueAttemptsThisLevel: number;

  // Actions
  refreshLives(now: number): void;
  consumeLifeForLevelStart(now: number): boolean;
  grantLives(n: number, now: number): void;

  registerStreakWin(levelId: string): void;
  registerStreakLossFinal(): void;
  consumePreLevelBoosters(): Partial<Record<BoosterId, number>>;

  addBoosters(patch: Partial<Record<BoosterId, number>>): void;
  spendBooster(id: BoosterId): boolean;

  applyGrants(grants: Grants, now: number): void;

  purchaseProduct(product: ProductDef, now: number): void;
  recordRestoredPurchase(product: ProductDef, now: number): void;
  activateSubscription(now: number): void;
  claimSubscriptionDrip(now: number): number;

  crackPiggy(now: number): number;
  dripPiggy(kind: keyof typeof PIGGY_DRIP): void;

  canShowAd(placement: AdPlacement, now: number): boolean;
  noteAdShown(placement: AdPlacement, now: number): void;

  progressPassChallenge(challengeId: string, delta: number, now: number): void;
  claimPassReward(track: 'free' | 'premium', level: number, now: number): Grants | null;
  unlockPassPremium(now: number): void;
  refreshPass(now: number): void;

  maybeMintOffer(fails: number, levelId: string, level: LevelDef, now: number): ActiveOffer | null;
  purgeOffers(now: number): void;
  consumeOffer(sku: string): ActiveOffer | null;

  recordContinueUsed(): void;
  resetContinueAttempts(): void;

  addCurrency(patch: { coins?: number; gems?: number; embers?: number }): void;

  resetMonetization(): void;
}

/** Storage key kept isolated from the profile store so we can wipe one
 *  without touching the other. */
const STORAGE_KEY = 'moonpetal.monetization.v1';

export const useMonetization = create<MonetizationSlice>()(
  persist(
    (set, get) => ({
      lives: initLives(0),
      streak: initStreak(),
      piggy: initPiggy(),
      adCounters: initAdCounters(),
      pass: initPass(seasonIdFor(0)),
      subscription: initSubscription(),
      boosters: {},
      purchasedSkus: [],
      everPurchased: false,
      activeOffers: [],
      continueAttemptsThisLevel: 0,

      refreshLives(now) {
        const s = get();
        const next = syncLives(s.lives, now);
        if (next !== s.lives) set({ lives: next });
      },
      consumeLifeForLevelStart(now) {
        const s = get();
        const next = spendLife(s.lives, now);
        if (!next) return false;
        set({ lives: next });
        return true;
      },
      grantLives(n, now) {
        set({ lives: grantLives(get().lives, n, now) });
      },

      registerStreakWin(levelId) {
        set((s) => ({ streak: streakWin(s.streak, levelId) }));
      },
      registerStreakLossFinal() {
        set((s) => ({ streak: onLossFinal(s.streak) }));
      },
      consumePreLevelBoosters() {
        const s = get();
        const b = preLevelBoosters(s.streak);
        if (Object.keys(b).length === 0) return {};
        set({ boosters: mergeBoosters(s.boosters, b) });
        return b;
      },

      addBoosters(patch) {
        set((s) => ({ boosters: mergeBoosters(s.boosters, patch) }));
      },
      spendBooster(id) {
        const s = get();
        const current = s.boosters[id] ?? 0;
        if (current <= 0) return false;
        set({ boosters: { ...s.boosters, [id]: current - 1 } });
        return true;
      },

      applyGrants(grants, now) {
        const s = get();
        const patch: Partial<MonetizationSlice> = {};
        if (grants.boosters) {
          patch.boosters = mergeBoosters(s.boosters, grants.boosters);
        }
        if (grants.lives) {
          patch.lives = grantLives(s.lives, grants.lives, now);
        }
        set(patch as Partial<MonetizationSlice>);
        get().addCurrency({
          coins: grants.coins,
          gems: grants.gems,
          embers: grants.embers,
        });
        if (grants.subscriptionDays && grants.subscriptionDays > 0) {
          set({ subscription: subActivate(get().subscription, now) });
        }
      },

      purchaseProduct(product, now) {
        const s = get();
        const nextSkus = s.purchasedSkus.includes(product.sku)
          ? s.purchasedSkus
          : [...s.purchasedSkus, product.sku];
        set({
          purchasedSkus: nextSkus,
          everPurchased: true,
        });
        get().applyGrants(product.grants, now);
      },
      recordRestoredPurchase(product, now) {
        // Re-establish ownership + entitlements from a store restore WITHOUT
        // re-granting consumables (gems/coins/boosters). Store restore only
        // returns non-consumables + subscriptions; re-running applyGrants
        // would double-dip a consumable bundle. So we mark the SKU owned and
        // reinstate only the durable entitlements (ad-free sub, pass premium).
        const s = get();
        const nextSkus = s.purchasedSkus.includes(product.sku)
          ? s.purchasedSkus
          : [...s.purchasedSkus, product.sku];
        const patch: Partial<MonetizationSlice> = {
          purchasedSkus: nextSkus,
          everPurchased: true,
        };
        if (product.kind === 'subscription') {
          patch.subscription = subActivate(s.subscription, now);
        }
        if (product.kind === 'battlePass') {
          patch.pass = unlockPremium(rolloverIfNeeded(s.pass, now));
        }
        set(patch);
      },
      activateSubscription(now) {
        set({ subscription: subActivate(get().subscription, now) });
      },
      claimSubscriptionDrip(now) {
        const s = get();
        const r = claimDailyDrip(s.subscription, now);
        if (!r) return 0;
        set({ subscription: r.next });
        get().addCurrency({ gems: r.grantGems });
        return r.grantGems;
      },

      crackPiggy(now) {
        const s = get();
        const r = piggyCrack(s.piggy);
        set({ piggy: r.next });
        get().addCurrency({ gems: r.grantGems });
        return r.grantGems;
      },
      dripPiggy(kind) {
        const amt = PIGGY_DRIP[kind];
        set((s) => ({ piggy: piggyDrip(s.piggy, amt) }));
      },

      canShowAd(placement, now) {
        const s = get();
        return canShow(s.adCounters, placement, now, {
          everPurchased: s.everPurchased,
          subscribed: subActive(s.subscription, now),
        }).allowed;
      },
      noteAdShown(placement, now) {
        set((s) => ({ adCounters: noteShown(s.adCounters, placement, now) }));
      },

      progressPassChallenge(challengeId, delta, now) {
        set((s) => ({
          pass: progressChallenge(rolloverIfNeeded(s.pass, now), challengeId, delta),
        }));
      },
      claimPassReward(track, level, now) {
        const s = get();
        const pass = rolloverIfNeeded(s.pass, now);
        const r = claimReward(pass, track, level);
        if (!r) {
          if (pass !== s.pass) set({ pass });
          return null;
        }
        set({ pass: r.next });
        get().addCurrency({
          coins: r.grants.coins,
          embers: r.grants.embers,
          gems: r.grants.gems,
        });
        return r.grants;
      },
      unlockPassPremium(now) {
        set((s) => ({ pass: unlockPremium(rolloverIfNeeded(s.pass, now)) }));
      },
      refreshPass(now) {
        const s = get();
        const pass = rolloverIfNeeded(s.pass, now);
        if (pass !== s.pass) set({ pass });
      },

      maybeMintOffer(fails, levelId, level, now) {
        const s = get();
        const active = purgeExpired(s.activeOffers, now).filter(
          (o) => o.levelId === levelId,
        );
        if (!shouldTriggerOffer(fails, active.length > 0)) {
          if (active.length !== s.activeOffers.length) {
            set({ activeOffers: purgeExpired(s.activeOffers, now) });
          }
          return null;
        }
        const offer = mintOffer({ levelId, level, now });
        set({
          activeOffers: [...purgeExpired(s.activeOffers, now), offer],
        });
        // Lazy require to sidestep any startup import cycle with the logger.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { track } = require('../telemetry/logger') as typeof import('../telemetry/logger');
        track('offer_shown', {
          sku: offer.sku,
          levelId: offer.levelId,
          reason: offer.reason,
        });
        return offer;
      },
      purgeOffers(now) {
        set((s) => ({ activeOffers: purgeExpired(s.activeOffers, now) }));
      },
      consumeOffer(sku) {
        const s = get();
        const found = s.activeOffers.find((o) => o.sku === sku) ?? null;
        if (!found) return null;
        set({ activeOffers: s.activeOffers.filter((o) => o.sku !== sku) });
        return found;
      },

      recordContinueUsed() {
        set((s) => ({
          continueAttemptsThisLevel: s.continueAttemptsThisLevel + 1,
          streak: onContinueUsed(s.streak),
        }));
      },
      resetContinueAttempts() {
        set({ continueAttemptsThisLevel: 0 });
      },

      addCurrency(patch) {
        // Currency lives on the profile store; we import lazily to avoid
        // a circular reference at module load time.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { useProfile } = require('./profile') as typeof import('./profile');
        useProfile.getState().addCurrency(patch);
      },

      resetMonetization() {
        set({
          lives: initLives(0),
          streak: initStreak(),
          piggy: initPiggy(),
          adCounters: initAdCounters(),
          pass: initPass(seasonIdFor(0)),
          subscription: initSubscription(),
          boosters: {},
          purchasedSkus: [],
          everPurchased: false,
          activeOffers: [],
          continueAttemptsThisLevel: 0,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

function mergeBoosters(
  base: Partial<Record<BoosterId, number>>,
  patch: Partial<Record<BoosterId, number>>,
): Partial<Record<BoosterId, number>> {
  const out: Partial<Record<BoosterId, number>> = { ...base };
  for (const [k, v] of Object.entries(patch) as Array<[BoosterId, number]>) {
    out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

/** Convenience: current pass-level derived from XP. */
export function currentPassLevel(state: MonetizationSlice): number {
  return passLevelFor(state.pass.xp);
}
