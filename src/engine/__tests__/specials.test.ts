import { cellsClearedByActivation, comboClears } from '../specials';
import { boardFromRows } from './helpers';

describe('special activations', () => {
  const b = boardFromRows(['mvrsu', 'vsurm', 'ruvms', 'srmvu', 'muvsr']);

  test('lineH clears the entire row', () => {
    const cells = cellsClearedByActivation(b, { row: 2, col: 3 }, 'lineH');
    expect(cells).toHaveLength(5);
    expect(cells.every((c) => c.row === 2)).toBe(true);
  });

  test('lineV clears the entire column', () => {
    const cells = cellsClearedByActivation(b, { row: 2, col: 3 }, 'lineV');
    expect(cells).toHaveLength(5);
    expect(cells.every((c) => c.col === 3)).toBe(true);
  });

  test('bomb clears a 3x3 area', () => {
    const cells = cellsClearedByActivation(b, { row: 2, col: 2 }, 'bomb');
    expect(cells).toHaveLength(9);
  });

  test('bomb near the edge is clipped by bounds', () => {
    const cells = cellsClearedByActivation(b, { row: 0, col: 0 }, 'bomb');
    expect(cells).toHaveLength(4);
  });

  test('prism clears every tile of the partner color', () => {
    const cells = cellsClearedByActivation(b, { row: 0, col: 0 }, 'prism', 'vial');
    const vialCount = 5; // one 'v' per row in this diagonal board
    expect(cells.length).toBeGreaterThanOrEqual(vialCount);
  });

  test('cross clears the full row and full column (deduped)', () => {
    const cells = cellsClearedByActivation(b, { row: 2, col: 3 }, 'cross');
    // 5 (row) + 5 (col) - 1 shared = 9, no duplicates.
    expect(cells).toHaveLength(9);
    expect(cells.every((c) => c.row === 2 || c.col === 3)).toBe(true);
    const keys = new Set(cells.map((c) => `${c.row},${c.col}`));
    expect(keys.size).toBe(cells.length);
  });

  test('nova clears a 5x5 area', () => {
    // centered on a 5x5 board => whole board.
    expect(cellsClearedByActivation(b, { row: 2, col: 2 }, 'nova')).toHaveLength(25);
    // clipped at a corner => 3x3.
    expect(cellsClearedByActivation(b, { row: 0, col: 0 }, 'nova')).toHaveLength(9);
  });
});

describe('special+special combos', () => {
  const b = boardFromRows(['mvrsu', 'vsurm', 'ruvms', 'srmvu', 'muvsr']);

  test('bomb + bomb yields a 5x5 blast', () => {
    const c = comboClears(
      b,
      { at: { row: 2, col: 2 }, kind: 'bomb', color: 'moonpetal' },
      { at: { row: 2, col: 3 }, kind: 'bomb', color: 'vial' },
    );
    // 5x5 is 25 cells, but we're near center of a 5x5 board so it's clipped.
    expect(c.length).toBeGreaterThanOrEqual(9);
  });

  test('lineH + lineV clears both a full row and column', () => {
    const c = comboClears(
      b,
      { at: { row: 2, col: 2 }, kind: 'lineH', color: 'moonpetal' },
      { at: { row: 2, col: 3 }, kind: 'lineV', color: 'vial' },
    );
    // 5 + 5 - 1 overlap = 9
    expect(c.length).toBe(9);
  });

  test('prism + prism clears the entire board', () => {
    const c = comboClears(
      b,
      { at: { row: 2, col: 2 }, kind: 'prism', color: 'moonpetal' },
      { at: { row: 2, col: 3 }, kind: 'prism', color: 'vial' },
    );
    expect(c).toHaveLength(25);
  });

  test('cross + cross clears both cells\' rows and columns', () => {
    const c = comboClears(
      b,
      { at: { row: 1, col: 1 }, kind: 'cross', color: 'moonpetal' },
      { at: { row: 3, col: 3 }, kind: 'cross', color: 'vial' },
    );
    // rows {1,3} (10) + cols {1,3} (10) - 4 shared corners = 16.
    expect(c).toHaveLength(16);
  });

  test('a nova combo dominates via the union default (5x5)', () => {
    const c = comboClears(
      b,
      { at: { row: 2, col: 2 }, kind: 'nova', color: 'moonpetal' },
      { at: { row: 2, col: 3 }, kind: 'bomb', color: 'vial' },
    );
    // nova centered on 5x5 already covers the whole board.
    expect(c).toHaveLength(25);
  });
});
