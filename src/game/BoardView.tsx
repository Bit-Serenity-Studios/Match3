import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Canvas, ImageSVG, Rect, RoundedRect, Text, matchFont } from '@shopify/react-native-skia';
import type { BoardSnapshot, CellPos, Tile } from '../engine/types';
import { TILE_GLYPH, TILE_HEX } from '../config/tiles';
import { palette } from '../theme';
import { getTile, idx, isPlayable } from '../engine/board';
import { useProfile } from '../state/profile';
import { useTileArt, type TileArt } from './tileArt';

interface Props {
  board: BoardSnapshot;
  size: number;
  onSwap: (a: CellPos, b: CellPos) => void;
  highlight?: CellPos[];
  /** Two cells whose swap was rejected — plays the wobble. */
  rejectedSwap?: [CellPos, CellPos] | null;
  /** Two cells whose swap is currently being animated — plays the glide.
   *  The board passed in should still be the PRE-swap board while this is set. */
  pendingSwap?: [CellPos, CellPos] | null;
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

const SWAP_DURATION_MS = 220;
const REJECT_DURATION_MS = 260;
const FALL_DURATION_MS = 300;
const FALL_MAX_STAGGER_MS = 140;
const FALL_TOTAL_MS = FALL_DURATION_MS + FALL_MAX_STAGGER_MS;

/** Ease-out cubic — quick start, gentle settle. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Overshoot cubic for a little "bounce" at the end of the glide. */
function easeOutBack(t: number): number {
  const c1 = 1.35;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

interface SwapAnim {
  a: CellPos;
  b: CellPos;
  tileA: Tile | null;
  tileB: Tile | null;
  startedAt: number;
}

interface RejectAnim {
  a: CellPos;
  b: CellPos;
  startedAt: number;
}

interface FallAnim {
  startedAt: number;
  /** "row,col" → drop distance in cells (how far the tile visually falls). */
  cells: Map<string, number>;
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
  pendingSwap,
  flash = 0,
}: Props) {
  const cellSize = size / Math.max(board.width, board.height);
  const boardPx = cellSize * board.width;
  const art = useTileArt();

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

  const [swapAnim, setSwapAnim] = useState<SwapAnim | null>(null);
  const [rejectAnim, setRejectAnim] = useState<RejectAnim | null>(null);
  const [fallAnim, setFallAnim] = useState<FallAnim | null>(null);
  const [now, setNow] = useState(0);
  const reduceMotion = useProfile((s) => s.reduceMotion);
  const prevBoardRef = useRef<BoardSnapshot>(board);

  // Fall-in: whenever the board commits a new state (cascade resolve,
  // ability cast, retry, level load), diff against the previous board and
  // drop every changed tile in from above. Drop distance approximates how
  // many vacancies were filled below it in the same column, so refills
  // near the bottom travel farther than surface swaps — reads as gravity
  // without replaying engine steps.
  useEffect(() => {
    const prev = prevBoardRef.current;
    prevBoardRef.current = board;
    if (prev === board) return;
    if (reduceMotion) {
      setFallAnim(null);
      return;
    }
    const sameGeom =
      prev.width === board.width && prev.height === board.height;
    const changedInCol: number[] = new Array(board.width).fill(0);
    const cells = new Map<string, number>();
    for (let row = 0; row < board.height; row++) {
      for (let col = 0; col < board.width; col++) {
        const i = idx(board.width, row, col);
        if (!board.mask[i]) continue;
        const nt = board.tiles[i] ?? null;
        if (!nt) continue;
        const pt = sameGeom ? (prev.tiles[i] ?? null) : null;
        if (sameGeom && tilesEqual(pt, nt)) continue;
        changedInCol[col] = (changedInCol[col] ?? 0) + 1;
        const drop = Math.min(changedInCol[col]!, row + 2, 6);
        cells.set(`${row},${col}`, drop);
      }
    }
    if (cells.size === 0) {
      setFallAnim(null);
      return;
    }
    const startedAt = Date.now();
    setFallAnim({ startedAt, cells });
    setNow(startedAt);
  }, [board, reduceMotion]);

  // Spawn / retire the swap animation when pendingSwap changes.
  useEffect(() => {
    if (!pendingSwap) {
      setSwapAnim(null);
      return;
    }
    const [a, b] = pendingSwap;
    setSwapAnim({
      a,
      b,
      tileA: getTile(board, a),
      tileB: getTile(board, b),
      startedAt: Date.now(),
    });
    // Board reference intentionally excluded from deps — we only want to
    // spawn the anim when pendingSwap changes; capturing the board at
    // spawn time is the correct behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSwap]);

  useEffect(() => {
    if (!rejectedSwap) return;
    setRejectAnim({
      a: rejectedSwap[0],
      b: rejectedSwap[1],
      startedAt: Date.now(),
    });
  }, [rejectedSwap]);

  useEffect(() => {
    if (!swapAnim && !rejectAnim && !fallAnim) return;
    let raf: number;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (swapAnim && t - swapAnim.startedAt >= SWAP_DURATION_MS) {
        setSwapAnim(null);
      }
      if (rejectAnim && t - rejectAnim.startedAt >= REJECT_DURATION_MS) {
        setRejectAnim(null);
      }
      if (fallAnim && t - fallAnim.startedAt >= FALL_TOTAL_MS) {
        setFallAnim(null);
      }
      if (
        (swapAnim && t - swapAnim.startedAt < SWAP_DURATION_MS) ||
        (rejectAnim && t - rejectAnim.startedAt < REJECT_DURATION_MS) ||
        (fallAnim && t - fallAnim.startedAt < FALL_TOTAL_MS)
      ) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [swapAnim, rejectAnim, fallAnim]);

  const highlightSet = new Set(
    (highlight ?? []).map((p) => `${p.row},${p.col}`),
  );

  const shake = reduceMotion ? 0 : (flash % 2) * 2 - 1;

  // Swap animation: interpolate positions with a slight overshoot
  const swapRawT = swapAnim
    ? Math.min(1, (now - swapAnim.startedAt) / SWAP_DURATION_MS)
    : 0;
  const swapT = swapAnim ? easeOutBack(swapRawT) : 0;
  const swapAKey = swapAnim ? `${swapAnim.a.row},${swapAnim.a.col}` : null;
  const swapBKey = swapAnim ? `${swapAnim.b.row},${swapAnim.b.col}` : null;

  // Reject wobble
  const rejectProgress = rejectAnim
    ? Math.min(1, (now - rejectAnim.startedAt) / REJECT_DURATION_MS)
    : 0;
  const rejectOffset =
    rejectAnim && rejectProgress < 1
      ? Math.sin(rejectProgress * Math.PI * 3) *
        cellSize *
        0.14 *
        (1 - rejectProgress)
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
          const isSwapping = swapAnim && (cellKey === swapAKey || cellKey === swapBKey);
          const isFalling = fallAnim?.cells.has(cellKey) ?? false;
          // Hide the underlying tile at swap/fall cells; overlays draw them.
          const showTileHere = !isSwapping && !isFalling;

          const wobble =
            rejectSet && rejectSet.has(cellKey) && rejectAnim
              ? cellKey === `${rejectAnim.a.row},${rejectAnim.a.col}`
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
                    opacity={0.32}
                  />
                  {art.tiles[t.color] ? (
                    <ImageSVG
                      svg={art.tiles[t.color]}
                      x={x + w * 0.12}
                      y={y + w * 0.12}
                      width={w * 0.76}
                      height={w * 0.76}
                    />
                  ) : (
                    <Text
                      x={x + w / 2 - 8}
                      y={y + w / 2 + 8}
                      text={TILE_GLYPH[t.color]}
                      font={glyphFont}
                      color={palette.parchment}
                    />
                  )}
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
                art.specials[t.special] ? (
                  <ImageSVG
                    svg={art.specials[t.special]}
                    x={x + w - w * 0.42 - 2}
                    y={y + 2}
                    width={w * 0.42}
                    height={w * 0.42}
                  />
                ) : (
                  <Text
                    x={x + w - 14}
                    y={y + 14}
                    text={specialGlyph(t.special)}
                    font={specialFont}
                    color={palette.parchment}
                  />
                )
              )}
            </React.Fragment>
          );
        })}

        {/* Falling tiles — drawn on top of the static grid so they can
            overlap cells above their resting spot mid-flight. */}
        {fallAnim &&
          rangeCells(board).map(({ row, col, i }) => {
            const cellKey = `${row},${col}`;
            const drop = fallAnim.cells.get(cellKey);
            if (drop === undefined || !board.mask[i]) return null;
            const t = getTile(board, { row, col });
            if (!t?.color && !t?.blocker) return null;
            const stagger = Math.min(
              FALL_MAX_STAGGER_MS,
              col * 10 + drop * 18,
            );
            const raw = Math.max(
              0,
              Math.min(1, (now - fallAnim.startedAt - stagger) / FALL_DURATION_MS),
            );
            const offsetY = -drop * cellSize * (1 - easeOut(raw));
            const x = col * cellSize + 3;
            const y = row * cellSize + 3 + offsetY;
            const w = cellSize - 6;
            return (
              <React.Fragment key={`fall-${cellKey}`}>
                {t.color && (
                  <>
                    <RoundedRect
                      x={x + 4}
                      y={y + 4}
                      width={w - 8}
                      height={w - 8}
                      r={6}
                      color={TILE_HEX[t.color]}
                      opacity={0.32}
                    />
                    {art.tiles[t.color] ? (
                      <ImageSVG
                        svg={art.tiles[t.color]}
                        x={x + w * 0.12}
                        y={y + w * 0.12}
                        width={w * 0.76}
                        height={w * 0.76}
                      />
                    ) : (
                      <Text
                        x={x + w / 2 - 8}
                        y={y + w / 2 + 8}
                        text={TILE_GLYPH[t.color]}
                        font={glyphFont}
                        color={palette.parchment}
                      />
                    )}
                  </>
                )}
                {t.blocker && (
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
                {t.special &&
                  (art.specials[t.special] ? (
                    <ImageSVG
                      svg={art.specials[t.special]}
                      x={x + w - w * 0.42 - 2}
                      y={y + 2}
                      width={w * 0.42}
                      height={w * 0.42}
                    />
                  ) : (
                    <Text
                      x={x + w - 14}
                      y={y + 14}
                      text={specialGlyph(t.special)}
                      font={specialFont}
                      color={palette.parchment}
                    />
                  ))}
              </React.Fragment>
            );
          })}

        {/* Two moving tiles for the swap glide, rendered on top */}
        {swapAnim && (
          <>
            <MovingTile
              tile={swapAnim.tileA}
              fromCell={swapAnim.a}
              toCell={swapAnim.b}
              progress={swapT}
              cellSize={cellSize}
              scale={1 + Math.sin(swapRawT * Math.PI) * 0.08}
              art={art}
            />
            <MovingTile
              tile={swapAnim.tileB}
              fromCell={swapAnim.b}
              toCell={swapAnim.a}
              progress={swapT}
              cellSize={cellSize}
              scale={1 + Math.sin(swapRawT * Math.PI) * 0.08}
              art={art}
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
  scale: number;
  art: TileArt;
}

function MovingTile({
  tile,
  fromCell,
  toCell,
  progress,
  cellSize,
  scale,
  art,
}: MovingTileProps): React.ReactElement | null {
  if (!tile?.color) return null;
  const sx = fromCell.col * cellSize;
  const sy = fromCell.row * cellSize;
  const ex = toCell.col * cellSize;
  const ey = toCell.row * cellSize;
  const cx = sx + (ex - sx) * progress + cellSize / 2;
  const cy = sy + (ey - sy) * progress + cellSize / 2;
  const w = (cellSize - 6) * scale;
  const inner = (cellSize - 14) * scale;
  const svg = art.tiles[tile.color];
  const iconSize = (cellSize - 6) * 0.76 * scale;
  return (
    <>
      <RoundedRect
        x={cx - w / 2}
        y={cy - w / 2}
        width={w}
        height={w}
        r={8}
        color={palette.bgSurface}
      />
      <RoundedRect
        x={cx - inner / 2}
        y={cy - inner / 2}
        width={inner}
        height={inner}
        r={6}
        color={TILE_HEX[tile.color]}
        opacity={0.32}
      />
      {svg ? (
        <ImageSVG
          svg={svg}
          x={cx - iconSize / 2}
          y={cy - iconSize / 2}
          width={iconSize}
          height={iconSize}
        />
      ) : (
        <Text
          x={cx - 8}
          y={cy + 8}
          text={TILE_GLYPH[tile.color]}
          font={glyphFont}
          color={palette.parchment}
        />
      )}
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
