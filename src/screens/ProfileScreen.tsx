import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, radii, typography } from '../theme';
import { Icon, type IconName } from '../components/Icon';
import { useProfile } from '../state/profile';
import { useMonetization } from '../state/monetization';
import { useRetention } from '../state/retention';
import { useUI } from '../state/ui';
import { LEVELS } from '../levels/catalog';
import { click } from '../audio/click';

/**
 * Player profile — the "who am I" page. Shows avatar (moon crest with
 * derived level), rank + campaign progress, streak stats, ownership
 * badges (subscription/starter/piggy), and lifetime aggregates.
 *
 * No account backend yet, so nickname etc. are placeholder-derived. When
 * we wire real accounts, `Connect Account` (from HeaderMenu) becomes the
 * on-ramp.
 */
export function ProfileScreen(): React.ReactElement {
  const goToHome = useUI((s) => s.goToHome);
  const highest = useProfile((s) => s.highestUnlocked);
  const moonstones = useProfile((s) => s.moonstones);
  const coins = useProfile((s) => s.coins);
  const embers = useProfile((s) => s.embers);
  const gems = useProfile((s) => s.gems);
  const owned = useProfile((s) => s.ownedCompanions);
  const purchasedSkus = useMonetization((s) => s.purchasedSkus);
  const streak = useMonetization((s) => s.streak);
  const subscription = useMonetization((s) => s.subscription);
  const clearedWow = useRetention((s) => s.clearedWowLevels);

  const level = Math.max(1, Math.floor(highest / 3) + 1);
  const progressPct = Math.min(100, (highest / LEVELS.length) * 100);
  const hasSub = subscription.active;
  const totalCampaign = LEVELS.length;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Profile</Text>
          <Text style={typography.small}>Your apothecary at a glance.</Text>
        </View>
        <Pressable style={styles.backBtn} onPress={click(goToHome)}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Hero card */}
        <View style={styles.hero}>
          <View style={styles.avatarLarge}>
            <Icon name="moon" size={64} />
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>{level}</Text>
            </View>
          </View>
          <Text style={styles.nickname}>Apprentice</Text>
          <Text style={styles.tagline}>Under the moonlit garden</Text>
          <View style={styles.progressWrap}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {highest} / {totalCampaign} authored levels cleared
            </Text>
          </View>
        </View>

        {/* Currency row */}
        <Text style={styles.section}>Wallet</Text>
        <View style={styles.currencyRow}>
          <CurrencyTile icon="moonstone" label="Moonstones" value={moonstones} />
          <CurrencyTile icon="star" label="Stars" value={gems} />
          <CurrencyTile icon="coin" label="Coins" value={coins} />
          <CurrencyTile icon="ember" label="Embers" value={embers} />
        </View>

        {/* Records */}
        <Text style={styles.section}>Records</Text>
        <View style={styles.statGrid}>
          <StatCard label="Current streak" value={String(streak.count)} sub={streak.count > 0 ? `+${streak.count} win chain` : 'Win to start'} />
          <StatCard label="Best streak" value={String(streak.best)} sub="Longest ever" />
          <StatCard label="Wow moments" value={String(clearedWow)} sub="Highlight wins cleared" />
          <StatCard label="Companions" value={String(owned.length)} sub="Collected" />
        </View>

        {/* Ownership */}
        <Text style={styles.section}>Perks</Text>
        <View style={styles.perkList}>
          <PerkRow
            active={hasSub}
            icon="star"
            title="Apprentice's Oath"
            sub={hasSub ? 'Active subscription' : 'Not active'}
          />
          <PerkRow
            active={purchasedSkus.includes('bundle.starter')}
            icon="pouch"
            title="Starter Kit"
            sub={purchasedSkus.includes('bundle.starter') ? 'Claimed' : 'Not claimed'}
          />
          <PerkRow
            active={purchasedSkus.length > 0}
            icon="adFree"
            title="Ad-free interstitials"
            sub={purchasedSkus.length > 0 ? 'Enabled by prior purchase' : 'Available with any purchase'}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function CurrencyTile({
  icon,
  label,
  value,
}: {
  icon: IconName;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.currencyTile}>
      <Icon name={icon} size={22} />
      <Text style={styles.currencyValue}>{value}</Text>
      <Text style={styles.currencyLabel}>{label}</Text>
    </View>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function PerkRow({
  active,
  icon,
  title,
  sub,
}: {
  active: boolean;
  icon: IconName;
  title: string;
  sub: string;
}) {
  return (
    <View style={[styles.perkRow, active && styles.perkRowActive]}>
      <Icon name={icon} size={22} />
      <View style={{ flex: 1 }}>
        <Text style={styles.perkTitle}>{title}</Text>
        <Text style={styles.perkSub}>{sub}</Text>
      </View>
      <Text style={[styles.perkDot, { color: active ? palette.emerald : palette.parchmentDim }]}>
        {active ? '●' : '○'}
      </Text>
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
  body: { paddingBottom: 60 },
  hero: {
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.lg,
    marginBottom: spacing.lg,
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.candlelight,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarGlyph: { fontSize: 56 },
  avatarBadge: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.candlelight,
    borderColor: palette.bgSurface,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  avatarBadgeText: { color: palette.bgDeep, fontWeight: '900', fontSize: 14 },
  nickname: { ...typography.h1, fontSize: 24 },
  tagline: { ...typography.small, marginTop: 2 },
  progressWrap: { marginTop: spacing.md, width: '100%' },
  progressBar: {
    height: 8,
    backgroundColor: palette.bgSurface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: palette.candlelight,
  },
  progressText: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  section: {
    ...typography.small,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    color: palette.parchmentDim,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  currencyTile: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  currencyGlyph: { fontSize: 22 },
  currencyValue: {
    color: palette.parchment,
    fontWeight: '900',
    fontSize: 16,
    marginTop: 2,
  },
  currencyLabel: { ...typography.small, marginTop: 2, fontSize: 10 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flexBasis: '47%',
    flexGrow: 1,
    padding: spacing.md,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  statLabel: { ...typography.small, fontSize: 11, textTransform: 'uppercase' },
  statValue: { ...typography.h1, fontSize: 26, marginTop: 2 },
  statSub: { ...typography.small, marginTop: 2 },
  perkList: { gap: spacing.sm },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  perkRowActive: { borderColor: palette.emerald },
  perkGlyph: { fontSize: 22 },
  perkTitle: { color: palette.parchment, fontWeight: '700', fontSize: 14 },
  perkSub: { ...typography.small, marginTop: 2 },
  perkDot: { fontSize: 20 },
});
