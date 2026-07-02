import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { applySwap, newGame } from '../engine/engine';
import type { CellPos, GameState } from '../engine/types';
import { BoardView } from '../game/BoardView';
import { palette, spacing, typography, radii } from '../theme';
import { tutorial01 } from '../levels/tutorial01';

export function GameScreen() {
  const dims = useWindowDimensions();
  const [state, setState] = useState<GameState>(() => newGame(tutorial01));
  const [flash, setFlash] = useState(0);
  const [highlight, setHighlight] = useState<CellPos[] | undefined>(undefined);

  const boardSize = Math.min(dims.width - spacing.lg * 2, 420);

  const onSwap = useCallback(
    (a: CellPos, b: CellPos) => {
      const r = applySwap(state, a, b);
      if (!r.accepted) {
        setHighlight([a, b]);
        setTimeout(() => setHighlight(undefined), 180);
        return;
      }
      const cascades = r.events.filter((e) => e.t === 'cascade').length;
      setFlash((f) => f + Math.min(cascades, 4));
      setState(r.next);
    },
    [state],
  );

  const restart = useCallback(() => {
    setState(newGame(tutorial01));
    setFlash(0);
  }, []);

  const progress = state.progress[0];
  const objective = state.objectives[0];
  const objectiveLabel = useMemo(() => {
    if (!objective) return '';
    switch (objective.kind) {
      case 'collectColor':
        return `Collect ${objective.count} ${objective.color}`;
      case 'clearBlockers':
        return `Clear all ${objective.blocker ?? ''} blockers`.trim();
      case 'dropIngredients':
        return `Drop ${objective.count} ${objective.tile}`;
      case 'score':
        return `Reach ${objective.target} pts`;
    }
  }, [objective]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={typography.h1}>Moonpetal Apothecary</Text>
        <Text style={typography.small}>Level {state.levelId}</Text>
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
          <Text style={typography.small}>{objectiveLabel}</Text>
          <Text style={typography.score}>
            {progress?.progress ?? 0}/{progress?.target ?? 0}
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
          <Text style={[typography.body, { marginTop: spacing.sm }]}>
            {state.status === 'won'
              ? 'The moon smiled on your work tonight.'
              : 'The kettle sighed. Try again?'}
          </Text>
          <Pressable style={styles.btn} onPress={restart}>
            <Text style={styles.btnLabel}>
              {state.status === 'won' ? 'Play again' : 'Retry'}
            </Text>
          </Pressable>
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
