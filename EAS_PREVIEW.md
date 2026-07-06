# Open Moonpetal in Expo Go — without a PC tunnel

`npm run start:tunnel` needs your PC running. **EAS Update** publishes the JS
bundle to Expo's cloud instead, so the real game opens in Expo Go from
anywhere — and it can auto-publish on every git push.

The app already runs in Expo Go (Skia, Reanimated, gesture-handler, and
audio are all bundled into Expo Go for SDK 54), so no dev build is needed.

## One-time setup (~5 minutes, on your PC)

Do this once. After that, updates are automatic on push (or one command).

### 1. Make a free Expo account

Sign up at **expo.dev** (or `npx expo login` / `npx expo register`).

### 2. Link the project

From the repo on your PC:

```bash
npx eas-cli login          # sign in with the Expo account
npx eas-cli init           # creates the project on Expo's servers and
                           # writes extra.eas.projectId + updates.url into app.json
npx eas-cli update:configure   # confirms the runtimeVersion policy (already set)
```

Commit the `app.json` changes `eas init` makes, and push.

### 3. Publish the first update

```bash
npm run publish
# = eas update --branch preview --message "<last commit subject>"
```

The command prints a QR code and a link.

### 4. Open it in Expo Go

- Open **Expo Go** on your iPhone and **sign in with the same Expo account**.
- Your project appears under the **Projects** tab → tap it → it loads the
  published bundle. No tunnel, no PC.
- Or scan the QR that `npm run publish` printed.

## Automatic updates on every push (optional but recommended)

A GitHub Action (`.github/workflows/eas-update.yml`) is already committed. It
publishes a new update on every push once you add one secret:

1. **expo.dev → Account → Settings → Access tokens → Create token.** Copy it.
2. In the GitHub repo: **Settings → Secrets and variables → Actions → New
   repository secret.** Name it `EXPO_TOKEN`, paste the token.

That's it. Every push now publishes to the `preview` branch, and Expo Go
shows the latest whenever you open the project. (Until the secret exists, the
workflow skips itself so pushes never fail.)

## Which preview should I use?

- **This (EAS Update / Expo Go)** — runs the *real* app: Skia board, audio,
  every screen, real feel. Needs the one-time Expo login above. Best for
  playtesting the actual game.
- **Web preview (`docs/`)** — a lightweight always-on browser mockup, no
  login. Best for a quick look or sharing a link. See `docs/README.md`.

Use both: EAS Update to actually play, the web page for a zero-friction peek.

## Troubleshooting

- **"No compatible build found" in Expo Go** — the update's SDK must match
  Expo Go. This project targets SDK 54; keep Expo Go updated on the App Store.
- **CI job skipped** — you haven't added `EXPO_TOKEN` yet (see above).
- **`eas update` says project not configured** — re-run `npx eas-cli init`.
