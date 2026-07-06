import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { useUI } from '../state/ui';
import { ShellFrame } from './shell/ShellFrame';

/**
 * Home hub — the default landing after login. Two big mode cards:
 * "Solo Journey" (the 60-level campaign) and "Moonrise Duel" (online 1v1,
 * placeholder until a backend + matchmaking are wired up).
 *
 * Below the mode cards: a Daily Brew callout, a current-level continue
 * card, and a Streak stat.
 */
export function HomeHubScreen(): React.ReactElement {
  const goToGame = useUI((s) => s.goToGame);
  const goToDaily = useUI((s) => s.goToDaily);
  const goToMoonrise = useUI((s) => s.goToMoonrise);
  const currentLevelIndex = useProfile((s) => s.currentLevelIndex);
  const moonstones = useProfile((s) => s.moonstones);
  const highest = useProfile((s) => s.highestUnlocked);

  return (
    <ShellFrame>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.section}>Play</Text>

        {/* Solo campaign */}
        <Pressable style={styles.modeCardSolo} onPress={goToGame}>
          <View style={styles.modeIcon}>
            <Text style={styles.modeGlyph}>🌿</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modeTitle}>Solo Journey</Text>
            <Text style={styles.modeSub}>
              {highest > 0
                ? `Continue at Level ${currentLevelIndex + 1}`
                : '60 hand-crafted levels · no timer'}
            </Text>
            <View style={styles.modeChipRow}>
              <View style={styles.modeChip}>
                <Text style={styles.modeChipText}>Offline</Text>
              </View>
              <View style={styles.modeChip}>
                <Text style={styles.modeChipText}>Cozy</Text>
              </View>
            </View>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>

        {/* Online competitive */}
        <Pressable style={styles.modeCardOnline} onPress={goToMoonrise}>
          <View style={styles.modeIcon}>
            <Text style={styles.modeGlyph}>⚔️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modeTitle}>Moonrise Duel</Text>
            <Text style={styles.modeSub}>
              Compete for moonstones · Ranked 1v1
            </Text>
            <View style={styles.modeChipRow}>
              <View style={[styles.modeChip, styles.betaChip]}>
                <Text style={styles.modeChipText}>Beta</Text>
              </View>
              <View style={styles.modeChip}>
                <Text style={styles.modeChipText}>Online</Text>
              </View>
            </View>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>

        <Text style={styles.section}>Today</Text>

        <Pressable style={styles.smallCard} onPress={goToDaily}>
          <Text style={styles.smallCardGlyph}>☕</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.smallCardTitle}>Daily Brew</Text>
            <Text style={styles.smallCardSub}>
              Today’s seeded level · same for every player
            </Text>
          </View>
          <Text style={styles.chev}>›</Text>
        </Pressable>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Rank</Text>
            <Text style={styles.statValue}>🏵️ {moonstones}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Cleared</Text>
            <Text style={styles.statValue}>{highest} / 60</Text>
          </View>
        </View>
      </ScrollView>
    </ShellFrame>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: palette.parchmentDim,
  },
  modeCardSolo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.emerald,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  modeCardOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelight,
    borderWidth: 2,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  modeIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeGlyph: { fontSize: 30 },
  modeTitle: {
    ...typography.h2,
    fontSize: 18,
  },
  modeSub: {
    ...typography.small,
    color: palette.parchmentDim,
    marginTop: 2,
  },
  modeChipRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: spacing.xs,
  },
  modeChip: {
    backgroundColor: palette.bgSurface2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    borderColor: palette.border,
    borderWidth: 1,
  },
  betaChip: {
    backgroundColor: palette.purple,
    borderColor: palette.purpleDeep,
  },
  modeChipText: {
    color: palette.parchment,
    fontSize: 10,
    fontWeight: '700',
  },
  chev: {
    color: palette.parchmentDim,
    fontSize: 28,
  },
  smallCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  smallCardGlyph: { fontSize: 22 },
  smallCardTitle: { ...typography.body, color: palette.parchment, fontWeight: '600' },
  smallCardSub: { ...typography.small, marginTop: 2 },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statLabel: { ...typography.small, marginBottom: 4 },
  statValue: { ...typography.h2, fontSize: 20 },
});
