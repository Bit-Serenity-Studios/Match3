# Web preview

`docs/index.html` is a **self-contained, playable web preview** of Moonpetal
Apothecary. It's served from this repo via GitHub Pages and updates on every
push to the tracked branches (see `.github/workflows/pages.yml`).

## Live URL

Once Pages is enabled (see below), the preview is at:

```
https://bit-serenity-studios.github.io/match3/
```

Bookmark it on your phone — no PC, tunnel, or install required.

## One-time setup (repo owner)

GitHub Pages must be pointed at the Actions workflow once:

1. Repo → **Settings** → **Pages**
2. Under **Build and deployment → Source**, choose **GitHub Actions**
3. Push to a tracked branch (or run the "Deploy web preview" workflow
   manually from the **Actions** tab). The workflow publishes `docs/`.

## What it is

A single HTML file — no build step, no external requests, no WASM. It
reimplements the match-3 faithfully in vanilla JS:

- Seeded RNG (same deterministic approach as the TS engine), match
  detection, gravity, cascades, and the fall-in animation.
- The real Fluent Emoji tile art (MIT) inlined as SVG, with the app's
  exact palette and screen flow (home hub, top HUD, bottom nav, store,
  profile, gated online screens).

## What it is not

It does **not** run the real React Native app. The device build renders the
board with Skia (CanvasKit/WASM on web), plays real audio, and talks to IAP
/ ad SDKs — none of which belong in a lightweight always-available preview.
For the real thing, run `npm run start:tunnel` and open in Expo Go.

## Updating

Edit `docs/index.html` and push. The workflow redeploys automatically.
The source of truth for the preview lives at
`scripts/` sibling tooling is not involved — this page is hand-maintained
to track the current build.
