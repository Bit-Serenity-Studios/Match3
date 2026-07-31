import React from 'react';
import {
  Text,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { palette, spacing, radii } from '../theme';
import { Icon } from './Icon';
import { useUI } from '../state/ui';
import { click } from '../audio/click';

/**
 * The universal, one-tap route back to the main menu (the Home screen with the
 * big PLAY button). Rendered in the header of every standalone screen so the
 * player is NEVER stranded — tapping it always lands on Home, no matter how
 * deep they are. Shell screens (home/moonrise/covens/grimoire) get the same
 * escape via the persistent bottom-nav "Cauldron" tab.
 */
export function HomeButton({
  style,
  label = 'Home',
}: {
  style?: StyleProp<ViewStyle>;
  label?: string;
}): React.ReactElement {
  const goToHome = useUI((s) => s.goToHome);
  return (
    <Pressable
      style={[styles.btn, style]}
      onPress={click(goToHome)}
      accessibilityRole="button"
      accessibilityLabel="Back to main menu"
    >
      <Icon name="home" size={16} tint={palette.candlelight} />
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  label: { color: palette.parchment, fontWeight: '700' },
});
