import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OwnedCompanion } from '../companions/types';
import type { ActiveExpedition, ExpeditionDuration } from '../expeditions/types';
import { EXPEDITION_MINUTES } from '../expeditions/types';
import { computeRewards } from '../expeditions/rewards';
import { initPity, ownFresh, type PityState } from '../companions/gacha';
import { addXp, evolve } from '../companions/progression';
import type { FixtureId } from '../hub/fixtures';
import { computeFixtureBonuses, upgradeCost } from '../hub/fixtures';
import {
  consumeLife,
  grantLives,
  materializeLives,
  MAX_LIVES,
  type LivesState,
} from '../monetization/lives';
import {
  accrue as piggyAccrue,
  claim as piggyClaim,
  emptyPiggy,
  type PiggyState,
} from '../monetization/piggyBank';
import {
  newPass,
  addXp as passAddXp,
  isExpired as passIsExpired,
  rewardAt as passRewardAt,
  type BattlePassState,
} from '../monetization/battlepass';
import {
  activate as subActivate,
  claimDrip,
  emptySubscription,
  isActive as subIsActive,
  type SubscriptionState,
} from '../monetization/subscription';
import type { AdCountersByDay } from '../monetization/ads';
import { bumpCount, canShow, prune as pruneAds } from '../monetization/ads';
import type { ActiveOffer } from '../monetization/segmentedOffers';
import { getProvider } from '../monetization/mockProvider';
import { getSku, DAILY_SUB_GEMS, SUBSCRIPTION_MONTHLY } from '../monetization/catalog';
import type { AdPlacement, Sku, PurchaseResult, AdResult } from '../monetization/types';
import { trackEvent } from '../telemetry/analytics';

/**
 * The persistent player profile. Everything here survives app restart via
 * AsyncStorage. Keep this file the only place we hold mutable player state —
 * pure logic modules stay data-in, data-out.
 */
export interface Currencies {
  coins: number;
  gems: number;
  embers: number;
}

export interface LevelRewards {
  coins: number;
  embers: number;
  xp: number;
}

export interface ProfileState {
  // Progression
  currentLevelIndex: number;
  consecutiveFails: Record<string, number>;
  highestUnlocked: number;

  // Currencies
  coins: number;
  gems: number;
  embers: number;
  lives: LivesState;

  // Streak
  winStreak: number;

  // Companions
  ownedCompanions: OwnedCompanion[];
  equippedCompanionId: string | null;
  pity: PityState;

  // Expeditions
  activeExpeditions: ActiveExpedition[];

  // Hub
  fixtureLevels: Partial<Record<FixtureId, number>>;

  // Monetization
  hasEverPurchased: boolean;
  starterBundleClaimed: boolean;
  piggy: PiggyState;
  subscription: SubscriptionState;
  battlePass: BattlePassState | null;
  adCounters: AdCountersByDay;
  activeOffer: ActiveOffer | null;

  // Progression actions
  registerWin(levelId: string, rewards: LevelRewards): void;
  registerLoss(levelId: string): void;
  advanceLevel(): void;
  resetProgress(): void;

  // Currency actions
  spendCoins(amount: number): boolean;
  spendEmbers(amount: number): boolean;
  spendGems(amount: number): boolean;

  // Lives actions
  materializeLivesNow(): LivesState;
  consumeLifeNow(): boolean;
  grantLivesNow(n: number): void;

  // Companion actions
  addCompanion(id: string, isNew: boolean, shardsAwarded: number): void;
  equipCompanion(id: string | null): void;
  updateCompanion(id: string, patch: Partial<OwnedCompanion>): void;
  tryEvolveCompanion(id: string): boolean;
  setPity(p: PityState): void;

  // Expedition actions
  startExpedition(
    companionId: string,
    duration: ExpeditionDuration,
    now: number,
  ): boolean;
  claimExpedition(index: number, now: number): LevelRewards | null;

  // Hub
  upgradeFixture(id: FixtureId): boolean;

  // Streak
  setWinStreak(n: number): void;

  // Monetization actions
  purchase(skuId: string): Promise<PurchaseResult>;
  showRewardedAd(placement: AdPlacement): Promise<AdResult>;
  canShowRewardedAd(placement: AdPlacement, now: number): boolean;
  showInterstitial(placement: AdPlacement): Promise<AdResult>;
  canShowInterstitial(placement: AdPlacement, now: number): boolean;
  claimPiggy(): number;
  activateSubscription(now: number): void;
  claimSubDripNow(now: number): number;
  setOffer(offer: ActiveOffer | null): void;
  addBattlePassXp(amount: number): void;
  claimBattlePassTier(tier: number, track: 'free' | 'premium'): boolean;
  startNewBattlePass(now: number): void;
  buyBattlePassPremium(): void;
  applyMysteryReward(coins: number, gems: number, embers: number): void;
}

const DIFFICULTY_EASE_THRESHOLD = 4;
export const MAX_DIFFICULTY_EASE = 0.35;

export function difficultyEaseFor(consecutiveFails: number): number {
  if (consecutiveFails < DIFFICULTY_EASE_THRESHOLD) return 0;
  const extra = consecutiveFails - DIFFICULTY_EASE_THRESHOLD;
  return Math.min(MAX_DIFFICULTY_EASE, 0.15 + extra * 0.05);
}

/** Unlock gates from the brief: hub@L4, companions@L7, expeditions@L10. */
export const UNLOCK_HUB_AT = 3; // 0-based → level 4 (index 3)
export const UNLOCK_COMPANIONS_AT = 6;
export const UNLOCK_EXPEDITIONS_AT = 9;

/** Fraction of level-win gems (via mystery/piggy) that spill into the piggy. */
const PIGGY_ACCRUE_ON_WIN = 3; // gems per win

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentLevelIndex: 0,
      consecutiveFails: {},
      highestUnlocked: 0,
      coins: 0,
      gems: 0,
      embers: 0,
      lives: { lives: MAX_LIVES, regenAt: null },
      winStreak: 0,
      ownedCompanions: [],
      equippedCompanionId: null,
      pity: initPity(1),
      activeExpeditions: [],
      fixtureLevels: {},
      hasEverPurchased: false,
      starterBundleClaimed: false,
      piggy: emptyPiggy(),
      subscription: emptySubscription(),
      battlePass: null,
      adCounters: {},
      activeOffer: null,

      registerWin(levelId, rewards) {
        set((s) => {
          const nextFails = { ...s.consecutiveFails };
          delete nextFails[levelId];
          const bonuses = computeFixtureBonuses(s.fixtureLevels);
          const coinsGain = Math.round(
            rewards.coins * (1 + bonuses.coinBonusPct / 100),
          );
          const embersGain = Math.round(
            rewards.embers * (1 + bonuses.emberBonusPct / 100),
          );
          const companions = s.ownedCompanions.map((c) =>
            c.id === s.equippedCompanionId ? addXp(c, rewards.xp) : c,
          );
          const piggyRes = piggyAccrue(s.piggy, PIGGY_ACCRUE_ON_WIN);
          return {
            consecutiveFails: nextFails,
            coins: s.coins + coinsGain,
            embers: s.embers + embersGain,
            ownedCompanions: companions,
            winStreak: s.winStreak + 1,
            piggy: piggyRes.state,
          };
        });
      },
      registerLoss(levelId) {
        set((s) => ({
          consecutiveFails: {
            ...s.consecutiveFails,
            [levelId]: (s.consecutiveFails[levelId] ?? 0) + 1,
          },
          lives: consumeLife(materializeLives(s.lives, Date.now()), Date.now()),
          winStreak: 0,
        }));
      },
      advanceLevel() {
        set((s) => ({
          currentLevelIndex: s.currentLevelIndex + 1,
          highestUnlocked: Math.max(
            s.highestUnlocked,
            s.currentLevelIndex + 1,
          ),
        }));
      },
      resetProgress() {
        set({
          currentLevelIndex: 0,
          consecutiveFails: {},
          highestUnlocked: 0,
          coins: 0,
          gems: 0,
          embers: 0,
          lives: { lives: MAX_LIVES, regenAt: null },
          winStreak: 0,
          ownedCompanions: [],
          equippedCompanionId: null,
          pity: initPity(1),
          activeExpeditions: [],
          fixtureLevels: {},
          hasEverPurchased: false,
          starterBundleClaimed: false,
          piggy: emptyPiggy(),
          subscription: emptySubscription(),
          battlePass: null,
          adCounters: {},
          activeOffer: null,
        });
      },

      spendCoins(amount) {
        const s = get();
        if (s.coins < amount) return false;
        set({ coins: s.coins - amount });
        return true;
      },
      spendEmbers(amount) {
        const s = get();
        if (s.embers < amount) return false;
        set({ embers: s.embers - amount });
        return true;
      },
      spendGems(amount) {
        const s = get();
        if (s.gems < amount) return false;
        set({ gems: s.gems - amount });
        return true;
      },

      materializeLivesNow() {
        const now = Date.now();
        const proj = materializeLives(get().lives, now);
        set({ lives: proj });
        return proj;
      },
      consumeLifeNow() {
        const now = Date.now();
        const proj = materializeLives(get().lives, now);
        if (proj.lives <= 0) {
          set({ lives: proj });
          return false;
        }
        set({ lives: consumeLife(proj, now) });
        return true;
      },
      grantLivesNow(n) {
        const now = Date.now();
        set((s) => ({ lives: grantLives(s.lives, n, now) }));
      },

      addCompanion(id, isNew, shardsAwarded) {
        set((s) => {
          const owned = s.ownedCompanions.slice();
          const existing = owned.findIndex((c) => c.id === id);
          if (isNew && existing < 0) {
            owned.push(ownFresh(id, Date.now()));
            return {
              ownedCompanions: owned,
              equippedCompanionId: s.equippedCompanionId ?? id,
            };
          }
          if (existing >= 0 && shardsAwarded > 0) {
            const c = owned[existing]!;
            owned[existing] = { ...c, shards: c.shards + shardsAwarded };
          }
          return { ownedCompanions: owned };
        });
      },
      equipCompanion(id) {
        const s = get();
        if (id && !s.ownedCompanions.some((c) => c.id === id)) return;
        set({ equippedCompanionId: id });
      },
      updateCompanion(id, patch) {
        set((s) => ({
          ownedCompanions: s.ownedCompanions.map((c) =>
            c.id === id ? { ...c, ...patch } : c,
          ),
        }));
      },
      tryEvolveCompanion(id) {
        const s = get();
        const c = s.ownedCompanions.find((x) => x.id === id);
        if (!c) return false;
        const r = evolve(c);
        if (!r.evolved) return false;
        set({
          ownedCompanions: s.ownedCompanions.map((x) =>
            x.id === id ? r.owned : x,
          ),
        });
        return true;
      },

      setPity(p) {
        set({ pity: p });
      },

      startExpedition(companionId, duration, now) {
        const s = get();
        if (s.activeExpeditions.length >= 2) return false;
        if (!s.ownedCompanions.some((c) => c.id === companionId)) return false;
        if (s.activeExpeditions.some((e) => e.companionId === companionId))
          return false;
        const bonuses = computeFixtureBonuses(s.fixtureLevels);
        const durMs =
          EXPEDITION_MINUTES[duration] *
          60 *
          1000 *
          (1 - bonuses.expeditionSpeedupPct / 100);
        const exp: ActiveExpedition = {
          companionId,
          duration,
          startedAt: now,
          endsAt: now + Math.round(durMs),
          seed: now ^ (companionId.length * 137),
        };
        set({ activeExpeditions: [...s.activeExpeditions, exp] });
        trackEvent({ type: 'expedition_start', companionId, duration });
        return true;
      },
      claimExpedition(index, now) {
        const s = get();
        const exp = s.activeExpeditions[index];
        if (!exp) return null;
        if (now < exp.endsAt) return null;
        const r = computeRewards(exp.companionId, exp.duration, exp.seed);
        set({
          activeExpeditions: s.activeExpeditions.filter((_, i) => i !== index),
          coins: s.coins + r.coins,
          embers: s.embers + r.embers,
          gems: s.gems + r.gems,
          ownedCompanions: s.ownedCompanions.map((c) =>
            c.id === exp.companionId
              ? { ...c, shards: c.shards + r.shards }
              : c,
          ),
        });
        trackEvent({
          type: 'expedition_claim',
          companionId: exp.companionId,
          duration: exp.duration,
          coins: r.coins,
          embers: r.embers,
          gems: r.gems,
          shards: r.shards,
        });
        return { coins: r.coins, embers: r.embers, xp: 0 };
      },

      upgradeFixture(id) {
        const s = get();
        const lv = s.fixtureLevels[id] ?? 0;
        const cost = upgradeCost(id, lv);
        if (cost === null) return false;
        if (s.coins < cost) return false;
        set({
          coins: s.coins - cost,
          fixtureLevels: { ...s.fixtureLevels, [id]: lv + 1 },
        });
        return true;
      },

      setWinStreak(n) {
        set({ winStreak: n });
      },

      async purchase(skuId) {
        const sku = getSku(skuId);
        if (!sku) return { ok: false, sku: skuId, error: 'unknown-sku' };
        const provider = getProvider();
        const result = await provider.purchase(sku);
        if (!result.ok) return result;
        applyPurchase(sku, set, get);
        trackEvent({
          type: 'offer_purchased',
          skuId: sku.id,
          priceUsdCents: sku.priceUsdCents,
        });
        return result;
      },

      async showRewardedAd(placement) {
        const now = Date.now();
        const s = get();
        trackEvent({ type: 'ad_requested', placement });
        if (!canShow(s.adCounters, placement, now)) {
          return { ok: false, placement, rewarded: false, error: 'cap-reached' };
        }
        const provider = getProvider();
        const result = await provider.showRewardedAd(placement);
        if (result.ok && result.rewarded) {
          set({ adCounters: bumpCount(pruneAds(s.adCounters, now), placement, now) });
        }
        trackEvent({
          type: 'ad_completed',
          placement,
          rewarded: result.rewarded,
        });
        return result;
      },
      canShowRewardedAd(placement, now) {
        return canShow(get().adCounters, placement, now);
      },
      async showInterstitial(placement) {
        const now = Date.now();
        const s = get();
        trackEvent({ type: 'ad_requested', placement });
        if (s.hasEverPurchased) {
          return { ok: false, placement, rewarded: false, error: 'purchaser-suppressed' };
        }
        if (subIsActive(s.subscription, now)) {
          return { ok: false, placement, rewarded: false, error: 'subscriber-suppressed' };
        }
        if (!canShow(s.adCounters, placement, now)) {
          return { ok: false, placement, rewarded: false, error: 'cap-reached' };
        }
        const provider = getProvider();
        const result = await provider.showInterstitial(placement);
        if (result.ok) {
          set({ adCounters: bumpCount(pruneAds(s.adCounters, now), placement, now) });
        }
        trackEvent({
          type: 'ad_completed',
          placement,
          rewarded: false,
        });
        return result;
      },
      canShowInterstitial(placement, now) {
        const s = get();
        if (s.hasEverPurchased) return false;
        if (subIsActive(s.subscription, now)) return false;
        return canShow(s.adCounters, placement, now);
      },

      claimPiggy() {
        const s = get();
        const r = piggyClaim(s.piggy);
        set({ piggy: r.state, gems: s.gems + r.gemsGranted });
        return r.gemsGranted;
      },

      activateSubscription(now) {
        set((s) => ({
          subscription: subActivate(s.subscription, now, SUBSCRIPTION_MONTHLY.subDurationDays ?? 30),
          hasEverPurchased: true,
          gems: s.gems + DAILY_SUB_GEMS, // day-1 grant
        }));
      },
      claimSubDripNow(now) {
        const s = get();
        const r = claimDrip(s.subscription, now);
        if (r.gems > 0) {
          set({ subscription: r.state, gems: s.gems + r.gems });
        }
        return r.gems;
      },

      setOffer(offer) {
        set({ activeOffer: offer });
      },

      startNewBattlePass(now) {
        const seasonId = `s${Math.floor(now / (14 * 24 * 3600 * 1000))}`;
        set({ battlePass: newPass(seasonId, now) });
      },
      addBattlePassXp(amount) {
        set((s) => {
          if (!s.battlePass) return {};
          const now = Date.now();
          if (passIsExpired(s.battlePass, now)) return {};
          return { battlePass: passAddXp(s.battlePass, amount) };
        });
      },
      claimBattlePassTier(tier, track) {
        const s = get();
        const p = s.battlePass;
        if (!p) return false;
        if (track === 'premium' && !p.premiumOwned) return false;
        const claimedField = track === 'free' ? 'claimedFree' : 'claimedPremium';
        if (p[claimedField] >= tier) return false;
        const reward = passRewardAt(tier);
        const gemsGain = track === 'premium' ? reward.premium.gems : 0;
        const coinsGain =
          track === 'free' ? reward.free.coins : reward.premium.coins;
        const embersGain =
          track === 'free' ? reward.free.embers : reward.premium.embers;
        set({
          battlePass: { ...p, [claimedField]: tier },
          coins: s.coins + coinsGain,
          embers: s.embers + embersGain,
          gems: s.gems + gemsGain,
        });
        return true;
      },
      buyBattlePassPremium() {
        set((s) => {
          if (!s.battlePass) return {};
          return {
            battlePass: { ...s.battlePass, premiumOwned: true },
            hasEverPurchased: true,
          };
        });
      },
      applyMysteryReward(coins, gems, embers) {
        set((s) => ({
          coins: s.coins + coins,
          gems: s.gems + gems,
          embers: s.embers + embers,
        }));
      },
    }),
    {
      name: 'moonpetal.profile.v3',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

function applyPurchase(
  sku: Sku,
  set: (partial: Partial<ProfileState>) => void,
  get: () => ProfileState,
) {
  const s = get();
  const patch: Partial<ProfileState> = { hasEverPurchased: true };
  if (sku.kind === 'piggyBankUnlock') {
    const r = piggyClaim(s.piggy);
    patch.piggy = r.state;
    patch.gems = s.gems + r.gemsGranted;
  } else if (sku.kind === 'subscription') {
    patch.subscription = subActivate(s.subscription, Date.now(), sku.subDurationDays ?? 30);
    patch.gems = s.gems + DAILY_SUB_GEMS;
  } else {
    patch.gems = s.gems + sku.reward.gems;
    patch.coins = s.coins + sku.reward.coins;
    patch.embers = s.embers + sku.reward.embers;
    if (sku.reward.lives > 0) {
      patch.lives = grantLives(s.lives, sku.reward.lives, Date.now());
    }
    if (sku.tag === 'starter') patch.starterBundleClaimed = true;
    if (sku.tag === 'limited') patch.activeOffer = null; // consumed
  }
  set(patch);
}
