import type {
  BoardSnapshot,
  CellPos,
  DetectedMatch,
  SpecialKind,
  TileColor,
} from './types';
import { getTile, idx, isPlayable } from './board';

/**
 * Detects horizontal and vertical runs of >=3 same-color tiles, then merges
 * overlapping runs into L/T shapes. Blocked tiles (stone runes with no color)
 * never match. Tiles with existing specials still match by their color.
 */
export function findMatches(b: BoardSnapshot): DetectedMatch[] {
  const runs = collectRuns(b);
  return mergeIntoShapes(runs);
}

interface Run {
  cells: CellPos[];
  color: TileColor;
  orientation: 'H' | 'V';
}

function collectRuns(b: BoardSnapshot): Run[] {
  const runs: Run[] = [];
  // Horizontal
  for (let r = 0; r < b.height; r++) {
    let c = 0;
    while (c < b.width) {
      const start = c;
      const startColor = tileColorAt(b, r, c);
      if (startColor === null) {
        c++;
        continue;
      }
      while (c < b.width && tileColorAt(b, r, c) === startColor) c++;
      const len = c - start;
      if (len >= 3) {
        const cells: CellPos[] = [];
        for (let k = 0; k < len; k++) cells.push({ row: r, col: start + k });
        runs.push({ cells, color: startColor, orientation: 'H' });
      }
    }
  }
  // Vertical
  for (let c = 0; c < b.width; c++) {
    let r = 0;
    while (r < b.height) {
      const start = r;
      const startColor = tileColorAt(b, r, c);
      if (startColor === null) {
        r++;
        continue;
      }
      while (r < b.height && tileColorAt(b, r, c) === startColor) r++;
      const len = r - start;
      if (len >= 3) {
        const cells: CellPos[] = [];
        for (let k = 0; k < len; k++) cells.push({ row: start + k, col: c });
        runs.push({ cells, color: startColor, orientation: 'V' });
      }
    }
  }
  return runs;
}

function tileColorAt(
  b: BoardSnapshot,
  r: number,
  c: number,
): TileColor | null {
  const pos = { row: r, col: c };
  if (!isPlayable(b, pos)) return null;
  const t = getTile(b, pos);
  if (!t) return null;
  // Blockers without color (stone rune) don't count.
  if (!t.color) return null;
  return t.color;
}

function mergeIntoShapes(runs: Run[]): DetectedMatch[] {
  const byColor = new Map<TileColor, Run[]>();
  for (const r of runs) {
    const arr = byColor.get(r.color) ?? [];
    arr.push(r);
    byColor.set(r.color, arr);
  }
  const out: DetectedMatch[] = [];
  for (const [color, list] of byColor) {
    const hs = list.filter((r) => r.orientation === 'H');
    const vs = list.filter((r) => r.orientation === 'V');
    const used = new Set<Run>();
    // Try L/T merges: H run + V run sharing exactly one cell.
    for (const h of hs) {
      for (const v of vs) {
        const shared = h.cells.find((hc) =>
          v.cells.some((vc) => vc.row === hc.row && vc.col === hc.col),
        );
        if (!shared) continue;
        used.add(h);
        used.add(v);
        const cells = uniqCells([...h.cells, ...v.cells]);
        const isT = isTShape(h, v, shared);
        const shape = isT ? 'T' : 'L';
        const special = specialForShape(cells.length, shape);
        out.push({
          cells,
          length: cells.length,
          shape,
          color,
          origin: shared,
          special,
        });
      }
    }
    for (const r of list) {
      if (used.has(r)) continue;
      const shape = 'line';
      const special = specialForShape(r.cells.length, shape, r.orientation);
      out.push({
        cells: r.cells.slice(),
        length: r.cells.length,
        shape,
        color,
        origin: r.cells[Math.floor(r.cells.length / 2)],
        special,
      });
    }
  }
  return out;
}

function isTShape(h: Run, v: Run, shared: CellPos): boolean {
  // T: intersection cell is at an end of one run and the middle of the other.
  const hEnd =
    shared.col === h.cells[0]!.col ||
    shared.col === h.cells[h.cells.length - 1]!.col;
  const vEnd =
    shared.row === v.cells[0]!.row ||
    shared.row === v.cells[v.cells.length - 1]!.row;
  // L: both ends. T: exactly one end.
  return hEnd !== vEnd;
}

function uniqCells(cells: CellPos[]): CellPos[] {
  const seen = new Set<string>();
  const out: CellPos[] = [];
  for (const c of cells) {
    const k = `${c.row},${c.col}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

function specialForShape(
  length: number,
  shape: 'line' | 'L' | 'T',
  orientation?: 'H' | 'V',
): SpecialKind | undefined {
  if (shape === 'line') {
    if (length >= 5) return 'prism';
    if (length === 4) return orientation === 'H' ? 'lineV' : 'lineH';
    return undefined;
  }
  // L or T (length >= 5)
  return 'bomb';
}

/** True if the board currently contains at least one match-3+. */
export function hasAnyMatch(b: BoardSnapshot): boolean {
  for (let r = 0; r < b.height; r++) {
    for (let c = 0; c < b.width - 2; c++) {
      const a = tileColorAt(b, r, c);
      if (a && a === tileColorAt(b, r, c + 1) && a === tileColorAt(b, r, c + 2))
        return true;
    }
  }
  for (let c = 0; c < b.width; c++) {
    for (let r = 0; r < b.height - 2; r++) {
      const a = tileColorAt(b, r, c);
      if (a && a === tileColorAt(b, r + 1, c) && a === tileColorAt(b, r + 2, c))
        return true;
    }
  }
  return false;
}

export { idx };
