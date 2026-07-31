import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OwnedCompanion } from '../companions/types';
import type { ActiveExpedition, ExpeditionDuration } from '../expeditions/types';
import { EXPEDITION_MINUTES } from '../expeditions/types';
import { computeRewards } from '../expeditions/rewards';
import { initPity, ownFresh, type PityState } from '../companions/gacha';
import { addXp, evolve } from '../companions/progression';
import { getCompanion } from '../companions/catalog';
import type { FixtureId } from '../hub/fixtures';
import { computeFixtureBonuses, upgradeCost } from '../hub/fixtures';

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

  // Companions
  ownedCompanions: OwnedCompanion[];
  equippedCompanionId: string | null;
  pity: PityState;

  // Expeditions
  activeExpeditions: ActiveExpedition[];

  // Hub
  fixtureLevels: Partial<Record<FixtureId, number>>;

  // First-run flags
  tutorialSeen: boolean;
  /** True once the player clears the last authored tutorial-archetype level. */
  tutorialLevelsCleared: boolean;
  tosAcceptedAt: number; // 0 = not accepted

  // Audio
  soundEnabled: boolean; // legacy alias — kept for compatibility with sfx()
  sfxEnabled: boolean;
  sfxVolume: number; // 0..1
  musicEnabled: boolean;
  musicVolume: number; // 0..1

  // Feedback
  hapticsEnabled: boolean;

  // Accessibility
  reduceMotion: boolean;
  largerText: boolean;
  largerTapTargets: boolean;
  highContrast: boolean;
  colorblindMode: 'off' | 'deuteranopia' | 'protanopia' | 'tritanopia';

  // Competitive rank (online mode). Starts at 0, gates online unlocks.
  moonstones: number;

  // Actions
  markTutorialSeen(): void;
  markTutorialLevelsCleared(): void;
  acceptTos(now: number): void;
  setSoundEnabled(v: boolean): void;
  setSfxEnabled(v: boolean): void;
  setSfxVolume(v: number): void;
  setMusicEnabled(v: boolean): void;
  setMusicVolume(v: number): void;
  setHapticsEnabled(v: boolean): void;
  setReduceMotion(v: boolean): void;
  setLargerText(v: boolean): void;
  setLargerTapTargets(v: boolean): void;
  setHighContrast(v: boolean): void;
  setColorblindMode(m: ProfileState['colorblindMode']): void;
  awardMoonstones(delta: number): void;

  registerWin(levelId: string, rewards: LevelRewards): void;
  registerLoss(levelId: string): void;
  advanceLevel(): void;
  resetProgress(): void;

  spendCoins(amount: number): boolean;
  spendEmbers(amount: number): boolean;
  spendGems(amount: number): boolean;
  addCurrency(patch: { coins?: number; gems?: number; embers?: number }): void;

  addCompanion(id: string, isNew: boolean, shardsAwarded: number): void;
  equipCompanion(id: string | null): void;
  updateCompanion(id: string, patch: Partial<OwnedCompanion>): void;
  tryEvolveCompanion(id: string): boolean;

  setPity(p: PityState): void;

  startExpedition(
    companionId: string,
    duration: ExpeditionDuration,
    now: number,
  ): boolean;
  claimExpedition(index: number, now: number): LevelRewards | null;

  upgradeFixture(id: FixtureId): boolean;
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

/** Online mode unlock thresholds (moonstones). */
export const UNLOCK_COVENS_AT_MOONSTONES = 550;
export const UNLOCK_MOONRISE_AT_MOONSTONES = 800;
export const UNLOCK_GRIMOIRE_AT_MOONSTONES = 200;

/** Moonstones granted per level win. Mirrors the web preview (+5/win) so the
 *  currency actually accrues and the moonstone-gated screens (Grimoire, Covens,
 *  Moonrise) can be reached — previously nothing ever awarded moonstones. */
export const MOONSTONES_PER_WIN = 5;

export const useProfile = create<ProfileState>()(
  persist(
    (set, get) => ({
      currentLevelIndex: 0,
      consecutiveFails: {},
      highestUnlocked: 0,
      coins: 0,
      gems: 0,
      embers: 0,
      ownedCompanions: [],
      equippedCompanionId: null,
      pity: initPity(1),
      activeExpeditions: [],
      fixtureLevels: {},
      tutorialSeen: false,
      tutorialLevelsCleared: false,
      tosAcceptedAt: 0,
      soundEnabled: true,
      sfxEnabled: true,
      sfxVolume: 0.7,
      musicEnabled: true,
      musicVolume: 0.4,
      hapticsEnabled: true,
      reduceMotion: false,
      largerText: false,
      largerTapTargets: false,
      highContrast: false,
      colorblindMode: 'off' as const,
      moonstones: 0,

      markTutorialSeen() {
        set({ tutorialSeen: true });
      },
      markTutorialLevelsCleared() {
        set({ tutorialLevelsCleared: true });
      },
      acceptTos(now) {
        set({ tosAcceptedAt: now });
      },
      setSoundEnabled(v) {
        set({ soundEnabled: v, sfxEnabled: v });
      },
      setSfxEnabled(v) {
        set({ sfxEnabled: v, soundEnabled: v });
      },
      setSfxVolume(v) {
        set({ sfxVolume: Math.max(0, Math.min(1, v)) });
      },
      setMusicEnabled(v) {
        set({ musicEnabled: v });
      },
      setMusicVolume(v) {
        set({ musicVolume: Math.max(0, Math.min(1, v)) });
      },
      setHapticsEnabled(v) {
        set({ hapticsEnabled: v });
      },
      setReduceMotion(v) {
        set({ reduceMotion: v });
      },
      setLargerText(v) {
        set({ largerText: v });
      },
      setLargerTapTargets(v) {
        set({ largerTapTargets: v });
      },
      setHighContrast(v) {
        set({ highContrast: v });
      },
      setColorblindMode(m) {
        set({ colorblindMode: m });
      },
      awardMoonstones(delta) {
        set((s) => ({ moonstones: Math.max(0, s.moonstones + delta) }));
      },

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
          return {
            consecutiveFails: nextFails,
            coins: s.coins + coinsGain,
            embers: s.embers + embersGain,
            moonstones: s.moonstones + MOONSTONES_PER_WIN,
            ownedCompanions: companions,
          };
        });
      },
      registerLoss(levelId) {
        set((s) => ({
          consecutiveFails: {
            ...s.consecutiveFails,
            [levelId]: (s.consecutiveFails[levelId] ?? 0) + 1,
          },
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
          ownedCompanions: [],
          equippedCompanionId: null,
          pity: initPity(1),
          activeExpeditions: [],
          fixtureLevels: {},
          tutorialSeen: false,
          tutorialLevelsCleared: false,
          moonstones: 0,
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
      addCurrency(patch) {
        set((s) => ({
          coins: s.coins + Math.max(0, patch.coins ?? 0),
          gems: s.gems + Math.max(0, patch.gems ?? 0),
          embers: s.embers + Math.max(0, patch.embers ?? 0),
        }));
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
        // Companion can't be on two expeditions simultaneously.
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
    }),
    {
      name: 'moonpetal.profile.v3',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
