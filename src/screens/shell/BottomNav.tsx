import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, radii } from '../../theme';
import { useUI, type Screen } from '../../state/ui';
import { useProfile, UNLOCK_HUB_AT } from '../../state/profile';
import { click } from '../../audio/click';

type Tab = 'store' | 'covens' | 'home' | 'moonrise' | 'grimoire';

const TABS: Array<{ id: Tab; label: string; glyph: string; screen: Screen }> = [
  { id: 'store', label: 'Market', glyph: '🏪', screen: 'store' },
  { id: 'covens', label: 'Covens', glyph: '🐾', screen: 'covens' },
  { id: 'home', label: 'Cauldron', glyph: '🏠', screen: 'home' },
  { id: 'moonrise', label: 'Moonrise', glyph: '📅', screen: 'moonrise' },
  { id: 'grimoire', label: 'Grimoire', glyph: '📖', screen: 'grimoire' },
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
  const goToHub = useUI((s) => s.goToHub);
  const highest = useProfile((s) => s.highestUnlocked);
  const hubUnlocked = highest >= UNLOCK_HUB_AT;

  const onTab = (t: Tab) => {
    switch (t) {
      case 'store':
        return goToStore();
      case 'covens':
        return goToCovens();
      case 'home':
        return hubUnlocked ? goToHome() : goToHub();
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
            <Text style={[styles.glyph, active && styles.glyphActive]}>{t.glyph}</Text>
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
    paddingBottom: spacing.md,
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
  glyph: { fontSize: 22 },
  glyphActive: {},
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
