import React from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { palette, spacing, radii } from '../../theme';
import { Icon, type IconName } from '../../components/Icon';
import { useProfile } from '../../state/profile';
import { useUI } from '../../state/ui';
import { click } from '../../audio/click';

/**
 * Persistent top HUD — avatar/level, moonstone rank, streak, coins, gems,
 * and a menu button. Rendered by every "shell" screen (home, moonrise,
 * covens, grimoire, store). NOT rendered by the game screen (which owns
 * its own compact HUD).
 */
export function TopHud(): React.ReactElement {
  const highest = useProfile((s) => s.highestUnlocked);
  const moonstones = useProfile((s) => s.moonstones);
  const coins = useProfile((s) => s.coins);
  const gems = useProfile((s) => s.gems);
  const goToProfile = useUI((s) => s.goToProfile);
  const openHeaderMenu = useUI((s) => s.openHeaderMenu);

  const level = Math.max(1, Math.floor(highest / 3) + 1);

  return (
    <View style={styles.root}>
      <Pressable onPress={click(goToProfile)}>
        <ImageBackground
          source={require('../../../assets/art/kenney-ui/round_brown.png')}
          style={styles.avatar}
          resizeMode="contain"
        >
          <Icon name="moon" size={22} />
          <View style={styles.avatarBadge}>
            <Text style={styles.avatarBadgeText}>{level}</Text>
          </View>
        </ImageBackground>
      </Pressable>

      <Chip icon="moonstone" value={fmt(moonstones)} />
      <Chip icon="coin" value={fmt(coins)} />
      <Chip icon="star" value={fmt(gems)} />

      <Pressable style={styles.menuBtn} onPress={click(openHeaderMenu)}>
        <View style={styles.menuBars}>
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
          <View style={styles.menuBar} />
        </View>
      </Pressable>
    </View>
  );
}

function Chip({ icon, value }: { icon: IconName; value: string }) {
  return (
    <View style={styles.chip}>
      <Icon name={icon} size={16} />
      <Text style={styles.chipValue}>{value}</Text>
    </View>
  );
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: palette.bgSurface,
    borderBottomColor: palette.border,
    borderBottomWidth: 1,
  },
  avatar: {
    // Kenney wooden round frame (CC0) provides the ring + cream centre.
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  avatarBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: palette.candlelight,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: {
    color: palette.bgDeep,
    fontSize: 10,
    fontWeight: '800',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface2,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    gap: 4,
    flex: 1,
    minWidth: 0,
  },
  chipValue: { color: palette.parchment, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: palette.border,
    borderWidth: 1,
  },
  menuBars: { width: 18, height: 14, justifyContent: 'space-between' },
  menuBar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: palette.parchment,
  },
});
