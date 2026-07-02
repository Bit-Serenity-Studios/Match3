import type { LevelDef } from '../engine/types';

/** A hand-authored tutorial level to get the player into the first cascade
 *  immediately on first launch. Deterministic seed. */
export const tutorial01: LevelDef = {
  id: 'tutorial-01',
  width: 7,
  height: 8,
  mask: new Array(7 * 8).fill(true),
  startingLayout: new Array(7 * 8).fill(null),
  dropWeights: {
    moonpetal: 1,
    vial: 1,
    runestone: 1,
    resin: 1,
    mushroom: 1,
  },
  objectives: [
    { kind: 'collectColor', color: 'moonpetal', count: 20 },
  ],
  moves: 25,
  archetype: 'tutorial',
  seed: 20260702,
};
