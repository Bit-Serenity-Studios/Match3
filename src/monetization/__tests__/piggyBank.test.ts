import { PIGGY_MAX_GEMS, crack, drip, initPiggy, isFull } from '../piggyBank';

describe('piggy bank', () => {
  test('starts empty', () => {
    expect(initPiggy().gems).toBe(0);
    expect(initPiggy().totalEverEarned).toBe(0);
  });

  test('drip adds up to cap and increments total-ever', () => {
    let p = initPiggy();
    for (let i = 0; i < 20; i++) p = drip(p, 20);
    expect(p.gems).toBe(PIGGY_MAX_GEMS);
    // total-ever counts only what actually landed inside the cap
    expect(p.totalEverEarned).toBe(PIGGY_MAX_GEMS);
    expect(isFull(p)).toBe(true);
  });

  test('drip ignores zero/negative', () => {
    let p = drip(initPiggy(), 0);
    p = drip(p, -5);
    expect(p.gems).toBe(0);
  });

  test('crack pays out the balance and starts a new cycle', () => {
    let p = drip(drip(drip(initPiggy(), 10), 15), 20);
    const before = p.gems;
    const r = crack(p);
    expect(r.grantGems).toBe(before);
    expect(r.next.gems).toBe(0);
    expect(r.next.cycleId).toBe(p.cycleId + 1);
    expect(r.next.totalEverEarned).toBe(p.totalEverEarned);
  });
});
