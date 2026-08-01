import { useImage, type SkImage } from '@shopify/react-native-skia';
import type { SpecialKind, TileColor } from '../engine/types';

/**
 * Board art. Tiles are Kenney Puzzle Pack gems and specials are CC0 icons
 * (Kenney / Quaternius packs — see ASSETS_LICENSES.md), all public domain so
 * the build ships clean for sale. Loaded as Skia images through one hook so
 * BoardView stays clean. Every entry loads async and is null until decoded;
 * BoardView falls back to the text glyphs for those first frames.
 */
export interface TileArt {
  tiles: Record<TileColor, SkImage | null>;
  specials: Record<SpecialKind, SkImage | null>;
}

export function useTileArt(): TileArt {
  const moonpetal = useImage(require('../../assets/art/kenney-gems/moonpetal.png'));
  const vial = useImage(require('../../assets/art/kenney-gems/vial.png'));
  const runestone = useImage(require('../../assets/art/kenney-gems/runestone.png'));
  const resin = useImage(require('../../assets/art/kenney-gems/resin.png'));
  const mushroom = useImage(require('../../assets/art/kenney-gems/mushroom.png'));
  const bomb = useImage(require('../../assets/icons/bomb.png'));
  const prism = useImage(require('../../assets/icons/prism.png'));
  const collision = useImage(require('../../assets/icons/collision.png'));
  const nova = useImage(require('../../assets/icons/nova.png'));

  return {
    tiles: { moonpetal, vial, runestone, resin, mushroom },
    specials: {
      bomb,
      // Line specials are drawn as a directional streak in BoardView
      // (horizontal for lineH, vertical for lineV) rather than a sprite:
      // the old bolt.png shrank into an illegible squiggle and made the two
      // directions indistinguishable.
      lineH: null,
      lineV: null,
      cross: collision,
      nova,
      prism,
    },
  };
}
