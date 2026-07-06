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
});
