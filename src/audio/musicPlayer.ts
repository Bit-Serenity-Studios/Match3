import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useProfile } from '../state/profile';

/**
 * Ambient music player. Loads themed ambient loops (10 in-house
 * pentatonic + 3 Kenney CC0 recorded beds) and plays them one at a time,
 * respecting the profile's musicEnabled + musicVolume settings.
 *
 * Simple UX: pick a random track on boot; user can skip forward / back
 * from Settings. Each track loops until the user changes it. When the
 * user toggles music off, we pause but keep the player warm so resuming
 * is instant.
 */

export interface TrackDef {
  id: string;
  title: string;
  mood: string;
}

export const TRACKS: TrackDef[] = [
  { id: 'moonrise', title: 'Moonrise', mood: 'Rising warmth' },
  { id: 'petal_rain', title: 'Petal Rain', mood: 'Soft plink' },
  { id: 'kettle_song', title: 'Kettle Song', mood: 'Cozy sway' },
  { id: 'firefly_waltz', title: 'Firefly Waltz', mood: 'Turning' },
  { id: 'garden_at_dusk', title: 'Garden at Dusk', mood: 'Spacious' },
  { id: 'silver_thread', title: 'Silver Thread', mood: 'Contemplative' },
  { id: 'sleeping_pond', title: 'Sleeping Pond', mood: 'Deep drone' },
  { id: 'lanterns_vigil', title: "Lantern's Vigil", mood: 'Steady glow' },
  { id: 'first_star', title: 'First Star', mood: 'Twinkle' },
  { id: 'winter_brew', title: 'Winter Brew', mood: 'Slow subterranean' },
  // Kenney Music Loops (CC0) — real recorded ambient beds. See ASSETS_LICENSES.md.
  { id: 'kenney_flowing_rocks', title: 'Moonlit Stream', mood: 'Ambient bed' },
  { id: 'kenney_night_beach', title: 'Nightshore', mood: 'Mellow tide' },
  { id: 'kenney_infinite_descent', title: 'Deepening', mood: 'Calm mystery' },
];

// Requires must be static — Metro can't resolve `require(variable)`. So
// we hard-code the sources here.
const SOURCES: Record<string, number> = {
  moonrise: require('../../assets/music/moonrise.wav'),
  petal_rain: require('../../assets/music/petal_rain.wav'),
  kettle_song: require('../../assets/music/kettle_song.wav'),
  firefly_waltz: require('../../assets/music/firefly_waltz.wav'),
  garden_at_dusk: require('../../assets/music/garden_at_dusk.wav'),
  silver_thread: require('../../assets/music/silver_thread.wav'),
  sleeping_pond: require('../../assets/music/sleeping_pond.wav'),
  'lanterns_vigil': require('../../assets/music/lanterns_vigil.wav'),
  first_star: require('../../assets/music/first_star.wav'),
  winter_brew: require('../../assets/music/winter_brew.wav'),
  kenney_flowing_rocks: require('../../assets/music/kenney_flowing_rocks.mp3'),
  kenney_night_beach: require('../../assets/music/kenney_night_beach.mp3'),
  kenney_infinite_descent: require('../../assets/music/kenney_infinite_descent.mp3'),
};

let currentPlayer: AudioPlayer | null = null;
let currentTrackId: string | null = null;
let ready = false;
let initInFlight: Promise<void> | null = null;

function seedTrack(): string {
  const idx = Math.floor(Math.random() * TRACKS.length);
  return TRACKS[idx]!.id;
}

export async function initMusic(): Promise<void> {
  if (ready) return;
  if (initInFlight) return initInFlight;
  initInFlight = (async () => {
    const startingId = seedTrack();
    try {
      const player = createAudioPlayer(SOURCES[startingId]);
      player.loop = true;
      currentPlayer = player;
      currentTrackId = startingId;
      applyVolume();
      const state = useProfile.getState();
      if (state.musicEnabled) {
        player.play();
      }
    } catch {
      // audio unavailable — keep ready true so we don't spin
    }
    ready = true;
  })();
  return initInFlight;
}

function applyVolume(): void {
  if (!currentPlayer) return;
  const s = useProfile.getState();
  try {
    currentPlayer.volume = s.musicEnabled ? s.musicVolume : 0;
  } catch {}
}

/** Called on profile changes to keep the player state in sync. */
export function refreshMusicFromProfile(): void {
  if (!currentPlayer) return;
  const s = useProfile.getState();
  applyVolume();
  try {
    if (s.musicEnabled && !currentPlayer.playing) currentPlayer.play();
    else if (!s.musicEnabled && currentPlayer.playing) currentPlayer.pause();
  } catch {}
}

export function currentTrack(): TrackDef | null {
  if (!currentTrackId) return null;
  return TRACKS.find((t) => t.id === currentTrackId) ?? null;
}

export function playTrack(id: string): void {
  const src = SOURCES[id];
  if (!src) return;
  try {
    currentPlayer?.pause();
  } catch {}
  currentPlayer = createAudioPlayer(src);
  currentPlayer.loop = true;
  currentTrackId = id;
  applyVolume();
  const s = useProfile.getState();
  if (s.musicEnabled) {
    try {
      currentPlayer.play();
    } catch {}
  }
}

export function nextTrack(): void {
  if (!currentTrackId) return;
  const idx = TRACKS.findIndex((t) => t.id === currentTrackId);
  const next = TRACKS[(idx + 1) % TRACKS.length]!;
  playTrack(next.id);
}

export function prevTrack(): void {
  if (!currentTrackId) return;
  const idx = TRACKS.findIndex((t) => t.id === currentTrackId);
  const prev = TRACKS[(idx - 1 + TRACKS.length) % TRACKS.length]!;
  playTrack(prev.id);
}
