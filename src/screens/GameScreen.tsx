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
import { useProfile, difficultyEaseFor } from '../state/profile';

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

  const level = useMemo(
    () =>
      getLevelByIndex(currentLevelIndex) ??
      getLevelByIndex(LEVELS.length - 1)!,
    [currentLevelIndex],
  );
  const [state, setState] = useState<GameState>(() =>
    initialState(level, consecutiveFails[level.id] ?? 0),
  );
  const [flash, setFlash] = useState(0);
  const [highlight, setHighlight] = useState<CellPos[] | undefined>(undefined);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    // When the current level changes, spin up a fresh game state for it.
    setState(initialState(level, consecutiveFails[level.id] ?? 0));
    setEnded(false);
  }, [level, consecutiveFails]);

  const boardSize = Math.min(dims.width - spacing.lg * 2, 420);

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
      setState(r.next);
      if (r.next.status !== 'active' && !ended) {
        setEnded(true);
        if (r.next.status === 'won') {
          registerWin(level.id);
        } else {
          registerLoss(level.id);
        }
      }
    },
    [state, ended, level.id, registerWin, registerLoss],
  );

  const onNext = useCallback(() => {
    advanceLevel();
  }, [advanceLevel]);

  const onRetry = useCallback(() => {
    setState(initialState(level, consecutiveFails[level.id] ?? 0));
    setEnded(false);
    setFlash(0);
  }, [level, consecutiveFails]);

  const objectiveLabel = (i: number) => {
    const o = state.objectives[i];
    if (!o) return '';
    switch (o.kind) {
      case 'collectColor':
        return `${o.color} × ${o.count}`;
      case 'clearBlockers':
        return `clear ${o.blocker ?? 'blockers'}`;
      case 'dropIngredients':
        return `drop ${o.tile} × ${o.count}`;
      case 'score':
        return `${o.target} pts`;
    }
  };

  const isLastLevel = currentLevelIndex >= LEVELS.length - 1;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>Moonpetal Apothecary</Text>
        <Text style={typography.small}>
          {level.id} · {level.archetype}
        </Text>
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
        <View style={styles.hudTile}>
          <Text style={typography.small}>Objectives</Text>
          <Text style={typography.body}>
            {state.progress
              .map(
                (p, i) =>
                  `${objectiveLabel(i)}: ${p.progress}/${p.target}${p.done ? ' ✓' : ''}`,
              )
              .join('  ·  ')}
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
              <Text style={styles.btnLabel}>Next level</Text>
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
  header: { alignItems: 'center', marginBottom: spacing.lg },
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
