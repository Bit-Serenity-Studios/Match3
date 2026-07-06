import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { LEVELS, getLevelByIndex, isEndlessIndex } from '../levels/catalog';
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
import { useRetention } from '../state/retention';
import { sfx } from '../audio/soundEffects';
import { click } from '../audio/click';
import { TutorialOverlay } from './TutorialOverlay';
import { MilestoneOverlay } from './MilestoneOverlay';

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
  const goToHome = useUI((s) => s.goToHome);
  const goToStore = useUI((s) => s.goToStore);
  const tutorialSeen = useProfile((s) => s.tutorialSeen);
  const markTutorialSeen = useProfile((s) => s.markTutorialSeen);
  const tutorialLevelsCleared = useProfile((s) => s.tutorialLevelsCleared);
  const markTutorialLevelsCleared = useProfile((s) => s.markTutorialLevelsCleared);
  const [milestone, setMilestone] = useState<null | 'tutorialDone' | 'endlessStart'>(null);
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
    () => getLevelByIndex(currentLevelIndex)!,
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
  const [rejectedSwap, setRejectedSwap] = useState<[CellPos, CellPos] | null>(null);
  const [pendingSwap, setPendingSwap] = useState<[CellPos, CellPos] | null>(null);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);
  const toastCounter = useRef(0);
  const pushToast = useCallback((text: string) => {
    const id = ++toastCounter.current;
    sfx('toast');
    setToasts((ts) => [...ts, { id, text }]);
    setTimeout(() => {
      setToasts((ts) => ts.filter((t) => t.id !== id));
    }, 1400);
  }, []);
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
      if (pendingSwap) return; // don't queue swaps mid-animation
      const r = applySwap(state, a, b);
      if (!r.accepted) {
        sfx('reject');
        setHighlight([a, b]);
        setRejectedSwap([a, b]);
        setTimeout(() => setHighlight(undefined), 260);
        setTimeout(() => setRejectedSwap(null), 300);
        return;
      }
      const cascades = r.events.filter((e) => e.t === 'cascade').length;
      // Animate the swap glide over the CURRENT board, then commit the
      // engine's result state so the cascade appears at once with a flash.
      sfx('swap');
      const glideMs = useProfile.getState().reduceMotion ? 0 : 220;
      if (glideMs > 0) setPendingSwap([a, b]);
      setTimeout(() => {
        setPendingSwap(null);
        setFlash((f) => f + Math.min(cascades + 1, 4));
        if (companion) {
          setCharge((c) => c + chargeFromEvents(r.events, companion.affinityColor));
        }
        setState(r.next);
        // Encouraging toast — extra hype for longer chains.
        const label =
          cascades >= 3
            ? 'Amazing!'
            : cascades >= 2
              ? 'Great chain!'
              : cascades >= 1
                ? 'Nice match!'
                : 'Match!';
        sfx(cascades >= 1 ? 'chain' : 'match');
        pushToast(label);
        if (cascades >= 2) {
          setTimeout(() => pushToast('+combo'), 180);
        }
        if (r.next.status !== 'active' && !ended) {
          setEnded(true);
          const attemptsUsed =
            useMonetization.getState().continueAttemptsThisLevel;
          if (r.next.status === 'won') {
            setTimeout(() => sfx('win'), 400);
            const rew = rewardsFor(r.next);
            registerWin(r.next.levelId, rew);
            streakWin(r.next.levelId);
            dripPiggy(r.next.levelId.includes('hard') ? 'hardLevelWin' : 'levelWin');
            resetContinueAttempts();
            progressPassChallenge('daily.win3', 1, Date.now());
            progressPassChallenge('weekly.win15', 1, Date.now());
            progressPassChallenge('weekly.coins500', rew.coins, Date.now());
            if (tunedLevel.archetype === 'wow') {
              useRetention.getState().registerWowLevelCleared();
            }
            // Milestone hand-offs: last tutorial level cleared, and first
            // step into endless generation. Shown as a modal on the win
            // screen the next time the overlay renders.
            if (tunedLevel.archetype === 'tutorial' && !tutorialLevelsCleared) {
              const next = getLevelByIndex(currentLevelIndex + 1);
              if (!next || next.archetype !== 'tutorial') {
                markTutorialLevelsCleared();
                setMilestone('tutorialDone');
              }
            }
            if (
              !isEndlessIndex(currentLevelIndex) &&
              isEndlessIndex(currentLevelIndex + 1)
            ) {
              setMilestone('endlessStart');
            }
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
            sfx('lose');
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
            sfx('lose');
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
      }, glideMs);
    },
    [
      state,
      ended,
      companion,
      pendingSwap,
      pushToast,
      registerWin,
      registerLoss,
      streakWin,
      streakLoss,
      dripPiggy,
      resetContinueAttempts,
      openContinue,
      progressPassChallenge,
      consecutiveFails,
      tunedLevel,
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
    if (highestUnlocked >= UNLOCK_HUB_AT) goToHome();
  }, [advanceLevel, highestUnlocked, goToHome]);

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

  const isLastLevel = false; // endless: there's always a next level
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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable style={styles.hubBtn} onPress={click(goToHome)}>
            <Text style={styles.hubBtnLabel}>Home</Text>
          </Pressable>
          {hubUnlocked && (
            <Pressable style={styles.hubBtn} onPress={click(() => goToHub())}>
              <Text style={styles.hubBtnLabel}>Hub</Text>
            </Pressable>
          )}
        </View>
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
          rejectedSwap={rejectedSwap}
          pendingSwap={pendingSwap}
          flash={flash}
        />
        <View pointerEvents="none" style={styles.toastColumn}>
          {toasts.map((t, i) => (
            <View key={t.id} style={[styles.toast, { opacity: Math.max(0.35, 0.95 - i * 0.25) }]}>
              <Text style={styles.toastText}>{t.text}</Text>
            </View>
          ))}
        </View>
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
            <Pressable style={styles.btn} onPress={click(onNext)}>
              <Text style={styles.btnLabel}>
                {hubUnlocked ? 'Back to Apothecary' : 'Next level'}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.btn} onPress={click(onRetry)}>
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
          <Pressable style={styles.btn} onPress={click(onRetry)}>
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

      {!tutorialSeen && <TutorialOverlay onDone={markTutorialSeen} />}

      {milestone === 'tutorialDone' && (
        <MilestoneOverlay
          glyph="🎓"
          title="You've finished the tutorial!"
          body="You've cleared every training level. From here the recipes get more clever — new blockers, tougher targets, and richer rewards."
          actionLabel="Onward"
          onAction={() => setMilestone(null)}
        />
      )}
      {milestone === 'endlessStart' && (
        <MilestoneOverlay
          glyph="♾️"
          title="Endless Cauldron"
          body="You've cleared all 60 crafted levels. The garden keeps growing — new levels are brewed on the fly, each a little tougher than the last. See how deep you can go."
          actionLabel="Keep brewing"
          onAction={() => setMilestone(null)}
        />
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
  toastColumn: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '38%',
    gap: 8,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: 'rgba(230, 178, 90, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    shadowColor: palette.candlelight,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  toastText: {
    color: palette.bgDeep,
    fontWeight: '900',
    fontSize: 20,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(255,255,255,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
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
