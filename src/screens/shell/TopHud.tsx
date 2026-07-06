import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, radii } from '../../theme';
import { useProfile } from '../../state/profile';
import { useUI } from '../../state/ui';

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
  const goToMenu = useUI((s) => s.goToMenu);

  const level = Math.max(1, Math.floor(highest / 3) + 1);

  return (
    <View style={styles.root}>
      <Pressable style={styles.avatar} onPress={goToMenu}>
        <Text style={styles.avatarGlyph}>🌙</Text>
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarBadgeText}>{level}</Text>
        </View>
      </Pressable>

      <Chip glyph="🏵️" value={fmt(moonstones)} tint={palette.candlelight} />
      <Chip glyph="🪙" value={fmt(coins)} tint={palette.candlelight} />
      <Chip glyph="💎" value={fmt(gems)} tint={palette.purple} />

      <Pressable style={styles.menuBtn} onPress={goToMenu}>
        <Text style={styles.menuGlyph}>≡</Text>
      </Pressable>
    </View>
  );
}

function Chip({ glyph, value, tint }: { glyph: string; value: string; tint: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipGlyph, { color: tint }]}>{glyph}</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.candlelightSoft,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  avatarGlyph: { fontSize: 18 },
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
  chipGlyph: { fontSize: 14 },
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
  menuGlyph: { color: palette.parchment, fontSize: 22, fontWeight: '700' },
});
