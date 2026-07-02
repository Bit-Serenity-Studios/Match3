# Phase 1 — Engine + Board Renderer

## What ships

- Pure-TS deterministic Match-3 engine at `src/engine/` (zero React deps).
- Skia + React Native board renderer at `src/game/BoardView.tsx`.
- `GameScreen` boots directly into tutorial level 1 — no title, no dialogue.
- 38 unit tests covering RNG, matches, specials/combos, blockers, gravity, shuffle,
  determinism, serialize/deserialize.

## Public engine API (surface)

Everything the UI, simulator, and future daily-challenge feature call:

- `newGame(level)` → `GameState`
- `applySwap(state, a, b)` → `{ next, events, accepted }`
- `hint(state)` → `[CellPos, CellPos] | null`
- `serialize/deserialize`
- `withDifficulty(state, mod)` (Phase 2 hook)

Internal helpers are re-exported from `src/engine/index.ts` for testability.

## Tunable knobs (all in `src/config/`)

| Knob | File | Notes |
|---|---|---|
| Cascade base/bonus scores + step multiplier curve | `engine.ts` | `stepMultiplier(step)` currently `1 + step*0.5`. Cascades cap at `maxCascadeSteps=40` (safety, not gameplay). |
| Bomb blast radius | `engine.ts` | Chebyshev radius, default 1 → 3x3. |
| Blocker start-layers | `engine.ts` | Vine=2, Frost=1, StoneRune=1, Ivy=1. |
| Ivy spread cadence + cap | `engine.ts` | Every 1 turn, capped at 12 cells. |
| Shuffle attempts before falling back | `engine.ts` | 32. |
| Default drop weights | `dropWeights.ts` | Uniform 1s. |
| Tile palette + glyphs | `tiles.ts` | Placeholder art via colored rounded rects + glyph. |

## Notable design decisions

- **RNG**: single mulberry32 uint32 state, threaded through explicitly. `seedFrom(0)` maps to a non-zero constant so `seed: 0` still works. See `src/engine/rng.ts`.
- **Ivy spread + gravity refill share the RNG stream.** The brief called for ivy to use a "labeled sub-stream" so future consumers don't shift existing seeds; we skipped that in P1 to keep the state one uint32. Adding new RNG consumers later WILL change existing seeds — flag for Phase 2.
- **Board events are the only cross-cutting bus**: engine returns an ordered `BoardEvent[]` per swap; the UI plays them, the simulator ignores them, telemetry (Phase 5) will subscribe to them.
- **Immutability**: `applySwap` returns a new `GameState`. Structural sharing where cheap (mask array, drop weights).
- **Storage**: Zustand is a dependency but not yet wired — coming in Phase 3 (meta-game persistence). Persistence layer will be AsyncStorage in Expo Go; a config flag will swap to MMKV in dev builds later.

## Running

```bash
npm install
npm test          # 38 tests
npm run typecheck # strict TS
npm start         # Expo Go
```

## Known limitations to address later

- `hasValidMove` only considers direct-match swaps; a board where the only move is prism activation gets flagged as "no moves". Rare in practice, but note for Phase 2 simulator.
- No animation of tile movement yet in the renderer — cascade result is applied atomically, with a small screen-shake per cascade step ("juice" placeholder). Tile-tween animations, particle bursts, and combo escalation are Phase 1.5 polish, tracked separately from correctness.
- Cell-mask irregular shapes are supported by the engine and helper but only the rectangular default is exercised by the shipped level.
