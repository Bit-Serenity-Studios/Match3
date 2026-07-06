import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useProfile } from '../state/profile';

/**
 * Sound-effect manager. Preloads a small set of short WAVs at boot and
 * exposes `sfx(name)` for one-shot playback. Every call short-circuits
 * when the profile's `soundEnabled` flag is false.
 *
 * Playback is fire-and-forget — errors are swallowed so a missing asset
 * or hardware hiccup never crashes gameplay.
 */

export type SoundId =
  | 'click'
  | 'swap'
  | 'match'
  | 'chain'
  | 'reject'
  | 'win'
  | 'lose'
  | 'splash'
  | 'toast';

const SOURCES: Record<SoundId, number> = {
  click: require('../../assets/sounds/click.wav'),
  swap: require('../../assets/sounds/swap.wav'),
  match: require('../../assets/sounds/match.wav'),
  chain: require('../../assets/sounds/chain.wav'),
  reject: require('../../assets/sounds/reject.wav'),
  win: require('../../assets/sounds/win.wav'),
  lose: require('../../assets/sounds/lose.wav'),
  splash: require('../../assets/sounds/splash.wav'),
  toast: require('../../assets/sounds/toast.wav'),
};

const players = new Map<SoundId, AudioPlayer>();
let ready = false;
let initInFlight: Promise<void> | null = null;

export function initSoundEngine(): Promise<void> {
  if (ready) return Promise.resolve();
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
      });
    } catch {
      // audio-mode setup can fail on web / older simulators; keep going
    }
    for (const id of Object.keys(SOURCES) as SoundId[]) {
      try {
        const player = createAudioPlayer(SOURCES[id]);
        players.set(id, player);
      } catch {
        // best-effort: a missing player just means that sound is silent
      }
    }
    ready = true;
  })();
  return initInFlight;
}

/** Fire and forget. Safe to call before init — it just no-ops until the
 *  players are ready. */
export function sfx(id: SoundId): void {
  try {
    const s = useProfile.getState();
    if (!s.sfxEnabled) return;
    const p = players.get(id);
    if (!p) return;
    try {
      p.volume = s.sfxVolume;
    } catch {}
    p.seekTo(0);
    p.play();
  } catch {
    // swallow — audio is a decoration, not a correctness concern
  }
}

/** For tests / dev tooling. */
export function _isReady(): boolean {
  return ready;
}
