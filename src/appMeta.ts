import pkg from '../package.json';

/**
 * Single source of truth for the app's human-facing version: package.json.
 *
 * `app.config.ts` reads the same field for the Expo config (`version`), so the
 * store version, the OTA telemetry session version (App.tsx), and the on-screen
 * version (About) can never drift apart. Bump `version` in package.json once
 * per release.
 */
export const APP_VERSION: string = pkg.version;

/** Expo SDK the build targets — shown on the About screen. */
export const EXPO_SDK = '54';
