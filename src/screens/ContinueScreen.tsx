import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { CurrencyAmount } from '../components/Currency';
import { CONTINUE_EXTRA_MOVES, priceForContinue } from '../monetization/continue';
import { click } from '../audio/click';
import type { ContinueSummary } from '../monetization/continue';
import { useMonetization } from '../state/monetization';
import { useProfile } from '../state/profile';
import { tierFor } from '../monetization/streak';

interface Props {
  summary: ContinueSummary;
  onContinue(): void;
  onGiveUp(): void;
  onWatchAd?(): void;
  watchAdAllowed?: boolean;
}

/**
 * Fail-state monetization surface. Displays:
 *   - remaining objectives (drives urgency: "Only 2 vials left!")
 *   - streak-at-risk callout
 *   - +5 moves priced in gems (escalating on later continues)
 *   - one rewarded-ad option per day (capped)
 *   - a passive give-up button
 *
 * All commits to profile / monetization state happen through the callbacks
 * so the screen stays pure and testable.
 */
export function ContinueScreen({
  summary,
  onContinue,
  onGiveUp,
  onWatchAd,
  watchAdAllowed = false,
}: Props): React.ReactElement {
  const attempts = useMonetization((s) => s.continueAttemptsThisLevel);
  const gems = useProfile((s) => s.gems);
  const streak = useMonetization((s) => s.streak.count);
  const price = useMemo(() => priceForContinue(attempts), [attempts]);
  const canAfford = gems >= price;
  const tier = tierFor(streak);

  return (
    <View style={styles.root}>
      <Text style={typography.h1}>Out of moves</Text>
      <Text style={[typography.body, styles.subtitle]}>
        {summary.remainingByObjective.length === 1
          ? `Only ${summary.remainingByObjective[0]!.needed} ${summary.remainingByObjective[0]!.label} left!`
          : `You're ${summary.totalStillNeeded} away from brewing this one.`}
      </Text>

      {summary.remainingByObjective.length > 0 && (
        <View style={styles.objectiveList}>
          {summary.remainingByObjective.map((o) => (
            <View key={o.label} style={styles.objectiveRow}>
              <Text style={[typography.body, { color: palette.parchment }]}>{o.label}</Text>
              <Text style={typography.score}>{o.needed}</Text>
            </View>
          ))}
        </View>
      )}

      {streak >= 3 && (
        <View style={styles.streakBox}>
          <Text style={typography.small}>Streak at risk</Text>
          <Text style={[typography.h2, { color: palette.candlelight }]}>
            {streak}-win {tier?.name ?? ''} streak
          </Text>
          <Text style={typography.small}>Giving up ends it.</Text>
        </View>
      )}

      <Pressable
        style={[styles.buyBtn, !canAfford && styles.disabled]}
        disabled={!canAfford}
        onPress={click(onContinue)}
      >
        <Text style={styles.buyTitle}>+{CONTINUE_EXTRA_MOVES} Moves</Text>
        <CurrencyAmount
          kind="gems"
          amount={price}
          size={15}
          tint={palette.bgDeep}
          textStyle={styles.buyPrice}
        />
      </Pressable>
      {!canAfford && (
        <Text style={[typography.small, { color: palette.danger, marginTop: spacing.xs }]}>
          Not enough stars.
        </Text>
      )}

      {onWatchAd && watchAdAllowed && (
        <Pressable style={styles.adBtn} onPress={click(onWatchAd)}>
          <Text style={styles.adLabel}>Watch ad · +1 life</Text>
        </Pressable>
      )}

      <Pressable style={styles.giveUpBtn} onPress={click(onGiveUp)}>
        <Text style={styles.giveUpLabel}>Give up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    padding: spacing.xl,
    backgroundColor: palette.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    width: '100%',
  },
  subtitle: {
    marginTop: spacing.xs,
    color: palette.parchmentDim,
  },
  objectiveList: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.bgSurface2,
    borderRadius: radii.md,
  },
  objectiveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  streakBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.bgSurface2,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  buyBtn: {
    marginTop: spacing.lg,
    backgroundColor: palette.candlelight,
    borderRadius: radii.pill,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  disabled: { opacity: 0.55 },
  buyTitle: { color: palette.bgDeep, fontSize: 18, fontWeight: '700' },
  buyPrice: { color: palette.bgDeep, fontSize: 14, marginTop: spacing.xs },
  adBtn: {
    marginTop: spacing.md,
    borderRadius: radii.pill,
    borderColor: palette.emerald,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  adLabel: { color: palette.emerald, fontWeight: '600' },
  giveUpBtn: { marginTop: spacing.md, alignItems: 'center' },
  giveUpLabel: { color: palette.parchmentDim },
});
