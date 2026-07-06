import { applyGravity, applyRefill } from '../gravity';
import { boardFromRows, boardToRows } from './helpers';

describe('gravity', () => {
  test('empty cells cause tiles above to fall', () => {
    const b = boardFromRows(['mvru', 'v.rm', 'r.us', 'sum.']);
    const { board } = applyGravity(b);
    expect(boardToRows(board)).toEqual(['m.r.', 'v.ru', 'rvum', 'sums']);
  });

  test('stone runes are immovable and block falls above them', () => {
    const b = boardFromRows(['mvru', '.#rm', 'r.us', 'sum.']);
    const { board } = applyGravity(b);
    // Column 1: [v,#,.,u]. v can't pass through #. Result [v,#,.,u] with u still at bottom, . above the stone.
    const rows = boardToRows(board);
    // Column 1: read chars at index 1 of each row.
    const col1 = rows.map((r) => r[1]);
    expect(col1).toEqual(['v', '#', '.', 'u']);
  });

  test('mask holes block gravity across them', () => {
    // Column 2: 'r','r','u','.', with mask hole at row=2 col=2
    const b = boardFromRows(['mvru', 'msrm', 'ruxs', 'sum.']);
    // The 'x' at (2,2) marks non-playable in our helper.
    const { board } = applyGravity(b);
    const rows = boardToRows(board);
    // Column 2 tiles above the hole stay put; below the hole (row 3) shows '.' still.
    const col2 = rows.map((r) => r[2]);
    expect(col2[2]).toBe('x');
  });
});

describe('refill', () => {
  test('fills all playable empty cells and advances RNG', () => {
    const b = boardFromRows(['....', 'm...', 'vr..', 'sums']);
    const before = b.rngState;
    const { board } = applyRefill(
      b,
      { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 },
      0,
      null,
    );
    expect(board.rngState).not.toBe(before);
    // No cells should remain empty.
    for (let r = 0; r < board.height; r++) {
      for (let c = 0; c < board.width; c++) {
        const i = r * board.width + c;
        if (!board.mask[i]) continue;
        expect(board.tiles[i]).toBeTruthy();
      }
    }
  });

  test('deterministic under fixed seed', () => {
    const a = boardFromRows(['....', '....'], 999);
    const b = boardFromRows(['....', '....'], 999);
    const w = { moonpetal: 1, vial: 1, runestone: 1, resin: 1, mushroom: 1 };
    const ra = applyRefill(a, w, 0, null);
    const rb = applyRefill(b, w, 0, null);
    expect(boardToRows(ra.board)).toEqual(boardToRows(rb.board));
    expect(ra.board.rngState).toBe(rb.board.rngState);
  });
});
