import React from 'react';
import { Image, type ImageStyle, type StyleProp } from 'react-native';

/**
 * Central icon registry. Every UI glyph in the app resolves to a CC0 (public
 * domain) image here — no OS-rendered emoji and no MIT/Apache-licensed art, so
 * the build ships clean for commercial release. See ASSETS_LICENSES.md for the
 * per-asset provenance (Kenney, Quaternius, and other CC0 packs).
 *
 * Add a glyph by dropping its PNG in assets/icons/ and adding a line below;
 * screens reference it by name via <Icon name="..." />.
 */
const ICONS = {
  // crests / moons
  moon: require('../../assets/icons/moon.png'),
  themeMoon: require('../../assets/icons/themeMoon.png'),
  moonrise: require('../../assets/icons/moonrise.png'),
  // currencies
  coin: require('../../assets/icons/coin.png'),
  star: require('../../assets/icons/star.png'),
  moonstone: require('../../assets/icons/moonstone.png'),
  ember: require('../../assets/icons/ember.png'),
  // fx / decor
  sparkle: require('../../assets/icons/sparkle.png'),
  candle: require('../../assets/icons/candle.png'),
  herb: require('../../assets/icons/herb.png'),
  droplet: require('../../assets/icons/droplet.png'),
  moonpetalDecor: require('../../assets/icons/moonpetalDecor.png'),
  mushroom: require('../../assets/icons/mushroom.png'),
  // navigation / features
  market: require('../../assets/icons/market.png'),
  covens: require('../../assets/icons/covens.png'),
  friends: require('../../assets/icons/friends.png'),
  home: require('../../assets/icons/home.png'),
  grimoire: require('../../assets/icons/grimoire.png'),
  swords: require('../../assets/icons/swords.png'),
  trophy: require('../../assets/icons/trophy.png'),
  flask: require('../../assets/icons/flask.png'),
  scroll: require('../../assets/icons/scroll.png'),
  gift: require('../../assets/icons/gift.png'),
  lock: require('../../assets/icons/lock.png'),
  gear: require('../../assets/icons/gear.png'),
  link: require('../../assets/icons/link.png'),
  news: require('../../assets/icons/news.png'),
  heart: require('../../assets/icons/heart.png'),
  support: require('../../assets/icons/support.png'),
  trade: require('../../assets/icons/trade.png'),
  chat: require('../../assets/icons/chat.png'),
  // milestones
  graduation: require('../../assets/icons/graduation.png'),
  infinity: require('../../assets/icons/infinity.png'),
  temple: require('../../assets/icons/temple.png'),
  compass: require('../../assets/icons/compass.png'),
  crown: require('../../assets/icons/crown.png'),
  pumpkin: require('../../assets/icons/pumpkin.png'),
  // store / perks
  pouch: require('../../assets/icons/pouch.png'),
  adFree: require('../../assets/icons/adFree.png'),
  pig: require('../../assets/icons/pig.png'),
  // status
  check: require('../../assets/icons/check.png'),
  wipDot: require('../../assets/icons/wipDot.png'),
} as const;

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  /** Rendered square edge in px (default 20). */
  size?: number;
  /** Optional tint for the flat white icons; leave undefined for colored art. */
  tint?: string;
  style?: StyleProp<ImageStyle>;
}

/** Renders a CC0 image glyph. Colored art keeps its palette; pass `tint` only
 *  for the monochrome (white) icons that need to match a surface accent. */
export function Icon({ name, size = 20, tint, style }: Props): React.ReactElement {
  return (
    <Image
      source={ICONS[name]}
      style={[{ width: size, height: size }, tint ? { tintColor: tint } : null, style]}
      resizeMode="contain"
      accessibilityIgnoresInvertColors
    />
  );
}
