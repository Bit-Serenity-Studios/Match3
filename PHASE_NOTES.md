# Phase Notes

## Phase 1 — Engine + Board Renderer

- Pure-TS deterministic Match-3 engine at `src/engine/` (zero React deps).
- Skia + React Native board renderer at `src/game/BoardView.tsx`.
- `GameScreen` boots directly into level 1 — no title, no dialogue.
- Engine public API: `newGame`, `applySwap`, `hint`, `serialize/deserialize`, `withDifficulty`.
- Balance in `src/config/` only: cascade multipliers, blast radius, ivy cadence, blocker layers, drop weights, palette.
- **Ivy shares the main RNG stream** in P1. Adding new RNG consumers later WILL shift existing seeds — worth revisiting before Phase 3.

## Phase 2 — Level System + Balance Simulator

### Data flow

```
scripts/gen-levels.mjs  →  levels/*.json  ←  hand-tune here
                          ↑
      pacing table (60 rows)  →  src/levels/generated.ts (auto)
                                         ↓
                        src/levels/schema.ts (validator)
                                         ↓
                          src/levels/catalog.ts (LEVELS)
```

- `levels/level-001.json` … `levels/level-060.json` are the source of truth for level design. Regenerating with `npm run levels:generate` re-emits every file from the pacing table AND rewrites `src/levels/generated.ts`; hand-tunes are overwritten.
- `src/levels/schema.ts` validates every field at load time (strict). Unknown fields error out at boot, not at play.

### The 60-level pacing curve

- **1-5**: tutorial. 6×7 grid, 28-36 moves, single collect objective (8-16 tiles). Near-impossible to fail.
- **Waves after 5**: `wow → procrastinating × (2-3) → hard`
- Hard checkpoints at levels 10, 18, 27, 36, 45, 54 (gaps 8-9 apart)
- Level 60 is a celebration `wow` — the plateau after wave 12
- Every level is beatable with zero boosters — verified by the sim (max APS 12.5 on the hardest level, i.e. the myopic bot still wins ~8% of attempts).

### Simulator results at ship (25 attempts/level, myopic bot)

| Archetype        | APS range (bot)   | In-band?        |
|------------------|-------------------|-----------------|
| tutorial (5)     | 1.00              | ✓ all in band   |
| wow (23)         | 1.00-1.04         | ✓ all in band   |
| procrastinating (26) | 1.47-2.78     | ✓ all in band   |
| hard (6)         | 1.92-12.50 (ramping) | 5/6 flagged as easier than 6-18 band — early hards intentionally ease in |

### CLI simulator (`npm run sim`)

**Two bot modes.** Default is the **myopic** heuristic: scores each swap by the immediate match footprint (findMatches on the swapped board) without simulating the cascade — this mimics realistic human play. Pass `lookahead: true` to `chooseSwap` for the expert-play bot that fully simulates each candidate. The default sim uses myopic; that's what the APS ranges above are calibrated to.

Myopic scoring (`tools/simulator/bot.ts`):
- 1 pt / tile in each match
- +3 for a match-4, +8 for a match-5
- +5 for L/T (bomb-forming) matches
- Objective-color bonus: up to +5 for matches that contribute to a still-open collect objective, weighted by remaining need
- +1.2 per adjacent blocker
- +6 for special-tile swaps (prism activation, special+special combo)
- Score-tie break: seeded jitter, so different attempts on the same board pick different top swaps

Report columns:
- **APS** attempts / wins — Infinity if no wins
- **target** archetype APS band
- **~moves** mean moves remaining on wins
- **failΔ** median fail-margin (mean fraction of remaining need per unfinished objective, over the fail set)
- **flags**: `easy` (below band), `hard` (above band), `blowout` (median fail-margin > 0.35 on hard levels)

Archetype APS targets (`APS_TARGETS` in `runner.ts`):

| Archetype        | APS band  |
|------------------|-----------|
| tutorial         | 1.0-1.15  |
| wow              | 1.0-1.4   |
| procrastinating  | 1.4-3.5   |
| hard             | 6-18      |

`npm run sim` is informational (always exits 0). `npm run sim:strict` exits non-zero on any outlier — use in CI.

### Dynamic difficulty

- `src/state/profile.ts` — Zustand store persisted to AsyncStorage. Tracks `consecutiveFails: Record<levelId, number>`.
- On win: fails are cleared for that level.
- On 4+ consecutive fails: `difficultyEaseFor(n)` returns a positive modifier (0.15 → 0.35 max) fed to `withDifficulty(state, mod)`. The engine's `applyRefill` uses this to bias favorable-color drops upward. Bounded so the game never becomes trivial.
- `GameScreen` reads the profile and applies the ease at `newGame` time.

### Tunable knobs added in Phase 2

| Knob | Location | Notes |
|---|---|---|
| Bot scoring weights | `tools/simulator/bot.ts` | Adjust to make the sim more/less generous. |
| APS target bands | `tools/simulator/runner.ts` | Per archetype. |
| Difficulty ease threshold / max | `src/state/profile.ts` | Threshold=4 fails, max mod=0.35. |
| Level pacing table | `scripts/gen-levels.mjs` | 60 archetypes + per-archetype builders. |

### Known limitations / tuning todos

- The first three hard checkpoints (level-010, 018, 027) sim at APS 1.9-3.6, below the 6-18 band. This is intentional as a progression ramp — but if a real balance designer wanted them in-band, tighten `hardLevel(i, hardIndex)` in the pacing table (fewer moves, higher targets).
- Hard levels 036 and 045 flagged as "blowout" — median fail-margin > 0.35 means when the myopic bot fails, it fails wide. Real-player data (Phase 5 telemetry) will tell us whether this matches human fail patterns.
- Bot doesn't consider prism-only activations that produce no direct match. Levels heavily gated by prism plays would fool it — none of the shipped 60 are.
- Bot's myopic mode uses ONE-move immediate matching. Cascades are unpredicted, so long chain-heavy plays are under-scored. The expert bot (`lookahead: true`) would over-score them the other way. A learned bot from real play data would be the next step.
- Fail-margin is averaged across unfinished objectives. A "1 objective almost done, other blown out" fail reports mid-range; per-objective breakout is Phase 5.
- Sim `seedStride=1` means N attempts play N different starting boards (via `level.seed + i`). Use `seedStride: 0` for a fixed-seed replay.

### Running

```bash
npm run levels:generate  # regen JSONs + generated.ts from pacing table
npm run sim              # sim all 60 levels (informational; always exits 0)
npm run sim:strict       # same but exits non-zero on outliers — for CI
npm run sim -- --attempts 100 --json report.json
npm run sim:one -- level-018
npm test                 # engine + level catalog + profile tests
```
