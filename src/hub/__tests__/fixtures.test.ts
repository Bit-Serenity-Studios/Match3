import { computeFixtureBonuses, upgradeCost } from '../fixtures';

describe('hub fixtures', () => {
  test('upgradeCost from level 0 returns unlock cost', () => {
    expect(upgradeCost('cauldron', 0)).toBe(200);
  });

  test('upgradeCost from max returns null', () => {
    expect(upgradeCost('cauldron', 3)).toBeNull();
  });

  test('no fixtures → no bonuses', () => {
    expect(computeFixtureBonuses({})).toEqual({
      coinBonusPct: 0,
      emberBonusPct: 0,
      expeditionSpeedupPct: 0,
    });
  });

  test('fully upgraded → sum of top-tier effects', () => {
    const b = computeFixtureBonuses({
      cauldron: 3,
      herbWall: 3,
      teaCorner: 3,
    });
    expect(b.emberBonusPct).toBe(50);
    expect(b.coinBonusPct).toBe(50);
    expect(b.expeditionSpeedupPct).toBe(20);
  });
});
