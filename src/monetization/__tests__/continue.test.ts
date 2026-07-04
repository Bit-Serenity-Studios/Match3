import { CONTINUE_PRICE_GEMS, priceForContinue, summarizeFail } from '../continue';
import type { GameState } from '../../engine/types';

const state = (patch: Partial<GameState>): GameState =>
  ({
    levelId: 'level-042',
    board: {
      width: 6,
      height: 7,
      mask: [],
      tiles: [],
      rngState: 1,
      ivyStepsSinceSpread: 0,
    },
    movesRemaining: 0,
    score: 5000,
    progress: [],
    status: 'lost',
    difficultyMod: 0,
    objectives: [],
    dropWeights: { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 },
    turn: 24,
    ...patch,
  }) as GameState;

describe('continue pricing', () => {
  test('escalates strictly monotonically then caps', () => {
    let prev = 0;
    for (let i = 0; i < 10; i++) {
      const p = priceForContinue(i);
      if (i < CONTINUE_PRICE_GEMS.length) expect(p).toBeGreaterThanOrEqual(prev);
      prev = p;
    }
    // beyond max index, price is the last tier
    expect(priceForContinue(99)).toBe(CONTINUE_PRICE_GEMS[CONTINUE_PRICE_GEMS.length - 1]);
    expect(priceForContinue(-1)).toBe(CONTINUE_PRICE_GEMS[0]);
  });
});

describe('summarizeFail', () => {
  test('reports remaining per unfinished objective', () => {
    const s = state({
      objectives: [
        { kind: 'collectColor', color: 'vial', count: 20 },
        { kind: 'collectColor', color: 'moonpetal', count: 10 },
      ],
      progress: [
        { progress: 18, target: 20, done: false },
        { progress: 10, target: 10, done: true },
      ],
    });
    const summary = summarizeFail(s, (i) => `obj-${i}`);
    expect(summary.levelId).toBe('level-042');
    expect(summary.remainingByObjective).toEqual([{ label: 'obj-0', needed: 2 }]);
    expect(summary.totalStillNeeded).toBe(2);
  });

  test('empty when all objectives done', () => {
    const s = state({
      objectives: [{ kind: 'collectColor', color: 'vial', count: 10 }],
      progress: [{ progress: 10, target: 10, done: true }],
    });
    expect(summarizeFail(s, () => 'x').totalStillNeeded).toBe(0);
  });
});
