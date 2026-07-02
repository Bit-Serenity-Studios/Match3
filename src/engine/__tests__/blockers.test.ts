import { applyBlockerDamage } from '../blockers';
import { boardFromRows } from './helpers';
import type { Tile } from '../types';
import { getTile, setTile } from '../board';

function withBlocker(
  b: ReturnType<typeof boardFromRows>,
  row: number,
  col: number,
  tile: Tile,
) {
  return setTile(b, { row, col }, tile);
}

describe('blockers', () => {
  test('vine adjacent to a clear loses one layer', () => {
    let b = boardFromRows(['mvrsu', 'vsurm', 'ruvms']);
    // place a vine at (1,1)
    b = withBlocker(b, 1, 1, {
      color: 'vial',
      blocker: { kind: 'vine', layers: 2 },
    });
    const { board, events } = applyBlockerDamage(
      b,
      [{ row: 0, col: 1 }],
      [],
    );
    const t = getTile(board, { row: 1, col: 1 })!;
    expect(t.blocker?.layers).toBe(1);
    expect(events.find((e) => e.t === 'blockerHit')).toBeTruthy();
  });

  test('vine adjacent to two clears in one step only takes 1 damage', () => {
    let b = boardFromRows(['mvrsu', 'vsurm', 'ruvms']);
    b = withBlocker(b, 1, 1, {
      color: 'vial',
      blocker: { kind: 'vine', layers: 2 },
    });
    const { board } = applyBlockerDamage(
      b,
      [
        { row: 0, col: 1 },
        { row: 1, col: 0 },
      ],
      [],
    );
    // Only one damage even though multiple neighbors were cleared.
    expect(getTile(board, { row: 1, col: 1 })!.blocker!.layers).toBe(1);
  });

  test('frost glass takes a direct hit and unlocks the tile', () => {
    let b = boardFromRows(['mvrsu', 'vsurm', 'ruvms']);
    b = withBlocker(b, 1, 1, {
      color: 'vial',
      blocker: { kind: 'frostGlass', layers: 1 },
    });
    const { board } = applyBlockerDamage(b, [{ row: 1, col: 1 }], []);
    const t = getTile(board, { row: 1, col: 1 })!;
    expect(t.blocker).toBeUndefined();
    expect(t.color).toBe('vial');
  });

  test('stone rune only takes damage from adjacent blasts', () => {
    let b = boardFromRows(['mvrsu', 'vsurm', 'ruvms']);
    b = withBlocker(b, 1, 1, {
      color: null,
      blocker: { kind: 'stoneRune', layers: 1 },
    });
    // Direct hits shouldn't count (adjacent-only), but blast should.
    const { board: b1 } = applyBlockerDamage(b, [], [{ row: 0, col: 1 }]);
    expect(getTile(b1, { row: 1, col: 1 })).toBeNull();
  });
});
