import type {
  BlockerKind,
  LevelDef,
  LevelArchetype,
  Objective,
  Tile,
  TileColor,
} from '../engine/types';

/**
 * On-disk level format. Diverges slightly from the engine's LevelDef to be
 * JSON-friendly (booleans, arrays, no undefined). The loader converts to
 * LevelDef and validates every field.
 */
export interface LevelJSON {
  id: string;
  width: number;
  height: number;
  /** Row-major booleans; true = playable. If omitted, all cells are playable. */
  mask?: boolean[];
  /** Row-major starting tiles. Each entry is null (engine will fill via RNG),
   *  a TileColor string (plain tile), or a Tile object (special / blocker). */
  layout?: (TileColor | null | LayoutCell)[];
  dropWeights: Record<TileColor, number>;
  objectives: Objective[];
  moves: number;
  archetype: LevelArchetype;
  seed: number;
}

export interface LayoutCell {
  color?: TileColor | null;
  special?: Tile['special'];
  blocker?: { kind: BlockerKind; layers: number };
}

const TILE_COLORS: readonly TileColor[] = [
  'moonpetal',
  'vial',
  'runestone',
  'resin',
  'mushroom',
];
const ARCHETYPES: readonly LevelArchetype[] = [
  'tutorial',
  'wow',
  'procrastinating',
  'hard',
];
const BLOCKER_KINDS: readonly BlockerKind[] = [
  'vine',
  'frostGlass',
  'stoneRune',
  'ivy',
];

export function validateLevel(json: unknown, source = '<memory>'): LevelDef {
  if (!isRecord(json)) throw fail(source, 'not an object');
  const id = expectString(json, 'id', source);
  const width = expectPosInt(json, 'width', source);
  const height = expectPosInt(json, 'height', source);
  const size = width * height;

  // mask
  let mask: boolean[];
  if (json.mask === undefined) {
    mask = new Array<boolean>(size).fill(true);
  } else if (Array.isArray(json.mask) && json.mask.length === size) {
    mask = json.mask.map((v, i) => {
      if (typeof v !== 'boolean') {
        throw fail(source, `mask[${i}] not boolean`);
      }
      return v;
    });
  } else {
    throw fail(source, `mask must be boolean[${size}] or omitted`);
  }

  // layout
  let startingLayout: (Tile | null)[];
  if (json.layout === undefined) {
    startingLayout = new Array<Tile | null>(size).fill(null);
  } else if (Array.isArray(json.layout) && json.layout.length === size) {
    startingLayout = json.layout.map((v, i) => layoutCellToTile(v, i, source));
  } else {
    throw fail(source, `layout must be array of length ${size} or omitted`);
  }

  // dropWeights
  const rawWeights = expectRecord(json, 'dropWeights', source);
  const dropWeights: Record<TileColor, number> = {
    moonpetal: 0,
    vial: 0,
    runestone: 0,
    resin: 0,
    mushroom: 0,
  };
  for (const c of TILE_COLORS) {
    const v = rawWeights[c];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      throw fail(source, `dropWeights.${c} must be a non-negative number`);
    }
    dropWeights[c] = v;
  }

  // objectives
  const rawObjs = expectArray(json, 'objectives', source);
  if (rawObjs.length === 0) throw fail(source, 'objectives must be non-empty');
  const objectives: Objective[] = rawObjs.map((o, i) =>
    validateObjective(o, source, i),
  );

  const moves = expectPosInt(json, 'moves', source);
  const archetype = expectEnum(json, 'archetype', ARCHETYPES, source);
  const seed = expectInt(json, 'seed', source);

  return {
    id,
    width,
    height,
    mask,
    startingLayout,
    dropWeights,
    objectives,
    moves,
    archetype,
    seed,
  };
}

function layoutCellToTile(
  v: unknown,
  i: number,
  source: string,
): Tile | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') {
    if (!TILE_COLORS.includes(v as TileColor)) {
      throw fail(source, `layout[${i}]: unknown color ${v}`);
    }
    return { color: v as TileColor };
  }
  if (isRecord(v)) {
    const tile: Tile = { color: null };
    if (v.color !== undefined) {
      if (v.color === null) tile.color = null;
      else if (typeof v.color === 'string' && TILE_COLORS.includes(v.color as TileColor)) {
        tile.color = v.color as TileColor;
      } else throw fail(source, `layout[${i}].color invalid`);
    }
    if (v.special !== undefined) {
      const s = String(v.special);
      if (!['lineH', 'lineV', 'bomb', 'prism'].includes(s)) {
        throw fail(source, `layout[${i}].special invalid`);
      }
      tile.special = s as Tile['special'];
    }
    if (v.blocker !== undefined) {
      if (!isRecord(v.blocker)) throw fail(source, `layout[${i}].blocker invalid`);
      const kind = v.blocker.kind;
      const layers = v.blocker.layers;
      if (typeof kind !== 'string' || !BLOCKER_KINDS.includes(kind as BlockerKind)) {
        throw fail(source, `layout[${i}].blocker.kind invalid`);
      }
      if (typeof layers !== 'number' || layers <= 0 || !Number.isInteger(layers)) {
        throw fail(source, `layout[${i}].blocker.layers must be positive int`);
      }
      tile.blocker = { kind: kind as BlockerKind, layers };
    }
    return tile;
  }
  throw fail(source, `layout[${i}] must be null | color | object`);
}

function validateObjective(o: unknown, source: string, i: number): Objective {
  if (!isRecord(o)) throw fail(source, `objectives[${i}] not an object`);
  const kind = String(o.kind);
  switch (kind) {
    case 'collectColor':
      return {
        kind: 'collectColor',
        color: expectEnum({ v: o.color }, 'v', TILE_COLORS, source),
        count: expectPosInt({ v: o.count }, 'v', source),
      };
    case 'clearBlockers': {
      const spec: Objective = { kind: 'clearBlockers' };
      if (o.blocker !== undefined) {
        (spec as Extract<Objective, { kind: 'clearBlockers' }>).blocker =
          expectEnum({ v: o.blocker }, 'v', BLOCKER_KINDS, source);
      }
      return spec;
    }
    case 'dropIngredients':
      return {
        kind: 'dropIngredients',
        tile: expectEnum({ v: o.tile }, 'v', TILE_COLORS, source),
        count: expectPosInt({ v: o.count }, 'v', source),
      };
    case 'score':
      return {
        kind: 'score',
        target: expectPosInt({ v: o.target }, 'v', source),
      };
    default:
      throw fail(source, `objectives[${i}].kind unknown: ${kind}`);
  }
}

// helpers
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function expectString(o: Record<string, unknown>, k: string, s: string): string {
  const v = o[k];
  if (typeof v !== 'string' || v.length === 0) throw fail(s, `${k} must be non-empty string`);
  return v;
}
function expectInt(o: Record<string, unknown>, k: string, s: string): number {
  const v = o[k];
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) {
    throw fail(s, `${k} must be integer`);
  }
  return v;
}
function expectPosInt(o: Record<string, unknown>, k: string, s: string): number {
  const v = expectInt(o, k, s);
  if (v <= 0) throw fail(s, `${k} must be positive integer`);
  return v;
}
function expectArray(o: Record<string, unknown>, k: string, s: string): unknown[] {
  const v = o[k];
  if (!Array.isArray(v)) throw fail(s, `${k} must be array`);
  return v;
}
function expectRecord(o: Record<string, unknown>, k: string, s: string): Record<string, unknown> {
  const v = o[k];
  if (!isRecord(v)) throw fail(s, `${k} must be object`);
  return v;
}
function expectEnum<T extends string>(
  o: Record<string, unknown>,
  k: string,
  allowed: readonly T[],
  s: string,
): T {
  const v = o[k];
  if (typeof v !== 'string' || !allowed.includes(v as T)) {
    throw fail(s, `${k} must be one of ${allowed.join('|')} (got ${String(v)})`);
  }
  return v as T;
}
function fail(source: string, msg: string): Error {
  return new Error(`level "${source}": ${msg}`);
}
