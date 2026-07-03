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
    setState(initialState(tunedLevel, consecutiveFails[tunedLevel.id] ?? 0));
    setEnded(false);
    setCharge(0);
  }, [tunedLevel, consecutiveFails]);

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
        if (r.next.status === 'won') {
          registerWin(r.next.levelId, rewardsFor(r.next));
        } else {
          registerLoss(r.next.levelId);
        }
      }
    },
    [state, ended, companion, registerWin, registerLoss],
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
  }, [tunedLevel, consecutiveFails]);

  const objectiveLabel = (i: number) => {
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
  };

  const isLastLevel = currentLevelIndex >= LEVELS.length - 1;
  const hubUnlocked = highestUnlocked >= UNLOCK_HUB_AT;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={typography.h1}>Moonpetal Apothecary</Text>
          <Text style={typography.small}>
            {level.id} · {level.archetype}
          </Text>
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

      {state.status !== 'active' && (
        <View style={styles.overlay}>
          <Text style={typography.h1}>
            {state.status === 'won' ? '✨ Brewed!' : 'Out of moves'}
          </Text>
          <Text style={[typography.body, { marginTop: spacing.sm, textAlign: 'center' }]}>
            {state.status === 'won'
              ? 'The moon smiled on your work tonight.'
              : 'The kettle sighed. Try again?'}
          </Text>
          {state.status === 'won' && !isLastLevel ? (
            <Pressable style={styles.btn} onPress={onNext}>
              <Text style={styles.btnLabel}>
                {hubUnlocked ? 'Back to Apothecary' : 'Next level'}
              </Text>
            </Pressable>
          ) : (
            <Pressable style={styles.btn} onPress={onRetry}>
              <Text style={styles.btnLabel}>
                {state.status === 'won' ? 'Play again' : 'Retry'}
              </Text>
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
