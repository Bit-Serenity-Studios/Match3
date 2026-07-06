import { create } from 'zustand';

export type Screen =
  | 'home'
  | 'game'
  | 'hub'
  | 'store'
  | 'pass'
  | 'devDashboard'
  | 'daily'
  | 'privacy'
  | 'about'
  | 'settings'
  | 'moonrise'
  | 'covens'
  | 'grimoire'
  | 'profile'
  | 'friends'
  | 'leaderboards'
  | 'news'
  | 'joinUs'
  | 'connectAccount'
  | 'support';
export type HubTab = 'fixtures' | 'companions' | 'expeditions';

interface UIState {
  screen: Screen;
  hubTab: HubTab;
  continueOpen: boolean;
  pendingOfferSku: string | null;
  /** Ephemeral: the floating hamburger dropdown is open. */
  headerMenuOpen: boolean;
  goToGame(): void;
  goToHub(tab?: HubTab): void;
  goToStore(): void;
  goToPass(): void;
  goToDevDashboard(): void;
  goToDaily(): void;
  goToHome(): void;
  goToPrivacy(): void;
  goToAbout(): void;
  goToSettings(): void;
  goToMoonrise(): void;
  goToCovens(): void;
  goToGrimoire(): void;
  goToProfile(): void;
  goToFriends(): void;
  goToLeaderboards(): void;
  goToNews(): void;
  goToJoinUs(): void;
  goToConnectAccount(): void;
  goToSupport(): void;
  setHubTab(t: HubTab): void;
  openContinue(): void;
  closeContinue(): void;
  showOffer(sku: string): void;
  clearOffer(): void;
  openHeaderMenu(): void;
  closeHeaderMenu(): void;
}

/**
 * Ephemeral (non-persisted) UI navigation state.
 */
export const useUI = create<UIState>((set) => ({
  screen: 'home',
  hubTab: 'fixtures',
  continueOpen: false,
  pendingOfferSku: null,
  headerMenuOpen: false,
  goToGame: () => set({ screen: 'game', continueOpen: false, headerMenuOpen: false }),
  goToHub: (tab) =>
    set((s) => ({
      screen: 'hub',
      hubTab: tab ?? s.hubTab,
      continueOpen: false,
      headerMenuOpen: false,
    })),
  goToStore: () => set({ screen: 'store', headerMenuOpen: false }),
  goToPass: () => set({ screen: 'pass', headerMenuOpen: false }),
  goToDevDashboard: () => set({ screen: 'devDashboard', headerMenuOpen: false }),
  goToDaily: () => set({ screen: 'daily', headerMenuOpen: false }),
  goToHome: () => set({ screen: 'home', continueOpen: false, headerMenuOpen: false }),
  goToPrivacy: () => set({ screen: 'privacy', headerMenuOpen: false }),
  goToAbout: () => set({ screen: 'about', headerMenuOpen: false }),
  goToSettings: () => set({ screen: 'settings', headerMenuOpen: false }),
  goToMoonrise: () => set({ screen: 'moonrise', headerMenuOpen: false }),
  goToCovens: () => set({ screen: 'covens', headerMenuOpen: false }),
  goToGrimoire: () => set({ screen: 'grimoire', headerMenuOpen: false }),
  goToProfile: () => set({ screen: 'profile', headerMenuOpen: false }),
  goToFriends: () => set({ screen: 'friends', headerMenuOpen: false }),
  goToLeaderboards: () => set({ screen: 'leaderboards', headerMenuOpen: false }),
  goToNews: () => set({ screen: 'news', headerMenuOpen: false }),
  goToJoinUs: () => set({ screen: 'joinUs', headerMenuOpen: false }),
  goToConnectAccount: () => set({ screen: 'connectAccount', headerMenuOpen: false }),
  goToSupport: () => set({ screen: 'support', headerMenuOpen: false }),
  setHubTab: (t) => set({ hubTab: t }),
  openContinue: () => set({ continueOpen: true }),
  closeContinue: () => set({ continueOpen: false }),
  showOffer: (sku) => set({ pendingOfferSku: sku }),
  clearOffer: () => set({ pendingOfferSku: null }),
  openHeaderMenu: () => set({ headerMenuOpen: true }),
  closeHeaderMenu: () => set({ headerMenuOpen: false }),
}));
