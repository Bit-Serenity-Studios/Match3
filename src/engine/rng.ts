/**
 * Mulberry32 seeded PRNG. Deterministic across platforms. State is a single
 * uint32; snapshot() returns it, restore() replays it. Every engine consumer
 * threads state through explicitly — no module-level randomness.
 */

const UINT32 = 0x100000000;

export function seedFrom(input: number): number {
  // Normalize to uint32 and avoid a zero state which stalls mulberry32.
  let s = (input | 0) >>> 0;
  if (s === 0) s = 0x9e3779b9;
  return s;
}

export function next(state: number): { value: number; state: number } {
  let t = (state + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
  t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
  const rand = ((t ^ (t >>> 14)) >>> 0) / UINT32;
  return { value: rand, state: t >>> 0 };
}

export function nextInt(
  state: number,
  maxExclusive: number,
): { value: number; state: number } {
  const r = next(state);
  return { value: Math.floor(r.value * maxExclusive), state: r.state };
}

export function pickWeighted<T>(
  state: number,
  items: readonly T[],
  weights: readonly number[],
): { value: T; state: number } {
  if (items.length === 0) {
    throw new Error('pickWeighted: empty items');
  }
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) {
    const r = nextInt(state, items.length);
    return { value: items[r.value] as T, state: r.state };
  }
  const r = next(state);
  const target = r.value * total;
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += Math.max(0, weights[i] ?? 0);
    if (target < acc) return { value: items[i] as T, state: r.state };
  }
  return { value: items[items.length - 1] as T, state: r.state };
}

/** Advance the RNG by n steps deterministically (for sub-streams). */
export function advance(state: number, n: number): number {
  let s = state;
  for (let i = 0; i < n; i++) s = next(s).state;
  return s;
}
