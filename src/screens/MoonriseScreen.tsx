import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { Icon, type IconName } from '../components/Icon';
import { useProfile, UNLOCK_MOONRISE_AT_MOONSTONES } from '../state/profile';
import { ShellFrame } from './shell/ShellFrame';

/**
 * Moonrise Duel — the online competitive hub. Modes appear as cards.
 * The full competitive experience is gated at UNLOCK_MOONRISE_AT_MOONSTONES;
 * players below the threshold see a "coming soon at N stones" preview.
 *
 * All modes route through matchmaker + a game session — none of that
 * exists yet, so the buttons are inert. Everything is Beta-tagged.
 */
export function MoonriseScreen(): React.ReactElement {
  const stones = useProfile((s) => s.moonstones);
  const unlocked = stones >= UNLOCK_MOONRISE_AT_MOONSTONES;

  return (
    <ShellFrame>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.hero}>
          <Icon name="moon" size={44} style={styles.heroGlyph} />
          <Text style={styles.heroTitle}>Moonrise Duel</Text>
          <Text style={styles.heroSub}>
            Compete against other brewers under the same moon.
          </Text>
        </View>

        {!unlocked && (
          <View style={styles.lockCard}>
            <Icon name="lock" size={22} />
            <View style={{ flex: 1 }}>
              <View style={styles.lockTitleRow}>
                <Text style={styles.lockTitle}>Ranked events unlock at</Text>
                <Icon name="moonstone" size={14} />
                <Text style={styles.lockTitle}>{UNLOCK_MOONRISE_AT_MOONSTONES}</Text>
              </View>
              <Text style={styles.lockSub}>
                Earn moonstones from casual duels below. You have{' '}
                <Text style={{ color: palette.candlelight }}>
                  {stones} / {UNLOCK_MOONRISE_AT_MOONSTONES}
                </Text>
                .
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.section}>Live modes</Text>

        <ModeCard
          icon="swords"
          title="Casual Duel"
          subtitle="First to three matches wins. No rank risk."
          badge="Beta"
        />
        <ModeCard
          icon="trophy"
          title="Ranked Duel"
          subtitle="Earn or lose moonstones each match."
          badge={unlocked ? 'Live' : 'Locked'}
          disabled={!unlocked}
        />
        <ModeCard
          icon="pumpkin"
          title="Weekly Cauldron"
          subtitle="Seasonal event with unique rules."
          badge={unlocked ? '3d left' : 'Locked'}
          disabled={!unlocked}
        />

        <Text style={styles.section}>Private</Text>
        <ModeCard
          icon="link"
          title="Invite a friend"
          subtitle="Room codes for a private match. No ranked stakes."
          badge="Free"
        />
      </ScrollView>
    </ShellFrame>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  badge,
  disabled,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  badge: string;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.card, disabled && styles.cardDisabled]} disabled={disabled}>
      <View style={styles.cardIcon}>
        <Icon name={icon} size={24} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{subtitle}</Text>
      </View>
      <View
        style={[
          styles.badge,
          badge === 'Beta' && { backgroundColor: palette.purple },
          badge === 'Locked' && { backgroundColor: palette.bgSurface2 },
        ]}
      >
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
  },
  heroGlyph: { marginBottom: spacing.xs },
  lockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  heroTitle: { ...typography.h1, fontSize: 24 },
  heroSub: {
    ...typography.small,
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: spacing.lg,
  },
  section: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    color: palette.parchmentDim,
  },
  lockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  lockGlyph: { fontSize: 22 },
  lockTitle: { ...typography.body, color: palette.parchment, fontWeight: '700' },
  lockSub: { ...typography.small, marginTop: 4, lineHeight: 18 },
  card: {
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
  cardDisabled: { opacity: 0.55 },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGlyph: { fontSize: 24 },
  cardTitle: { ...typography.h2, fontSize: 16 },
  cardSub: { ...typography.small, marginTop: 2 },
  badge: {
    backgroundColor: palette.emerald,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  badgeText: {
    color: palette.bgDeep,
    fontSize: 10,
    fontWeight: '800',
  },
});
