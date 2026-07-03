import { addXp, currentPassive, evolve, xpProgress } from '../progression';
import { getCompanion } from '../catalog';
import { ownFresh } from '../gacha';

const now = 1720000000000;

describe('progression', () => {
  test('addXp levels up when threshold reached', () => {
    const o = ownFresh('lumen-moth', now);
    const def = getCompanion('lumen-moth')!;
    const need = def.xpCurve[0]!;
    const r = addXp(o, need);
    expect(r.level).toBe(2);
    expect(r.xp).toBe(0);
  });

  test('addXp cascades level-ups when large XP given', () => {
    const o = ownFresh('lumen-moth', now);
    const def = getCompanion('lumen-moth')!;
    const total = def.xpCurve.reduce((a, b) => a + b, 0);
    const r = addXp(o, total);
    expect(r.level).toBe(def.xpCurve.length + 1);
  });

  test('addXp caps xp at 0 when at max level', () => {
    const o = ownFresh('lumen-moth', now);
    const def = getCompanion('lumen-moth')!;
    const overshoot = def.xpCurve.reduce((a, b) => a + b, 0) + 500;
    const r = addXp(o, overshoot);
    expect(r.level).toBe(def.xpCurve.length + 1);
    expect(r.xp).toBe(0);
  });

  test('evolve requires the level threshold', () => {
    let o = ownFresh('lumen-moth', now);
    o = { ...o, shards: 100 };
    const r = evolve(o);
    expect(r.evolved).toBe(false);
    expect(r.reason).toBe('levelTooLow');
  });

  test('evolve requires shards', () => {
    let o = ownFresh('lumen-moth', now);
    o = { ...o, level: 5, shards: 0 };
    const r = evolve(o);
    expect(r.evolved).toBe(false);
    expect(r.reason).toBe('notEnoughShards');
  });

  test('evolve succeeds when both requirements met', () => {
    let o = ownFresh('lumen-moth', now);
    o = { ...o, level: 5, shards: 8 };
    const r = evolve(o);
    expect(r.evolved).toBe(true);
    expect(r.owned.tier).toBe(2);
    expect(r.owned.shards).toBe(0);
  });

  test('evolve refuses past max tier', () => {
    let o = ownFresh('lumen-moth', now);
    o = { ...o, level: 10, tier: 3, shards: 100 };
    const r = evolve(o);
    expect(r.evolved).toBe(false);
    expect(r.reason).toBe('maxTier');
  });

  test('currentPassive reflects tier', () => {
    const o = ownFresh('lumen-moth', now);
    const def = getCompanion('lumen-moth')!;
    expect(currentPassive({ ...o, tier: 1 }, def)).toEqual(def.passives[0]);
    expect(currentPassive({ ...o, tier: 2 }, def)).toEqual(def.passives[1]);
    expect(currentPassive({ ...o, tier: 3 }, def)).toEqual(def.passives[2]);
  });

  test('xpProgress reports fraction toward next level', () => {
    const o = ownFresh('lumen-moth', now);
    const def = getCompanion('lumen-moth')!;
    const halfway = Math.floor(def.xpCurve[0]! / 2);
    const p = xpProgress(addXp(o, halfway));
    expect(p.fraction).toBeGreaterThan(0.4);
    expect(p.fraction).toBeLessThan(0.6);
  });
});
