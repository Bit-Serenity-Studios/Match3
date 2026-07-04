/**
 * Local push-notification manager. Never a real remote push — everything
 * is scheduled with the OS via a NotificationScheduler adapter. Ships
 * with a `MockScheduler` used in dev/test.
 *
 * Consent model:
 *   - `permission` is one of: `unknown` (initial), `granted`, `denied`
 *   - Soft-ask prompt fires exactly once after the first "wow" level
 *     (never on first launch)
 *   - `soft_asked_at` prevents multiple prompts
 *   - When granted, we schedule the four supported reasons.
 *
 * All notification bodies are static — no dynamic strings from external
 * sources, so nothing embarrassing can leak through the OS notification.
 */

export type NotificationReason =
  | 'expedition_complete'
  | 'lives_refilled'
  | 'streak_at_risk'
  | 'lapsed_day3';

export type NotificationPermission = 'unknown' | 'granted' | 'denied';

export interface ScheduledNotification {
  id: string;
  reason: NotificationReason;
  fireAt: number;
  title: string;
  body: string;
}

export interface NotificationScheduler {
  schedule(n: ScheduledNotification): Promise<void>;
  cancel(id: string): Promise<void>;
  cancelAll(): Promise<void>;
  listScheduled(): Promise<ScheduledNotification[]>;
  requestPermission(): Promise<NotificationPermission>;
}

/** In-memory mock. */
export class MockScheduler implements NotificationScheduler {
  scheduled: ScheduledNotification[] = [];
  permission: NotificationPermission = 'unknown';

  async schedule(n: ScheduledNotification): Promise<void> {
    this.scheduled.push(n);
  }
  async cancel(id: string): Promise<void> {
    this.scheduled = this.scheduled.filter((x) => x.id !== id);
  }
  async cancelAll(): Promise<void> {
    this.scheduled = [];
  }
  async listScheduled(): Promise<ScheduledNotification[]> {
    return this.scheduled.slice();
  }
  async requestPermission(): Promise<NotificationPermission> {
    this.permission = 'granted';
    return this.permission;
  }
}

/** Copy is authored here so we never leak dynamic strings into the OS. */
export const NOTIFICATION_COPY: Record<
  NotificationReason,
  { title: string; body: string }
> = {
  expedition_complete: {
    title: 'The kettle whistles.',
    body: 'A companion has returned. Claim their haul.',
  },
  lives_refilled: {
    title: 'Full lives.',
    body: 'The moon has refilled the lamp. Come brew.',
  },
  streak_at_risk: {
    title: 'Your streak is waiting.',
    body: 'Keep the fire going before it fades.',
  },
  lapsed_day3: {
    title: 'The garden misses you.',
    body: 'A rare bloom awaits your return.',
  },
};

/** Build a scheduled notification. Deterministic id-per-reason so a
 *  reschedule replaces rather than duplicates. */
export function buildNotification(
  reason: NotificationReason,
  fireAt: number,
): ScheduledNotification {
  const copy = NOTIFICATION_COPY[reason];
  return {
    id: `moonpetal.${reason}`,
    reason,
    fireAt,
    title: copy.title,
    body: copy.body,
  };
}

/**
 * When should we soft-ask for notification permission?
 *   - `permission` must be 'unknown'
 *   - Player must have cleared at least one 'wow' level (given by the
 *     caller — decoupled from telemetry so the caller decides "wow")
 *   - `hasBeenAsked` must be false
 */
export function shouldSoftAsk(inputs: {
  permission: NotificationPermission;
  clearedWowLevels: number;
  hasBeenAsked: boolean;
  isFirstLaunch: boolean;
}): boolean {
  if (inputs.permission !== 'unknown') return false;
  if (inputs.isFirstLaunch) return false;
  if (inputs.hasBeenAsked) return false;
  return inputs.clearedWowLevels >= 1;
}

/** Given player state, decide which reasons should be scheduled and when. */
export function planNotifications(inputs: {
  expeditionEndsAt: number | null;
  livesFullAt: number | null;
  streakAtRiskAt: number | null;
  lastActiveAt: number;
  now: number;
}): ScheduledNotification[] {
  const out: ScheduledNotification[] = [];
  if (inputs.expeditionEndsAt && inputs.expeditionEndsAt > inputs.now) {
    out.push(
      buildNotification('expedition_complete', inputs.expeditionEndsAt),
    );
  }
  if (inputs.livesFullAt && inputs.livesFullAt > inputs.now) {
    out.push(buildNotification('lives_refilled', inputs.livesFullAt));
  }
  if (inputs.streakAtRiskAt && inputs.streakAtRiskAt > inputs.now) {
    out.push(buildNotification('streak_at_risk', inputs.streakAtRiskAt));
  }
  const lapsedAt = inputs.lastActiveAt + 3 * 24 * 60 * 60 * 1000;
  if (lapsedAt > inputs.now) {
    out.push(buildNotification('lapsed_day3', lapsedAt));
  }
  return out;
}
