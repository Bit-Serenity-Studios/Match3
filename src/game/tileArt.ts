import { useSVG, useImage, type SkSVG, type SkImage } from '@shopify/react-native-skia';
import type { SpecialKind, TileColor } from '../engine/types';

/**
 * Board art. Tiles are Kenney Puzzle Pack gems (CC0, see ASSETS_LICENSES.md)
 * loaded as Skia images; specials are Fluent Emoji (MIT) SVGs. One hook so
 * BoardView stays clean. Both load async; entries are null until decoded,
 * and BoardView falls back to the text glyphs for those first frames.
 */
export interface TileArt {
  tiles: Record<TileColor, SkImage | null>;
  specials: Record<SpecialKind, SkSVG | null>;
}

export function useTileArt(): TileArt {
  const moonpetal = useImage(require('../../assets/art/kenney-gems/moonpetal.png'));
  const vial = useImage(require('../../assets/art/kenney-gems/vial.png'));
  const runestone = useImage(require('../../assets/art/kenney-gems/runestone.png'));
  const resin = useImage(require('../../assets/art/kenney-gems/resin.png'));
  const mushroom = useImage(require('../../assets/art/kenney-gems/mushroom.png'));
  const bomb = useSVG(require('../../assets/art/fluent-emoji-flat/bomb.svg'));
  const bolt = useSVG(require('../../assets/art/fluent-emoji-flat/high-voltage.svg'));
  const rainbow = useSVG(require('../../assets/art/fluent-emoji-flat/rainbow.svg'));
  const collision = useSVG(require('../../assets/art/fluent-emoji-flat/collision.svg'));
  const sparkles = useSVG(require('../../assets/art/fluent-emoji-flat/sparkles.svg'));

  return {
    tiles: { moonpetal, vial, runestone, resin, mushroom },
    specials: {
      bomb,
      lineH: bolt,
      lineV: bolt,
      cross: collision,
      nova: sparkles,
      prism: rainbow,
    },
  };
}
