# Internal Testing — getting real builds onto devices

This repo is now wired for **internal testing builds** (real installable apps,
not just Expo Go). Everything that can be set up in-repo is done; the only
remaining steps need your store/developer accounts.

> Once a build is installed, push future changes over-the-air with a single
> `eas update` — no rebuild. See **`OTA_RELEASE.md`** for that loop.

## What's already set up

- **Bundle identifiers** — `studio.bitserenity.moonpetal` (prod),
  `.preview`, and `.dev` for the other variants, so all three install
  side-by-side. *(Changeable until your first store upload; permanent after.)*
- **Environment variants** via `APP_VARIANT` (`app.config.ts`) mapped to EAS
  build profiles (`eas.json`): `development`, `preview`, `production`.
- **Launcher icon, adaptive icon, and native splash** (`assets/branding/`).
- **CI quality gate** (`.github/workflows/ci.yml`) — typecheck + 202 tests on
  every push/PR.
- **One-click build** (`.github/workflows/eas-build.yml`) — build from GitHub,
  no PC required.
- **Single version source** — bump `src/appMeta.ts` once per release; the store
  config, OTA session version, and About screen all read it.

## Fastest path to testers (Android — works today)

Android needs no paid account to produce an installable APK (EAS generates a
signing keystore for you):

1. GitHub → **Actions** → **EAS Build (internal testing)** → **Run workflow**.
2. profile = `preview`, platform = `android` → Run.
3. When it finishes, open the build in [expo.dev](https://expo.dev) →
   **Builds** → download the **APK** (or share the QR/link).
4. Testers install the APK directly, or upload it to **Play Console → Internal
   testing** for a managed track.

## iOS / TestFlight (needs an Apple Developer account)

1. Enroll in the **Apple Developer Program** ($99/yr) and create the app record
   in **App Store Connect**.
2. One-time credential setup: run `eas credentials` (or let EAS manage signing
   the first interactive build). This can't be done head-less on the very first
   iOS build.
3. Then Actions → EAS Build → profile = `preview`, platform = `ios`. Submit the
   resulting build to **TestFlight** (`eas submit -p ios`) for internal testers.

## Prerequisites checklist

- [x] `EXPO_TOKEN` secret (already set — the EAS Update workflow uses it).
- [ ] Google Play Console ($25 one-time) — only for the managed Play track;
      direct APK sideload needs nothing.
- [ ] Apple Developer Program ($99/yr) — required for any iOS device install.
- [ ] Decide the final bundle ID before the first store upload (currently
      `studio.bitserenity.moonpetal`).

## Not done yet (deliberately deferred to public launch)

These are **public-launch** blockers, not internal-testing blockers, and are
best done once the core loop is proven fun in testing:

- Server-side IAP receipt validation (e.g. RevenueCat) + Restore Purchases UI.
- Ad-consent stack (Google UMP + iOS ATT) and subscription disclosures.
- Hosted privacy policy URL + store data-safety / privacy-label declarations.
- Store listing kit (screenshots, feature graphic, description).

See the CIFA audit summary for the full backlog.
