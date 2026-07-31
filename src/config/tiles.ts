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

// Decorative non-emoji dingbats, shown only as a first-frame fallback before
// the CC0 tile art decodes (the real tiles are Kenney gem images). Kept free
// of emoji-presentation codepoints so nothing renders as an OS emoji.
export const TILE_GLYPH: Record<TileColor, string> = {
  moonpetal: '❋',
  vial: '❖',
  runestone: '⟡',
  resin: '❂',
  mushroom: '✿',
};
