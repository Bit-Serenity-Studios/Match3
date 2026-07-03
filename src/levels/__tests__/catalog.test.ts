import { LEVELS, getLevel } from '../catalog';
import { newGame } from '../../engine/engine';

describe('level catalog', () => {
  test('loads exactly 60 levels and validates each', () => {
    expect(LEVELS).toHaveLength(60);
  });

  test('levels are id-sorted and unique', () => {
    const ids = LEVELS.map((l) => l.id);
    const sorted = [...ids].sort((a, b) => a.localeCompare(b));
    expect(ids).toEqual(sorted);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('archetype pacing: 1..5 tutorial; hard checkpoints at expected indices', () => {
    for (let i = 0; i < 5; i++) {
      expect(LEVELS[i]!.archetype).toBe('tutorial');
    }
    const hardIndices = LEVELS.map((l, i) => ({ i, a: l.archetype }))
      .filter((x) => x.a === 'hard')
      .map((x) => x.i + 1);
    // We author 6 hard checkpoints.
    expect(hardIndices).toHaveLength(6);
    // Roughly every 8-10 levels apart.
    for (let k = 1; k < hardIndices.length; k++) {
      const gap = hardIndices[k]! - hardIndices[k - 1]!;
      expect(gap).toBeGreaterThanOrEqual(7);
      expect(gap).toBeLessThanOrEqual(11);
    }
  });

  test('every level can newGame() without throwing', () => {
    for (const lv of LEVELS) {
      const g = newGame(lv);
      expect(g.status).toBe('active');
      expect(g.movesRemaining).toBe(lv.moves);
      expect(g.progress).toHaveLength(lv.objectives.length);
    }
  });

  test('getLevel returns null for unknown id', () => {
    expect(getLevel('does-not-exist')).toBeNull();
    expect(getLevel('level-001')).not.toBeNull();
  });
});
