import { findMatches, hasAnyMatch } from '../match';
import { boardFromRows } from './helpers';
import type { DetectedMatch, TileColor } from '../types';

function matchOf(matches: DetectedMatch[], color: TileColor): DetectedMatch {
  const m = matches.find((x) => x.color === color);
  if (!m) throw new Error(`no ${color} match found`);
  return m;
}

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

  test('detects an L shape (length 5) and marks a bomb', () => {
    // moonpetal: row0 cols0-2 (horizontal 3) + col0 rows0-2 (vertical 3),
    // sharing the corner (0,0) => 5 unique cells, an L.
    const b = boardFromRows([
      'mmmvr',
      'mvsur',
      'mrvsu',
      'suvur',
    ]);
    const m = findMatches(b).find(
      (x) => x.color === 'moonpetal' && x.shape !== 'line',
    );
    expect(m).toBeDefined();
    expect(m!.length).toBe(5);
    expect(m!.special).toBe('bomb');
  });

  test('an L/T of length 6 marks a cross', () => {
    // moonpetal: row0 cols0-3 (horizontal 4) + col0 rows0-2 (vertical 3),
    // sharing the corner (0,0) => 6 unique cells.
    const b = boardFromRows([
      'mmmmv',
      'mvsur',
      'mrvsu',
    ]);
    const m = matchOf(findMatches(b), 'moonpetal');
    expect(m.shape).not.toBe('line');
    expect(m.length).toBe(6);
    expect(m.special).toBe('cross');
  });

  test('an L/T of length 7 marks a nova', () => {
    // horizontal 4 + vertical 4 sharing the corner => 7 unique cells.
    const b = boardFromRows([
      'mmmmv',
      'mvsur',
      'mrvsu',
      'msuvr',
    ]);
    const m = matchOf(findMatches(b), 'moonpetal');
    expect(m.length).toBe(7);
    expect(m.special).toBe('nova');
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
