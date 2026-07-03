import {
  consumeLife,
  grantLives,
  LIFE_REGEN_MS,
  MAX_LIVES,
  materializeLives,
  msUntilNextLife,
} from '../lives';

const t0 = 1_700_000_000_000;

describe('lives regen', () => {
  test('at max lives, regen is idle', () => {
    const s = { lives: MAX_LIVES, regenAt: null };
    expect(materializeLives(s, t0 + 999999)).toEqual(s);
    expect(msUntilNextLife(s, t0)).toBe(0);
  });

  test('consuming from max schedules regen at now + window', () => {
    const s = consumeLife({ lives: MAX_LIVES, regenAt: null }, t0);
    expect(s.lives).toBe(MAX_LIVES - 1);
    expect(s.regenAt).toBe(t0 + LIFE_REGEN_MS);
  });

  test('materializing across one regen window adds one life', () => {
    const s = consumeLife({ lives: MAX_LIVES, regenAt: null }, t0);
    const proj = materializeLives(s, t0 + LIFE_REGEN_MS);
    expect(proj.lives).toBe(MAX_LIVES);
    expect(proj.regenAt).toBeNull();
  });

  test('materializing across several windows caps at max', () => {
    const s = { lives: 0, regenAt: t0 + LIFE_REGEN_MS };
    const proj = materializeLives(s, t0 + 100 * LIFE_REGEN_MS);
    expect(proj.lives).toBe(MAX_LIVES);
    expect(proj.regenAt).toBeNull();
  });

  test('partial elapse: still not enough for +1 life', () => {
    const s = { lives: 3, regenAt: t0 + LIFE_REGEN_MS };
    const proj = materializeLives(s, t0 + LIFE_REGEN_MS - 1);
    expect(proj.lives).toBe(3);
  });

  test('grantLives from below max advances toward max', () => {
    const s = { lives: 1, regenAt: t0 + LIFE_REGEN_MS };
    const r = grantLives(s, 2, t0);
    expect(r.lives).toBe(3);
    expect(r.regenAt).not.toBeNull();
  });

  test('grantLives to max clears regenAt', () => {
    const s = { lives: 4, regenAt: t0 + LIFE_REGEN_MS };
    const r = grantLives(s, 1, t0);
    expect(r.lives).toBe(MAX_LIVES);
    expect(r.regenAt).toBeNull();
  });

  test('consumeLife at 0 is a no-op', () => {
    const s = { lives: 0, regenAt: t0 + LIFE_REGEN_MS };
    const r = consumeLife(s, t0);
    expect(r.lives).toBe(0);
  });

  test('msUntilNextLife counts down correctly', () => {
    const s = { lives: 2, regenAt: t0 + 5000 };
    expect(msUntilNextLife(s, t0)).toBe(5000);
    expect(msUntilNextLife(s, t0 + 6000)).toBe(0);
  });
});
