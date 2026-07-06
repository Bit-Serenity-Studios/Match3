import { applySwap, newGame, serialize, deserialize } from '../engine';
import { hasAnyMatch } from '../match';
import { level } from './helpers';

describe('engine.newGame', () => {
  test('starting board has no active matches and has a valid move', () => {
    const lv = level(
      // Only 2-in-a-rows here; the fillEmptyCells will not run because no '.'.
      // The engine also invokes reshuffle if starting has a match.
      ['mvrsu', 'vrsum', 'rsumv', 'sumvr', 'umvrs'],
      { objectives: [{ kind: 'score', target: 100 }], moves: 10 },
    );
    const g = newGame(lv);
    expect(hasAnyMatch(g.board)).toBe(false);
    expect(g.status).toBe('active');
    expect(g.movesRemaining).toBe(10);
  });

  test('same seed produces identical initial state', () => {
    const lv1 = level(['....', '....', '....', '....'], {
      objectives: [{ kind: 'score', target: 100 }],
      moves: 5,
      seed: 7,
    });
    const lv2 = level(['....', '....', '....', '....'], {
      objectives: [{ kind: 'score', target: 100 }],
      moves: 5,
      seed: 7,
    });
    const a = newGame(lv1);
    const b = newGame(lv2);
    expect(a.board.tiles).toEqual(b.board.tiles);
    expect(a.board.rngState).toBe(b.board.rngState);
  });
});

describe('engine.applySwap', () => {
  test('rejects non-adjacent swaps', () => {
    const lv = level(['mvrsu', 'vrsum', 'rsumv', 'sumvr', 'umvrs'], {
      objectives: [{ kind: 'score', target: 100 }],
      moves: 5,
    });
    const g = newGame(lv);
    const r = applySwap(g, { row: 0, col: 0 }, { row: 2, col: 2 });
    expect(r.accepted).toBe(false);
    expect(r.next.movesRemaining).toBe(5);
  });

  test('rejects swaps that produce no match', () => {
    // A board with no adjacent pair that produces a match is easy to reject.
    const lv = level(['mvrsu', 'vrsum', 'rsumv', 'sumvr', 'umvrs'], {
      objectives: [{ kind: 'score', target: 100 }],
      moves: 5,
    });
    const g = newGame(lv);
    // (0,0)=m, (0,1)=v — swap produces (0,0)=v, (0,1)=m. Board becomes vmrsu / vrsum ...
    // No 3-in-a-row expected in this pattern.
    const r = applySwap(g, { row: 1, col: 0 }, { row: 1, col: 1 });
    expect(r.accepted).toBe(false);
  });

  test('accepts a swap that creates a match-3 and decrements moves', () => {
    // Board where swapping (0,0)<->(0,1) creates a match:
    // Row 0: 'vmvrs' -> swap (0,0)&(0,1) -> 'mvvrs' (no match)
    // Design one carefully:
    // Column-3 matches: place three 'm' in column 0 rows 0,1,2 by swapping row 0 col 0/1.
    // Row 0: 'vm...' Row 1: 'm....' Row 2: 'm....'  Swap (0,0)<->(0,1) -> col 0 becomes m,m,m.
    const lv = level(
      ['mvrsu', 'vmrsu', 'mrsuv', 'svumr', 'urvsm'],
      { objectives: [{ kind: 'collectColor', color: 'moonpetal', count: 3 }], moves: 5 },
    );
    const g = newGame(lv);
    const r = applySwap(g, { row: 1, col: 0 }, { row: 1, col: 1 });
    expect(r.accepted).toBe(true);
    expect(r.next.movesRemaining).toBe(4);
    expect(r.events.some((e) => e.t === 'match')).toBe(true);
    // gravity event may or may not fire (depends on whether tiles fell); refill always does when cells clear.
    expect(r.events.some((e) => e.t === 'refill')).toBe(true);
    expect(r.events.some((e) => e.t === 'clear')).toBe(true);
    expect(r.next.score).toBeGreaterThan(0);
  });

  test('collectColor objective progresses on matched tiles', () => {
    const lv = level(
      ['mvrsu', 'vmrsu', 'mrsuv', 'svumr', 'urvsm'],
      { objectives: [{ kind: 'collectColor', color: 'moonpetal', count: 3 }], moves: 5 },
    );
    const g = newGame(lv);
    const r = applySwap(g, { row: 1, col: 0 }, { row: 1, col: 1 });
    expect(r.next.progress[0]!.progress).toBeGreaterThanOrEqual(3);
    expect(r.next.progress[0]!.done).toBe(true);
    expect(r.next.status).toBe('won');
  });
});

describe('engine determinism', () => {
  test('identical swap sequences produce identical event streams', () => {
    const lv = level(
      ['mvrsu', 'vmrsu', 'mrsuv', 'svumr', 'urvsm'],
      { objectives: [{ kind: 'score', target: 999999 }], moves: 5, seed: 4321 },
    );
    const a = newGame(lv);
    const b = newGame(lv);
    const ra = applySwap(a, { row: 0, col: 0 }, { row: 0, col: 1 });
    const rb = applySwap(b, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(ra.events.length).toBe(rb.events.length);
    for (let i = 0; i < ra.events.length; i++) {
      expect(ra.events[i]).toEqual(rb.events[i]);
    }
    expect(ra.next.board.tiles).toEqual(rb.next.board.tiles);
    expect(ra.next.board.rngState).toBe(rb.next.board.rngState);
    expect(ra.next.score).toBe(rb.next.score);
  });

  test('serialize/deserialize round-trip', () => {
    const lv = level(
      ['mvrsu', 'vmrsu', 'mrsuv', 'svumr', 'urvsm'],
      { objectives: [{ kind: 'score', target: 999999 }], moves: 5 },
    );
    const g = newGame(lv);
    const s = serialize(g);
    const g2 = deserialize(s);
    expect(g2).toEqual(g);
  });
});
