import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { applySwap, newGame } from '../engine/engine';
import { withDifficulty } from '../engine/difficulty';
import type { CellPos, GameState, LevelDef } from '../engine/types';
import { BoardView } from '../game/BoardView';
import { palette, spacing, typography, radii } from '../theme';
import { LEVELS, getLevelByIndex } from '../levels/catalog';
import {
  UNLOCK_HUB_AT,
  difficultyEaseFor,
  useProfile,
} from '../state/profile';
import { useUI } from '../state/ui';
import { rewardsFor } from '../economy/rewards';
import { getCompanion } from '../companions/catalog';
import {
  applyDropMultipliers,
  castAbility,
  chargeFromEvents,
  passiveDropMultipliers,
} from '../companions/effects';
import { useMonetization } from '../state/monetization';
import { getFlags } from '../state/featureFlags';
import { ContinueScreen } from './ContinueScreen';
import { summarizeFail, CONTINUE_EXTRA_MOVES, priceForContinue } from '../monetization/continue';
import { getMonetization } from '../monetization/singleton';
import { track } from '../telemetry/logger';

function normalizeGrantsForTelemetry(
  g: import('../monetization/types').Grants,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (g.coins) out.coins = g.coins;
  if (g.gems) out.gems = g.gems;
  if (g.embers) out.embers = g.embers;
  if (g.lives) out.lives = g.lives;
  if (g.extraMoves) out.extraMoves = g.extraMoves;
  return out;
}

function buildLevelForPlayer(
  level: LevelDef,
  equippedId: string | null,
  ownedById: (id: string) => ReturnType<typeof getCompanion> extends null ? never : any,
  ownedCompanions: ReturnType<typeof useProfile.getState>['ownedCompanions'],
): LevelDef {
  if (!equippedId) return level;
  const def = getCompanion(equippedId);
  const owned = ownedCompanions.find((c) => c.id === equippedId) ?? null;
  if (!def || !owned) return level;
  const mult = passiveDropMultipliers(owned, def);
  return {
    ...level,
    dropWeights: applyDropMultipliers(level.dropWeights, mult),
  };
}

function initialState(
  level: LevelDef,
  consecutiveFails: number,
): GameState {
  const g = newGame(level);
  const ease = difficultyEaseFor(consecutiveFails);
  return ease > 0 ? withDifficulty(g, ease) : g;
}

export function GameScreen() {
  const dims = useWindowDimensions();
  const currentLevelIndex = useProfile((s) => s.currentLevelIndex);
  const consecutiveFails = useProfile((s) => s.consecutiveFails);
  const registerWin = useProfile((s) => s.registerWin);
  const registerLoss = useProfile((s) => s.registerLoss);
  const advanceLevel = useProfile((s) => s.advanceLevel);
  const highestUnlocked = useProfile((s) => s.highestUnlocked);
  const equippedId = useProfile((s) => s.equippedCompanionId);
  const owned = useProfile((s) => s.ownedCompanions);
  const goToHub = useUI((s) => s.goToHub);
  const goToStore = useUI((s) => s.goToStore);
  const continueOpen = useUI((s) => s.continueOpen);
  const openContinue = useUI((s) => s.openContinue);
  const closeContinue = useUI((s) => s.closeContinue);
  const pendingOfferSku = useUI((s) => s.pendingOfferSku);
  const showOffer = useUI((s) => s.showOffer);
  const clearOffer = useUI((s) => s.clearOffer);
  const spendGems = useProfile((s) => s.spendGems);
  const gems = useProfile((s) => s.gems);
  const streak = useMonetization((s) => s.streak.count);
  const streakWin = useMonetization((s) => s.registerStreakWin);
  const streakLoss = useMonetization((s) => s.registerStreakLossFinal);
  const dripPiggy = useMonetization((s) => s.dripPiggy);
  const resetContinueAttempts = useMonetization((s) => s.resetContinueAttempts);
  const recordContinueUsed = useMonetization((s) => s.recordContinueUsed);
  const maybeMintOffer = useMonetization((s) => s.maybeMintOffer);
  const canShowAd = useMonetization((s) => s.canShowAd);
  const noteAdShown = useMonetization((s) => s.noteAdShown);
  const applyGrants = useMonetization((s) => s.applyGrants);
  const progressPassChallenge = useMonetization((s) => s.progressPassChallenge);

  const level = useMemo(
    () =>
      getLevelByIndex(currentLevelIndex) ??
      getLevelByIndex(LEVELS.length - 1)!,
    [currentLevelIndex],
  );

  const tunedLevel = useMemo(
    () => buildLevelForPlayer(level, equippedId, getCompanion, owned),
    [level, equippedId, owned],
  );

  const [state, setState] = useState<GameState>(() =>
    initialState(tunedLevel, consecutiveFails[tunedLevel.id] ?? 0),
  );
  const [flash, setFlash] = useState(0);
  const [highlight, setHighlight] = useState<CellPos[] | undefined>(undefined);
  const [ended, setEnded] = useState(false);
  const [charge, setCharge] = useState(0);
  const [castSeed, setCastSeed] = useState(0);

  useEffect(() => {
    const fails = consecutiveFails[tunedLevel.id] ?? 0;
    setState(initialState(tunedLevel, fails));
    setEnded(false);
    setCharge(0);
    track('level_started', {
      levelId: tunedLevel.id,
      archetype: tunedLevel.archetype,
      attempt: fails + 1,
      seed: tunedLevel.seed,
      difficultyMod: 0,
      boostersUsed: {},
      companionId: equippedId ?? null,
    });
  }, [tunedLevel, consecutiveFails, equippedId]);

  const boardSize = Math.min(dims.width - spacing.lg * 2, 420);
  const companion = equippedId ? getCompanion(equippedId) : null;
  const ability = companion?.active;
  const abilityReady = ability ? charge >= ability.cost : false;

  const onSwap = useCallback(
    (a: CellPos, b: CellPos) => {
      if (state.status !== 'active') return;
      const r = applySwap(state, a, b);
      if (!r.accepted) {
        setHighlight([a, b]);
        setTimeout(() => setHighlight(undefined), 180);
        return;
      }
      const cascades = r.events.filter((e) => e.t === 'cascade').length;
      setFlash((f) => f + Math.min(cascades, 4));
      if (companion) {
        setCharge((c) => c + chargeFromEvents(r.events, companion.affinityColor));
      }
      setState(r.next);
      if (r.next.status !== 'active' && !ended) {
        setEnded(true);
        const attemptsUsed =
          useMonetization.getState().continueAttemptsThisLevel;
        if (r.next.status === 'won') {
          const rew = rewardsFor(r.next);
          registerWin(r.next.levelId, rew);
          streakWin(r.next.levelId);
          dripPiggy(r.next.levelId.includes('hard') ? 'hardLevelWin' : 'levelWin');
          resetContinueAttempts();
          progressPassChallenge('daily.win3', 1, Date.now());
          progressPassChallenge('weekly.win15', 1, Date.now());
          progressPassChallenge('weekly.coins500', rew.coins, Date.now());
          track('level_finished', {
            levelId: r.next.levelId,
            result: 'won',
            score: r.next.score,
            turnsTaken: r.next.turn,
            movesRemained: r.next.movesRemaining,
            boostersUsed: {},
            attempts: (consecutiveFails[r.next.levelId] ?? 0) + 1,
            continuePurchased: attemptsUsed > 0,
          });
        } else if (getFlags().continueScreen) {
          openContinue();
          track('level_failed', {
            levelId: r.next.levelId,
            failMarginPerObjective: r.next.progress.map((p, i) => ({
              index: i,
              margin: p.done ? 0 : Math.max(0, 1 - p.progress / p.target),
            })),
            score: r.next.score,
            turnsTaken: r.next.turn,
          });
        } else {
          registerLoss(r.next.levelId);
          streakLoss();
          track('level_finished', {
            levelId: r.next.levelId,
            result: 'lost',
            score: r.next.score,
            turnsTaken: r.next.turn,
            movesRemained: r.next.movesRemaining,
            boostersUsed: {},
            attempts: (consecutiveFails[r.next.levelId] ?? 0) + 1,
            continuePurchased: false,
          });
        }
      }
    },
    [
      state,
      ended,
      companion,
      registerWin,
      streakWin,
      streakLoss,
      dripPiggy,
      resetContinueAttempts,
      openContinue,
      progressPassChallenge,
    ],
  );

  const onCastAbility = useCallback(() => {
    if (!ability || !abilityReady || state.status !== 'active') return;
    setCastSeed((s) => s + 1);
    const board = castAbility(state, ability, state.board.rngState ^ castSeed);
    setState({ ...state, board });
    setCharge(0);
  }, [ability, abilityReady, state, castSeed]);

  const onNext = useCallback(() => {
    advanceLevel();
    if (highestUnlocked >= UNLOCK_HUB_AT) goToHub();
  }, [advanceLevel, highestUnlocked, goToHub]);

  const onRetry = useCallback(() => {
    setState(initialState(tunedLevel, consecutiveFails[tunedLevel.id] ?? 0));
    setEnded(false);
    setFlash(0);
    setCharge(0);
    closeContinue();
  }, [tunedLevel, consecutiveFails, closeContinue]);

  const onBuyContinue = useCallback(() => {
    if (state.status !== 'lost') return;
    const attempts = useMonetization.getState().continueAttemptsThisLevel;
    const price = priceForContinue(attempts);
    if (!spendGems(price)) return;
    recordContinueUsed();
    setEnded(false);
    setState({
      ...state,
      status: 'active',
      movesRemaining: state.movesRemaining + CONTINUE_EXTRA_MOVES,
    });
    closeContinue();
  }, [state, spendGems, recordContinueUsed, closeContinue]);

  const onGiveUp = useCallback(() => {
    registerLoss(state.levelId);
    streakLoss();
    const level = tunedLevel;
    const fails = (consecutiveFails[level.id] ?? 0) + 1;
    const offer = maybeMintOffer(fails, level.id, level, Date.now());
    if (offer) showOffer(offer.sku);
    closeContinue();
  }, [
    state.levelId,
    registerLoss,
    streakLoss,
    tunedLevel,
    consecutiveFails,
    maybeMintOffer,
    showOffer,
    closeContinue,
  ]);

  const onWatchRescueAd = useCallback(async () => {
    const now = Date.now();
    if (!canShowAd('outOfLivesRescue', now)) return;
    track('ad_requested', { placement: 'outOfLivesRescue' });
    const r = await getMonetization().showRewardedAd('outOfLivesRescue', {});
    if (!r) return;
    noteAdShown('outOfLivesRescue', now);
    applyGrants(r.grants, now);
    track('ad_completed', {
      placement: 'outOfLivesRescue',
      grants: normalizeGrantsForTelemetry(r.grants),
    });
  }, [canShowAd, noteAdShown, applyGrants]);

  const objectiveLabel = useCallback(
    (i: number) => {
      const o = state.objectives[i];
      if (!o) return '';
      switch (o.kind) {
        case 'collectColor':
          return `${o.color}`;
        case 'clearBlockers':
          return `clear ${o.blocker ?? 'blockers'}`;
        case 'dropIngredients':
          return `drop ${o.tile}`;
        case 'score':
          return `pts`;
      }
    },
    [state.objectives],
  );

  const failSummary = useMemo(() => {
    if (state.status !== 'lost') return null;
    return summarizeFail(state, objectiveLabel);
  }, [state, objectiveLabel]);

  const isLastLevel = currentLevelIndex >= LEVELS.length - 1;
  const hubUnlocked = highestUnlocked >= UNLOCK_HUB_AT;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Moonpetal Apothecary</Text>
          <Pressable onLongPress={() => useUI.getState().goToDevDashboard()} delayLongPress={800}>
            <Text style={typography.small}>
              {level.id} · {level.archetype} · v0.4
            </Text>
          </Pressable>
        </View>
        {hubUnlocked && (
          <Pressable style={styles.hubBtn} onPress={() => goToHub()}>
            <Text style={styles.hubBtnLabel}>Hub</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.hud}>
        <View style={styles.hudTile}>
          <Text style={typography.small}>Moves</Text>
          <Text style={typography.score}>{state.movesRemaining}</Text>
        </View>
        <View style={styles.hudTile}>
          <Text style={typography.small}>Score</Text>
          <Text style={typography.score}>{state.score}</Text>
        </View>
        <View style={[styles.hudTile, { flex: 2 }]}>
          <Text style={typography.small}>Objectives</Text>
          <Text style={typography.body} numberOfLines={2}>
            {state.progress
              .map(
                (p, i) =>
                  `${objectiveLabel(i)} ${p.progress}/${p.target}${p.done ? ' ✓' : ''}`,
              )
              .join(' · ')}
          </Text>
        </View>
      </View>

      <View style={styles.boardWrap}>
        <BoardView
          board={state.board}
          size={boardSize}
          onSwap={onSwap}
          highlight={highlight}
          flash={flash}
        />
      </View>

      {companion && ability && (
        <Pressable
          onPress={onCastAbility}
          disabled={!abilityReady}
          style={[styles.abilityBar, !abilityReady && { opacity: 0.55 }]}
        >
          <Text style={typography.small}>
            {companion.name} · {abilityReady ? 'Ready' : `${charge}/${ability.cost}`}
          </Text>
          <View style={styles.abilityFill}>
            <View
              style={{
                height: '100%',
                width: `${Math.min(100, (charge / ability.cost) * 100)}%`,
                backgroundColor: abilityReady ? palette.emerald : palette.candlelight,
              }}
            />
          </View>
        </Pressable>
      )}

      {state.status === 'won' && (
        <View style={styles.overlay}>
          <Text style={typography.h1}>✨ Brewed!</Text>
          <Text style={[typography.body, { marginTop: spacing.sm, textAlign: 'center' }]}>
            The moon smiled on your work tonight.
          </Text>
          {streak >= 3 && (
            <Text style={[typography.small, { marginTop: spacing.sm, color: palette.candlelight }]}>
              {streak}-win streak!
            </Text>
          )}
          {!isLastLevel ? (
            <Pressable style={styles.btn} onPress={onNext}>
              <Text style={styles.btnLabel}>
                {hubUnlocked ? 'Back to Apothecary' : 'Next level'}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.btn} onPress={onRetry}>
              <Text style={styles.btnLabel}>Play again</Text>
            </Pressable>
          )}
        </View>
      )}

      {state.status === 'lost' && continueOpen && failSummary && (
        <View style={styles.overlay}>
          <ContinueScreen
            summary={failSummary}
            onContinue={onBuyContinue}
            onGiveUp={onGiveUp}
            onWatchAd={onWatchRescueAd}
            watchAdAllowed={getFlags().rewardedAds && canShowAd('outOfLivesRescue', Date.now())}
          />
        </View>
      )}

      {state.status === 'lost' && !continueOpen && (
        <View style={styles.overlay}>
          <Text style={typography.h1}>Out of moves</Text>
          <Text style={[typography.body, { marginTop: spacing.sm, textAlign: 'center' }]}>
            The kettle sighed. Try again?
          </Text>
          <Pressable style={styles.btn} onPress={onRetry}>
            <Text style={styles.btnLabel}>Retry</Text>
          </Pressable>
          {pendingOfferSku && (
            <Pressable
              style={[styles.btn, { backgroundColor: palette.emerald, marginTop: spacing.sm }]}
              onPress={() => {
                goToStore();
                clearOffer();
              }}
            >
              <Text style={styles.btnLabel}>See offer 🎁</Text>
            </Pressable>
          )}
        </View>
      )}
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
    marginBottom: spacing.lg,
  },
  hubBtn: {
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  hubBtnLabel: {
    color: palette.parchment,
    fontWeight: '600',
  },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  hudTile: {
    flex: 1,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  boardWrap: { alignItems: 'center', marginTop: spacing.md },
  abilityBar: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.bgSurface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: radii.md,
  },
  abilityFill: {
    height: 6,
    marginTop: spacing.xs,
    backgroundColor: palette.bgSurface2,
    borderRadius: 3,
    overflow: 'hidden',
  },
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
  btn: {
    marginTop: spacing.xl,
    backgroundColor: palette.candlelight,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
  },
  btnLabel: {
    color: palette.bgDeep,
    fontWeight: '700',
    fontSize: 16,
  },
});
