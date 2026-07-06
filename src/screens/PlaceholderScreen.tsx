import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, radii, typography } from '../theme';
import { useUI } from '../state/ui';
import { click } from '../audio/click';

interface Props {
  title: string;
  glyph: string;
  blurb: string;
  bullets: string[];
  cta?: { label: string; onPress: () => void };
}

/**
 * Reusable "coming soon" screen used for header-menu destinations that
 * don't have real content yet — Friends, Leaderboards, News, Join Us,
 * Connect Account. Consistent structure so the visual style stays
 * cohesive as we fill each one in.
 */
export function PlaceholderScreen({
  title,
  glyph,
  blurb,
  bullets,
  cta,
}: Props): React.ReactElement {
  const goToHome = useUI((s) => s.goToHome);
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>{title}</Text>
        <Pressable style={styles.backBtn} onPress={click(goToHome)}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.crest}>
          <Text style={styles.crestGlyph}>{glyph}</Text>
        </View>
        <Text style={styles.blurb}>{blurb}</Text>
        <View style={styles.bulletBox}>
          {bullets.map((b) => (
            <View key={b} style={styles.bulletRow}>
              <Text style={styles.bulletDot}>·</Text>
              <Text style={styles.bulletText}>{b}</Text>
            </View>
          ))}
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
        {cta && (
          <Pressable style={styles.cta} onPress={click(cta.onPress)}>
            <Text style={styles.ctaLabel}>{cta.label}</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.bgDeep,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl + spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  backBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  backLabel: { color: palette.parchment, fontWeight: '600' },
  body: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  crest: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelight,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  crestGlyph: { fontSize: 48 },
  blurb: {
    ...typography.body,
    color: palette.parchment,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  bulletBox: {
    width: '100%',
    padding: spacing.md,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    marginBottom: spacing.lg,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 4,
    gap: spacing.sm,
  },
  bulletDot: { color: palette.candlelight, fontSize: 18, lineHeight: 22 },
  bulletText: {
    color: palette.parchmentDim,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  badge: {
    backgroundColor: palette.candlelightSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    marginBottom: spacing.lg,
  },
  badgeText: {
    color: palette.bgDeep,
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 12,
  },
  cta: {
    backgroundColor: palette.candlelight,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.pill,
  },
  ctaLabel: {
    color: palette.bgDeep,
    fontWeight: '900',
    fontSize: 16,
  },
});
