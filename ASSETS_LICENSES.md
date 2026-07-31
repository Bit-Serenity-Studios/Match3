# Asset Licenses

Every third-party asset bundled in this app, its exact license, and what
that license requires of us as a **commercial, for-profit** distributor.
Keep this file current: when an asset is added, its provenance and license
go here in the same commit.

> **Status: 100% CC0.** Every bundled art, icon, and audio asset is CC0 1.0
> (public domain) or original work owned by Bit Serenity Studios. Nothing in
> the shipped app requires attribution, a license-notice screen, or carries
> copyleft. The previously-used Microsoft Fluent Emoji (MIT) and Google Noto
> Emoji (Apache 2.0) artwork has been **removed** and replaced with CC0
> equivalents so the app ships clean for sale.

## Summary table

| Asset group | Source | License | Commercial use | Attribution required | Copyleft |
|---|---|---|---|---|---|
| UI/icon set — `assets/icons/` (47 PNGs, native) + embedded base64 in `docs/index.html` (preview) | Kenney (Board Game Icons, Game Icons, Puzzle Pack 2, Particle Pack, Medals, Foliage/Background/Cartography/Emote/Tappy Plane packs, Platformer/Graveyard/Cube-Pets/Food/Platformer-Kit) & Quaternius (Ultimate RPG icons), all via `Bit-Serenity-Studios/CC0-Assets` (mirror of first-party CC0 sources) | CC0 1.0 (public domain) | ✅ Yes, incl. selling | ❌ None required | ❌ None |
| Board tile gems — `assets/art/kenney-gems/` (native, 5 PNGs) + embedded base64 in `docs/index.html` (preview) | Kenney "Puzzle Pack" via `Bit-Serenity-Studios/KennyNLAssets`. Licence text: `assets/art/kenney-gems/LICENSE.txt` | CC0 1.0 (public domain) | ✅ Yes, incl. selling | ❌ None required | ❌ None |
| Kenney UI — `assets/art/kenney-ui/` (native: wooden round frame + button/panel) + embedded base64 in `docs/index.html` (preview) | Kenney "UI Pack - Adventure" via `Bit-Serenity-Studios/KennyNLAssets`. Licence text: `assets/art/kenney-ui/LICENSE.txt` | CC0 1.0 (public domain) | ✅ Yes, incl. selling | ❌ None required | ❌ None |
| `assets/sounds/` (9 SFX, `.mp3`) | Kenney "Interface Sounds / UI Audio / Impact Sounds / Music Jingles" via `Bit-Serenity-Studios/KennyNLAssets`, transcoded OGG→mp3 | CC0 1.0 (public domain) | ✅ Yes, incl. selling | ❌ None required | ❌ None |
| `assets/music/*.wav` (10 ambient loops) | Generated in-repo by `scripts/gen-sounds.mjs` | Original work — owned by Bit Serenity Studios | ✅ | — | — |
| `assets/music/kenney_*.mp3` (3 ambient loops) | Kenney "Music Loops" via `Bit-Serenity-Studios/KennyNLAssets`, transcoded OGG→mp3 | CC0 1.0 (public domain) | ✅ Yes, incl. selling | ❌ None required | ❌ None |

## What CC0 means for us

CC0 1.0 is a public-domain dedication: the creator has waived all copyright.
For a paid app that means:

1. **No attribution required.** No "Open Source Licenses" screen is needed for
   these assets (we may still ship one for MIT JS dependencies — that's a
   separate concern from art). No credit line, no notice file must travel with
   the build.
2. **No copyleft.** We can modify, recolor, crop, or re-encode freely; our
   copies and derivatives carry no license obligations back.
3. **Selling is fine.** CC0 explicitly permits commercial use and sale.
4. **No trademark grant** (as with any license). The glyphs we use are generic
   (moons, coins, flasks, scrolls) and carry no logos — never bundle a company
   logo or brand mark.

Per-pack `LICENSE.txt` files are kept next to the assets (`assets/art/*/`) as a
provenance record, not because distribution requires them.

## Details

### CC0 icon set (`assets/icons/`)

The app's UI glyphs (currencies, navigation, milestones, store products,
decor, and the match-3 special-tile overlays) are individual CC0 PNGs copied
out of `Bit-Serenity-Studios/CC0-Assets` — the studio's canonical CC0 library,
which mirrors first-party CC0 packs from Kenney and Quaternius. Each icon is
referenced by name through `src/components/Icon.tsx` (native) and, for the web
preview, embedded as a base64 data URI in the `ICON` map inside
`docs/index.html`. No OS-rendered emoji and no MIT/Apache art remain in either
surface.

### In-house audio

All WAVs under `assets/music/` (the 10 non-`kenney_` loops) are synthesized
from scratch by `scripts/gen-sounds.mjs` in this repository (sine-wave
synthesis, no samples). They are original works owned by Bit Serenity Studios;
no third-party license applies.

## History — removed non-CC0 art

Earlier builds bundled Microsoft **Fluent Emoji** (MIT) and Google **Noto
Emoji** (Apache 2.0) SVG artwork under `assets/art/fluent-emoji-flat/` and
`assets/art/noto-emoji/`, plus a set of inlined Fluent SVG tiles in
`docs/index.html`. Both carried attribution/notice obligations and are no
longer a fit for a clean commercial sale. They — and the
`scripts/extract-art.mjs` extraction pipeline that produced them — have been
**deleted** and replaced by the CC0 icon set above. OS-rendered Unicode emoji
that had been used as text glyphs across the native screens and the web
preview were likewise replaced with CC0 image icons.

## Sources rejected and why

- **Twemoji** (CC BY 4.0) and **game-icons.net upstream** (CC BY 3.0) —
  commercial use fine but requires *public attribution*. Skipped to keep
  obligations at zero. (Kenney's own "Game Icons" pack, used above, is CC0.)
- **OpenMoji** (CC BY-SA 4.0) — share-alike could arguably reach derived
  artwork; not worth the legal ambiguity in a paid app.
- **Microsoft Fluent Emoji** (MIT) / **Google Noto Emoji** (Apache 2.0) —
  previously used; removed because both require shipping a license notice with
  the app. CC0 avoids that entirely.
