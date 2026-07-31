# Web preview

`docs/index.html` is a **self-contained, playable web preview** of Moonpetal
Apothecary — a single static HTML file (no build step, no external requests,
no WASM). It mirrors the app's engine, tile art, palette, and screen flow so
you can check progress from any phone without launching from a PC.

## Live URL

Once GitHub Pages is switched on (one-time step below), the preview is served at:

**https://bit-serenity-studios.github.io/Match3/**

## Hosting: GitHub Pages (this repo is public)

The repo is public, so `.github/workflows/pages.yml` publishes `docs/` to
GitHub Pages for free and redeploys on every push. It needs **one** manual
toggle first — GitHub won't let the Actions bot switch Pages on by itself for
an org-owned repo (it fails with *"Resource not accessible by integration"*).

### One-time enable (~15 seconds, from a phone browser)

1. Repo → **Settings** → **Pages** (left sidebar).
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. That's it — no other fields. GitHub creates the Pages site.

Then re-run the **Deploy web preview** workflow (Actions tab → the workflow →
**Run workflow**), or just push any change under `docs/`. The run turns green
and the site goes live at the URL above. The exact address also appears as the
`page_url` output on the **Deploy to GitHub Pages** step.

### Alternative hosts (no toggle, but require a signup)

If you'd rather not use Pages, `netlify.toml` and `vercel.json` are committed
so the `docs/` folder deploys as-is:
- **Netlify** — netlify.com → Add new site → Import from GitHub → pick the repo
  (reads `netlify.toml`, publish dir `docs`). Get `something.netlify.app`.
- **Cloudflare Pages** — Workers & Pages → Create → Pages → Connect to Git →
  build command empty, output dir `docs`. Get `something.pages.dev`.
- **Vercel** — vercel.com → Add New → Project → Import (reads `vercel.json`).
  Get `something.vercel.app`.

## What the preview is

Vanilla-JS reimplementation of the match-3: seeded RNG (same deterministic
approach as the TS engine), match detection, gravity, cascades, fall-in
animation. CC0 (public-domain) tile gems and UI icons embedded as base64,
with the app's exact palette and screen flow (home hub, top HUD, bottom nav,
store, profile, gated online screens) plus a build-status ledger.

## What it is not

It does **not** run the real React Native app. The device build renders the
board with Skia (CanvasKit/WASM), plays real audio, and talks to IAP / ad
SDKs — none of which belong in a lightweight always-available preview. For
the real thing, open the project in **Expo Go** (published from the cloud on
every push — see `EAS_PREVIEW.md`).

## Updating

Edit `docs/index.html` and push. Whichever host you connected redeploys
automatically.
