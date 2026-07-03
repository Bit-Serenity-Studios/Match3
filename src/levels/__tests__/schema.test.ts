import { validateLevel } from '../schema';

const MIN = {
  id: 'test-01',
  width: 3,
  height: 3,
  dropWeights: { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 },
  objectives: [{ kind: 'score', target: 100 }],
  moves: 10,
  archetype: 'tutorial',
  seed: 1,
};

describe('level schema', () => {
  test('accepts a minimal valid level', () => {
    const lv = validateLevel(MIN);
    expect(lv.id).toBe('test-01');
    expect(lv.width).toBe(3);
    expect(lv.height).toBe(3);
    expect(lv.mask).toHaveLength(9);
    expect(lv.mask.every((v) => v === true)).toBe(true);
  });

  test('rejects unknown archetype', () => {
    expect(() => validateLevel({ ...MIN, archetype: 'bogus' })).toThrow(/archetype/);
  });

  test('rejects missing drop weight', () => {
    const bad = {
      ...MIN,
      dropWeights: { moonpetal: 1, vial: 1, runestone: 1, resin: 1 },
    };
    expect(() => validateLevel(bad)).toThrow(/dropWeights.mushroom/);
  });

  test('rejects mask of wrong length', () => {
    expect(() =>
      validateLevel({ ...MIN, mask: [true, false] }),
    ).toThrow(/mask/);
  });

  test('parses layout with a blocker', () => {
    const layout = new Array(9).fill(null);
    layout[0] = {
      color: 'vial',
      blocker: { kind: 'frostGlass', layers: 1 },
    };
    const lv = validateLevel({ ...MIN, layout });
    expect(lv.startingLayout[0]).toEqual({
      color: 'vial',
      blocker: { kind: 'frostGlass', layers: 1 },
    });
  });

  test('rejects unknown blocker kind', () => {
    const layout = new Array(9).fill(null);
    layout[0] = { color: 'vial', blocker: { kind: 'quicksand', layers: 1 } };
    expect(() => validateLevel({ ...MIN, layout })).toThrow(/blocker.kind/);
  });

  test('rejects objective with unknown kind', () => {
    expect(() =>
      validateLevel({ ...MIN, objectives: [{ kind: 'nope' }] }),
    ).toThrow(/kind unknown/);
  });
});
