import type { LevelDef } from '../engine/types';
import { validateLevel } from './schema';
import { LEVEL_JSONS } from './generated';
import { generateEndlessLevel } from './endless';

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

/** Return level i if it exists (authored or procedurally generated).
 *  Past the 60 authored levels we generate endless levels deterministically
 *  from the index so play stretches on forever with slowly rising
 *  difficulty. Never returns null for i >= 0. */
export function getLevelByIndex(i: number): LevelDef | null {
  if (i < 0) return null;
  const authored = LEVELS[i];
  if (authored) return authored;
  return generateEndlessLevel(i, LEVELS.length);
}

/** Is this campaign index served by the endless generator? */
export function isEndlessIndex(i: number): boolean {
  return i >= LEVELS.length;
}

export function levelIndex(id: string): number {
  return LEVELS.findIndex((l) => l.id === id);
}
