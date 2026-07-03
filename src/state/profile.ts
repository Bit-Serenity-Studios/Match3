import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The persistent player profile. Kept intentionally small in Phase 2 — meta
 * currencies (coins/gems/embers/lives) land here in Phase 3-4. What lives
 * here now is what the engine needs: per-level fail counts, so we can nudge
 * difficulty for churn-prevention as described in the brief.
 */
export interface ProfileState {
  currentLevelIndex: number; // 0-based index into LEVELS
  consecutiveFails: Record<string, number>; // levelId -> count
  highestUnlocked: number; // 0-based

  registerWin(levelId: string): void;
  registerLoss(levelId: string): void;
  advanceLevel(): void;
  resetProgress(): void;
}

const DIFFICULTY_EASE_THRESHOLD = 4;
export const MAX_DIFFICULTY_EASE = 0.35;

/** Mulberry32-style dip: 0 at threshold, growing by 0.05 per additional fail,
 *  clamped so we never over-ease. Returned as a POSITIVE modifier that biases
 *  favorable-color drops upward (see engine/difficulty.ts). */
export function difficultyEaseFor(consecutiveFails: number): number {
  if (consecutiveFails < DIFFICULTY_EASE_THRESHOLD) return 0;
  const extra = consecutiveFails - DIFFICULTY_EASE_THRESHOLD;
  return Math.min(MAX_DIFFICULTY_EASE, 0.15 + extra * 0.05);
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      currentLevelIndex: 0,
      consecutiveFails: {},
      highestUnlocked: 0,

      registerWin(levelId: string) {
        set((s) => {
          const next = { ...s.consecutiveFails };
          delete next[levelId];
          return { consecutiveFails: next };
        });
      },
      registerLoss(levelId: string) {
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
        });
      },
    }),
    {
      name: 'moonpetal.profile.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
