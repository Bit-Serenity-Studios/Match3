import React from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { palette } from '../theme';
import { useUI } from '../state/ui';
import { click } from '../audio/click';

/**
 * The universal hamburger (≡) that opens the app-wide HeaderMenu overlay.
 * Rendered on standalone screens that sit OUTSIDE the ShellFrame — the shell
 * screens already carry their own menu button in the TopHud. The HeaderMenu
 * itself is mounted once at the App root, so this button works from anywhere.
 */
export function MenuButton({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}): React.ReactElement {
  const openHeaderMenu = useUI((s) => s.openHeaderMenu);
  return (
    <Pressable
      style={[styles.btn, style]}
      onPress={click(openHeaderMenu)}
      accessibilityRole="button"
      accessibilityLabel="Menu"
    >
      <View style={styles.bars}>
        <View style={styles.bar} />
        <View style={styles.bar} />
        <View style={styles.bar} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: palette.border,
    borderWidth: 1,
  },
  bars: { width: 18, height: 14, justifyContent: 'space-between' },
  bar: { height: 2, borderRadius: 1, backgroundColor: palette.parchment },
});
