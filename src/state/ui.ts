import { create } from 'zustand';

export type Screen = 'game' | 'hub';
export type HubTab =
  | 'fixtures'
  | 'companions'
  | 'expeditions'
  | 'store'
  | 'pass';

interface UIState {
  screen: Screen;
  hubTab: HubTab;
  goToGame(): void;
  goToHub(tab?: HubTab): void;
  setHubTab(t: HubTab): void;
}

/**
 * Ephemeral (non-persisted) UI navigation state. Screen and hub tab live
 * separately from the persistent profile so a fresh app launch always drops
 * the player on the game screen (frictionless onboarding per the brief).
 */
export const useUI = create<UIState>((set) => ({
  screen: 'game',
  hubTab: 'fixtures',
  goToGame: () => set({ screen: 'game' }),
  goToHub: (tab) =>
    set((s) => ({ screen: 'hub', hubTab: tab ?? s.hubTab })),
  setHubTab: (t) => set({ hubTab: t }),
}));
