# Phase Notes

## Phase 4 — Economy + Monetization (behind feature flags, stub providers)

### The `MonetizationProvider` seam

All IAP and ad calls route through a single interface at `src/monetization/types.ts`:

```ts
interface MonetizationProvider {
  purchase(sku: Sku): Promise<PurchaseResult>;
  showRewardedAd(placement: AdPlacement): Promise<AdResult>;
  showInterstitial(placement: AdPlacement): Promise<AdResult>;
  isPurchaseAvailable(): Promise<boolean>;
  isAdAvailable(placement: AdPlacement): Promise<boolean>;
}
```

- `MockProvider` in `mockProvider.ts` returns instant success (configurable purchase-fail-rate + ad-dismiss-rate). It's the only implementation today.
- `getProvider()` / `setProvider(...)` swap the process-wide default. Wire the RevenueCat / AdMob adapters here — no other code needs to change.

### Feature flags (`src/config/flags.ts`)

Hard-coded for Phase 4; hook a remote-config plugin in Phase 5 to flip in prod without a release:

- `iapEnabled` — gem packs, starter, piggy bank, subscription
- `adsEnabled` — rewarded ads + interstitials
- `battlePassEnabled` — Mini-Pass tab
- `piggyBankEnabled`, `segmentedOffersEnabled`, `subscriptionEnabled`
- `suppressInterstitialsOverride` — internal killswitch for interstitials

Every UI surface reads flags at render time; flipping one off hides its slot completely.

### Currencies (`src/state/profile.ts`)

- `coins`, `gems`, `embers`, `lives` (persisted)
- Lives: `LivesState = { lives, regenAt }`; max 5, 30 min per life. `materializeLives(state, now)` is pure and idempotent — every read projects forward against `Date.now()`.
- Consumed on `registerLoss`. Rescued via ad (`rescueLife` placement, 3/day cap) or IAP starter bundle.

### Streak (`src/monetization/streak.ts`)

Consecutive wins escalate through 3/5/7 tiers:
| Tier | Wins | Booster |
|---|---|---|
| Kindled | 3 | +2 moves |
| Simmering | 5 | +3 moves + free lineH special |
| Roaring | 7 | +4 moves + free bomb special |

`applyStreakBoosters(state, streak, seed)` is a pure transform on GameState — extra moves are added to `movesRemaining`, free specials are spawned at a seeded random plain cell. `GameScreen` applies this at newGame time.

The **continue screen** (see below) prominently shows the streak that will be lost if the player gives up.

### Fail-state continue flow

`ContinueScreen` opens when a level status flips to `lost`. It shows:
- Remaining objectives (e.g. "Only 2 vials left!")
- Streak card with current tier and `winsToNext`
- "+5 moves · 20 💎" primary CTA — pays gems, resumes level, **preserves streak**
- Rewarded-ad rescue if `extraMoves` daily cap unused (strictly 1/day per brief)
- "Give up" — resets streak, calls `registerLoss`, triggers segmented offer if applicable

### Store

`src/monetization/catalog.ts` defines:

**Gem packs (decoy anchoring):**
| SKU | USD | Gems | Per-gem cost | Tag |
|---|---|---|---|---|
| gems-small | $0.99 | 80 | 1.24¢ | — |
| gems-mid | $4.99 | 550 | 0.91¢ | **value** |
| gems-large | $19.99 | 2400 | 0.83¢ | — |
| gems-decoy | $99.99 | 9500 | 1.05¢ | **decoy** |

The mid-tier `value` pack sits between the cheapest (worst per-gem) and the decoy (deliberately worse per-gem than the tier above it). The decoy exists to anchor the mid-tier as the obvious buy.

**Starter bundle** — one-time, $1.99 → 300 gems + 1500 coins + 50 embers + 5 lives. Hidden after `starterBundleClaimed`.

**Piggy Bank** — every win drips 3 gems into a locked balance capped at 500. `isRipe()` fires at 80%. Player unlocks with a $2.99 IAP; balance transfers to gems and piggy resets.

**Segmented offers** — 3 fails on the same level trigger `offerFor(level, now)`, a 15-min limited SKU with contents biased toward the level's blockers (ivy/vine → extra embers, stoneRune → extra coins, frostGlass → extra gems). Only one active offer at a time.

**Apprentice's Oath** — monthly subscription stub, $4.99/mo. Suppresses interstitials, drips 30 gems/day via `claimDrip`, day-1 grant.

### Rewarded ads and interstitials

`src/monetization/ads.ts` tracks per-day per-placement counters:

| Placement | Daily cap |
|---|---|
| `rescueLife` | 3 |
| `coinDouble` | 5 |
| `mysteryBox` | 1 |
| `extraMoves` | 1 (brief-mandated) |
| `interstitialReturnToHub` | 6 |

Interstitials:
- **Only** on hub-return transitions (GameScreen `onNext`)
- Frequency-capped (6/day)
- Fully suppressed for players with `hasEverPurchased == true` OR an active subscription

The **Mystery Box** on the fixtures tab uses `rollMystery(seed)` — weighted table: 55% small (~100 coins + 5 embers), 30% medium, 12% jackpot-lite (5 gems), 3% "Rare Draught" (25 gems + 60 embers). Payout values are ~20-30% of the equivalent IAP.

### Battle Pass (Mini-Pass)

`src/monetization/battlepass.ts` — 14-day, 14-tier pass. Free + premium tracks. Premium unlock is a one-tap flag today; wire to a Sku in Phase 5.

XP sources (wired via `addBattlePassXp`):
- +cascades count per swap (Cascade challenge)
- +60 on any level win (daily-win credit)

Rewards scale linearly per tier; premium gets gems (every 3rd tier: 25 gems, else 10). Season expires after 14 days; `isExpired` gates further XP.

Daily/weekly challenge generators (`makeDailyChallenges(dayKey)`, `makeWeeklyChallenges(weekKey)`) produce structured challenge sets. Full tracking-and-claim UI is a Phase 5 polish pass — right now XP flows from gameplay directly.

### Wiring summary (what happens on which event)

| Event | Consequence |
|---|---|
| Level win | +coins/+embers/+xp; streak++; piggy drip; battle-pass XP |
| Level loss | consumeLife; streak=0; consecutiveFails++; if fails==3 → segmentedOffer |
| Level swap | battle-pass XP from cascades; companion charge from affinity matches |
| Hub return | interstitial (capped, purchaser-suppressed) |
| Hub mount | materialize lives; claim sub drip if any |
| Purchase | apply rewards; `hasEverPurchased=true` — kills future interstitials |
| Rewarded ad watched | bump per-placement counter for the day |

### Tunable knobs added

| Knob | Location |
|---|---|
| Feature flags | `src/config/flags.ts` |
| Continue cost (gems) | `src/screens/ContinueScreen.tsx` (`CONTINUE_COST_GEMS`) |
| Streak thresholds + boosters | `src/monetization/streak.ts` (`STREAK_TIERS`) |
| Gem pack contents + prices | `src/monetization/catalog.ts` |
| Piggy bank cap + accrual rate | `src/monetization/piggyBank.ts` |
| Ad daily caps | `src/monetization/types.ts` (`AD_DAILY_CAPS`) |
| Mystery box payout table | `src/monetization/ads.ts` |
| Segmented offer trigger + duration | `src/monetization/segmentedOffers.ts` |
| Battle-pass duration + tier XP curve | `src/monetization/battlepass.ts` |
| Subscription duration + daily drip | `src/monetization/subscription.ts` + `catalog.ts` |

### Tests added (57 new, 150 total)

- `MockProvider`: purchase success/failure, ad watch/dismiss, log hook
- `lives`: regen tick, cap, consume from max, grant-to-max clears regen, ms countdown
- `streak`: tier thresholds, winsToNext, applyBoosters deterministic seed, special spawn at tier 2+
- `catalog`: gem-pack decoy-per-gem ratio, starter/sub properties, getSku
- `piggyBank`: accrue, spillage at cap, claim, isRipe
- `ads`: per-day caps, day-flip reset, prune, mystery table distribution
- `segmentedOffers`: threshold trigger, active-offer suppression, expiry, blocker-biased contents
- `battlepass`: tier progression, expiry, reward composition, pendingClaimSummary premium gating
- `subscription`: activate, drip accumulation, claim-stamp, re-activate extends

### Known limitations / follow-ups

- Segmented-offer SKU isn't in the static `getSku(...)` lookup, so `profile.purchase(offer.sku.id)` synthesizes the reward inline in `GameScreen`. Migrate to a dynamic per-level SKU registry in Phase 5.
- Battle-pass challenge UI is minimal (XP flows in from gameplay but there's no explicit challenge card list yet).
- Real ad + IAP SDKs are drop-in replacements at `getProvider()` — but wiring StoreKit / Play Billing sandboxing takes a dev-build swap (Expo Go can't run those).
- Interstitial timing is "on hub return" per the brief. If we ship a longer session that lingers on the hub, we might want a second `interstitialSessionStart` placement — flag added, not wired.
- Sim regression at 10 attempts shows level-054 with 0 wins (known from M2 at 12.5 APS with 25 attempts — sample size, not a real regression).

---



## Phase 3 — Companions + Apothecary Hub

### Data flow

```
src/companions/         # collectibles + gacha + progression + effects
  types.ts / catalog.ts (10 companions across C/R/E/L)
  gacha.ts   → seeded pulls, pity, dup→shards
  progression.ts → XP curves, evolution
  effects.ts  → passive drop multipliers, active cast

src/expeditions/        # appointment mechanic
  types.ts / rewards.ts (deterministic seeded rewards, 30m/2h/8h)

src/hub/                # builder screen fixtures
  fixtures.ts (3 fixed slots, tap-to-build, permanent meta bonuses)

src/economy/            # per-level-win reward computation
  rewards.ts

src/state/
  profile.ts  → extended with currencies, companions, expeditions, hub
  ui.ts       → screen router (game ↔ hub) — ephemeral, not persisted
                so a fresh launch always drops on the game (brief: no title)

src/screens/
  GameScreen.tsx  → applies passive drop multipliers, tracks ability charge,
                    casts active ability, rewards on win, routes to hub
  HubScreen.tsx   → 3 tabs (fixtures / companions / expeditions)
```

### Companion roster (10)

- 4 common (Lumen Moth, Marsh Toad, Slate Newt, Reed Sparrow) — +6/10/15% affinity drop weight per tier
- 3 rare (Emberling Fox, Crescent Owl, Ivy Cat) — +10/15/22% affinity
- 2 epic (Astral Toad, Widowmoth) — +15/22/30% affinity
- 1 legendary (Moonchild Fox Spirit) — +5/8/12% GLOBAL drop weight

Distribution matches gacha odds so pulls feel varied but bounded.

### Gacha (Summoning Cauldron)

- Cost: **100 embers** per pull (`PULL_COST_EMBERS` in `gacha.ts`)
- Base rates: common 70% / rare 22% / epic 6.5% / legendary 1.5%
- **Pity**: 30 pulls without epic+ forces epic+; 90 pulls without legendary forces legendary
- Duplicates: award shards on the companion's record (common 1 / rare 3 / epic 10 / legendary 50)
- Deterministic given seed + owned set

### Companion progression

- **XP curve** per companion (5 thresholds). Common companions cap at level 6, epic/legendary progress slower per level but with more powerful passives
- **Evolution**: two thresholds gated by both level AND shards. Tier 1→2, 2→3. Passives step up at each tier
- Currently no visual tier change (tier is exposed on the collection card only) — real art drop lands here later

### Expeditions

- 3 durations: 30m / 2h / 8h. **Real time**, uses `Date.now()`. No backend — timer survives cold start (endsAt is absolute epoch).
- Max 2 concurrent slots (`MAX_SLOTS`). A companion can only be on one expedition at a time.
- Rewards deterministic given (companionId, duration, seed):
  - coins scale by rarity mult (common 1.0 → legendary 2.0) and jitter ±20%
  - embers/shards scale by rarity mult (no jitter)
  - Long expeditions have a 10% chance to return a premium gem — the only expedition path to gems

### Apothecary Hub — fixtures

Three fixed slots, tap-to-build, no inventory management (per brief):
| Fixture | Effect at max tier | Cost to max |
|---|---|---|
| Brass Cauldron | +50% embers earned | 1900 coins |
| Hanging Herb Wall | +50% coins earned | 2900 coins |
| Reading Tea Corner | -20% expedition duration | 3900 coins |

Level 0 = unlocked but not built. `computeFixtureBonuses` sums across all fixtures — used by profile on level-win rewards and expedition start.

### Progressive unlocks

- **Hub** at `highestUnlocked >= 3` (level 4 cleared) — win screen offers "Back to Apothecary" instead of "Next level"
- **Companions tab** at `highestUnlocked >= 6` (level 7 cleared) — locked chip on hub until then
- **Expeditions tab** at `highestUnlocked >= 9` (level 10 cleared)
- First launch: game screen only, boots straight into level 1

### Board integration

**Passive**: equipped companion's `chargedDropBoost` (or `globalDropBoost`) multipliers are applied to the level's `dropWeights` at `newGame` time via `applyDropMultipliers`. Keeps the engine unaware of companions.

**Active**: affinity-color matches per turn are tallied in the GameScreen via `chargeFromEvents(events, color)`. When `charge >= ability.cost`, the ability bar arms; tapping it calls `castAbility(state, ability, seed)` which returns a new board:
- `spawnPrism` / `spawnBomb`: pick a random plain colored cell (no blocker, no special) and transform it
- `shuffleBoard`: call the engine's `reshuffle`

Cast doesn't consume a move. Charge resets. Deterministic given seed.

### New tunable knobs

| Knob | Location |
|---|---|
| Gacha rates + pity thresholds | `src/companions/gacha.ts` |
| XP curves + evolution requirements | `src/companions/catalog.ts` |
| Expedition durations / base rewards / rarity multipliers | `src/expeditions/{types,rewards}.ts` |
| Fixture costs / effects | `src/hub/fixtures.ts` |
| Per-level-win reward formula | `src/economy/rewards.ts` |
| Unlock gates | `src/state/profile.ts` (`UNLOCK_HUB_AT`, `UNLOCK_COMPANIONS_AT`, `UNLOCK_EXPEDITIONS_AT`) |

### Tests added (36 new, 93 total)

- gacha: rates distribution, epic/legendary pity, duplicates → shards, determinism, rate sum
- progression: level-up cascade, XP cap, evolve level/shard gates, tier passives
- expedition rewards: base+jitter, rarity scaling, gem chance, ms helpers, determinism
- hub fixtures: upgrade cost, bonus composition
- companion effects: passive multipliers, charge counting, active cast (spawn variants, shuffle)
- economy rewards: loss zeros out, positive on win, scales with score

### Known limitations / follow-ups

- No visual tier-change art yet — companion tier is text on the collection card
- Active ability cast doesn't play any animation; the board just updates. Skia-particle flourish is Phase 3.5 polish
- Expedition timer is device-local — if the player changes the clock backward, they wait longer. Anti-cheat requires server-side stamping (Phase 5)
- Companions unlock at cleared-level 7 as the brief specifies; the first free companion is via a gacha pull with earned embers. If a player never pulls, they never see companions — consider a **first-companion grant** on hitting the unlock gate as a onboarding polish pass
- Battle pass, subscription, and gem economy are Phase 4

---



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
