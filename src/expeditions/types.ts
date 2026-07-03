export type ExpeditionDuration = 'short' | 'medium' | 'long';

export const EXPEDITION_MINUTES: Record<ExpeditionDuration, number> = {
  short: 30,
  medium: 120,
  long: 480,
};

export interface ExpeditionRewards {
  coins: number;
  embers: number;
  shards: number;
  gems: number;
}

export interface ActiveExpedition {
  companionId: string;
  duration: ExpeditionDuration;
  startedAt: number; // ms epoch
  endsAt: number; // ms epoch (startedAt + duration in ms)
  seed: number;
}

/** Maximum concurrent expeditions the player can have running. */
export const MAX_SLOTS = 2;
