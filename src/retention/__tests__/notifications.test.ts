import {
  MockScheduler,
  NOTIFICATION_COPY,
  buildNotification,
  planNotifications,
  shouldSoftAsk,
} from '../notifications';

const T0 = 1_800_000_000_000;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;

describe('notifications', () => {
  test('buildNotification uses static copy', () => {
    const n = buildNotification('streak_at_risk', T0 + HOUR);
    expect(n.title).toBe(NOTIFICATION_COPY.streak_at_risk.title);
    expect(n.body).toBe(NOTIFICATION_COPY.streak_at_risk.body);
    expect(n.id).toContain('streak_at_risk');
  });

  test('id is stable per reason (so reschedule replaces)', () => {
    expect(buildNotification('lives_refilled', T0).id).toBe(
      buildNotification('lives_refilled', T0 + HOUR).id,
    );
  });
});

describe('shouldSoftAsk', () => {
  test('never on first launch', () => {
    expect(
      shouldSoftAsk({
        permission: 'unknown',
        clearedWowLevels: 3,
        hasBeenAsked: false,
        isFirstLaunch: true,
      }),
    ).toBe(false);
  });

  test('only after the first wow level', () => {
    expect(
      shouldSoftAsk({
        permission: 'unknown',
        clearedWowLevels: 0,
        hasBeenAsked: false,
        isFirstLaunch: false,
      }),
    ).toBe(false);
    expect(
      shouldSoftAsk({
        permission: 'unknown',
        clearedWowLevels: 1,
        hasBeenAsked: false,
        isFirstLaunch: false,
      }),
    ).toBe(true);
  });

  test('never asked twice', () => {
    expect(
      shouldSoftAsk({
        permission: 'unknown',
        clearedWowLevels: 5,
        hasBeenAsked: true,
        isFirstLaunch: false,
      }),
    ).toBe(false);
  });

  test('never asked once already granted or denied', () => {
    expect(
      shouldSoftAsk({
        permission: 'granted',
        clearedWowLevels: 5,
        hasBeenAsked: true,
        isFirstLaunch: false,
      }),
    ).toBe(false);
    expect(
      shouldSoftAsk({
        permission: 'denied',
        clearedWowLevels: 5,
        hasBeenAsked: false,
        isFirstLaunch: false,
      }),
    ).toBe(false);
  });
});

describe('planNotifications', () => {
  test('emits only future reasons', () => {
    const plan = planNotifications({
      expeditionEndsAt: T0 + HOUR,
      livesFullAt: T0 - HOUR, // in the past
      streakAtRiskAt: T0 + 2 * HOUR,
      lastActiveAt: T0,
      now: T0,
    });
    const reasons = plan.map((n) => n.reason);
    expect(reasons).toContain('expedition_complete');
    expect(reasons).toContain('streak_at_risk');
    expect(reasons).toContain('lapsed_day3');
    expect(reasons).not.toContain('lives_refilled');
  });

  test('lapsed_day3 fires 3 days after last active', () => {
    const plan = planNotifications({
      expeditionEndsAt: null,
      livesFullAt: null,
      streakAtRiskAt: null,
      lastActiveAt: T0,
      now: T0,
    });
    const lapsed = plan.find((n) => n.reason === 'lapsed_day3');
    expect(lapsed).toBeDefined();
    expect(lapsed!.fireAt).toBe(T0 + 3 * 24 * HOUR);
  });
});

describe('MockScheduler', () => {
  test('schedule/cancel/list roundtrip', async () => {
    const s = new MockScheduler();
    await s.schedule(buildNotification('lives_refilled', T0 + HOUR));
    await s.schedule(buildNotification('streak_at_risk', T0 + 2 * HOUR));
    let list = await s.listScheduled();
    expect(list.length).toBe(2);
    await s.cancel('moonpetal.lives_refilled');
    list = await s.listScheduled();
    expect(list.length).toBe(1);
    await s.cancelAll();
    list = await s.listScheduled();
    expect(list.length).toBe(0);
  });

  test('permission request returns granted', async () => {
    const s = new MockScheduler();
    expect(await s.requestPermission()).toBe('granted');
  });
});
