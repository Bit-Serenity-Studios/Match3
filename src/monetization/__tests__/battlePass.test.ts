import {
  CHALLENGES,
  PASS_LEVELS,
  PASS_REWARDS,
  SEASON_ANCHOR_MS,
  SEASON_LENGTH_MS,
  XP_PER_LEVEL,
  claimReward,
  initPass,
  passLevelFor,
  progressChallenge,
  rolloverIfNeeded,
  seasonIdFor,
  seasonWindow,
  unlockPremium,
} from '../battlePass';

describe('battle pass', () => {
  test('season id is a monotonic function of time', () => {
    const s0 = seasonIdFor(SEASON_ANCHOR_MS);
    const s1 = seasonIdFor(SEASON_ANCHOR_MS + SEASON_LENGTH_MS + 1);
    expect(s1).toBeGreaterThan(s0);
    const w = seasonWindow(s0);
    expect(w.startsAt).toBe(SEASON_ANCHOR_MS);
    expect(w.endsAt - w.startsAt).toBe(SEASON_LENGTH_MS);
  });

  test('rolloverIfNeeded refreshes state on season change', () => {
    const oldState = initPass(0);
    const t = SEASON_ANCHOR_MS + SEASON_LENGTH_MS * 5;
    const rolled = rolloverIfNeeded(oldState, t);
    expect(rolled.seasonId).toBe(seasonIdFor(t));
    expect(rolled.xp).toBe(0);
    expect(rolled.premiumUnlocked).toBe(false);
  });

  test('progressChallenge accumulates and unlocks XP on completion', () => {
    const daily = CHALLENGES.find((c) => c.id === 'daily.win3')!;
    let s = initPass(0);
    for (let i = 0; i < daily.target; i++) {
      s = progressChallenge(s, daily.id, 1);
    }
    expect(s.challengesCompleted).toContain(daily.id);
    expect(s.xp).toBe(daily.xp);
  });

  test('progressChallenge is idempotent past the target', () => {
    const daily = CHALLENGES.find((c) => c.id === 'daily.win3')!;
    let s = initPass(0);
    s = progressChallenge(s, daily.id, daily.target + 5);
    const beforeXp = s.xp;
    s = progressChallenge(s, daily.id, 5);
    expect(s.xp).toBe(beforeXp);
  });

  test('passLevelFor floors xp/100 + 1 with cap', () => {
    expect(passLevelFor(0)).toBe(1);
    expect(passLevelFor(XP_PER_LEVEL)).toBe(2);
    expect(passLevelFor(XP_PER_LEVEL * (PASS_LEVELS + 10))).toBe(PASS_LEVELS);
  });

  test('claimReward returns null until level is reached', () => {
    let s = initPass(0);
    expect(claimReward(s, 'free', 2)).toBeNull();
    s = { ...s, xp: 300 }; // level 4
    const ok = claimReward(s, 'free', 2);
    expect(ok).not.toBeNull();
    // second claim of same level is rejected
    expect(claimReward(ok!.next, 'free', 2)).toBeNull();
  });

  test('premium track requires unlock', () => {
    let s = { ...initPass(0), xp: 500 };
    expect(claimReward(s, 'premium', 2)).toBeNull();
    s = unlockPremium(s);
    expect(claimReward(s, 'premium', 2)).not.toBeNull();
  });

  test('PASS_REWARDS has exactly PASS_LEVELS entries', () => {
    expect(PASS_REWARDS.length).toBe(PASS_LEVELS);
    expect(PASS_REWARDS[0]?.level).toBe(1);
  });
});
