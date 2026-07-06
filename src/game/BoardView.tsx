import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, Rect, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import type { BoardSnapshot, CellPos, Tile } from '../engine/types';
import { TILE_GLYPH, TILE_HEX } from '../config/tiles';
import { palette } from '../theme';
import { getTile, idx, isPlayable } from '../engine/board';

interface Props {
  board: BoardSnapshot;
  size: number;
  onSwap: (a: CellPos, b: CellPos) => void;
  highlight?: CellPos[];
  /** Two cells that failed a swap — plays the "reject" shake. */
  rejectedSwap?: [CellPos, CellPos] | null;
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

const SWAP_DURATION_MS = 180;
const REJECT_DURATION_MS = 260;

interface SwapAnim {
  from: CellPos;
  to: CellPos;
  /** Tile snapshot at `to` in the PREVIOUS board — this is what visually moves toward `from`. */
  fromTile: Tile | null;
  toTile: Tile | null;
  startedAt: number;
}

interface RejectAnim {
  a: CellPos;
  b: CellPos;
  startedAt: number;
}

/** Ease-out cubic — quick start, gentle settle. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Find the single-swap that turned prevBoard into nextBoard, if any.
 *  Returns null when the diff isn't a clean two-cell adjacent swap. */
function detectSwap(
  prev: BoardSnapshot,
  next: BoardSnapshot,
): { a: CellPos; b: CellPos } | null {
  if (prev.width !== next.width || prev.height !== next.height) return null;
  const changed: CellPos[] = [];
  for (let row = 0; row < prev.height; row++) {
    for (let col = 0; col < prev.width; col++) {
      const i = idx(prev.width, row, col);
      const pt = prev.tiles[i] ?? null;
      const nt = next.tiles[i] ?? null;
      if (!tilesEqual(pt, nt)) {
        changed.push({ row, col });
        if (changed.length > 2) return null;
      }
    }
  }
  if (changed.length !== 2) return null;
  const [a, b] = changed as [CellPos, CellPos];
  const dr = Math.abs(a.row - b.row);
  const dc = Math.abs(a.col - b.col);
  if (dr + dc !== 1) return null;
  return { a, b };
}

function tilesEqual(a: Tile | null, b: Tile | null): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return (
    a.color === b.color &&
    a.special === b.special &&
    (a.blocker?.kind ?? null) === (b.blocker?.kind ?? null) &&
    (a.blocker?.layers ?? 0) === (b.blocker?.layers ?? 0)
  );
}

export function BoardView({
  board,
  size,
  onSwap,
  highlight,
  rejectedSwap,
  flash = 0,
}: Props) {
  const cellSize = size / Math.max(board.width, board.height);
  const boardPx = cellSize * board.width;

  const startRef = useRef<CellPos | null>(null);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .minDistance(4)
        .onBegin((e) => {
          const col = Math.floor(e.x / cellSize);
          const row = Math.floor(e.y / cellSize);
          startRef.current = { row, col };
        })
        .onEnd((e) => {
          const start = startRef.current;
          startRef.current = null;
          if (!start) return;
          if (!isPlayable(board, start)) return;
          const adx = Math.abs(e.translationX);
          const ady = Math.abs(e.translationY);
          if (adx + ady < cellSize * 0.35) return;
          let dr = 0;
          let dc = 0;
          if (adx > ady) dc = e.translationX > 0 ? 1 : -1;
          else dr = e.translationY > 0 ? 1 : -1;
          const target = { row: start.row + dr, col: start.col + dc };
          if (!isPlayable(board, target)) return;
          onSwap(start, target);
        }),
    [board, cellSize, onSwap],
  );

  // ─── Swap-glide animation ─────────────────────────────────────────────
  // Detect a two-cell adjacent diff each time `board` changes; if we find
  // one, spawn a SwapAnim that renders the two moving tiles over the top of
  // the new board for SWAP_DURATION_MS. `now` ticks at ~60fps while the
  // animation is live so we can interpolate positions.
  const prevBoardRef = useRef<BoardSnapshot>(board);
  const [swapAnim, setSwapAnim] = useState<SwapAnim | null>(null);
  const [rejectAnim, setRejectAnim] = useState<RejectAnim | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const prev = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prev === board) return;
    const swap = detectSwap(prev, board);
    if (!swap) return;
    // The visible glide reads more naturally when we render the OLD tile
    // sliding from its OLD position into its NEW position — so we capture
    // the tile snapshots from the PREVIOUS board keyed by their NEW cells.
    setSwapAnim({
      from: swap.a,
      to: swap.b,
      fromTile: getTile(prev, swap.a),
      toTile: getTile(prev, swap.b),
      startedAt: Date.now(),
    });
  }, [board]);

  useEffect(() => {
    if (!rejectedSwap) return;
    setRejectAnim({
      a: rejectedSwap[0],
      b: rejectedSwap[1],
      startedAt: Date.now(),
    });
  }, [rejectedSwap]);

  useEffect(() => {
    if (!swapAnim && !rejectAnim) return;
    let raf: number;
    const tick = () => {
      setNow(Date.now());
      const t = Date.now();
      if (swapAnim && t - swapAnim.startedAt >= SWAP_DURATION_MS) {
        setSwapAnim(null);
      }
      if (rejectAnim && t - rejectAnim.startedAt >= REJECT_DURATION_MS) {
        setRejectAnim(null);
      }
      if (
        (swapAnim && t - swapAnim.startedAt < SWAP_DURATION_MS) ||
        (rejectAnim && t - rejectAnim.startedAt < REJECT_DURATION_MS)
      ) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [swapAnim, rejectAnim]);

  const highlightSet = new Set(
    (highlight ?? []).map((p) => `${p.row},${p.col}`),
  );

  const shake = (flash % 2) * 2 - 1;

  // Swap-anim progress (0..1) and offsets for the two moving tiles
  const swapProgress = swapAnim
    ? easeOut(Math.min(1, (now - swapAnim.startedAt) / SWAP_DURATION_MS))
    : 0;
  const swapFromKey = swapAnim ? `${swapAnim.from.row},${swapAnim.from.col}` : null;
  const swapToKey = swapAnim ? `${swapAnim.to.row},${swapAnim.to.col}` : null;

  // Reject-anim: sine wobble left/right for the two rejected cells
  const rejectProgress = rejectAnim
    ? Math.min(1, (now - rejectAnim.startedAt) / REJECT_DURATION_MS)
    : 0;
  const rejectOffset =
    rejectAnim && rejectProgress < 1
      ? Math.sin(rejectProgress * Math.PI * 3) * cellSize * 0.12 * (1 - rejectProgress)
      : 0;
  const rejectSet = rejectAnim
    ? new Set([
        `${rejectAnim.a.row},${rejectAnim.a.col}`,
        `${rejectAnim.b.row},${rejectAnim.b.col}`,
      ])
    : null;

  return (
    <GestureDetector gesture={panGesture}>
      <View
        collapsable={false}
        style={[styles.wrap, { width: boardPx, height: boardPx, transform: [{ translateX: shake }] }]}
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
          const cellKey = `${row},${col}`;
          const isHi = highlightSet.has(cellKey);

          // Suppress the two swapping cells' NEW tiles while the glide is
          // running — the moving tile overlay will render them instead.
          const isSwapping = swapAnim && (cellKey === swapFromKey || cellKey === swapToKey);
          const showTileHere = !isSwapping;

          // Reject wobble — nudge x by rejectOffset (mirrored between the pair)
          const wobble =
            rejectSet && rejectSet.has(cellKey)
              ? cellKey === `${rejectAnim!.a.row},${rejectAnim!.a.col}`
                ? rejectOffset
                : -rejectOffset
              : 0;

          const x = col * cellSize + 3 + wobble;
          const y = row * cellSize + 3;
          const w = cellSize - 6;
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
              {showTileHere && t?.color && (
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
              {showTileHere && t?.blocker && (
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
              {showTileHere && t?.special && (
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

        {/* Two moving tiles for the swap glide */}
        {swapAnim && (
          <>
            <MovingTile
              tile={swapAnim.fromTile}
              fromCell={swapAnim.from}
              toCell={swapAnim.to}
              progress={swapProgress}
              cellSize={cellSize}
            />
            <MovingTile
              tile={swapAnim.toTile}
              fromCell={swapAnim.to}
              toCell={swapAnim.from}
              progress={swapProgress}
              cellSize={cellSize}
            />
          </>
        )}
      </Canvas>
      </View>
    </GestureDetector>
  );
}

interface MovingTileProps {
  tile: Tile | null;
  fromCell: CellPos;
  toCell: CellPos;
  progress: number;
  cellSize: number;
}

/** Renders a tile at an interpolated position between fromCell and toCell. */
function MovingTile({ tile, fromCell, toCell, progress, cellSize }: MovingTileProps): React.ReactElement | null {
  if (!tile?.color) return null;
  const sx = fromCell.col * cellSize;
  const sy = fromCell.row * cellSize;
  const ex = toCell.col * cellSize;
  const ey = toCell.row * cellSize;
  const x = sx + (ex - sx) * progress + 3;
  const y = sy + (ey - sy) * progress + 3;
  const w = cellSize - 6;
  return (
    <>
      <RoundedRect x={x + 4} y={y + 4} width={w - 8} height={w - 8} r={6} color={TILE_HEX[tile.color]} />
      <Text
        x={x + w / 2 - 8}
        y={y + w / 2 + 8}
        text={TILE_GLYPH[tile.color]}
        font={glyphFont}
        color={palette.bgDeep}
      />
    </>
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
