import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile, UNLOCK_GRIMOIRE_AT_MOONSTONES } from '../state/profile';
import { ShellFrame } from './shell/ShellFrame';

/**
 * Grimoire — collectible recipe book. Cards drop from wins, get
 * completed into pages, and pages award prizes. Placeholder until the
 * card catalog + drop tables land.
 */
export function GrimoireScreen(): React.ReactElement {
  const stones = useProfile((s) => s.moonstones);
  const unlocked = stones >= UNLOCK_GRIMOIRE_AT_MOONSTONES;

  return (
    <ShellFrame>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Text style={styles.heroGlyph}>📖</Text>
          <Text style={styles.heroTitle}>Grimoire</Text>
          <Text style={styles.heroSub}>
            Every match adds a page to your recipe book.
          </Text>
        </View>

        <View style={styles.pillars}>
          <Pillar glyph="✨" text="Collect and complete pages" />
          <Pillar glyph="🔁" text="Trade duplicates with covenmates" />
          <Pillar glyph="🎁" text="Win prizes for completed volumes" />
        </View>

        {!unlocked ? (
          <View style={styles.lock}>
            <Text style={styles.lockLine}>
              🔒 Earn your first pages by playing a few matches
            </Text>
            <Text style={styles.lockSub}>
              Unlocks at 🏵️ {UNLOCK_GRIMOIRE_AT_MOONSTONES} · You have {stones}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.section}>Recent volumes</Text>
            <VolumeCard title="Under the Moon" progress={3} of={12} />
            <VolumeCard title="Kettle Songs" progress={0} of={9} />
            <VolumeCard title="Forest Familiars" progress={0} of={15} />
          </>
        )}
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

function VolumeCard({ title, progress, of }: { title: string; progress: number; of: number }) {
  const pct = of === 0 ? 0 : (progress / of) * 100;
  return (
    <View style={styles.volume}>
      <View style={{ flex: 1 }}>
        <Text style={styles.volumeTitle}>{title}</Text>
        <Text style={styles.volumeSub}>
          {progress} / {of} pages
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      </View>
      <Text style={styles.chev}>›</Text>
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
    color: palette.parchmentDim,
  },
  pillars: { gap: spacing.sm, marginBottom: spacing.lg },
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
  lock: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
  },
  lockLine: {
    ...typography.h2,
    fontSize: 14,
    color: palette.candlelight,
    textAlign: 'center',
  },
  lockSub: { ...typography.small, marginTop: spacing.xs, textAlign: 'center' },
  section: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: palette.parchmentDim,
  },
  volume: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  volumeTitle: { ...typography.h2, fontSize: 16 },
  volumeSub: { ...typography.small, marginTop: 2, marginBottom: spacing.xs },
  progressBar: {
    height: 6,
    backgroundColor: palette.bgSurface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: palette.candlelight },
  chev: { color: palette.parchmentDim, fontSize: 28 },
});
