import { generateEndlessLevel, ENDLESS_TUNING } from '../endless';
import { LEVELS, getLevelByIndex, isEndlessIndex } from '../catalog';
import { newGame, applySwap } from '../../engine/engine';

describe('endless level generation', () => {
  test('deterministic given the same index', () => {
    const a = generateEndlessLevel(65, LEVELS.length);
    const b = generateEndlessLevel(65, LEVELS.length);
    expect(a).toEqual(b);
  });

  test('changes across indices', () => {
    const a = generateEndlessLevel(70, LEVELS.length);
    const b = generateEndlessLevel(71, LEVELS.length);
    expect(a.id).not.toBe(b.id);
    expect(a.seed).not.toBe(b.seed);
  });

  test('id follows endless-#### format', () => {
    expect(generateEndlessLevel(70, LEVELS.length).id).toBe('endless-0071');
    expect(generateEndlessLevel(120, LEVELS.length).id).toBe('endless-0121');
  });

  test('move budget floor honored', () => {
    for (let i = LEVELS.length; i < LEVELS.length + 500; i += 25) {
      const lv = generateEndlessLevel(i, LEVELS.length);
      expect(lv.moves).toBeGreaterThanOrEqual(ENDLESS_TUNING.minMoves);
    }
  });

  test('primary collect objective scales with rank', () => {
    const early = generateEndlessLevel(LEVELS.length, LEVELS.length);
    const later = generateEndlessLevel(LEVELS.length + 100, LEVELS.length);
    const earlyCollect = early.objectives.find((o) => o.kind === 'collectColor');
    const laterCollect = later.objectives.find((o) => o.kind === 'collectColor');
    expect(earlyCollect?.kind).toBe('collectColor');
    expect(laterCollect?.kind).toBe('collectColor');
    if (earlyCollect?.kind === 'collectColor' && laterCollect?.kind === 'collectColor') {
      expect(laterCollect.count).toBeGreaterThan(earlyCollect.count);
    }
  });

  test('score sub-objective appears past the gate rank', () => {
    const before = generateEndlessLevel(
      LEVELS.length + ENDLESS_TUNING.scoreGateStartsAtRank - 2,
      LEVELS.length,
    );
    const after = generateEndlessLevel(
      LEVELS.length + ENDLESS_TUNING.scoreGateStartsAtRank + 5,
      LEVELS.length,
    );
    expect(before.objectives.some((o) => o.kind === 'score')).toBe(false);
    expect(after.objectives.some((o) => o.kind === 'score')).toBe(true);
  });

  test('board is playable by the engine (no immediate crash)', () => {
    const lv = generateEndlessLevel(LEVELS.length + 50, LEVELS.length);
    const g = newGame(lv);
    // Just prove the engine can step against the board.
    const swap = applySwap(g, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(swap).toBeDefined();
  });

  test('catalog falls through to endless past authored count', () => {
    expect(isEndlessIndex(LEVELS.length - 1)).toBe(false);
    expect(isEndlessIndex(LEVELS.length)).toBe(true);
    expect(getLevelByIndex(LEVELS.length + 30)?.id).toBe(
      `endless-${String(LEVELS.length + 31).padStart(4, '0')}`,
    );
  });
});
