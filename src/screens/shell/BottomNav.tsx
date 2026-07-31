import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { palette, spacing, radii } from '../../theme';
import { Icon, type IconName } from '../../components/Icon';
import { useUI, type Screen } from '../../state/ui';
import { click } from '../../audio/click';

type Tab = 'store' | 'covens' | 'home' | 'moonrise' | 'grimoire';

const TABS: Array<{ id: Tab; label: string; icon: IconName; screen: Screen }> = [
  { id: 'store', label: 'Market', icon: 'market', screen: 'store' },
  { id: 'covens', label: 'Covens', icon: 'covens', screen: 'covens' },
  { id: 'home', label: 'Cauldron', icon: 'home', screen: 'home' },
  { id: 'moonrise', label: 'Moonrise', icon: 'moonrise', screen: 'moonrise' },
  { id: 'grimoire', label: 'Grimoire', icon: 'grimoire', screen: 'grimoire' },
];

/**
 * Persistent bottom nav bar. Rendered on every "shell" screen (home,
 * store, moonrise, covens, grimoire). Not the game or menu screens.
 * Active tab is highlighted with a candlelight border + upward extension.
 */
export function BottomNav(): React.ReactElement {
  const screen = useUI((s) => s.screen);
  const goToStore = useUI((s) => s.goToStore);
  const goToCovens = useUI((s) => s.goToCovens);
  const goToHome = useUI((s) => s.goToHome);
  const goToMoonrise = useUI((s) => s.goToMoonrise);
  const goToGrimoire = useUI((s) => s.goToGrimoire);

  const onTab = (t: Tab) => {
    switch (t) {
      case 'store':
        return goToStore();
      case 'covens':
        return goToCovens();
      case 'home':
        // The center "Cauldron" tab is the always-available Home landing.
        // (The Apothecary HubScreen is reached via the in-game "Hub" button.)
        return goToHome();
      case 'moonrise':
        return goToMoonrise();
      case 'grimoire':
        return goToGrimoire();
    }
  };

  return (
    <View style={styles.root}>
      {TABS.map((t) => {
        const active = screen === t.screen;
        return (
          <Pressable
            key={t.id}
            style={[styles.tab, active && styles.tabActive]}
            onPress={click(() => onTab(t.id))}
          >
            <Icon
              name={t.icon}
              size={24}
              tint={active ? palette.bgDeep : palette.parchmentDim}
            />
            <Text style={[styles.label, active && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderTopColor: palette.border,
    borderTopWidth: 1,
    backgroundColor: palette.bgSurface,
    // Clear the home indicator / gesture bar (the app draws edge-to-edge on
    // SDK 54, so a flat 12px left the tabs sitting under the home bar). The bar
    // background fills to the screen edge; the tab content is padded up.
    paddingBottom: Platform.OS === 'ios' ? 34 : 30,
    paddingTop: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    marginHorizontal: 2,
  },
  tabActive: {
    backgroundColor: palette.candlelight,
    marginTop: -spacing.sm,
    paddingTop: spacing.md,
  },
  label: {
    color: palette.parchmentDim,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  labelActive: {
    color: palette.bgDeep,
    fontWeight: '800',
  },
});
