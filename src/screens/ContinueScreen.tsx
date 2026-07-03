import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { palette, spacing, typography, radii } from '../theme';
import { useProfile } from '../state/profile';
import { currentTier, winsToNext } from '../monetization/streak';
import { FEATURE_FLAGS } from '../config/flags';
import type { GameState } from '../engine/types';

interface Props {
  state: GameState;
  onContinue: (extraMoves: number) => void;
  onGiveUp: () => void;
}

const CONTINUE_MOVES = 5;
const CONTINUE_COST_GEMS = 20;

/**
 * The primary monetization surface. Shown when the player runs out of moves
 * but hasn't yet cleared the level. Offers a paid continue (gems), a daily
 * rewarded-ad rescue, and — critically — shows the streak the player is
 * about to lose if they give up.
 */
export function ContinueScreen({ state, onContinue, onGiveUp }: Props) {
  const gems = useProfile((s) => s.gems);
  const spendGems = useProfile((s) => s.spendGems);
  const winStreak = useProfile((s) => s.winStreak);
  const canShowRewarded = useProfile((s) => s.canShowRewardedAd);
  const showAd = useProfile((s) => s.showRewardedAd);
  const [busy, setBusy] = useState(false);

  const tier = currentTier(winStreak);
  const nextTierIn = winsToNext(winStreak);
  const canWatchAd =
    FEATURE_FLAGS.adsEnabled && canShowRewarded('extraMoves', Date.now());

  const remainingObjectives = state.progress
    .map((p, i) => {
      if (p.done) return null;
      const obj = state.objectives[i];
      if (!obj) return null;
      const rem = p.target - p.progress;
      switch (obj.kind) {
        case 'collectColor':
          return `${rem} ${obj.color}${rem === 1 ? '' : 's'}`;
        case 'clearBlockers':
          return `${obj.blocker ?? 'blocker'}${rem === 1 ? '' : 's'}`;
        case 'dropIngredients':
          return `${rem} ${obj.tile}`;
        case 'score':
          return `${rem} pts`;
      }
    })
    .filter(Boolean) as string[];

  const canBuy = gems >= CONTINUE_COST_GEMS;

  const onBuy = () => {
    if (!spendGems(CONTINUE_COST_GEMS)) return;
    onContinue(CONTINUE_MOVES);
  };

  const onWatch = async () => {
    setBusy(true);
    const r = await showAd('extraMoves');
    setBusy(false);
    if (r.ok && r.rewarded) onContinue(CONTINUE_MOVES);
  };

  return (
    <View style={styles.overlay}>
      <Text style={typography.h1}>Only {remainingObjectives.length === 1 ? '' : 'a few '}steps left</Text>
      <Text style={[typography.body, { marginTop: spacing.sm, textAlign: 'center' }]}>
        {remainingObjectives.length > 0
          ? `Only ${remainingObjectives.join(', ')} to brew.`
          : 'One more push.'}
      </Text>

      {tier && (
        <View style={styles.streakCard}>
          <Text style={typography.small}>Streak — {tier.label}</Text>
          <Text style={[typography.h2, { color: palette.candlelight }]}>
            {winStreak} wins {nextTierIn ? `· ${nextTierIn} to next` : '· max tier'}
          </Text>
          <Text style={typography.small}>You lose this if you give up.</Text>
        </View>
      )}

      <Pressable
        onPress={onBuy}
        disabled={!canBuy || busy}
        style={[styles.primary, (!canBuy || busy) && { opacity: 0.5 }]}
      >
        <Text style={styles.primaryLabel}>
          +{CONTINUE_MOVES} moves · {CONTINUE_COST_GEMS} 💎
        </Text>
      </Pressable>

      {canWatchAd && (
        <Pressable onPress={onWatch} disabled={busy} style={styles.secondary}>
          {busy ? (
            <ActivityIndicator color={palette.parchment} />
          ) : (
            <Text style={styles.secondaryLabel}>Watch ad · +{CONTINUE_MOVES} moves</Text>
          )}
        </Pressable>
      )}

      <Pressable onPress={onGiveUp} style={styles.giveUp}>
        <Text style={[typography.small, { color: palette.parchmentDim }]}>Give up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.overlay,
    padding: spacing.xl,
  },
  streakCard: {
    marginTop: spacing.lg,
    backgroundColor: palette.bgSurface,
    borderColor: palette.candlelightSoft,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 260,
  },
  primary: {
    marginTop: spacing.xl,
    backgroundColor: palette.candlelight,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  primaryLabel: {
    color: palette.bgDeep,
    fontWeight: '700',
    fontSize: 16,
  },
  secondary: {
    marginTop: spacing.md,
    borderColor: palette.parchmentDim,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  secondaryLabel: {
    color: palette.parchment,
    fontWeight: '600',
  },
  giveUp: {
    marginTop: spacing.lg,
    padding: spacing.sm,
  },
});
