import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import {
  PASS_TIERS,
  currentTier,
  msRemaining,
  rewardAt,
  xpToNextTier,
  xpToReach,
} from '../monetization/battlepass';

export function BattlePassScreen() {
  const pass = useProfile((s) => s.battlePass);
  const start = useProfile((s) => s.startNewBattlePass);
  const buyPremium = useProfile((s) => s.buyBattlePassPremium);
  const claim = useProfile((s) => s.claimBattlePassTier);

  if (!pass) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={typography.h2}>Mini-Pass · Season 1</Text>
          <Text style={typography.small}>14 days · free track + optional premium</Text>
          <Pressable
            style={styles.btn}
            onPress={() => start(Date.now())}
          >
            <Text style={styles.btnLabel}>Begin the season</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const now = Date.now();
  const remaining = msRemaining(pass, now);
  const tier = currentTier(pass.xp);
  const progressInTier = pass.xp - xpToReach(tier);
  const needForNext = tier < PASS_TIERS ? xpToNextTier(tier) : 0;

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={styles.card}>
        <Text style={typography.h2}>Season {pass.seasonId} · Mini-Pass</Text>
        <Text style={typography.small}>
          Tier {tier}/{PASS_TIERS} · ends in {formatDays(remaining)}
        </Text>
        <View style={styles.xpBar}>
          <View
            style={{
              height: '100%',
              width: needForNext ? `${(progressInTier / needForNext) * 100}%` : '100%',
              backgroundColor: palette.candlelight,
            }}
          />
        </View>
        <Text style={typography.small}>
          {needForNext ? `${progressInTier}/${needForNext} XP to next tier` : 'Max tier'}
        </Text>
        {!pass.premiumOwned && (
          <Pressable style={styles.btn} onPress={buyPremium}>
            <Text style={styles.btnLabel}>Unlock premium track</Text>
          </Pressable>
        )}
      </View>

      <Text style={[typography.h2, { marginTop: spacing.md, marginBottom: spacing.sm }]}>
        Tiers
      </Text>
      {Array.from({ length: PASS_TIERS }, (_, i) => i + 1).map((t) => {
        const r = rewardAt(t);
        const earned = tier >= t;
        const claimedFree = pass.claimedFree >= t;
        const claimedPrem = pass.claimedPremium >= t;
        return (
          <View key={t} style={styles.tierCard}>
            <View style={styles.tierHeader}>
              <Text style={typography.h2}>Tier {t}</Text>
              <Text style={typography.small}>
                {earned ? '✓ earned' : `${xpToReach(t) - pass.xp} XP away`}
              </Text>
            </View>
            <View style={styles.trackRow}>
              <View style={styles.trackHalf}>
                <Text style={typography.small}>Free</Text>
                <Text style={typography.body}>🪙 {r.free.coins} · 🔥 {r.free.embers}</Text>
                <Pressable
                  disabled={!earned || claimedFree}
                  onPress={() => claim(t, 'free')}
                  style={[
                    styles.smallBtn,
                    (!earned || claimedFree) && { opacity: 0.4 },
                  ]}
                >
                  <Text style={styles.smallBtnLabel}>
                    {claimedFree ? 'Claimed' : 'Claim'}
                  </Text>
                </Pressable>
              </View>
              <View style={styles.trackHalf}>
                <Text style={typography.small}>Premium</Text>
                <Text style={typography.body}>
                  🪙 {r.premium.coins} · 🔥 {r.premium.embers} · 💎 {r.premium.gems}
                </Text>
                <Pressable
                  disabled={!earned || !pass.premiumOwned || claimedPrem}
                  onPress={() => claim(t, 'premium')}
                  style={[
                    styles.smallBtn,
                    (!earned || !pass.premiumOwned || claimedPrem) && { opacity: 0.4 },
                  ]}
                >
                  <Text style={styles.smallBtnLabel}>
                    {!pass.premiumOwned ? 'Locked' : claimedPrem ? 'Claimed' : 'Claim'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

function formatDays(ms: number): string {
  const d = Math.floor(ms / (24 * 3600 * 1000));
  const h = Math.floor((ms % (24 * 3600 * 1000)) / (3600 * 1000));
  if (d > 0) return `${d}d ${h}h`;
  return `${h}h`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  xpBar: {
    height: 8,
    marginVertical: spacing.sm,
    backgroundColor: palette.bgSurface2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  btn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: palette.candlelight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  btnLabel: {
    color: palette.bgDeep,
    fontWeight: '700',
  },
  tierCard: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  trackRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  trackHalf: {
    flex: 1,
    padding: spacing.sm,
    backgroundColor: palette.bgSurface2,
    borderRadius: radii.md,
  },
  smallBtn: {
    marginTop: spacing.sm,
    backgroundColor: palette.purpleDeep,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
  smallBtnLabel: {
    color: palette.parchment,
    fontWeight: '600',
    fontSize: 12,
  },
});
