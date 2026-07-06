import { create } from 'zustand';

export type Screen =
  | 'menu'
  | 'game'
  | 'hub'
  | 'store'
  | 'pass'
  | 'devDashboard'
  | 'daily'
  | 'privacy'
  | 'about'
  | 'settings';
export type HubTab = 'fixtures' | 'companions' | 'expeditions';

interface UIState {
  screen: Screen;
  hubTab: HubTab;
  /** Ephemeral: the continue-screen overlay is showing on the game screen. */
  continueOpen: boolean;
  /** Ephemeral: a segmented offer awaits inspection on the game screen. */
  pendingOfferSku: string | null;
  goToGame(): void;
  goToHub(tab?: HubTab): void;
  goToStore(): void;
  goToPass(): void;
  goToDevDashboard(): void;
  goToDaily(): void;
  goToMenu(): void;
  goToPrivacy(): void;
  goToAbout(): void;
  goToSettings(): void;
  setHubTab(t: HubTab): void;
  openContinue(): void;
  closeContinue(): void;
  showOffer(sku: string): void;
  clearOffer(): void;
}

/**
 * Ephemeral (non-persisted) UI navigation state. Screen and hub tab live
 * separately from the persistent profile so a fresh app launch always drops
 * the player on the game screen (frictionless onboarding per the brief).
 */
export const useUI = create<UIState>((set) => ({
  screen: 'menu',
  hubTab: 'fixtures',
  continueOpen: false,
  pendingOfferSku: null,
  goToGame: () => set({ screen: 'game', continueOpen: false }),
  goToHub: (tab) =>
    set((s) => ({ screen: 'hub', hubTab: tab ?? s.hubTab, continueOpen: false })),
  goToStore: () => set({ screen: 'store' }),
  goToPass: () => set({ screen: 'pass' }),
  goToDevDashboard: () => set({ screen: 'devDashboard' }),
  goToDaily: () => set({ screen: 'daily' }),
  goToMenu: () => set({ screen: 'menu', continueOpen: false }),
  goToPrivacy: () => set({ screen: 'privacy' }),
  goToAbout: () => set({ screen: 'about' }),
  goToSettings: () => set({ screen: 'settings' }),
  setHubTab: (t) => set({ hubTab: t }),
  openContinue: () => set({ continueOpen: true }),
  closeContinue: () => set({ continueOpen: false }),
  showOffer: (sku) => set({ pendingOfferSku: sku }),
  clearOffer: () => set({ pendingOfferSku: null }),
}));
