/**
 * Audio generator — writes SFX + 10 ambient music tracks under
 * `assets/sounds/`. All tones are algorithmically synthesized: no
 * third-party audio, no licensing question.
 *
 * SFX are short and softened (long attacks, low peak amplitude, sine-only
 * partials). Music tracks are 24-second pentatonic pad-and-arpeggio
 * loops downsampled to 16 kHz to keep the bundle under ~8 MB total.
 *
 * Usage: node scripts/gen-sounds.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'sounds');
const MUSIC_DIR = join(__dirname, '..', 'assets', 'music');
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(MUSIC_DIR, { recursive: true });

/** Write a mono 16-bit PCM WAV from a Float32Array in [-1, 1]. */
function writeWav(dir, name, samples, sr, peak = 0.75) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767 * peak), 44 + i * 2);
  }
  const path = join(dir, `${name}.wav`);
  writeFileSync(path, buf);
  console.log(`wrote ${path.replace(__dirname + '/..', '.')} · ${(buf.length / 1024).toFixed(1)}KB · ${(n / sr).toFixed(2)}s`);
}

/* ═══ SFX (soft profiles) ═══════════════════════════════════════════════ */

const SFX_SR = 22050;

/** Symmetric raised-cosine window — gentle attack, gentle release. */
function softEnv(i, n, attackFrac = 0.15, releaseFrac = 0.55) {
  const attack = Math.floor(n * attackFrac);
  const release = Math.floor(n * releaseFrac);
  if (i < attack) {
    const x = i / attack;
    return 0.5 * (1 - Math.cos(Math.PI * x));
  }
  if (i > n - release) {
    const x = (n - i) / release;
    return 0.5 * (1 - Math.cos(Math.PI * x));
  }
  return 1;
}

const sine = (freq, i, sr = SFX_SR) => Math.sin((2 * Math.PI * freq * i) / sr);

// click — soft tick, very short, low amplitude
function makeClick() {
  const dur = 0.055;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = softEnv(i, n, 0.25, 0.85);
    // Only the fundamental — no harsh overtones
    s[i] = e * 0.28 * sine(1200, i);
  }
  return s;
}

// swap — smoother pitch glide, longer attack
function makeSwap() {
  const dur = 0.18;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = 480 + t * 260;
    const e = softEnv(i, n, 0.2, 0.65);
    s[i] = e * 0.32 * sine(f, i);
  }
  return s;
}

// match — mellower chime, sine partials only, softer partial mix
function makeMatch() {
  const dur = 0.4;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = softEnv(i, n, 0.05, 0.75);
    s[i] =
      e *
      0.36 *
      (0.6 * sine(660, i) + 0.28 * sine(990, i) + 0.12 * sine(1320, i));
  }
  return s;
}

// chain — same palette as match, added lower octave for warmth
function makeChain() {
  const dur = 0.6;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = softEnv(i, n, 0.06, 0.8);
    s[i] =
      e *
      0.38 *
      (0.35 * sine(330, i) +
        0.35 * sine(660, i) +
        0.22 * sine(990, i) +
        0.12 * sine(1320, i));
  }
  return s;
}

// reject — low, warm thump. No buzz.
function makeReject() {
  const dur = 0.22;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = 220 - t * 60;
    const e = softEnv(i, n, 0.12, 0.75);
    s[i] = e * 0.32 * sine(f, i);
  }
  return s;
}

// win — softer arpeggio, wider gaps, sine only
function makeWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const noteDur = 0.18;
  const gap = 0.05;
  const total = notes.length * (noteDur + gap);
  const n = Math.floor(SFX_SR * total);
  const s = new Float32Array(n);
  notes.forEach((f, ni) => {
    const start = Math.floor(SFX_SR * ni * (noteDur + gap));
    const len = Math.floor(SFX_SR * noteDur);
    for (let i = 0; i < len; i++) {
      const e = softEnv(i, len, 0.12, 0.72);
      const idx = start + i;
      if (idx < n) {
        s[idx] += e * 0.32 * sine(f, i);
      }
    }
  });
  return s;
}

// lose — gentle sad descent, slower notes
function makeLose() {
  const notes = [440, 349.23, 293.66];
  const noteDur = 0.28;
  const gap = 0.06;
  const total = notes.length * (noteDur + gap);
  const n = Math.floor(SFX_SR * total);
  const s = new Float32Array(n);
  notes.forEach((f, ni) => {
    const start = Math.floor(SFX_SR * ni * (noteDur + gap));
    const len = Math.floor(SFX_SR * noteDur);
    for (let i = 0; i < len; i++) {
      const e = softEnv(i, len, 0.15, 0.7);
      const idx = start + i;
      if (idx < n) {
        s[idx] += e * 0.34 * sine(f, i);
      }
    }
  });
  return s;
}

// splash — barely-there ascending pad
function makeSplash() {
  const dur = 1.0;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const e = softEnv(i, n, 0.3, 0.55);
    const f = 220 + t * 220;
    s[i] = e * 0.22 * (sine(f, i) + 0.4 * sine(f * 1.5, i));
  }
  return s;
}

// toast — quiet up-tick, softer
function makeToast() {
  const dur = 0.18;
  const n = Math.floor(SFX_SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const e = softEnv(i, n, 0.1, 0.75);
    const f = 800 + t * 300;
    s[i] = e * 0.26 * sine(f, i);
  }
  return s;
}

writeWav(OUT_DIR, 'click', makeClick(), SFX_SR, 0.7);
writeWav(OUT_DIR, 'swap', makeSwap(), SFX_SR, 0.7);
writeWav(OUT_DIR, 'match', makeMatch(), SFX_SR, 0.75);
writeWav(OUT_DIR, 'chain', makeChain(), SFX_SR, 0.75);
writeWav(OUT_DIR, 'reject', makeReject(), SFX_SR, 0.7);
writeWav(OUT_DIR, 'win', makeWin(), SFX_SR, 0.72);
writeWav(OUT_DIR, 'lose', makeLose(), SFX_SR, 0.72);
writeWav(OUT_DIR, 'splash', makeSplash(), SFX_SR, 0.6);
writeWav(OUT_DIR, 'toast', makeToast(), SFX_SR, 0.65);

/* ═══ Music (10 ambient pentatonic loops) ═══════════════════════════════ */

const MUSIC_SR = 16000; // downsampled — ambient doesn't need highs
const MUSIC_SEC = 24;

/** Deterministic LCG so re-runs of this script produce identical tracks. */
function lcg(seed) {
  let s = seed | 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    return (s >>> 0) / 0x100000000;
  };
}

/** Musical helpers. */
const A4 = 440;
const semitone = (steps) => A4 * Math.pow(2, steps / 12);

/** Major pentatonic (in semitones from root): 0, 2, 4, 7, 9. */
const MAJOR_PENTA = [0, 2, 4, 7, 9, 12, 14, 16];
const MINOR_PENTA = [0, 3, 5, 7, 10, 12, 15, 17];

function buildScale(rootSemi, pattern) {
  return pattern.map((step) => semitone(rootSemi + step));
}

/** Soft ADSR-ish envelope for a single note. */
function noteEnv(i, len) {
  const attack = Math.floor(len * 0.05);
  const decay = Math.floor(len * 0.1);
  const release = Math.floor(len * 0.6);
  if (i < attack) return i / attack;
  if (i < attack + decay) {
    const x = (i - attack) / decay;
    return 1 - 0.25 * x; // decay to 0.75
  }
  if (i > len - release) {
    const x = (len - i) / release;
    return 0.75 * x * x; // gentle release
  }
  return 0.75;
}

function makeTrack(config) {
  const {
    name,
    seed,
    scaleType,
    rootSemi,
    droneMix,
    droneCoveage,
    melodyRate,
    melodyMix,
    shimmerChance,
    shimmerMix,
    tempoMod,
    slowLfoHz,
  } = config;
  const n = MUSIC_SR * MUSIC_SEC;
  const s = new Float32Array(n);
  const rng = lcg(seed);
  const scale =
    scaleType === 'major'
      ? buildScale(rootSemi, MAJOR_PENTA)
      : buildScale(rootSemi, MINOR_PENTA);

  const droneRoot = semitone(rootSemi);
  const droneFifth = semitone(rootSemi + 7);

  // Global fade so the loop point is inaudible.
  const fade = Math.floor(MUSIC_SR * 1.5);

  // Layer 1 — drone (root + fifth), swelling with a very slow LFO.
  for (let i = 0; i < n; i++) {
    const t = i / MUSIC_SR;
    const lfo = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(2 * Math.PI * slowLfoHz * t));
    let v =
      0.55 * Math.sin(2 * Math.PI * droneRoot * t) +
      0.35 * Math.sin(2 * Math.PI * droneFifth * t) +
      0.15 * Math.sin(2 * Math.PI * droneRoot * 0.5 * t); // sub-octave
    v *= lfo * droneCoveage;
    let fadeMult = 1;
    if (i < fade) fadeMult = i / fade;
    else if (i > n - fade) fadeMult = (n - i) / fade;
    s[i] += v * droneMix * fadeMult;
  }

  // Layer 2 — arpeggiated melody line, notes drawn from the scale.
  const noteDur = 1 / melodyRate; // seconds per note
  const noteLen = Math.floor(MUSIC_SR * noteDur);
  let noteStart = Math.floor(MUSIC_SR * 3); // let drone establish first
  while (noteStart < n - noteLen) {
    const noteIdx = Math.floor(rng() * scale.length);
    const freq = scale[noteIdx];
    const vel = 0.5 + 0.5 * rng();
    for (let i = 0; i < noteLen; i++) {
      const e = noteEnv(i, noteLen);
      const t = i / MUSIC_SR;
      const partial =
        0.65 * Math.sin(2 * Math.PI * freq * t) +
        0.25 * Math.sin(2 * Math.PI * freq * 2 * t) +
        0.1 * Math.sin(2 * Math.PI * freq * 4 * t);
      const globalIdx = noteStart + i;
      if (globalIdx < n) {
        let fadeMult = 1;
        if (globalIdx < fade) fadeMult = globalIdx / fade;
        else if (globalIdx > n - fade) fadeMult = (n - globalIdx) / fade;
        s[globalIdx] += e * vel * melodyMix * partial * fadeMult;
      }
    }
    // Occasional rest for phrasing
    if (rng() < 0.15) noteStart += noteLen * 2;
    else noteStart += noteLen * (1 + tempoMod * (rng() - 0.5));
    noteStart = Math.floor(noteStart);
  }

  // Layer 3 — shimmer (rare high-pitch bells, sparse)
  const shimmerLen = Math.floor(MUSIC_SR * 1.8);
  let shimmerStart = Math.floor(MUSIC_SR * 4);
  while (shimmerStart < n - shimmerLen) {
    if (rng() < shimmerChance) {
      const noteIdx = Math.floor(rng() * 3) + 4; // upper register only
      const freq = scale[noteIdx] * 2;
      for (let i = 0; i < shimmerLen; i++) {
        const t = i / MUSIC_SR;
        const e =
          Math.exp(-t * 1.5) *
          (1 - Math.exp(-t * 15));
        const globalIdx = shimmerStart + i;
        if (globalIdx < n) {
          let fadeMult = 1;
          if (globalIdx < fade) fadeMult = globalIdx / fade;
          else if (globalIdx > n - fade) fadeMult = (n - globalIdx) / fade;
          s[globalIdx] +=
            e *
            shimmerMix *
            (0.7 * Math.sin(2 * Math.PI * freq * t) +
              0.3 * Math.sin(2 * Math.PI * freq * 1.5 * t)) *
            fadeMult;
        }
      }
    }
    shimmerStart += Math.floor(MUSIC_SR * (2 + rng() * 3));
  }

  console.log(`track "${name}" composed`);
  return s;
}

const TRACKS = [
  { name: 'moonrise', seed: 101, scaleType: 'major', rootSemi: -21, droneMix: 0.28, droneCoveage: 1.0, melodyRate: 1.6, melodyMix: 0.14, shimmerChance: 0.45, shimmerMix: 0.06, tempoMod: 0.15, slowLfoHz: 0.05 },
  { name: 'petal_rain', seed: 202, scaleType: 'major', rootSemi: -14, droneMix: 0.22, droneCoveage: 1.0, melodyRate: 2.2, melodyMix: 0.13, shimmerChance: 0.6, shimmerMix: 0.06, tempoMod: 0.2, slowLfoHz: 0.08 },
  { name: 'kettle_song', seed: 303, scaleType: 'major', rootSemi: -19, droneMix: 0.3, droneCoveage: 1.0, melodyRate: 1.4, melodyMix: 0.15, shimmerChance: 0.35, shimmerMix: 0.05, tempoMod: 0.1, slowLfoHz: 0.07 },
  { name: 'firefly_waltz', seed: 404, scaleType: 'minor', rootSemi: -16, droneMix: 0.24, droneCoveage: 0.9, melodyRate: 1.8, melodyMix: 0.14, shimmerChance: 0.5, shimmerMix: 0.07, tempoMod: 0.25, slowLfoHz: 0.1 },
  { name: 'garden_at_dusk', seed: 505, scaleType: 'major', rootSemi: -17, droneMix: 0.32, droneCoveage: 1.1, melodyRate: 1.2, melodyMix: 0.12, shimmerChance: 0.4, shimmerMix: 0.05, tempoMod: 0.1, slowLfoHz: 0.04 },
  { name: 'silver_thread', seed: 606, scaleType: 'major', rootSemi: -12, droneMix: 0.26, droneCoveage: 0.95, melodyRate: 1.7, melodyMix: 0.13, shimmerChance: 0.55, shimmerMix: 0.06, tempoMod: 0.18, slowLfoHz: 0.06 },
  { name: 'sleeping_pond', seed: 707, scaleType: 'minor', rootSemi: -23, droneMix: 0.34, droneCoveage: 1.15, melodyRate: 1.1, melodyMix: 0.11, shimmerChance: 0.3, shimmerMix: 0.04, tempoMod: 0.12, slowLfoHz: 0.03 },
  { name: 'lanterns_vigil', seed: 808, scaleType: 'major', rootSemi: -18, droneMix: 0.3, droneCoveage: 1.05, melodyRate: 1.5, melodyMix: 0.13, shimmerChance: 0.42, shimmerMix: 0.06, tempoMod: 0.15, slowLfoHz: 0.05 },
  { name: 'first_star', seed: 909, scaleType: 'minor', rootSemi: -13, droneMix: 0.25, droneCoveage: 0.9, melodyRate: 2.0, melodyMix: 0.14, shimmerChance: 0.65, shimmerMix: 0.08, tempoMod: 0.22, slowLfoHz: 0.09 },
  { name: 'winter_brew', seed: 111, scaleType: 'minor', rootSemi: -20, droneMix: 0.36, droneCoveage: 1.2, melodyRate: 1.0, melodyMix: 0.1, shimmerChance: 0.25, shimmerMix: 0.04, tempoMod: 0.08, slowLfoHz: 0.03 },
];

for (const cfg of TRACKS) {
  const samples = makeTrack(cfg);
  writeWav(MUSIC_DIR, cfg.name, samples, MUSIC_SR, 0.6);
}

console.log(`\nGenerated ${TRACKS.length} ambient tracks + 9 SFX.`);
