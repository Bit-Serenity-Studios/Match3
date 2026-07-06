import {
  LIFE_REGEN_MS,
  LIVES_MAX,
  grantLives,
  initLives,
  msUntilNextLife,
  spendLife,
  sync,
} from '../lives';

const T0 = 1_700_000_000_000;

describe('lives', () => {
  test('starts full with no refill timer', () => {
    const s = initLives(T0);
    expect(s.count).toBe(LIVES_MAX);
    expect(s.refillAt).toBe(0);
  });

  test('spending a life starts the regen timer', () => {
    const s = spendLife(initLives(T0), T0);
    expect(s).not.toBeNull();
    expect(s!.count).toBe(LIVES_MAX - 1);
    expect(s!.refillAt).toBe(T0 + LIFE_REGEN_MS);
  });

  test('sync grants accrued lives while app was closed', () => {
    let s = spendLife(initLives(T0), T0)!;
    s = spendLife(s, T0)!;
    s = spendLife(s, T0)!;
    expect(s.count).toBe(2);
    const later = T0 + 2 * LIFE_REGEN_MS + 5000;
    const synced = sync(s, later);
    expect(synced.count).toBe(4);
    expect(synced.refillAt).toBeGreaterThan(later);
  });

  test('sync fills to max and clears the timer', () => {
    let s = spendLife(initLives(T0), T0)!;
    s = spendLife(s, T0)!;
    const much = T0 + LIFE_REGEN_MS * 100;
    const full = sync(s, much);
    expect(full.count).toBe(LIVES_MAX);
    expect(full.refillAt).toBe(0);
  });

  test('spendLife returns null when no lives', () => {
    let s = initLives(T0);
    for (let i = 0; i < LIVES_MAX; i++) {
      s = spendLife(s, T0)!;
    }
    expect(s.count).toBe(0);
    const denied = spendLife(s, T0 + 1000);
    expect(denied).toBeNull();
  });

  test('grantLives caps at max', () => {
    const s = spendLife(initLives(T0), T0)!;
    const g = grantLives(s, 99, T0 + 100);
    expect(g.count).toBe(LIVES_MAX);
    expect(g.refillAt).toBe(0);
  });

  test('msUntilNextLife counts down toward zero', () => {
    const s = spendLife(initLives(T0), T0)!;
    expect(msUntilNextLife(s, T0)).toBeCloseTo(LIFE_REGEN_MS, -2);
    expect(msUntilNextLife(s, T0 + LIFE_REGEN_MS / 2)).toBeCloseTo(LIFE_REGEN_MS / 2, -2);
  });
});
