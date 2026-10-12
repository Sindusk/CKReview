# Tanking panel (build plan)

Status: **built 2026-10-11/12; archived as the design record.** The
rules live in the module headers: `lib/mitigation/tanking.ts` (stream,
busters, short cooldowns), `tanking-plan.ts` (the optimizer problem),
`buster-kinds.ts`, `components/MitigationTanking.tsx` (the view, layout
C). What's unconfirmed is in [../open-items.md](../open-items.md),
"Tanking panel". Where the build departed from this plan:
- Busters taken as an overlap of a dual buster (one tank took both hits)
  are mechanic failures, left out (user).
- "One tank takes both hits" and invuln re-planning on shared busters
  were not built: the only dual busters so far (Vamp's Hardcore, Plummet)
  make soloing a failure or impossible.
- The Blackest Night is MP-gated and MP isn't logged, so its "unused"
  count is usage only.
- The window keeps only pulls with the latest pull's tank jobs.
- Busters reached in 1-2 window pulls are protected (never made worse),
  not planned.
- The user picked a mirrored one-clock layout (C) over this file's sketch.

Built on the shared optimizer engine (`lib/mitigation/optimize.ts`), with
the party Analysis in `lib/mitigation/plan.ts` as the worked example.
Design record: [mitigation-optimizer-plan.md](mitigation-optimizer-plan.md).

Read first:
- the headers of `lib/mitigation/analyze.ts` and `ffxiv-catalog.ts`
- the optimizer plan's "The model" and "The search"
- [lib/mechanics/README.md](../../lib/mechanics/README.md), "FFXIV boss
  debuffs don't reach every attack"

## Why

Tank busters were taken out of the Mitigation Analysis view (user,
2026-10-11). Tanks plan their mitigation as a pair, around busters and
the boss's auto-attacks, and that needs its own view for the raid lead.
It has two jobs:
1. **Busters:** show where tank mitigation fails or is weak, and where
   the tanks over-mitigate and take more than they need to. Suggest
   additional mitigation where it's missing.
2. **Damage outside busters:** reduce what the tanks take overall, mostly
   from auto-attacks. The user's example: Rampart was used on a buster
   the tank survives without it; put it on a heavy run of autos instead,
   because healers top the tank up after the buster anyway.

## Decisions (user, 2026-10-11)

1. **Both tanks' mitigation is in scope, including what they cast on each
   other** (Intervention, Heart of Corundum, The Blackest Night,
   Oblation, Nascent Flash). The two tanks work as a pair, and the panel
   must make that link explicit wherever a plan expects them to work
   together.
2. **A buster's check includes the next ~10 seconds.** The tank must
   survive the buster plus all enemy damage to them for
   `FOLLOW_UP_MS` = 10s after it, with no healing counted. Healing the
   tank within 10s is the healers' implicit job. The panel never
   recommends healing.
3. **Invulnerabilities are part of the plan.** On brutal busters,
   invulns should be considered. That matters most on:
   - **shared busters**, where both tanks are expected to take the hit
     and both mitigate
   - **dual busters**, where each tank is expected to take one hit
   Groups often "cheese" these with an invuln, and the buster's damage
   should decide where invulns go. Each job's invuln has a different
   cooldown (Hallowed Ground 420s, Superbolide 360s, Living Dead 300s,
   Holmgang 240s, per the catalog), and the plan has to respect that.
4. **Every amount is a percentage of the tank's max HP.** Never raw HP:
   the app covers level-synced fights, where raw numbers mean nothing
   across content. Healer GCDs aren't a usable unit either: each
   healer's oGCD heals differ in strength, and GCD healing is meant to be
   avoided anyway.

## The model

### 1. Tank damage stream

Build one stream per tank: **every enemy damage event on that tank**
(autos, busters, raidwides, DoT ticks), in % of their max HP before
mitigation and after. Today `analyze.ts` drops auto-attacks and DoTs from
hits, so this is a new pass over `PlayerInfo.damageTaken`. It reuses
`isTick`, `isAutoAttack` and the dead-body filter.

**Who is tanking** at each moment is whoever receives the boss's
auto-attacks. That covers tank swaps without any configuration. In a
two-boss fight each tank may hold one boss; key autos by source boss.

### 2. Busters

Busters are the existing tank-only hits (`MitigationHit.tankOnly`, raw
damage at least TANK_HIT_MIN_RAW of max HP on some tank). Each is
**classified by who it hit**:
- **single:** one tank
- **both tanks:** both tanks hit within the cluster. It's either a
  **shared** buster (one hit split between the tanks) or a **dual**
  buster (a hit on each tank). The log alone can't reliably tell them
  apart, so:
  - use a per-encounter label table (`lib/mitigation/buster-kinds.ts`,
    keyed by ability name) filled from the boss module's research model
  - fall back to "both tanks" when an ability has no label
- **one tank took both hits:** a dual buster where one tank took every
  part, usually under an invuln. That's the cheese. Detect it from the
  parts: one tank, two or more parts, the other tank untouched.

**Buster check: the buster plus its follow-up, judged from full HP.**
- **Margin** = 100% − the buster's damage − all of that tank's enemy
  damage in the next `FOLLOW_UP_MS`, as % of max HP. It assumes no
  healing, and uses the mitigation that was actually up on each event.
  Apply `DAMAGE_ROLL_BUFFER` as elsewhere.
- **The margin starts from full HP, not the logged HP before the
  buster.** The question is whether the tank's plan is enough. A tank
  entering a buster low is the healers' problem; show the logged HP
  before as a small marker beside the verdict, not as part of it.
- **Verdict bands:** reuse fail / under / good / over with the
  Mitigation thresholds (MARGIN_UNDER 15%, MARGIN_OVER 30%), but keep
  them as separate `TANK_*` constants so they can be tuned apart.
- **Under an invuln,** the buster passes, and its margin shows as
  "invuln". Covered damage counts as 0 for the invuln's duration (plus
  `trailingInvulnMs` for Living Dead's Walking Dead). The healing
  Holmgang, Living Dead and Superbolide need afterwards is the healers'
  implicit job, as in decision 2.

### 3. Damage outside busters

Over the window, sum each tank's damage taken in % of max HP. Every tank
cooldown placement is worth **the damage it reduced while it was up**,
counting everything that tank took in that window, the buster
included.

This treats buster damage and auto damage the same: healers have to heal
all of it. It's also where over-mitigation shows, because % mitigation
multiplies: Rampart alone on a 100%-raw buster saves 20% HP, but with
Guardian (40%) already up it saves only 12%. Moving Rampart off a
stacked buster onto an uncovered stretch of autos is worth more, as
long as the buster still passes.

### 4. Short cooldowns and gauge

Short tank cooldowns are meant to be pressed on cooldown: Holy Sheltron
(Oath gauge), Bloodwhetting, Heart of Corundum, The Blackest Night
(MP). Per tank, compare uses against possible uses in the pull, and show
the gap as "≈ N unused" with the damage that many would typically have
saved, in % HP. This covers the Oath gauge overcap in open-items, which
was 3–5 Holy Sheltrons never pressed on the Vamp Fatale kill. The
optimizer doesn't place these; they're assumed to be used on cooldown.

### 5. Eligible cooldowns

- **The tanks' own:** Rampart, the 40% cooldowns (Guardian, Damnation,
  Shadowed Vigil, Great Nebula), and Bulwark, Camouflage, Dark Mind and
  the like.
- **Cast on the co-tank:** Intervention, Heart of Corundum, The Blackest
  Night, Oblation, Nascent Flash.
- **Invulns.**
- **Excluded:**
  - party mitigation, which belongs to the Mitigation Analysis
  - healer single-target mitigation (Exaltation, Taurochole, Aquaveil…).
    It's still counted in the math wherever it was logged, but never
    moved or added.

**Tank shields scale with max HP** (The Blackest Night is 25% of the
target's max HP). Add a `shieldPctMaxHp` field to those catalog entries,
so an added shield has an exact size in % HP instead of the
median-absorb estimate. Verify each value against logged absorbs with
`scripts/check-mitigation-catalog.js` before using it.

**Cooldowns that also heal** (Bloodwhetting, Damnation's Primeval
Impulse, Holy Sheltron's Knight's Benediction, Heart of Corundum's
Clarity/Catharsis) are valued on mitigation only in the first version.
Crediting their logged self-healing is an open question below.

## The optimizer

The same engine as the Mitigation Analysis (`lib/mitigation/optimize.ts`),
with this panel's eligible entries and objective. The plan model is the
same: (player, entry, anchor hit), anchored to busters and to the
**heavy auto windows** below. So are the window (last 5 pulls,
overridable), the per-pull legality checks, the beam search and
PLAN_MAX_CHANGES = 3.

**Anchors:**
- every buster
- the heaviest windows of a tank's non-buster damage: for each
  cooldown duration, the start times maximizing that tank's damage in
  the window. Take the top few per tank that don't overlap a buster's
  check window.

**Objective,** lexicographic:
1. **Busters that fail or are under:** fewer, then a higher capped sum
   of margins (as in the Analysis plan).
2. **Tight busters** (good on the median, under in the worst pull):
   fewer.
3. **Total tank damage taken:** less, as % of max HP summed over both
   tanks and averaged over the window pulls.
4. **Invuln cost:** prefer a plan without an invuln on a buster when
   tiers 1–3 tie. Holmgang, Living Dead and Superbolide hand the healers
   a near-dead tank; Hallowed Ground doesn't, so it gets a lower cost.
5. **Fewer changes.**

**Hard constraint:** no buster that passes in the baseline may end under,
by median or worst pull.

**Invuln and cheese edits** (beyond shift, swap, add and drop):
- **invuln a buster:** place a free invuln on a buster. Its value is
  the mitigation it replaces, plus the cooldowns it frees for tier 3.
- **one tank takes both hits** (dual busters only): the other tank stops
  taking the hit, and the invulning tank takes every part. Estimate
  the moved hit's damage from the other tank's logged raw damage in %
  HP. It's covered by the invuln, so it only matters as a check that
  the invuln really lasts through every part.
- **Shared busters** are never re-planned this way in the first version:
  how the split damage changes when one tank is invulnerable needs
  confirming in-game first (open question).

**Working together.** A change that involves both tanks is always one
"do together" card naming both: an Intervention that replaces the
receiving tank's Rampart, or one tank invulning a dual buster so the
other keeps their cooldowns. The card says who casts on whom, for
example "Kade → Alice: Heart of Corundum".

## UI

Make it a third view in the Mitigation dialog, **Tanking**, beside
Analysis and Timeline. It shares the dialog's boss, group, pull and
window controls. It's visual-first, like the reworked Analysis view.

```
 Last [ 5 ] pulls ⓘ                   Busters: 1 under → 0 · Tank damage −38% HP · 2 changes
 MT Alice (PLD) ▁▂▅█▂▁▁▃▃▄▄▅▃▂▁█▇▁▂▁▂▃▃▄▅▅▃      bars: % max HP per 2s, coloured autos / busters / raidwides
   Rampart   ━━━━━          ━━━━━
   Guardian       ━━━━━━
   Hallowed                          ▓▓▓
 OT Kade (GNB)  ▁▁▁▁▁▃▁▁▁▁▂▂▂▁▁█▇▁▁▁▁▁▁▂▁▁
   HoC→Alice  ┃     ┃     ┃     ┃
 Busters  [Hardcore #1 · 24% · good] [Plummet #1 · 8% · under] [Ultrasonic #2 · invuln]
 Unused   Holy Sheltron ≈ 4 (≈ 30% HP)
 ┌ Do together ── Alice ────────────────────────────────────────────┐
 │ Rampart: Hardcore #1 → autos 2:10–2:30      Hardcore #1 31% → 22%  │
 │ Guardian: + Plummet #1                     Plummet #1 8% → 27%     │
 │ Tank damage −38% HP                                               │
 └───────────────────────────────────────────────────────────────────┘
```

- **One lane per tank:** damage taken as bars (% max HP per short bin,
  coloured by source). Under the bars, that tank's cooldowns as spans,
  and cooldowns the co-tank cast on them as ticks labelled with the
  caster. Busters are marked on the lane with their verdict colour.
  Hovering a bar shows the numbers.
- **Buster strip:** one chip per buster with its follow-up margin and
  verdict, or "invuln". A shared or dual buster's chip shows both tanks.
  Clicking a chip opens the existing hit details panel.
- **Unused short cooldowns:** one line per tank.
- **Changes:** the Analysis view's cards, showing buster margins and
  tank damage before → after.
- **Player picker:** a picked tank sees their lane, their chips and the
  cards involving them. Non-tanks see the view unfiltered.
- In "one pull" mode, the lanes show that pull. In all-pulls mode, they
  show the median pull of the window: the one whose total tank damage is
  the median. Say so in the ⓘ tooltip.
- Same styling rules as the optimizer plan: inline styles, timeline
  helpers, no visual verification loop unless asked.

## Build order

Commit after each step once `validate.js --check` and `tsc` pass.

1. **Tank stream and busters:**
   - the damage stream per tank, and who is tanking at each moment
   - buster classification and the follow-up margin from full HP
   - a `tanking` print in the `mitigation-analysis` runner
     (`scripts/validate.js`)
   - Run it on Vamp Fatale (`jN3XDrf2z8PmLgRJ`) and Red Hot and Deep
     Blue (A/B/C). **Show the user the buster table** with each kind,
     margin and invuln before going further. They know which busters
     are shared or dual and how the group handles them; fill
     `buster-kinds.ts` from their answers.
2. **`shieldPctMaxHp`** for the tank shields, verified against the logs.
3. **Unused short cooldowns** per tank, plus the print.
4. **Optimizer objective and edits** for the tanking view, reusing the
   engine. Test on a synthetic case that recreates the user's example
   (Rampart on a survivable buster, heavy autos after it), then on the
   samples.
5. **UI:** lanes, chips, cards and the picker.
6. **Docs:**
   - module headers hold the rules
   - add a "Tanking panel" entry to `docs/open-items.md` with the
     builder's tunables marked "chosen by the builder, not yet
     confirmed"
   - archive this file

## Tunables (start values)

| Constant | Start | Meaning |
|---|---|---|
| `FOLLOW_UP_MS` | 10_000 | damage after a buster that must be survived (user) |
| `TANK_MARGIN_UNDER` / `TANK_MARGIN_OVER` | 0.15 / 0.30 | buster verdict bands (builder) |
| heavy-window anchors per tank | 3 per cooldown duration | auto windows the optimizer may target (builder) |
| invuln costs | Hallowed low; Holmgang, LD, Bolide higher | tie-break only (builder) |

## Open questions to raise with the user as they come up

- **Shared busters:** with one tank invulnerable, does the other still
  take half, or the full hit? This decides whether shared busters can
  be re-planned.
- **Cooldowns that heal:** should Bloodwhetting and Clarity's logged
  self-healing count against damage taken?
- **Two-boss fights:** when each tank holds a boss, check that "who is
  tanking" by auto source matches what the group calls MT and OT.
- **Starting from full HP:** whether busters taken right after another
  heavy hit (no time to heal) should start from the logged HP instead.
