import type {
  BoardSnapshot,
  CellPos,
  SpecialKind,
  Tile,
  TileColor,
} from './types';
import { getTile, isPlayable } from './board';
import { ENGINE_CONFIG } from '../config/engine';

/**
 * Compute the set of cells cleared by activating a special at position `at`
 * with an optional partnerColor context (used by prism vials).
 *
 * Does NOT chain-activate other specials — that is orchestrated in resolve.ts
 * so cascade events stay well-ordered.
 */
export function cellsClearedByActivation(
  b: BoardSnapshot,
  at: CellPos,
  kind: SpecialKind,
  partnerColor?: TileColor,
): CellPos[] {
  const out: CellPos[] = [];
  switch (kind) {
    case 'lineH': {
      for (let c = 0; c < b.width; c++) {
        const p = { row: at.row, col: c };
        if (isPlayable(b, p)) out.push(p);
      }
      return out;
    }
    case 'lineV': {
      for (let r = 0; r < b.height; r++) {
        const p = { row: r, col: at.col };
        if (isPlayable(b, p)) out.push(p);
      }
      return out;
    }
    case 'bomb': {
      const rad = ENGINE_CONFIG.specials.bombRadius;
      for (let dr = -rad; dr <= rad; dr++) {
        for (let dc = -rad; dc <= rad; dc++) {
          const p = { row: at.row + dr, col: at.col + dc };
          if (isPlayable(b, p)) out.push(p);
        }
      }
      return out;
    }
    case 'prism': {
      // Prism clears all tiles of the partner color (or the tile's own color
      // if activated without a partner — falls back to any color present).
      const target =
        partnerColor ?? getTile(b, at)?.color ?? findAnyColor(b);
      if (!target) return [at];
      for (let r = 0; r < b.height; r++) {
        for (let c = 0; c < b.width; c++) {
          const p = { row: r, col: c };
          if (!isPlayable(b, p)) continue;
          const t = getTile(b, p);
          if (t?.color === target) out.push(p);
        }
      }
      // Include the prism itself.
      if (!out.some((p) => p.row === at.row && p.col === at.col)) out.push(at);
      return out;
    }
  }
}

function findAnyColor(b: BoardSnapshot): TileColor | null {
  for (const t of b.tiles) if (t?.color) return t.color;
  return null;
}

/** Resolve a special+special combo, returning cells cleared. Symmetric. */
export function comboClears(
  b: BoardSnapshot,
  a: { at: CellPos; kind: SpecialKind; color: TileColor | null },
  c: { at: CellPos; kind: SpecialKind; color: TileColor | null },
): CellPos[] {
  const pair = [a.kind, c.kind].sort().join('+');
  switch (pair) {
    case 'bomb+bomb': {
      // 5x5 blast around the swap.
      const cells: CellPos[] = [];
      const cr = Math.floor((a.at.row + c.at.row) / 2);
      const cc = Math.floor((a.at.col + c.at.col) / 2);
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const p = { row: cr + dr, col: cc + dc };
          if (isPlayable(b, p)) cells.push(p);
        }
      }
      return cells;
    }
    case 'bomb+lineH':
    case 'bomb+lineV': {
      // Clear a 3-wide cross through the swap center.
      const cr = a.at.row;
      const cc = a.at.col;
      const cells: CellPos[] = [];
      for (let r = 0; r < b.height; r++) {
        for (let d = -1; d <= 1; d++) {
          const p = { row: r, col: cc + d };
          if (isPlayable(b, p)) cells.push(p);
        }
      }
      for (let c = 0; c < b.width; c++) {
        for (let d = -1; d <= 1; d++) {
          const p = { row: cr + d, col: c };
          if (isPlayable(b, p)) cells.push(p);
        }
      }
      return uniq(cells);
    }
    case 'lineH+lineH':
    case 'lineH+lineV':
    case 'lineV+lineV': {
      // Full row and full column through the swap.
      const cells: CellPos[] = [];
      for (let r = 0; r < b.height; r++) {
        const p = { row: r, col: a.at.col };
        if (isPlayable(b, p)) cells.push(p);
      }
      for (let c = 0; c < b.width; c++) {
        const p = { row: a.at.row, col: c };
        if (isPlayable(b, p)) cells.push(p);
      }
      return uniq(cells);
    }
    case 'bomb+prism':
    case 'lineH+prism':
    case 'lineV+prism': {
      // Prism + line/bomb: destroy all tiles of the partner's color; the ones
      // of that color are treated as line-clears in downstream chain logic
      // (approximated here as a single big clear).
      const partner = a.kind === 'prism' ? c : a;
      const target = partner.color;
      const cells: CellPos[] = [];
      if (target) {
        for (let r = 0; r < b.height; r++) {
          for (let cc = 0; cc < b.width; cc++) {
            const p = { row: r, col: cc };
            if (!isPlayable(b, p)) continue;
            const t = getTile(b, p);
            if (t?.color === target) cells.push(p);
          }
        }
      }
      // Also clear a cross through the swap for the line/bomb component.
      for (let r = 0; r < b.height; r++) {
        const p = { row: r, col: a.at.col };
        if (isPlayable(b, p)) cells.push(p);
      }
      for (let cc = 0; cc < b.width; cc++) {
        const p = { row: a.at.row, col: cc };
        if (isPlayable(b, p)) cells.push(p);
      }
      return uniq(cells);
    }
    case 'prism+prism': {
      // Nuke: clear every playable cell.
      const cells: CellPos[] = [];
      for (let r = 0; r < b.height; r++) {
        for (let cc = 0; cc < b.width; cc++) {
          const p = { row: r, col: cc };
          if (isPlayable(b, p)) cells.push(p);
        }
      }
      return cells;
    }
    default:
      return [a.at, c.at];
  }
}

function uniq(cells: CellPos[]): CellPos[] {
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

/** Detects a specialKind on a tile. */
export function specialOn(t: Tile | null): SpecialKind | null {
  return t?.special ?? null;
}
