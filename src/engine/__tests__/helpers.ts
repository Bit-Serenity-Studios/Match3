import type { BoardSnapshot, LevelDef, Tile, TileColor } from '../types';
import { createBoard, idx } from '../board';
import { seedFrom } from '../rng';

/**
 * Build a board from a compact 2D-string layout. Each row is a string of
 * single characters:
 *   'm' moonpetal, 'v' vial, 'r' runestone, 's' resin, 'u' mushroom,
 *   '.' empty (playable, no tile), 'x' non-playable hole,
 *   uppercase adds a specific special: 'M' moonpetal+bomb, etc. (custom later)
 *   '#' stoneRune (immovable, no color)
 */
export function boardFromRows(
  rows: string[],
  seed = 12345,
): BoardSnapshot {
  const height = rows.length;
  const width = rows[0]!.length;
  const mask = new Array<boolean>(width * height).fill(true);
  const tiles: (Tile | null)[] = new Array(width * height).fill(null);
  for (let r = 0; r < height; r++) {
    const row = rows[r]!;
    if (row.length !== width) throw new Error('inconsistent row width');
    for (let c = 0; c < width; c++) {
      const ch = row[c]!;
      const i = idx(width, r, c);
      if (ch === 'x') {
        mask[i] = false;
        continue;
      }
      if (ch === '.') {
        tiles[i] = null;
        continue;
      }
      if (ch === '#') {
        tiles[i] = { color: null, blocker: { kind: 'stoneRune', layers: 1 } };
        continue;
      }
      tiles[i] = { color: charToColor(ch) };
    }
  }
  return {
    width,
    height,
    mask,
    tiles,
    rngState: seedFrom(seed),
    ivyStepsSinceSpread: 0,
  };
}

export function charToColor(ch: string): TileColor {
  switch (ch) {
    case 'm':
      return 'moonpetal';
    case 'v':
      return 'vial';
    case 'r':
      return 'runestone';
    case 's':
      return 'resin';
    case 'u':
      return 'mushroom';
  }
  throw new Error(`unknown color char: ${ch}`);
}

export function boardToRows(b: BoardSnapshot): string[] {
  const rows: string[] = [];
  for (let r = 0; r < b.height; r++) {
    let s = '';
    for (let c = 0; c < b.width; c++) {
      const i = idx(b.width, r, c);
      if (!b.mask[i]) {
        s += 'x';
        continue;
      }
      const t = b.tiles[i];
      if (!t) {
        s += '.';
        continue;
      }
      if (t.blocker?.kind === 'stoneRune') {
        s += '#';
        continue;
      }
      s += colorToChar(t.color!);
    }
    rows.push(s);
  }
  return rows;
}

export function colorToChar(c: TileColor): string {
  switch (c) {
    case 'moonpetal':
      return 'm';
    case 'vial':
      return 'v';
    case 'runestone':
      return 'r';
    case 'resin':
      return 's';
    case 'mushroom':
      return 'u';
  }
}

/** Build a LevelDef from a compact layout + minimal params. */
export function level(
  rows: string[],
  opts: Partial<LevelDef> & { objectives: LevelDef['objectives']; moves: number },
): LevelDef {
  const height = rows.length;
  const width = rows[0]!.length;
  const b = boardFromRows(rows, opts.seed ?? 12345);
  return {
    id: opts.id ?? 'test',
    width,
    height,
    mask: b.mask,
    startingLayout: b.tiles,
    dropWeights: opts.dropWeights ?? {
      moonpetal: 1,
      vial: 1,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    },
    objectives: opts.objectives,
    moves: opts.moves,
    archetype: opts.archetype ?? 'wow',
    seed: opts.seed ?? 12345,
  };
}
