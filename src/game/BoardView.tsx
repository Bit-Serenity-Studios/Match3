import React, { useMemo } from 'react';
import { View, StyleSheet, PanResponder, GestureResponderEvent } from 'react-native';
import { Canvas, Rect, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import type { BoardSnapshot, CellPos } from '../engine/types';
import { TILE_GLYPH, TILE_HEX } from '../config/tiles';
import { palette } from '../theme';
import { getTile, idx, isPlayable } from '../engine/board';

interface Props {
  board: BoardSnapshot;
  size: number;
  onSwap: (a: CellPos, b: CellPos) => void;
  highlight?: CellPos[];
  flash?: number; // increment on cascade for screen-shake
}

const glyphFont = matchFont({
  fontFamily: 'System',
  fontSize: 28,
  fontStyle: 'normal',
  fontWeight: 'bold',
});
const specialFont = matchFont({
  fontFamily: 'System',
  fontSize: 14,
  fontStyle: 'normal',
  fontWeight: 'bold',
});

export function BoardView({ board, size, onSwap, highlight, flash = 0 }: Props) {
  const cellSize = size / Math.max(board.width, board.height);
  const boardPx = cellSize * board.width;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) + Math.abs(g.dy) > 4,
        onPanResponderRelease: (evt: GestureResponderEvent, g) => {
          const { locationX, locationY } = evt.nativeEvent;
          const startCol = Math.floor((locationX - g.dx) / cellSize);
          const startRow = Math.floor((locationY - g.dy) / cellSize);
          if (!isPlayable(board, { row: startRow, col: startCol })) return;
          const adx = Math.abs(g.dx);
          const ady = Math.abs(g.dy);
          if (adx + ady < cellSize * 0.35) return;
          let dr = 0;
          let dc = 0;
          if (adx > ady) dc = g.dx > 0 ? 1 : -1;
          else dr = g.dy > 0 ? 1 : -1;
          const target = { row: startRow + dr, col: startCol + dc };
          if (!isPlayable(board, target)) return;
          onSwap({ row: startRow, col: startCol }, target);
        },
      }),
    [board, cellSize, onSwap],
  );

  const highlightSet = new Set(
    (highlight ?? []).map((p) => `${p.row},${p.col}`),
  );

  const shake = (flash % 2) * 2 - 1;

  return (
    <View
      style={[styles.wrap, { width: boardPx, height: boardPx, transform: [{ translateX: shake }] }]}
      {...panResponder.panHandlers}
    >
      <Canvas style={{ width: boardPx, height: boardPx }}>
        <Rect x={0} y={0} width={boardPx} height={boardPx} color={palette.bgSurface2} />
        {rangeCells(board).map(({ row, col, i }) => {
          if (!board.mask[i]) {
            return (
              <Rect
                key={`hole-${row}-${col}`}
                x={col * cellSize}
                y={row * cellSize}
                width={cellSize}
                height={cellSize}
                color={palette.bgDeep}
              />
            );
          }
          const t = getTile(board, { row, col });
          const x = col * cellSize + 3;
          const y = row * cellSize + 3;
          const w = cellSize - 6;
          const isHi = highlightSet.has(`${row},${col}`);
          return (
            <React.Fragment key={`cell-${row}-${col}`}>
              <RoundedRect
                x={x}
                y={y}
                width={w}
                height={w}
                r={8}
                color={isHi ? palette.candlelight : palette.bgSurface}
              />
              {t?.color && (
                <>
                  <RoundedRect
                    x={x + 4}
                    y={y + 4}
                    width={w - 8}
                    height={w - 8}
                    r={6}
                    color={TILE_HEX[t.color]}
                  />
                  <Text
                    x={x + w / 2 - 8}
                    y={y + w / 2 + 8}
                    text={TILE_GLYPH[t.color]}
                    font={glyphFont}
                    color={palette.bgDeep}
                  />
                </>
              )}
              {t?.blocker && (
                <RoundedRect
                  x={x + 2}
                  y={y + 2}
                  width={w - 4}
                  height={w - 4}
                  r={6}
                  color={blockerColor(t.blocker.kind)}
                  opacity={0.55}
                />
              )}
              {t?.special && (
                <Text
                  x={x + w - 14}
                  y={y + 14}
                  text={specialGlyph(t.special)}
                  font={specialFont}
                  color={palette.parchment}
                />
              )}
            </React.Fragment>
          );
        })}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    overflow: 'hidden',
  },
});

function rangeCells(b: BoardSnapshot): { row: number; col: number; i: number }[] {
  const out: { row: number; col: number; i: number }[] = [];
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width; c++) {
      out.push({ row: r, col: c, i: idx(b.width, r, c) });
    }
  }
  return out;
}

function blockerColor(k: string): string {
  switch (k) {
    case 'vine':
      return palette.emeraldDeep;
    case 'frostGlass':
      return '#7aa5cf';
    case 'stoneRune':
      return '#4a4055';
    case 'ivy':
      return palette.emerald;
    default:
      return palette.border;
  }
}

function specialGlyph(s: string): string {
  switch (s) {
    case 'lineH':
      return '━';
    case 'lineV':
      return '│';
    case 'bomb':
      return '✸';
    case 'prism':
      return '◆';
    default:
      return '';
  }
}
