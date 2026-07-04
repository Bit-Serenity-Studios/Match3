import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initCalendar,
  claim as claimCalendar,
  canClaimToday,
  decayOnMiss,
  currentDayIndex,
  type CalendarState,
} from '../retention/calendar';
import {
  initDailyBrew,
  claimBrew,
  canClaimBrew,
  notePlayed,
  type DailyBrewState,
} from '../retention/dailyBrew';
import {
  MockScheduler,
  planNotifications,
  shouldSoftAsk,
  type NotificationPermission,
  type NotificationScheduler,
} from '../retention/notifications';
import type { Grants } from '../monetization/types';

/**
 * Retention store — daily calendar, daily brew, notification permission.
 * Uses AsyncStorage to persist across restarts. Notification scheduler is
 * a module-level singleton, swappable at boot.
 */

let scheduler: NotificationScheduler = new MockScheduler();

export function setScheduler(s: NotificationScheduler): void {
  scheduler = s;
}

export function getScheduler(): NotificationScheduler {
  return scheduler;
}

export interface RetentionState {
  calendar: CalendarState;
  brew: DailyBrewState;

  notificationPermission: NotificationPermission;
  softAskedAt: number;
  firstLaunchAt: number;
  clearedWowLevels: number;

  refreshCalendar(now: number): void;
  claimDailyLogin(now: number): Grants | null;
  currentCalendarDayIndex(now: number): number;

  canClaimBrew(now: number): boolean;
  claimDailyBrew(now: number, won: boolean): Grants | null;
  markBrewPlayed(now: number): void;

  registerWowLevelCleared(): void;
  shouldPromptSoftAsk(now: number): boolean;
  handleSoftAskResponse(granted: boolean, now: number): Promise<void>;

  rescheduleNotifications(inputs: {
    expeditionEndsAt: number | null;
    livesFullAt: number | null;
    streakAtRiskAt: number | null;
    lastActiveAt: number;
    now: number;
  }): Promise<void>;

  resetRetention(): void;
}

export const useRetention = create<RetentionState>()(
  persist(
    (set, get) => ({
      calendar: initCalendar(0),
      brew: initDailyBrew(),

      notificationPermission: 'unknown',
      softAskedAt: 0,
      firstLaunchAt: 0,
      clearedWowLevels: 0,

      refreshCalendar(now) {
        const s = get();
        // On first ever boot, stamp firstLaunchAt so we know not to soft-ask.
        if (s.firstLaunchAt === 0) {
          set({ firstLaunchAt: now, calendar: initCalendar(now) });
          return;
        }
        const next = decayOnMiss(s.calendar, now);
        if (next !== s.calendar) set({ calendar: next });
      },
      claimDailyLogin(now) {
        const s = get();
        const r = claimCalendar(s.calendar, now);
        if (!r) return null;
        set({ calendar: r.next });
        return r.grants;
      },
      currentCalendarDayIndex(now) {
        return currentDayIndex(get().calendar, now);
      },

      canClaimBrew(now) {
        return canClaimBrew(get().brew, now);
      },
      claimDailyBrew(now, won) {
        const s = get();
        const r = claimBrew(s.brew, now, won);
        if (!r) return null;
        set({ brew: r.next });
        return r.grants;
      },
      markBrewPlayed(now) {
        set((s) => ({ brew: notePlayed(s.brew, now) }));
      },

      registerWowLevelCleared() {
        set((s) => ({ clearedWowLevels: s.clearedWowLevels + 1 }));
      },
      shouldPromptSoftAsk(now) {
        const s = get();
        return shouldSoftAsk({
          permission: s.notificationPermission,
          clearedWowLevels: s.clearedWowLevels,
          hasBeenAsked: s.softAskedAt > 0,
          isFirstLaunch: s.firstLaunchAt === 0 || s.firstLaunchAt === now,
        });
      },
      async handleSoftAskResponse(granted, now) {
        set({ softAskedAt: now });
        if (!granted) {
          set({ notificationPermission: 'denied' });
          return;
        }
        const permission = await scheduler.requestPermission();
        set({ notificationPermission: permission });
      },

      async rescheduleNotifications(inputs) {
        if (get().notificationPermission !== 'granted') return;
        await scheduler.cancelAll();
        const plan = planNotifications(inputs);
        await Promise.all(plan.map((n) => scheduler.schedule(n)));
      },

      resetRetention() {
        set({
          calendar: initCalendar(0),
          brew: initDailyBrew(),
          notificationPermission: 'unknown',
          softAskedAt: 0,
          firstLaunchAt: 0,
          clearedWowLevels: 0,
        });
      },
    }),
    {
      name: 'moonpetal.retention.v1',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
