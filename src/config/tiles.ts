import type { TileColor } from '../engine/types';

export const TILE_COLORS: readonly TileColor[] = [
  'moonpetal',
  'vial',
  'runestone',
  'resin',
  'mushroom',
] as const;

export const TILE_HEX: Record<TileColor, string> = {
  moonpetal: '#c9a4ff',
  vial: '#7be3a8',
  runestone: '#8fb8ff',
  resin: '#f2b968',
  mushroom: '#e97e7e',
};

export const TILE_GLYPH: Record<TileColor, string> = {
  moonpetal: '❋',
  vial: '⚗',
  runestone: '⟡',
  resin: '❂',
  mushroom: '♣',
};
