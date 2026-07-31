import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, radii, typography } from '../../theme';
import { Icon, type IconName } from '../../components/Icon';
import { useUI } from '../../state/ui';
import { click } from '../../audio/click';

interface Item {
  icon: IconName;
  label: string;
  onPress: () => void;
}

/**
 * Floating dropdown from the top-right hamburger. Overlays whatever
 * screen the player was on and dismisses on backdrop tap. Each item
 * navigates to a full screen; the hamburger itself doesn't own routing.
 *
 * Positioned absolute so it sits above the ShellFrame's body content
 * without pushing anything around.
 */
export function HeaderMenu(): React.ReactElement | null {
  const open = useUI((s) => s.headerMenuOpen);
  const close = useUI((s) => s.closeHeaderMenu);
  const {
    goToProfile,
    goToFriends,
    goToLeaderboards,
    goToNews,
    goToJoinUs,
    goToSupport,
    goToConnectAccount,
    goToSettings,
  } = useUI.getState();

  if (!open) return null;

  const items: Item[] = [
    { icon: 'moon', label: 'Your Profile', onPress: goToProfile },
    { icon: 'friends', label: 'Friends', onPress: goToFriends },
    { icon: 'trophy', label: 'Leaderboards', onPress: goToLeaderboards },
    { icon: 'news', label: 'News', onPress: goToNews },
    { icon: 'heart', label: 'Join Us', onPress: goToJoinUs },
    { icon: 'support', label: 'Support', onPress: goToSupport },
    { icon: 'link', label: 'Connect Account', onPress: goToConnectAccount },
    { icon: 'gear', label: 'Settings', onPress: goToSettings },
  ];

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.dismissLayer} onPress={close} />
      <View style={styles.pointer} />
      <View style={styles.card}>
        {items.map((it, i) => (
          <React.Fragment key={it.label}>
            {i > 0 && <View style={styles.divider} />}
            <Pressable style={styles.row} onPress={click(it.onPress)}>
              <View style={styles.iconWrap}>
                <Icon name={it.icon} size={20} />
              </View>
              <Text style={styles.label}>{it.label}</Text>
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
  },
  dismissLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 8, 32, 0.4)',
  },
  pointer: {
    position: 'absolute',
    top: 84,
    right: 22,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 12,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: palette.candlelight,
  },
  card: {
    position: 'absolute',
    top: 94,
    right: 12,
    left: 40,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelight,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    color: palette.parchment,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.md,
    backgroundColor: palette.border,
  },
});
