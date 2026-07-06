import { findMatches, hasAnyMatch } from '../match';
import { boardFromRows } from './helpers';

describe('match detection', () => {
  test('detects a horizontal match-3', () => {
    const b = boardFromRows([
      'mmmvr',
      'vsurv',
      'ruvms',
      'smvur',
    ]);
    const matches = findMatches(b);
    expect(matches).toHaveLength(1);
    const m = matches[0]!;
    expect(m.length).toBe(3);
    expect(m.color).toBe('moonpetal');
    expect(m.shape).toBe('line');
    expect(m.special).toBeUndefined();
  });

  test('detects a vertical match-4 and marks a lineH special', () => {
    const b = boardFromRows([
      'vsurv',
      'vmvms',
      'vurvm',
      'vsvru',
      'muvsm',
    ]);
    const matches = findMatches(b);
    const vial = matches.find((m) => m.color === 'vial')!;
    expect(vial.length).toBe(4);
    expect(vial.shape).toBe('line');
    expect(vial.special).toBe('lineH');
  });

  test('detects a match-5 and marks a prism', () => {
    const b = boardFromRows([
      'rrrrrv',
      'vsumsv',
      'msvurs',
    ]);
    const matches = findMatches(b);
    const run = matches.find((m) => m.color === 'runestone')!;
    expect(run.length).toBe(5);
    expect(run.special).toBe('prism');
  });

  test('detects an L shape and marks a bomb', () => {
    const b = boardFromRows([
      'mmmvr',
      'vmurv',
      'rmvms',
      'smvur',
    ]);
    // moonpetals: (0,0)(0,1)(0,2) horizontal + (0,0)(1,0)(2,0)? No, (1,0)=v not m.
    // Redesign: L at top-left
    const b2 = boardFromRows([
      'mmmvr',
      'muvrv',
      'muurs',
      'muvur',
    ]);
    const matches = findMatches(b2);
    const m = matches.find((x) => x.color === 'moonpetal' && x.shape !== 'line');
    expect(m).toBeDefined();
    expect(m!.length).toBeGreaterThanOrEqual(5);
    expect(m!.special).toBe('bomb');
  });

  test('hasAnyMatch returns false on a match-free board', () => {
    const b = boardFromRows([
      'mvrsu',
      'vrsum',
      'rsumv',
      'sumvr',
    ]);
    expect(hasAnyMatch(b)).toBe(false);
  });
});
