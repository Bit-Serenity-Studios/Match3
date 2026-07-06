import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile, UNLOCK_HUB_AT } from '../state/profile';
import { useUI } from '../state/ui';

/**
 * Main menu. Boot lands here on every launch. Buttons progressively unlock
 * as the player progresses — Hub only appears once level 4 is cleared.
 */
export function MenuScreen(): React.ReactElement {
  const goToGame = useUI((s) => s.goToGame);
  const goToHub = useUI((s) => s.goToHub);
  const goToStore = useUI((s) => s.goToStore);
  const goToPrivacy = useUI((s) => s.goToPrivacy);
  const goToAbout = useUI((s) => s.goToAbout);
  const goToSettings = useUI((s) => s.goToSettings);
  const highestUnlocked = useProfile((s) => s.highestUnlocked);
  const currentLevelIndex = useProfile((s) => s.currentLevelIndex);
  const hubUnlocked = highestUnlocked >= UNLOCK_HUB_AT;

  const isReturning = useMemo(
    () => highestUnlocked > 0 || currentLevelIndex > 0,
    [highestUnlocked, currentLevelIndex],
  );

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.crest}>
        <Text style={styles.crestGlyph}>🌙</Text>
      </View>
      <Text style={styles.title}>Moonpetal Apothecary</Text>
      <Text style={styles.subtitle}>
        A cozy brewing garden between the moon and the kettle.
      </Text>

      <ScrollView contentContainerStyle={styles.body}>
        <Pressable style={[styles.primaryBtn]} onPress={goToGame}>
          <Text style={styles.primaryLabel}>
            {isReturning
              ? `Continue · Level ${currentLevelIndex + 1}`
              : 'Play'}
          </Text>
        </Pressable>

        {hubUnlocked && (
          <Pressable style={styles.secondaryBtn} onPress={() => goToHub()}>
            <Text style={styles.secondaryLabel}>Apothecary Hub</Text>
          </Pressable>
        )}
        {hubUnlocked && (
          <Pressable style={styles.secondaryBtn} onPress={goToStore}>
            <Text style={styles.secondaryLabel}>Store</Text>
          </Pressable>
        )}

        <Pressable style={styles.secondaryBtn} onPress={goToSettings}>
          <Text style={styles.secondaryLabel}>Settings</Text>
        </Pressable>

        <View style={styles.footer}>
          <Pressable onPress={goToPrivacy}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={goToAbout}>
            <Text style={styles.footerLink}>About</Text>
          </Pressable>
        </View>

        {isReturning && (
          <Text style={styles.progress}>
            {highestUnlocked} level{highestUnlocked === 1 ? '' : 's'} cleared
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgDeep,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
  },
  crest: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  crestGlyph: { fontSize: 40 },
  title: {
    ...typography.h1,
    fontSize: 32,
    textAlign: 'center',
    color: palette.parchment,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    color: palette.parchmentDim,
  },
  body: {
    marginTop: spacing.xxl,
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.lg,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  primaryLabel: {
    color: palette.bgDeep,
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  secondaryLabel: { color: palette.parchment, fontSize: 15, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  footerLink: { color: palette.parchmentDim, fontSize: 12, textDecorationLine: 'underline' },
  footerDot: { color: palette.parchmentDim, fontSize: 12 },
  progress: {
    textAlign: 'center',
    color: palette.parchmentDim,
    fontSize: 12,
    marginTop: spacing.sm,
  },
});
