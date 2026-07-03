import type { LevelDef } from '../engine/types';
import { validateLevel } from './schema';
import { LEVEL_JSONS } from './generated';

/**
 * Loads and validates every level in the catalog exactly once. Sorted by id
 * (level-001, level-002, ...). Exported as a frozen array so callers can't
 * accidentally mutate.
 */
function sourceOf(json: unknown): string {
  if (typeof json === 'object' && json !== null && 'id' in json) {
    const id = (json as { id?: unknown }).id;
    if (typeof id === 'string') return id;
  }
  return '<unknown>';
}

export const LEVELS: readonly LevelDef[] = Object.freeze(
  LEVEL_JSONS.map((json) => validateLevel(json, sourceOf(json))).sort(
    (a, b) => a.id.localeCompare(b.id),
  ),
);

export function getLevel(id: string): LevelDef | null {
  return LEVELS.find((l) => l.id === id) ?? null;
}

export function getLevelByIndex(i: number): LevelDef | null {
  return LEVELS[i] ?? null;
}

export function levelIndex(id: string): number {
  return LEVELS.findIndex((l) => l.id === id);
}
