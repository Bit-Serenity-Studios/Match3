# Open Moonpetal in Expo Go — no PC, ever

The real game (not the web mockup) can open in Expo Go straight from the
cloud. GitHub Actions publishes the JS bundle to Expo's servers on every
push, and Expo Go loads it — your PC is never involved.

The app already runs in Expo Go on SDK 54 (Skia, Reanimated, gesture
handler, and audio are all bundled into Expo Go), so no custom build is
needed.

## One-time setup — all from your phone (~4 minutes)

Everything below is a phone browser + the Expo Go app. No computer.

### 1. Make a free Expo account

In your phone browser, go to **expo.dev** → **Sign up**. (Or open the
**Expo Go** app → **Profile / Log in** → create an account there.)

### 2. Create an access token

Phone browser → **expo.dev** → tap your avatar → **Settings** →
**Access tokens** → **Create token** → copy it.
(This token only touches your Expo account. You can revoke it anytime.)

### 3. Add the token to GitHub

Phone browser → the repo **`bit-serenity-studios/match3`** →
**Settings** → **Secrets and variables** → **Actions** →
**New repository secret**:
- **Name:** `EXPO_TOKEN`
- **Secret:** paste the token → **Add secret**

### 4. Kick off the first publish

Phone browser → repo → **Actions** tab → **EAS Update (Expo Go)** →
**Run workflow**. (Or just wait for the next push — it runs automatically.)

The workflow links the Expo project, configures it, and publishes — all on
GitHub's servers. First run takes a couple minutes.

### 5. Open it in Expo Go

Open **Expo Go** on your iPhone, signed in with the same Expo account.
Your project **"Moonpetal Apothecary"** shows under the **Projects** tab →
tap it → the real game loads from the cloud. No tunnel, no PC.

## After setup

Every push republishes automatically. Open Expo Go, tap the project, and
you're on the latest build. Nothing else to do — and nothing runs on your
computer.

## How it works (why no PC is needed)

- `npm run start:tunnel` serves the bundle **from your PC** — that's why it
  needed the computer on.
- **EAS Update** serves the bundle **from Expo's cloud** instead. GitHub
  Actions builds and uploads it on push; Expo Go downloads it. Your PC is
  out of the loop entirely.

## Two previews, two jobs

| Preview | Runs | Setup |
|---|---|---|
| **EAS Update → Expo Go** | the **real app** | this file — one token, once |
| **Web page** (`docs/`) | faithful browser mockup | a free static host (see `docs/README.md`) |

## Troubleshooting (all checkable from a phone)

- **Actions run skipped** — the `EXPO_TOKEN` secret isn't set yet (step 3).
- **"No compatible version" in Expo Go** — update Expo Go on the App Store;
  this project targets SDK 54.
- **Workflow failed on "Link the Expo project"** — open the failed run's log
  from the Actions tab; it almost always means the token is invalid or
  expired. Recreate it (step 2) and update the secret.
- **Project not in Expo Go's Projects tab** — make sure you're signed into
  Expo Go with the *same* account that owns the token.
