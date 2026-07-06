# Web preview

`docs/index.html` is a **self-contained, playable web preview** of Moonpetal
Apothecary — a single static HTML file (no build step, no external requests,
no WASM). It mirrors the app's engine, tile art, palette, and screen flow so
you can check progress from any phone without launching from a PC.

## Hosting: this repo is private, so pick a free host that supports private repos

GitHub Pages is **not** an option here — it requires a public repo or a paid
GitHub plan (that's the "Upgrade or make this repository public to enable
Pages" message). Since this is a commercial game we're keeping private, use
one of these free hosts instead. All three deploy straight from the private
GitHub repo and auto-redeploy on every push.

### Option A — Netlify (recommended, simplest)

1. Go to **netlify.com** and sign up **with GitHub**.
2. **Add new site → Import an existing project → GitHub**, authorize, pick
   `bit-serenity-studios/match3`.
3. It reads `netlify.toml` automatically (publish dir = `docs`, no build
   command). Click **Deploy**.
4. You get a URL like `moonpetal.netlify.app`. It redeploys on every push.
   Rename it under **Site settings → Change site name**.

### Option B — Cloudflare Pages

1. **dash.cloudflare.com → Workers & Pages → Create → Pages → Connect to Git.**
2. Pick the repo. Set **Build command:** *(empty)*, **Build output
   directory:** `docs`.
3. Deploy → you get `moonpetal.pages.dev`, auto-deploying on push.

### Option C — Vercel

1. **vercel.com → Add New → Project → Import** the GitHub repo.
2. It reads `vercel.json` (output dir = `docs`, no build). Deploy.
3. You get `moonpetal.vercel.app`, auto-deploying on push.

### If you'd rather use GitHub Pages

Two ways to unblock it:
- **Make the repo public** — then the included `.github/workflows/pages.yml`
  publishes `docs/` for free, at `https://bit-serenity-studios.github.io/match3/`.
- **Upgrade the GitHub plan** (Pro/Team) to allow Pages on a private repo.

The Pages workflow is already committed and will start working the moment
either of those is true — no further changes needed.

## What the preview is

Vanilla-JS reimplementation of the match-3: seeded RNG (same deterministic
approach as the TS engine), match detection, gravity, cascades, fall-in
animation. Real Fluent Emoji tile art (MIT) inlined as SVG, with the app's
exact palette and screen flow (home hub, top HUD, bottom nav, store, profile,
gated online screens) plus a build-status ledger.

## What it is not

It does **not** run the real React Native app. The device build renders the
board with Skia (CanvasKit/WASM), plays real audio, and talks to IAP / ad
SDKs — none of which belong in a lightweight always-available preview. For
the real thing, run `npm run start:tunnel` and open in Expo Go.

## Updating

Edit `docs/index.html` and push. Whichever host you connected redeploys
automatically.
