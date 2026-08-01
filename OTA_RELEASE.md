# OTA Releases — "type the command, it appears on the phone"

The goal: push a change and have it show up on the tester's device with a
single command:

```powershell
eas update --branch production --message "your note here"
```

This works today for everything **except one thing**: the phone must first have
a native build installed that is wired to *this* Expo project. That's a
**one-time install**. After it, every future change is one `eas update` away.

This doc explains why, and the exact steps. It sits alongside:

| Doc | Covers |
|---|---|
| **this file** | getting OTA updates onto an **installed build** (the tester's app) |
| `EAS_PREVIEW.md` | opening the real app in **Expo Go** (no native build at all) |
| `INTERNAL_TESTING.md` | producing the **native build** itself (TestFlight / APK) |

---

## Why `eas update` doesn't reach the phone until then

An OTA update ships **only the JavaScript/asset bundle**. It does not install an
app — it drops new JS onto a native app that's **already installed**. For the
update to arrive, four things baked into the installed binary must match what
you publish:

1. **Same EAS project** — `projectId 0d632714…` / `updates.url` (app.json).
2. **Channel → branch** — a `production` build listens on the `production`
   branch, a `preview` build on `preview`.
3. **Same runtime version** — policy `sdkVersion`, i.e. Expo **SDK 54**.
4. **`expo-updates` present** in the binary (it is — package.json).

A binary from before the project moved to the `bit-serenity-studios-llc` org
(e.g. the old v0.4 install) is not wired to this project, so **no `eas update`
can reach it** — it must be replaced by one fresh install below.

---

## Step 1 (once): install a build wired to this project

### iOS — TestFlight (the canonical path)

TestFlight is the only iOS install path with **no Developer Mode prompt, no
device registration, no UDIDs** — the same way the studio's other apps reach
the phone. Do **not** use ad-hoc / internal-distribution builds for iOS: on
iOS 16+ they force the tester to enable Developer Mode.

From the project on a PC (Apple team: Bit Serenity Studios LLC / 8YKCFQVZCD):

```powershell
eas build --profile production --platform ios   # App Store-signed, EAS manages credentials
eas submit --platform ios --latest              # uploads to TestFlight
```

First-time-only prompts to expect:
- `eas submit` offers to **create the App Store Connect app record** — say yes.
- `ITSAppUsesNonExemptEncryption` is already declared `false` in
  `app.config.ts`, so the build skips TestFlight's "Missing Compliance" gate.
- In **App Store Connect → TestFlight**, add the tester's Apple ID to an
  **Internal Testing** group (once). Otherwise the build never shows up in
  their TestFlight app.

Then on the iPhone: install **TestFlight** from the App Store → sign in →
**Moonpetal Apothecary** appears → Install. Delete any old pre-org build so
there's no confusion.

Apple takes ~5–15 min to process each uploaded build before it's installable.

### Android — preview APK (sideload, no store account needed)

```powershell
eas build --profile preview --platform android
```

or GitHub → **Actions → EAS Build (internal testing)** → `preview` / `android`.
EAS prints an install link/QR → open on the phone → install the APK.

---

## Step 2 (every release): publish the update

```powershell
eas update --branch production --message "what changed"
```

The tester force-closes and reopens the app a couple of times → the update
lands (expo-updates downloads in the background on one launch, applies on the
next). No rebuild, no TestFlight re-upload, no review.

> ⚠️ **Match the branch to the installed build.** The TestFlight build uses the
> `production` channel → publish to `--branch production`. The Android preview
> APK uses `preview` → publish to `--branch preview`. Publishing to the wrong
> branch silently lands nowhere. To hit both at once, run the command twice,
> once per branch.

`npm run publish` is a shortcut for the preview branch (uses the last git
commit subject as the message).

---

## What ships over-the-air vs. needs a new build

| Change | Delivery |
|---|---|
| Game logic, screens, components, styles | ✅ `eas update` |
| Level data, balance, copy, JS-bundled images | ✅ `eas update` |
| Version string on the About screen (`package.json` `version`) | ✅ `eas update` |
| **Expo SDK upgrade** (changes the runtime version) | 🔁 rebuild + resubmit, then resume OTA |
| **New native dependency** (a package with native code) | 🔁 rebuild + resubmit |
| **app.json / app.config native fields** — icon, splash, permissions, bundle id, plugins | 🔁 rebuild + resubmit |

---

## Verify / troubleshoot (all quick)

- **Confirm a channel is linked to its branch:**
  ```powershell
  eas channel:view production
  ```
  If it isn't: `eas channel:edit production --branch production`.
- **"Nothing showed up after `eas update`."** Branch mismatch is the usual
  cause — TestFlight build ⇒ `--branch production`; preview APK ⇒
  `--branch preview`. Also make sure the app was fully closed and relaunched
  twice.
- **"No compatible update / runtime mismatch."** The installed build and the
  update must be the same Expo SDK. If you bumped the SDK, rebuild + resubmit.
- **Which version is on the phone?** The About screen reads `package.json`
  `version` (currently **0.5.3**) — a stale pre-org binary shows `v0.4`.

---

## Config reference (verified wired)

| Setting | Value | File |
|---|---|---|
| `expo-updates` | `~29.0.18` | package.json |
| EAS project id | `0d632714-c104-499c-9d41-871e252de6d1` | app.json |
| Update URL | `https://u.expo.dev/0d632714…` | app.json |
| Owner (org) | `bit-serenity-studios-llc` | app.json |
| Runtime version | policy `sdkVersion` (SDK 54) | app.json |
| Channels | `development` / `preview` / `production` | eas.json |
| Encryption compliance | `ITSAppUsesNonExemptEncryption: false` | app.config.ts |
| Version source | `package.json` `version` (read at runtime by `src/appMeta`) | app.config.ts |

Nothing in the repo needs to change for OTA to work — only the one-time
install in Step 1.
