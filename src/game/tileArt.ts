import { useSVG, type SkSVG } from '@shopify/react-native-skia';
import type { SpecialKind, TileColor } from '../engine/types';

/**
 * Board art — Fluent Emoji (MIT, see ASSETS_LICENSES.md) loaded as Skia
 * SVG objects. One hook so BoardView stays clean. useSVG loads async;
 * entries are null until decoded, and BoardView falls back to the old
 * text glyphs for those first frames.
 */
export interface TileArt {
  tiles: Record<TileColor, SkSVG | null>;
  specials: Record<SpecialKind, SkSVG | null>;
}

export function useTileArt(): TileArt {
  const moonpetal = useSVG(require('../../assets/art/fluent-emoji-flat/cherry-blossom.svg'));
  const vial = useSVG(require('../../assets/art/fluent-emoji-flat/test-tube.svg'));
  const runestone = useSVG(require('../../assets/art/fluent-emoji-flat/rock.svg'));
  const resin = useSVG(require('../../assets/art/fluent-emoji-flat/honey-pot.svg'));
  const mushroom = useSVG(require('../../assets/art/fluent-emoji-flat/mushroom.svg'));
  const bomb = useSVG(require('../../assets/art/fluent-emoji-flat/bomb.svg'));
  const bolt = useSVG(require('../../assets/art/fluent-emoji-flat/high-voltage.svg'));
  const rainbow = useSVG(require('../../assets/art/fluent-emoji-flat/rainbow.svg'));

  return {
    tiles: { moonpetal, vial, runestone, resin, mushroom },
    specials: { bomb, lineH: bolt, lineV: bolt, prism: rainbow },
  };
}
