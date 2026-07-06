import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile, UNLOCK_COVENS_AT_MOONSTONES } from '../state/profile';
import { ShellFrame } from './shell/ShellFrame';

/**
 * Covens — the guild / team layer. Locked at UNLOCK_COVENS_AT_MOONSTONES.
 * Below the gate: aspirational preview. Above: coven selection (stub —
 * no backend wired yet).
 */
export function CovensScreen(): React.ReactElement {
  const stones = useProfile((s) => s.moonstones);
  const unlocked = stones >= UNLOCK_COVENS_AT_MOONSTONES;

  return (
    <ShellFrame>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroGlyph}>🐾</Text>
          <Text style={styles.heroTitle}>Covens</Text>
          <Text style={styles.heroSub}>
            Brew with others. Share ingredients. Grow together.
          </Text>
        </View>

        <View style={styles.pillars}>
          <Pillar glyph="🎁" text="Free coven-shared rewards" />
          <Pillar glyph="🔄" text="Trade cards with covenmates" />
          <Pillar glyph="💬" text="Coven chat & strategy" />
          <Pillar glyph="🌟" text="Coven-only weekly events" />
        </View>

        <View style={styles.lockOrCta}>
          {unlocked ? (
            <Text style={styles.ctaText}>
              You’re at 🏵️ {stones}. Time to find a coven.
            </Text>
          ) : (
            <>
              <Text style={styles.lockLine}>
                🔒 UNLOCKS AT 🏵️ {UNLOCK_COVENS_AT_MOONSTONES}
              </Text>
              <Text style={styles.progress}>
                {stones} / {UNLOCK_COVENS_AT_MOONSTONES}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.min(100, (stones / UNLOCK_COVENS_AT_MOONSTONES) * 100)}%` },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </ShellFrame>
  );
}

function Pillar({ glyph, text }: { glyph: string; text: string }) {
  return (
    <View style={styles.pillar}>
      <Text style={styles.pillarGlyph}>{glyph}</Text>
      <Text style={styles.pillarText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
  },
  heroGlyph: { fontSize: 48, marginBottom: spacing.sm },
  heroTitle: { ...typography.h1, fontSize: 30 },
  heroSub: {
    ...typography.body,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
    color: palette.parchmentDim,
  },
  pillars: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pillar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  pillarGlyph: { fontSize: 22 },
  pillarText: { ...typography.body, color: palette.parchment, fontWeight: '600' },
  lockOrCta: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  ctaText: { ...typography.body, color: palette.candlelight, fontWeight: '700' },
  lockLine: {
    ...typography.h2,
    fontSize: 14,
    letterSpacing: 1,
    color: palette.candlelight,
  },
  progress: {
    ...typography.small,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: palette.bgSurface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.candlelight,
  },
});
