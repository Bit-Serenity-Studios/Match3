import type { ExpoConfig, ConfigContext } from 'expo/config';

// Single version source = package.json (also read by src/appMeta at runtime),
// so the store version, OTA session version, and About screen never diverge.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const APP_VERSION: string = require('./package.json').version;

/**
 * Dynamic Expo config layered on top of app.json.
 *
 * app.json stays the stable base (slug, owner, EAS projectId, updates URL,
 * runtimeVersion — the values the EAS Update / Expo Go pipeline depends on).
 * This file adds the things internal testing and store builds need:
 *
 *   - Bundle identifiers (iOS + Android), permanent app identity.
 *   - Per-environment variants via APP_VARIANT (development | preview |
 *     production) so dev/preview/prod builds install side-by-side with
 *     distinct ids and names. eas.json sets APP_VARIANT per build profile.
 *   - Launcher icon, adaptive icon, and native splash.
 *   - A single, imported version (APP_VERSION) shared with the runtime.
 *
 * OTA updates and Expo Go are unaffected: bundle ids/icons are only consumed
 * by native `eas build`; the projectId/updates/runtimeVersion come straight
 * through from app.json.
 */

type Variant = 'development' | 'preview' | 'production';
const VARIANT = ((process.env.APP_VARIANT as Variant | undefined) ?? 'production');

const BUNDLE_BASE = 'studio.bitserenity.moonpetal';
const BG_DEEP = '#100820';

const perVariant = {
  development: { id: `${BUNDLE_BASE}.dev`, name: 'Moonpetal (Dev)' },
  preview: { id: `${BUNDLE_BASE}.preview`, name: 'Moonpetal (Preview)' },
  production: { id: BUNDLE_BASE, name: 'Moonpetal Apothecary' },
}[VARIANT];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: perVariant.name,
  slug: config.slug ?? 'moonpetal-apothecary',
  version: APP_VERSION,
  icon: './assets/branding/icon.png',
  scheme: 'moonpetal',
  splash: {
    image: './assets/branding/splash.png',
    resizeMode: 'contain',
    backgroundColor: BG_DEEP,
  },
  ios: {
    ...config.ios,
    supportsTablet: false,
    bundleIdentifier: perVariant.id,
    infoPlist: {
      ...(config.ios?.infoPlist ?? {}),
      // Standard HTTPS only, no non-exempt encryption. Declaring this up
      // front skips the "Missing Compliance" gate that otherwise blocks
      // every TestFlight build until you answer it by hand.
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    ...config.android,
    package: perVariant.id,
    adaptiveIcon: {
      foregroundImage: './assets/branding/adaptive-foreground.png',
      backgroundColor: BG_DEEP,
    },
  },
  web: {
    ...config.web,
    bundler: 'metro',
    favicon: './assets/branding/favicon.png',
  },
  extra: {
    ...config.extra,
    appVariant: VARIANT,
  },
});
