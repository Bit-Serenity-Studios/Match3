import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { palette, spacing, typography, radii } from '../theme';
import { WoodButton } from '../components/WoodButton';
import { Icon } from '../components/Icon';
import { MenuButton } from '../components/MenuButton';
import { RewardChips } from '../components/Currency';
import { useMonetization, currentPassLevel } from '../state/monetization';
import { useUI } from '../state/ui';
import { CHALLENGES, PASS_REWARDS, XP_PER_LEVEL, PASS_LEVELS } from '../monetization/battlePass';
import { BATTLE_PASS } from '../monetization/catalog';
import { getMonetization } from '../monetization/singleton';

export function PassScreen(): React.ReactElement {
  const pass = useMonetization((s) => s.pass);
  const level = useMonetization((s) => currentPassLevel(s));
  const claimReward = useMonetization((s) => s.claimPassReward);
  const purchaseProduct = useMonetization((s) => s.purchaseProduct);
  const unlockPremium = useMonetization((s) => s.unlockPassPremium);
  const refreshPass = useMonetization((s) => s.refreshPass);
  const goToHub = useUI((s) => s.goToHub);

  // Roll the season over on open so the displayed pass state and the claim
  // logic agree — otherwise a claim at a season boundary silently resets it.
  useEffect(() => {
    refreshPass(Date.now());
  }, [refreshPass]);

  const buyPremium = async () => {
    const r = await getMonetization().purchase(BATTLE_PASS.sku);
    if (!r.success) return;
    unlockPremium(Date.now());
    purchaseProduct(BATTLE_PASS, Date.now());
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <MenuButton />
        <View style={styles.headerTitle}>
          <Text style={typography.h1}>Mini-Pass</Text>
          <Text style={typography.small}>
            Season {pass.seasonId} · Level {level} / {PASS_LEVELS}
          </Text>
        </View>
        <Pressable style={styles.backBtn} onPress={() => goToHub()}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      <View style={styles.xpBar}>
        <View
          style={[
            styles.xpFill,
            { width: `${((pass.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` },
          ]}
        />
      </View>
      <Text style={typography.small}>
        {pass.xp} XP · {XP_PER_LEVEL - (pass.xp % XP_PER_LEVEL)} to next
      </Text>

      {!pass.premiumUnlocked && (
        <WoodButton
          label={`Unlock premium · ${BATTLE_PASS.displayPrice}`}
          onPress={buyPremium}
          labelStyle={styles.unlockLabel}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <Text style={styles.sectionTitle}>Challenges</Text>
        {CHALLENGES.map((c) => {
          const progress = pass.challengeProgress[c.id] ?? 0;
          const done = pass.challengesCompleted.includes(c.id);
          return (
            <View key={c.id} style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={[typography.body, { color: palette.parchment }]}>{c.title}</Text>
                <Text style={typography.small}>+{c.xp} XP</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={typography.small}>
                  {c.cadence.toUpperCase()} · {progress}/{c.target}
                </Text>
                {done && <Icon name="check" size={12} tint={palette.parchment} />}
              </View>
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Rewards</Text>
        {PASS_REWARDS.map((r) => {
          const unlocked = level >= r.level;
          const freeClaimed = pass.claimedFree.includes(r.level);
          const premiumClaimed = pass.claimedPremium.includes(r.level);
          return (
            <View key={r.level} style={styles.card}>
              <Text style={[typography.body, { color: palette.parchment }]}>
                Level {r.level}
              </Text>
              <View style={styles.tracksRow}>
                <Pressable
                  disabled={!unlocked || freeClaimed}
                  style={[styles.trackBtn, (!unlocked || freeClaimed) && { opacity: 0.5 }]}
                  onPress={() => claimReward('free', r.level, Date.now())}
                >
                  <RewardLabel prefix="Free" reward={r.free} claimed={freeClaimed} />
                </Pressable>
                <Pressable
                  disabled={!unlocked || !pass.premiumUnlocked || premiumClaimed}
                  style={[
                    styles.trackBtn,
                    styles.trackPremium,
                    (!unlocked || !pass.premiumUnlocked || premiumClaimed) && { opacity: 0.5 },
                  ]}
                  onPress={() => claimReward('premium', r.level, Date.now())}
                >
                  <RewardLabel prefix="Premium" reward={r.premium} claimed={premiumClaimed} />
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function RewardLabel({
  prefix,
  reward,
  claimed,
}: {
  prefix: string;
  reward?: { coins?: number; embers?: number; gems?: number };
  claimed: boolean;
}): React.ReactElement {
  const hasAny = !!(reward && (reward.coins || reward.embers || reward.gems));
  return (
    <View style={styles.trackLabelRow}>
      <Text style={styles.trackLabel}>{prefix} ·</Text>
      {hasAny ? (
        <RewardChips
          grants={{ coins: reward?.coins, embers: reward?.embers, gems: reward?.gems }}
          size={12}
          textStyle={styles.trackLabel}
        />
      ) : (
        <Text style={styles.trackLabel}>—</Text>
      )}
      {claimed && <Icon name="check" size={12} tint={palette.parchment} />}
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
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { flex: 1 },
  backBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  backLabel: { color: palette.parchment, fontWeight: '600' },
  xpBar: {
    height: 8,
    marginTop: spacing.md,
    backgroundColor: palette.bgSurface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', backgroundColor: palette.candlelight },
  unlockBtn: {
    marginTop: spacing.md,
    backgroundColor: palette.candlelight,
    padding: spacing.md,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  unlockLabel: { color: palette.bgDeep, fontWeight: '700' },
  sectionTitle: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.sm },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tracksRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  trackBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: palette.bgSurface2,
    alignItems: 'center',
  },
  trackPremium: { backgroundColor: palette.purpleDeep },
  trackLabel: { color: palette.parchment, fontSize: 12, textAlign: 'center' },
  trackLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
