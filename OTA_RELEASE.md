# OTA Releases — "type the command, it appears on the phone"

The goal: push a change and have it show up on the tester's device with a
single command, exactly like:

```powershell
eas update --branch preview --message "your note here"
```

This works today for everything **except one thing**: the phone must first have
a native build installed that is wired to *this* Expo project. That's a
**one-time install**. After it, every future change is one `eas update` away.

This doc explains why, and the exact steps. It sits alongside:

| Doc | Covers |
|---|---|
| **this file** | getting OTA updates onto an **installed build** (the tester's app) |
| `EAS_PREVIEW.md` | opening the real app in **Expo Go** (no native build at all) |
| `INTERNAL_TESTING.md` | producing the **native build** itself (APK / TestFlight) |

---

## Why `eas update` doesn't reach the phone *yet*

An OTA update ships **only the JavaScript/asset bundle**. It does not install an
app — it drops new JS onto a native app that's **already installed**. For the
update to arrive, four things baked into the installed binary must match what
you publish:

1. **Same EAS project** — `projectId 0d632714…` / `updates.url` (app.json).
2. **Channel → branch** — a `preview` build listens on the `preview` branch.
3. **Same runtime version** — policy `sdkVersion`, i.e. Expo **SDK 54**.
4. **`expo-updates` present** in the binary (it is — package.json).

Your *other* app "just works" because you already installed a native build from
its project once, so all four line up and every `eas update` drops right in.

This app's phone is on **v0.4** — a binary built *before* the project moved to
the `bit-serenity-studios-llc` org. It isn't wired to project `0d632714…`, so
**no `eas update` can physically reach it.** No command changes that. You have
to install one fresh build. That is the entire gap.

---

## Step 1 (once): install a build wired to this project

Pick **one** of these. Android is fastest — EAS generates a signing keystore,
no paid account, and the APK sideloads directly.

### Option A — from GitHub, no PC

1. Repo → **Actions** → **EAS Build (internal testing)** → **Run workflow**.
2. `profile = preview`, `platform = android` → **Run**.
3. When it finishes: [expo.dev](https://expo.dev) → **Builds** → open the build
   → share the **QR / install link** to the phone → install the APK.

Requires the `EXPO_TOKEN` secret (member of the org) — see `EAS_PREVIEW.md`
step 3. iOS goes through TestFlight — see `INTERNAL_TESTING.md`.

### Option B — from your PC (PowerShell)

```powershell
eas whoami          # must be an account with access to bit-serenity-studios-llc
eas build --profile preview --platform android
```

EAS prints an install link/QR when done → open it on the phone → install.

> **Delete the old v0.4 app first** so there's no confusion about which is which.
> The new one is **Moonpetal (Preview)** with a `.preview` bundle id, so it can
> also sit side-by-side with a production install.

After this, the phone is permanently wired to the project. You never repeat
Step 1 unless a **native** change forces a rebuild (see the table below).

---

## Step 2 (every release): publish the update

Now it's the loop you wanted. From the project on your PC:

```powershell
eas update --branch preview --message "what changed"
```

That command is already scripted:

```powershell
npm run publish     # -> eas update --branch preview --message "<last git subject>"
```

Or from GitHub with no PC: **Actions → EAS Update (Expo Go) → Run workflow**
(publishes the current `main` to the `preview` branch).

The tester reopens the app and the new bundle loads on launch.

> ⚠️ **The one difference from your other app:** publish to **`--branch preview`**,
> not `production`. The tester's build listens on the `preview` channel, which
> maps to the `preview` branch. `--branch production` would publish somewhere the
> installed app isn't listening, and nothing would appear.
>
> (If you'd rather use `--branch production` out of habit, build the tester on
> the `production` profile instead — but that's an AAB/TestFlight path, not a
> directly-sideloadable APK. For a single Android tester, `preview` is simpler.)

---

## What ships over-the-air vs. needs a new build

| Change | Delivery |
|---|---|
| Game logic, screens, components, styles | ✅ `eas update` |
| Level data, balance, copy, JS-bundled images | ✅ `eas update` |
| Version string on the About screen (`package.json` `version`) | ✅ `eas update` |
| **Expo SDK upgrade** (changes the runtime version) | 🔁 rebuild, then resume OTA |
| **New native dependency** (a package with native code) | 🔁 rebuild |
| **app.json / app.config native fields** — icon, splash, permissions, bundle id, plugins | 🔁 rebuild |

Every fix currently waiting for the tester is pure JS — so once Step 1 is done,
all of them flow over-the-air with a single `eas update`.

---

## Verify / troubleshoot (all quick)

- **Confirm the channel is linked to its branch:**
  ```powershell
  eas channel:view preview
  ```
  It should show the `preview` channel pointing at the `preview` branch. If not:
  `eas channel:edit preview --branch preview`.
- **"Nothing showed up after `eas update`."** Check you published to
  `--branch preview` (not `production`), and that the installed app is the
  **Preview** variant (`.preview` bundle id).
- **"No compatible update / runtime mismatch."** The installed build and the
  update must be the same Expo SDK. If you bumped the SDK, do Step 1 again.
- **Which version is on the phone?** The About screen reads `package.json`
  `version` (currently **0.5.3**) — a fresh preview build shows that, the stale
  binary shows `v0.4`.

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
| Version source | `package.json` `version` (read at runtime by `src/appMeta`) | app.config.ts |

Nothing in the repo needs to change for OTA to work — only the one-time install
in Step 1.
