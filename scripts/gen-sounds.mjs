/**
 * Sound-effect generator. Emits 16-bit PCM WAV files under
 * `assets/sounds/` for a small set of gameplay events. Sounds are
 * deliberately short and lightweight — this is placeholder audio for
 * testing; production would replace the outputs with authored assets.
 *
 * Usage: node scripts/gen-sounds.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'sounds');
mkdirSync(OUT_DIR, { recursive: true });

const SR = 22050; // sample rate

/** Write a WAV file from a Float32Array of samples in [-1, 1]. */
function writeWav(name, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  // RIFF header
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767 * 0.85), 44 + i * 2);
  }
  const path = join(OUT_DIR, `${name}.wav`);
  writeFileSync(path, buf);
  console.log(`wrote ${path} · ${(buf.length / 1024).toFixed(1)}KB · ${(n / SR).toFixed(3)}s`);
}

/** Simple envelope helpers. */
const env = (i, n, attackFrac = 0.05, releaseFrac = 0.5) => {
  const attack = Math.floor(n * attackFrac);
  const release = Math.floor(n * releaseFrac);
  if (i < attack) return i / attack;
  if (i > n - release) return (n - i) / release;
  return 1;
};

function sine(freq, i, sr = SR) {
  return Math.sin((2 * Math.PI * freq * i) / sr);
}

/* ─── Sound designs ─────────────────────────────────────────────────── */

// click — short soft tap for buttons
function makeClick() {
  const dur = 0.06;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = env(i, n, 0.02, 0.9);
    s[i] = e * 0.4 * (sine(1600, i) + 0.3 * sine(2400, i));
  }
  return s;
}

// swap — quick pitch glide
function makeSwap() {
  const dur = 0.15;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const f = 520 + t * 360;
    const e = env(i, n, 0.05, 0.6);
    s[i] = e * 0.4 * sine(f, i);
  }
  return s;
}

// match — bright chime
function makeMatch() {
  const dur = 0.32;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = env(i, n, 0.02, 0.7);
    s[i] =
      e *
      0.45 *
      (0.55 * sine(880, i) +
        0.3 * sine(1320, i) +
        0.15 * sine(1760, i));
  }
  return s;
}

// chain — longer, richer chord for combos
function makeChain() {
  const dur = 0.5;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = env(i, n, 0.02, 0.7);
    s[i] =
      e *
      0.45 *
      (0.4 * sine(660, i) +
        0.3 * sine(880, i) +
        0.25 * sine(1100, i) +
        0.15 * sine(1320, i));
  }
  return s;
}

// reject — low buzz
function makeReject() {
  const dur = 0.18;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = env(i, n, 0.02, 0.7);
    // sawtooth-ish via two detuned squares
    const a = Math.sign(sine(180, i));
    const b = Math.sign(sine(220, i));
    s[i] = e * 0.28 * (a + b);
  }
  return s;
}

// win — brief C-major arpeggio
function makeWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  const noteDur = 0.14;
  const gap = 0.02;
  const total = notes.length * (noteDur + gap);
  const n = Math.floor(SR * total);
  const s = new Float32Array(n);
  notes.forEach((f, ni) => {
    const start = Math.floor(SR * ni * (noteDur + gap));
    const len = Math.floor(SR * noteDur);
    for (let i = 0; i < len; i++) {
      const e = env(i, len, 0.05, 0.5);
      const idx = start + i;
      if (idx < n) {
        s[idx] += e * 0.4 * (sine(f, i) + 0.3 * sine(f * 2, i));
      }
    }
  });
  return s;
}

// lose — descending sad tones
function makeLose() {
  const notes = [440, 349.23, 293.66]; // A4 F4 D4
  const noteDur = 0.22;
  const gap = 0.05;
  const total = notes.length * (noteDur + gap);
  const n = Math.floor(SR * total);
  const s = new Float32Array(n);
  notes.forEach((f, ni) => {
    const start = Math.floor(SR * ni * (noteDur + gap));
    const len = Math.floor(SR * noteDur);
    for (let i = 0; i < len; i++) {
      const e = env(i, len, 0.06, 0.6);
      const idx = start + i;
      if (idx < n) {
        s[idx] += e * 0.42 * sine(f, i);
      }
    }
  });
  return s;
}

// splash — soft ascending pad for the boot sequence
function makeSplash() {
  const dur = 0.9;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const e = env(i, n, 0.2, 0.5);
    const f = 220 + t * 220;
    s[i] =
      e *
      0.28 *
      (sine(f, i) + 0.5 * sine(f * 1.5, i) + 0.25 * sine(f * 2, i));
  }
  return s;
}

// toast — subtle up-tick when a match popup appears
function makeToast() {
  const dur = 0.14;
  const n = Math.floor(SR * dur);
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const e = env(i, n, 0.02, 0.7);
    const f = 900 + t * 400;
    s[i] = e * 0.35 * sine(f, i);
  }
  return s;
}

writeWav('click', makeClick());
writeWav('swap', makeSwap());
writeWav('match', makeMatch());
writeWav('chain', makeChain());
writeWav('reject', makeReject());
writeWav('win', makeWin());
writeWav('lose', makeLose());
writeWav('splash', makeSplash());
writeWav('toast', makeToast());
