# Asset Licenses

Every third-party asset bundled in this app, its exact license, and what
that license requires of us as a **commercial, for-profit** distributor.
Keep this file current: when an asset is added, its provenance and license
go here in the same commit.

## Summary table

| Asset group | Source | License | Commercial use | Attribution required | Copyleft |
|---|---|---|---|---|---|
| `assets/art/fluent-emoji-flat/` (59 SVGs) | Microsoft Fluent Emoji, via `@iconify-json/fluent-emoji-flat@1.2.5` (npm) | MIT | ✅ Yes, incl. selling | ❌ No user-facing credit needed. License text must ship with the app. | ❌ None |
| `assets/art/noto-emoji/` (12 SVGs) | Google Noto Emoji (SVG artwork), via `@iconify-json/noto@1.2.7` (npm) | Apache 2.0 | ✅ Yes, incl. selling | ❌ No user-facing credit needed. License text must ship with the app. | ❌ None |
| `assets/sounds/` (9 SFX WAVs) | Generated in-repo by `scripts/gen-sounds.mjs` | Original work — owned by Bit Serenity Studios | ✅ | — | — |
| `assets/music/` (10 ambient WAVs) | Generated in-repo by `scripts/gen-sounds.mjs` | Original work — owned by Bit Serenity Studios | ✅ | — | — |

## What we must do to stay compliant when selling the app

1. **Ship the license texts.** The MIT text (`assets/art/fluent-emoji-flat/LICENSE`)
   and the Apache 2.0 notice + full text (`assets/art/noto-emoji/LICENSE`,
   `assets/art/noto-emoji/LICENSE-APACHE-2.0.txt`) must be included in the
   distributed app. In practice: add an in-app "Open Source Licenses"
   screen (standard for every React Native app — the JS dependencies are
   already MIT and carry the same requirement), or bundle the files in the
   app package. The files in `assets/` are bundled automatically by
   Expo's `assetBundlePatterns: ["**/*"]`.
2. **Do not imply endorsement.** Don't use "Microsoft", "Google",
   "Fluent", or "Noto" in the app name, store listing, or marketing in a
   way that suggests they endorse the game. Naming them inside the
   licenses screen is expected and fine.
3. **No trademark grant.** MIT and Apache 2.0 license the *artwork
   copyright*, not any trademarks. The emoji glyphs themselves are
   generic (flowers, moons, potions) and carry no logos, so this is a
   non-issue in practice — just never bundle a company logo.
4. **Apache NOTICE handling.** The noto-emoji repository has no NOTICE
   file beyond the license header we ship; nothing further required.

## Details

### Microsoft Fluent Emoji (flat style)

- Upstream: https://github.com/microsoft/fluentui-emoji
- Fetched from: `registry.npmjs.org` package `@iconify-json/fluent-emoji-flat` version 1.2.5
- License: MIT — full text at `assets/art/fluent-emoji-flat/LICENSE`
  (fetched verbatim from the upstream repository)
- MIT terms: free to "use, copy, modify, merge, publish, distribute,
  sublicense, and/or **sell**", condition being the copyright + permission
  notice appears "in all copies or substantial portions".
- Files: 59 curated SVGs — board tiles (cherry-blossom, test-tube, rock,
  honey-pot, mushroom), specials (bomb, high-voltage, rainbow, collision),
  currencies (coin, gem-stone, star, fire, rosette), companions
  (butterfly, owl, fox, frog, bird, paw-prints), ambience (moons,
  sparkles, candle, teapot, alembic, magic-wand, crystal-ball, herbs,
  flowers, leaves), and UI glyphs (locked, gear, bell, trophy, house,
  shopping-bags, shield, scroll, books, world-map, …).

### Google Noto Emoji (SVG artwork)

- Upstream: https://github.com/googlefonts/noto-emoji (the `svg/` tree)
- Fetched from: `registry.npmjs.org` package `@iconify-json/noto` version 1.2.7
- License: Apache License 2.0 — notice at `assets/art/noto-emoji/LICENSE`,
  full license text at `assets/art/noto-emoji/LICENSE-APACHE-2.0.txt`.
  (Note: the *font binary* in that repo is under the SIL OFL; the SVG
  artwork we use is under Apache 2.0 — we bundle only SVG artwork.)
- Files: 12 alternate-style tiles/ambience SVGs for art-direction A/B
  (cherry-blossom, test-tube, rock, honey-pot, mushroom, crescent-moon,
  star, sparkles, teapot, crystal-ball, magic-wand, candle).

### In-house audio

All WAVs under `assets/sounds/` and `assets/music/` are synthesized from
scratch by `scripts/gen-sounds.mjs` in this repository (sine-wave synthesis,
no samples). They are original works owned by Bit Serenity Studios; no
third-party license applies.

## Re-extraction

The curated SVGs can be regenerated at any time:

```bash
cd <scratch-dir>
npm pack @iconify-json/fluent-emoji-flat @iconify-json/noto
mkdir fluent noto && tar xzf iconify-json-fluent-emoji-flat-*.tgz -C fluent --strip-components=1 \
  && tar xzf iconify-json-noto-*.tgz -C noto --strip-components=1
node scripts/extract-art.mjs <scratch-dir>
```

Add icon names to the `FLUENT_WANTED` / `NOTO_WANTED` lists in
`scripts/extract-art.mjs` to pull more.

## Sources rejected and why

- **kenney.nl / OpenGameArt.org** — CC0 assets (ideal license) but both
  hosts are unreachable from this build environment's network policy.
  Kenney packs remain a good future addition if downloaded manually —
  everything Kenney publishes is CC0.
- **Twemoji** (CC BY 4.0) and **game-icons.net** (CC BY 3.0) — commercial
  use fine but requires *public attribution*, a string MIT/Apache don't
  have. Skipped to keep obligations minimal.
- **OpenMoji** (CC BY-SA 4.0) — share-alike could arguably reach derived
  artwork; not worth the legal ambiguity in a paid app.
