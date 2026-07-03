import { rewardsFor } from '../rewards';
import type { GameState } from '../../engine/types';

const baseState = (patch: Partial<GameState>): GameState =>
  ({
    levelId: 'test',
    board: {
      width: 1,
      height: 1,
      mask: [true],
      tiles: [null],
      rngState: 1,
      ivyStepsSinceSpread: 0,
    },
    movesRemaining: 5,
    score: 0,
    progress: [],
    status: 'active',
    difficultyMod: 0,
    objectives: [],
    dropWeights: {
      moonpetal: 1,
      vial: 1,
      runestone: 1,
      resin: 1,
      mushroom: 1,
    },
    turn: 0,
    ...patch,
  }) as GameState;

describe('level-win rewards', () => {
  test('loss awards nothing', () => {
    expect(rewardsFor(baseState({ status: 'lost', score: 9999 }))).toEqual({
      coins: 0,
      embers: 0,
      xp: 0,
    });
  });

  test('a modest win awards positive rewards', () => {
    const r = rewardsFor(baseState({ status: 'won', score: 1500, turn: 6 }));
    expect(r.coins).toBeGreaterThan(0);
    expect(r.embers).toBeGreaterThanOrEqual(1);
    expect(r.xp).toBeGreaterThan(0);
  });

  test('higher score scales up rewards', () => {
    const low = rewardsFor(baseState({ status: 'won', score: 1000, turn: 4 }));
    const high = rewardsFor(baseState({ status: 'won', score: 8000, turn: 12 }));
    expect(high.coins).toBeGreaterThan(low.coins);
    expect(high.xp).toBeGreaterThan(low.xp);
    expect(high.embers).toBeGreaterThan(low.embers);
  });
});
