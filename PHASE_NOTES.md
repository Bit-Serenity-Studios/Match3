# Phase Notes

## Phase 4 — Economy + Monetization (behind feature flags)

### Data flow

```
src/monetization/           # pure-TS, zero React
  types.ts                  # Grants, ProductDef, AdPlacement, BoosterId
  provider.ts               # MonetizationProvider iface + MockProvider
                            #   + rollMysteryBox + MYSTERY_BOX_TABLE
  catalog.ts                # gem SKUs (decoy anchor), starter bundle,
                            #   piggy unlock, subscription, battle pass
  lives.ts                  # 5 max, 30-min regen, sync/spendLife/grantLives
  streak.ts                 # 3/5/7 tiers, pre-level booster grants
  continue.ts               # priceForContinue + summarizeFail
  offers.ts                 # segmented-offer detection + mint
  piggyBank.ts              # drip / crack / cap
  ads.ts                    # daily caps + interstitial gap policy
  battlePass.ts             # 14-day mini-pass, XP, challenges, rewards
  subscription.ts           # Apprentice's Oath state helpers
  singleton.ts              # app-wide provider instance (Mock by default)
  index.ts

src/state/
  featureFlags.ts           # all Phase-4 surfaces are flagged
  monetization.ts           # Zustand+AsyncStorage persistence store
                            #   (lives, streak, piggy, ads, pass,
                            #    subscription, boosters, offers)
  profile.ts (extended)     # addCurrency, spendGems

src/screens/
  ContinueScreen.tsx        # +5 moves priced in gems; streak-at-risk
                            # copy; watch-ad rescue option
  StoreScreen.tsx           # gem packages + starter + piggy + sub + pass
  PassScreen.tsx            # XP bar, challenges list, reward tracks
  GameScreen.tsx (extended) # routes fail into ContinueScreen, wires
                            # streak / piggy / pass-challenge progress,
                            # segmented-offer trigger on give-up
```

### MonetizationProvider interface

Adapter contract — RevenueCat / AdMob adapters slot in here at App boot
via `setMonetization()`.

```ts
interface MonetizationProvider {
  init(): Promise<void>;
  listProducts(): Promise<ProductDef[]>;
  purchase(sku): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult[]>;
  subscribe(sku): Promise<PurchaseResult>;
  querySubscription(sku): Promise<SubscriptionStatus>;
  loadRewardedAd(placement): Promise<void>;
  showRewardedAd(placement, ctx?): Promise<AdRewardResult | null>;
  loadInterstitial(): Promise<void>;
  showInterstitial(): Promise<boolean>;
}
```

`MockProvider` returns instant success, logs every call to
`provider.log[]` (visible to the Phase-5 dev dashboard).

### State split — persistent vs ephemeral

**Persistent (monetization store, `AsyncStorage`):**
lives + refill epoch, streak count+best, piggy balance + cycleId,
`purchasedSkus[]` + `everPurchased` flag (kills interstitials),
active offers with expiry, ad counters keyed by day, battle pass season
+ xp + claimed sets, subscription expiry, boosters inventory,
`continueAttemptsThisLevel`.

**Ephemeral (UI store, not persisted):**
`continueOpen`, `pendingOfferSku`, current screen.

### Fail-state → continue → offer flow

1. Player runs out of moves → `ContinueScreen` overlays the board.
2. Screen shows exact remaining objectives ("Only 2 vials left!") from
   `summarizeFail()` and the streak that will be lost.
3. Player either:
   - buys `+5 Moves` for `priceForContinue(attemptIndex)` gems
     (`[40, 65, 95]` escalating) — profile debits, state resumes with
     `movesRemaining += 5`, streak preserved
   - watches a rescue rewarded ad (capped) — `MockProvider` grants +1 life
   - gives up → streak resets, `maybeMintOffer` runs. On the 3rd
     consecutive fail of a level a segmented offer is minted with a
     15-min TTL and boosters picked to counter the level's dominant
     obstacle (frost glass → color bomb + hammer, ivy → hammer +
     extra moves, color objective → color bomb of that color, etc.)

### Gem store decoy anchoring

| SKU              | Price   | Gems | $/gem  | Badge      |
|------------------|---------|------|--------|------------|
| gems.small       | $0.99   | 20   | $0.049 | –          |
| gems.medium      | $4.99   | 120  | $0.042 | popular    |
| gems.large       | $9.99   | 260  | $0.038 | best_value |
| gems.whale       | $49.99  | 1200 | $0.042 | anchor     |

The whale SKU exists to anchor perception — its per-gem rate is worse
than `gems.large`, making the large tier read as a bargain. Test in
`catalog.test.ts` verifies this invariant (anchor rate < best rate).

### Piggy Bank

Drips gems from play (level win: +1, hard-level win: +3, expedition
claim: +2) into a locked balance capped at 250. A one-time IAP
(`piggy.unlock`, $2.99) transfers the balance and starts a new cycle
(`cycleId++`), so the bank refills across sessions.

### Rewarded ads

Placement → daily cap:

| Placement              | Cap |
|------------------------|-----|
| outOfLivesRescue       | 2   |
| coinDoublePostLevel    | 3   |
| mysteryBoxDaily        | 1   |
| interstitialHubReturn  | 4   |

Interstitials only trigger on return-to-hub transitions and are
suppressed entirely for anyone with `everPurchased=true` OR active
subscription. Minimum 3 minutes between interstitials.

Mystery Box table: 55/25/12/6/2 for
small-coins/medium-coins/embers/medium-gems/jackpot-gems. Deterministic
given seed. Extra-moves are ONLY sold for gems or granted by the
rescue ad — no meta reward path grants extra moves (per brief).

### Battle Pass (Mini-Pass)

14-day seasons. Season 0 anchor: 2025-01-05T00:00:00Z; `seasonIdFor(now)`
derives the current season. `XP_PER_LEVEL = 100`, `PASS_LEVELS = 30`.
30 reward levels, both tracks (free stingy; premium seeds gems every
5 levels). Challenges refresh on season rollover.

Challenge → XP → pass level → reward claim. Claim is idempotent per
`level×track`. Premium requires the $4.99 `pass.mini14.premium` IAP.

### Apprentice's Oath subscription

30-day period, +5 gems/day drip claimable on a 24h cooldown, cosmetic
nameplate flag, no interstitials. `activate()` extends past current
expiry (safe to double-buy).

### Feature flags

`src/state/featureFlags.ts` exposes `getFlags()` / `setFlags()`. All
Phase-4 surfaces (store, continue, piggy, ads, pass, subscription,
starter, offers) can be individually toggled — a build shipping any
subset is possible with zero code changes.

### Tunable knobs added in Phase 4

| Knob                                              | Location |
|---------------------------------------------------|---|
| Continue price ladder (gems)                      | `monetization/continue.ts` (`CONTINUE_PRICE_GEMS`) |
| Extra-moves granted per continue                  | `monetization/continue.ts` (`CONTINUE_EXTRA_MOVES`) |
| Segmented offer trigger threshold + TTL           | `monetization/offers.ts` |
| Gem SKU pricing + gem counts                      | `monetization/catalog.ts` (`GEM_PACKAGES`) |
| Starter bundle + subscription payloads            | `monetization/catalog.ts` |
| Life max + regen minutes                          | `monetization/lives.ts` |
| Streak tier thresholds + booster grants           | `monetization/streak.ts` |
| Piggy cap + drip amounts                          | `monetization/piggyBank.ts` |
| Daily ad caps + interstitial gap                  | `monetization/ads.ts` |
| Mystery-box payout table                          | `monetization/provider.ts` |
| Pass season length + XP curve + rewards           | `monetization/battlePass.ts` |
| Subscription period + daily drip amount           | `monetization/subscription.ts` |
| All feature flags                                 | `state/featureFlags.ts` |

### Tests added (63 new, 156 total)

- lives: full-start, regen accrual, cap clamp, timer clearing, empty spendLife
- streak: tier thresholds, win increment, loss reset, continue preserves
- piggy: drip cap, ignore-negatives, crack payout + cycle
- ads: daily cap enforcement, day rotation, purchaser/subscriber
       interstitial blocks, min-gap policy, per-placement independence
- continue: price monotonicity + cap, summarizeFail objective breakout
- offers: trigger condition, dominant-obstacle detection, blocker-specific
       booster contents, TTL stamping, purge expired
- catalog: decoy anchor invariant, starter bundle grants,
       best_value SKU has best $/gem rate
- provider (mock): purchase happy/error path, subscribe filter, coin-double
       returns baseCoins, rescue grants life, mystery box determinism +
       rare jackpot band
- battle pass: season roll, challenge progress + XP, idempotent claims,
       premium gating, pass-level formula
- subscription: activate stamps 30d, daily drip 24h cooldown, expiry

### Known limitations / follow-ups

- No real IAP receipt validation — `MockProvider.restore()` returns an
  empty list. A RevenueCat adapter replaces this with server-side
  entitlement checks.
- `everPurchased` is set on any successful purchase (including offers
  and gem SKUs); a real production build may want to distinguish "high
  intent" purchasers (subscription, starter) from a single tiny gem buy.
- Segmented offers are stored globally; a per-level cap limits abuse
  (one active offer per level) but multiple stuck levels can queue up.
  Consider a global cap of 2 concurrent offers.
- Ad-provider adapter (AdMob) still needs writing — the interface is
  ready, but frequency capping + eCPM shaping remain to be tuned with
  Phase-5 telemetry data.
- Continue-screen doesn't consume streak-tier boosters yet — the
  pre-level grant runs on level start; a hook into board setup
  (Phase 4.5 polish) will materialize them onto the board.

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
