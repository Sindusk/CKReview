# Mitigation Analysis: auto-optimizer (build plan)

Status: **built 2026-10-11.** Archived as the design record; the live
rules are the headers of `lib/mitigation/plan.ts` (party Analysis),
`optimize.ts` (generic engine), `debuff-reach.ts` and
`debuff-reach-overrides.ts`. Builder tunables and open questions are in
[open-items.md](../open-items.md), "Mitigation optimizer".

Decided during the build (user, 2026-10-11), beyond the plan below:
- **An attack is its ability name plus the actor that dealt it.** Red Hot
  and Deep Blue each cast their own Divers' Dare at once, and a boss's
  debuff reduces only its own copy. M10S corrections are in the overrides
  file.
- **Which boss a player debuffs is decided per hit:** the boss their
  debuff was on when they used it for that hit in other pulls, else their
  usual boss.
- **Gated entries may be added**, marked with their gate (the three-hit
  example needs it). Only moves were planned.
- **The roll buffer applies to a change's delta only**, so untouched hits
  keep their logged margins and the Analysis agrees with the Timeline.
- **Tier 3 only when nothing is failing or tight.** Otherwise its moves
  only spend headroom.
- **No separate drop edit:** a drop used elsewhere is a shift.
- **Party rules live in plan.ts**, the generic engine in optimize.ts, and
  the search runs in a web worker (0.2-2s on a 5-pull window).

Read first (when it was planned):
- the headers of `lib/mitigation/analyze.ts`, `aggregate.ts`, `plan.ts`
  and `notes.ts`, which hold the current rules this plan builds on
- [lib/mechanics/README.md](../../lib/mechanics/README.md), "FFXIV boss
  debuffs don't reach every attack": the hardest part of this work

## Why

The Analysis view (`components/MitigationPlan.tsx`, `lib/mitigation/plan.ts`)
shows too much text and is hard to read (user, 2026-10-11). The Spare
Mitigation section is the worst of it. It also can't find the changes
that are worth the most to a progressing group: re-ordering existing
cooldowns so a short cooldown comes back in time for a later hit.

The user's example: three hits 20s apart. The party uses Feint (90s) on
hit 1, Kerachole (30s) on hit 2, and has nothing for hit 3. If Kerachole
goes on hit 1 and Feint on hit 2, Kerachole is back up for hit 3. That
takes three edits, and the first edit on its own makes hit 2 worse. The
current planner tries one add or one move at a time and keeps only
improving steps, so it can never find this.

The new Analysis view proposes **a small set of coordinated changes to the
group's current plan, found by searching over the whole cooldown
schedule**, and shows them with as little text as possible.

## Decisions (user, 2026-10-11)

1. **Window: the last 5 pulls** of the selected group (same boss, exact
   roster, as today) define the current plan and are what changes get
   checked against. An optional number input overrides the 5. Blank
   means 5.
2. **About 3 changes per round.** It's a tunable constant
   (`PLAN_MAX_CHANGES`); the target is 3.
3. **Goal, in strict priority order:**
   1. fix failing hits (fail and under)
   2. add mitigation to tight hits
   3. free up cooldowns for upcoming mechanics
4. **Tank busters are out of the Analysis view.** Tank-only hits aren't
   listed, scored or optimized, and tank personal cooldowns are never
   moved. A future Tanking panel will hold Rampart, Damnation and the
   like. That panel isn't part of this plan. The Timeline keeps showing
   tank busters as it does today.
5. **Boss debuffs (Reprisal, Feint, Addle, Dismantle) only count on hits
   they are known to reach** (see "Boss-debuff reach" below). This also
   fixes the existing Notes and hit-details suggestions.
6. **Test foundation: Red Hot and Deep Blue (M10S).** It has two bosses,
   and many of its attacks aren't affected by boss debuffs. Samples on
   disk: `jN3XDrf2z8PmLgRJ` (A), `xFAfGP3qX4yJhDrV` (B) and
   `d3vRbwfpNBLzJ2Xh` (C, has the kill). The roster is in the
   `red-hot-deep-blue.ts` header.

**Build the engine generic.** The Tanking panel
([tanking-panel-plan.md](tanking-panel-plan.md)) reuses this optimizer
with its own eligible entries, anchors (busters plus heavy auto
windows), objective and extra edits (invulns). So `optimize.ts` should
take these as parameters: an eligibility predicate, the anchor hits, an
objective function returning a comparable tuple, any extra edit
generators, and the hard constraint. Don't hard-code the party rules.

## Scope

In:
- A new optimizer, `lib/mitigation/optimize.ts`, that replaces the
  change-finding part of `plan.ts`.
- Boss-debuff reach evidence, `lib/mitigation/debuff-reach.ts`, used by
  the optimizer, by `notes.ts` add options, and by the timeline's
  "ineffective" state.
- A rewrite of `components/MitigationPlan.tsx` to the layout below.
- The pull-window input in `components/MitigationDialog.tsx`, shown
  only on the Analysis view.

Out:
- The Timeline view and its Notes column, apart from the debuff-reach
  fix.
- Tank busters and the Tanking panel.
- Healing analysis. Kerachole and similar cooldowns also heal; the
  optimizer judges them on mitigation only.
- Adding gated cooldowns (explained below).

## The model

### 1. The plan is "cooldown on hit", not timestamps

The plan is written the way raid groups write theirs: a list of
assignments **(player, catalog entry, anchor hit id)**. The anchor hit id
is the existing cross-pull key, `MitigationHit.id`
(`phase|ability#occurrence`).

**Baseline (the current plan).** For each pull in the window:
1. Take each player's real casts of each eligible entry.
2. Attach each cast to the first hit it covered. That hit is the first
   with `cast ≤ hit.timestampMs` and `hit.timestampMs − cast ≤
   durationMs + SNAPSHOT_SLACK_MS` where the entry shows in `active`
   with this player among the casters. A cast that covered no hit
   attaches to nothing.
3. Across the window, the baseline assignment for (player, entry, hit) is
   the anchor used in a majority of the window pulls that reached that
   hit (the mode).

Show the baseline in the UI only as the "before" side of a change.

**Eligible entries:**
- party-reach only (`reach === "party"`)
- `inSheet !== false`
- not `situational`
- not invuln or limit break
- `cooldownMs ≥ DROP_MIN_COOLDOWN_MS` (GCD shields and short personals
  are treated as always used, as today)

**Gated entries** (Kerachole: Addersgall; Sacred Soil: Aetherflow;
Temperance's Divine Caress; and so on):
- **May be shifted or swapped.** Moving a cast that already happened
  spends the same resource, only at a different time.
- **Never added**, and never dropped and then re-added elsewhere. The log
  can't confirm the gauge was there.

Today `plan.ts` `reaches()` excludes every gated entry. That has to
change, or the user's own example can't be found.

### 2. Evaluating a candidate plan in each window pull

The plan is applied to every pull in the window, using that pull's real
hit times and real damage:
- **Cast time.** A cast the plan doesn't touch keeps its real timestamp.
  A moved or added cast is placed at `anchor.timestampMs −
  CAST_LEAD_MS`. Make CAST_LEAD_MS a constant; 2_000 is a starting
  point. Check it against how early the sample casts land before their
  hits.
- **Coverage.** A cast covers every hit from its anchor up to
  `durationMs` after the cast. Use no snapshot slack for new placements;
  that's the conservative choice. `variableDuration` entries (Sacred
  Soil, Passage of Arms, ground effects) cover only their anchor hit and
  anything joined into it when moved, because the log can't say whether
  players stayed in.
- **Legality.** Each player's resulting cast list must pass
  `simulateCharges` with nothing rejected, and the player must be alive
  at the cast (`isDeadOrFreshlyRevived`). In a pull where an assignment
  isn't legal, that cast is left out of the pull's evaluation
  (pessimistic). A change counts only if it is legal in at least half
  the window pulls that reached its anchor (same rule as today's
  `enough`).
- **Per-target margin with mitigations removed and added in one pass.**
  Generalize `marginWithout` and `marginWithAdded` in `analyze.ts` into
  one function, `marginWith(target, removeKeys, addEntries,
  shieldSizes, column, rollBuffer)`:
  - A removed % status divides out of the damage before shields.
  - An added % status scales the damage, using the part's damage column.
    Unaspected (`"none"`) damage takes shields only.
  - A removed shield gives back what it absorbed.
  - An added shield subtracts the median per-target absorb that the
    entry logged in the loaded pulls. That's the existing `shieldSize`
    in `plan.ts`; lift it into the shared code. A shield never seen
    absorbing has no estimate: it may be moved but never added.
  - Added boss debuffs apply only to the parts their reach evidence
    allows (next section).
  - Keep the sequence margin (`laterDrop`) as today.
  - Keep the existing functions as thin wrappers so `notes.ts` and
    `findDroppable` don't change behaviour, and keep
    `node scripts/validate.js --check` clean.
- **A hit's estimate in a pull** is the lowest judged target's margin
  with `DAMAGE_ROLL_BUFFER` applied. Use the same exclusions as today:
  vulnerable players, invulnerable tanks, and players already dead.
  Across the window, a hit's estimated verdict uses the median margin,
  and "tight" uses the worst pull, as `aggregate.ts` and `plan.ts` do
  today.

### 3. Boss-debuff reach

In FFXIV, Reprisal, Feint, Addle and Dismantle are debuffs on an enemy.
They reduce the damage of that enemy's attacks only:
- Many raidwides are dealt by helper actors that the game *does* treat as
  the boss (the mitigation-redesign data check: 107 of 209 debuffed hits
  came from helpers).
- Some attacks are not reduced at all.
- In a fight with two bosses (Red Hot and Deep Blue), a debuff on one
  boss doesn't reduce the other boss's attacks.

The attack's source actor in the log can't settle this. Only an attempt
can: the debuff was up when the attack hit, and either the hit carried
it or it didn't. Experienced players get this wrong too (user,
2026-10-11).

**Evidence** (`lib/mitigation/debuff-reach.ts`), built from **every
loaded pull of the boss**, not just the window, because more attempts
mean fewer unknowns:
- Use `Pull.bossDebuffs`: apply and remove events with `targetName` (which
  boss) and `statusId`. Build windows from them.
- For each hit part, and for each boss-debuff window open at the part's
  timestamp, a part is an **attempt** for that debuff and boss.
  - Skip parts within `SNAPSHOT_SLACK_MS` of the window's apply or
    remove; the snapshot lags.
  - The attempt **reached** when the target's `statusIds` lists the
    status and the part's FFLogs `multiplier` agrees (the target is
    `consistent`, or the multiplier implies the reduction).
  - It **missed** when the status is absent on every target of that part.
- Key the evidence by **(ability name, boss name, debuff status id)**.
  Its state is `reaches`, `misses` or `unknown` (no attempts).
  - Physical-only and magical-only differences are already handled by
    the catalog's split; don't key on them.
  - When the evidence conflicts (some attempts reached, some missed), go
    with the majority. Expose the counts so a debug print can show them.
- **Which boss a player debuffs** is the boss that player's debuff landed
  on most often in that phase, from `bossDebuffs` across the loaded
  pulls. If they never cast it in that phase, use the boss debuffed most
  often there by anyone. In a two-boss fight that's still a guess; add
  it to "Open questions" when the data shows it matters.
- **Consumers:**
  - **The optimizer:** an added or moved boss debuff reduces a part only
    when its key `reaches`. `unknown` counts as no reduction
    (conservative).
  - **`notes.ts` `addOptions` / `aggregateAddOptions`:** same rule, so
    the Notes column stops suggesting Feint on attacks it doesn't reach.
    This changes the `mitigation-analysis` print output; it's
    print-only, so there's no snapshot to update. Note the delta in the
    commit.
  - **The timeline's `ineffective` state** (`analyze.ts`
    `buildPlayerStates`): it already marks a debuff that was cast and
    up but not on the hit. Its tooltip can say "doesn't reach this
    attack (seen N times)" when the evidence agrees.
- **Manual overrides:** add `lib/mitigation/debuff-reach-overrides.ts`, a
  hand-edited table keyed the same way. VOD review is ground truth (see
  CLAUDE.md), so a user correction goes there and wins over the log.
  Start it empty.

### 4. The search

**Edits** (each acts on the current candidate plan):
- **shift:** move one assignment to a different anchor hit
- **swap:** two assignments trade anchors. This is the core of the
  user's example; also offer it as one edit so the search finds it in
  fewer steps.
- **add:** a new assignment for an entry the player has spare (not
  gated; a shield needs a size estimate)
- **drop:** remove an assignment from a hit that stays good without it.
  Only useful as the first half of a reallocation. The search keeps a
  drop only if a later edit uses the freed cooldown, and plain drops
  are never shown as advice.

**Change count:** the instructions a player gets. One shift, one add or
one drop is 1 change. A swap is 2: two players each move one cooldown.
The user's example is 3 changes (Kerachole moves, Feint moves, Kerachole
is added on hit 3), exactly the budget. A drop that a later shift uses
merges into that shift ("move X from A to B" is 1 change).

**Objective,** compared lexicographically, first difference wins:
1. **Failing hits:** fewer hits whose estimated median verdict is fail or
   under. Ties: higher sum of their median margins, capped at
   MARGIN_UNDER so lifting a hit past good earns nothing extra.
2. **Tight hits:** fewer hits that are good on the median but whose
   worst pull ends under MARGIN_UNDER. Ties: higher sum of worst-pull
   margins, capped the same way.
3. **Cooldowns free for later mechanics:** more party cooldown time
   available at the end of the window's reach. Proposed measure: for
   each (player, eligible entry), whether it is off cooldown at the
   **progression edge** (the last hit reached in at least
   PLAN_MIN_PULLS window pulls), plus how many seconds earlier it comes
   back than in the baseline. Sum over entries, weighted by cooldown
   length so a 120s cooldown counts more than a 30s one. This is the
   least certain tier; keep it isolated so it can be retuned.
4. **Fewer changes.**

**Hard constraint:** no hit that is good or over in the baseline may end
under good, by median or worst pull. A change may spend headroom, not
create a new problem.

**Algorithm:** beam search from the baseline.
- Start with depth up to PLAN_MAX_CHANGES changes and a beam of
  BEAM_WIDTH = 50.
- At each step, expand every candidate in the beam by every legal edit.
  Keep the best BEAM_WIDTH by the objective, and keep the best plan seen
  at any depth.
- Re-score only the hits an edit touches: those within the old and new
  casts' coverage, in each window pull.
- Expected size is about 20 eligible (player, entry) pairs × about 30
  hits, so a few hundred edits per step and roughly 100k hit
  re-evaluations. That should finish well under a second.
- Measure it on Red Hot and Deep Blue report B (longest pulls). If it's
  over about 300ms, run it in a web worker. If it's still slow, cut the
  edit set first: anchor only on hits that are failing, tight, or
  hold a movable cast.

**Grouping for display:** split the winning plan's changes into
**dependent groups**. Changes are dependent when one is legal or useful
only because of the other: a swap's two halves, or a shift that frees
a cooldown an add uses. Each group is shown as one "do together" card.
To find groups, take each change out alone; if another change then
becomes illegal or stops helping, they belong together.

### 5. What the optimizer returns

Replace `MitigationPlan` and its parts in `plan.ts` with something like:

```ts
type OptimizedChange = {
  kind: "move" | "add";          // a swap is two moves
  player: string; job: string;
  key: string; name: string;     // catalog entry
  from?: HitRef;                 // move only
  to: HitRef;
  legal: number; pulls: number;  // window pulls where it fits
};
type HitOutcome = {              // only hits the plan touches
  hit: HitRef;                   // id, name, occurrence, phase, medianMs
  before: { median: number; worst: number; verdict: HitVerdict; tight: boolean };
  after:  { median: number; worst: number; verdict: HitVerdict; tight: boolean };
};
type OptimizedPlan = {
  windowPulls: number[];         // pull ids used
  summary: { before: Counts; after: Counts };  // failing / tight hit counts
  groups: { changes: OptimizedChange[]; hits: HitOutcome[] }[];
  notMitigation: HitRef[];       // healing or mechanic failures: listed, never changed
  unfixed: HitRef[];             // failing or tight hits no plan within budget fixes
};
```

Keep the existing classification of `healing` hits (every clean death
from low HP before the hit) and `mechanic` hits (median margin below
MECHANIC_MARGIN). They're excluded from the objective and listed in
`notMitigation`.

## UI (components/MitigationPlan.tsx rewrite)

Goal: a raid lead reads it in 10 seconds. No paragraphs.

```
 Last [ 5 ] pulls ⓘ                        Failing 3 → 0 · Tight 1 → 1 · 3 changes
 ┌ Do together ─────────────────────────────────────────────────────────┐
 │               Hot Impact #2   Pyrotation #1   Dare #1                │
 │ Kerachole (Sa) ●───────────── ○                                      │
 │ Feint (Ri)     ○ ───────────► ●                                      │
 │ Kerachole (Sa)                                ✚                      │
 │ Lowest HP      18% → 22%     9% → 24%        −4% → 19%               │
 └──────────────────────────────────────────────────────────────────────┘
 2 hits need healing or mechanics, not mitigation ›        3 not fixable ›
```

- **Header row:**
  - the window input: number, placeholder "5", blank means 5, clamped
    to between PLAN_MIN_PULLS and the group's pull count
  - one ⓘ tooltip holding everything both current disclaimer paragraphs
    say (estimates from the log; make changes together and re-check)
  - the before → after summary
- **One card per dependent group:**
  - columns are only the hits the group touches, in fight order
  - rows are only the cooldowns that change, labelled with the
    cooldown, the player's first name and job colour
  - ● is the old position, ✚ an add, an arrow a move
  - the last row is lowest HP before → after (median), coloured by
    verdict; the worst pull goes in the cell tooltip, along with
    "fits N/M pulls"
- **Footer links**, one line each, collapsed by default:
  - "N hits need healing or mechanics, not mitigation"
  - "N not fixable within 3 changes"
  - Expanding either lists hit names with a link that opens the hit in
    the Timeline view (the existing details panel). It never adds prose.
- **Removed:** the Spare Mitigation section, the "Not planned this
  round" deferral, per-issue reason sentences, and the two intro
  paragraphs.
- **Player picker:** a picked player sees a checklist of their own
  changes ("Kerachole: Pyrotation #1 → Hot Impact #2"), the group's
  summary line for context, and nothing else. If they have no change,
  show one line saying so.
- **Empty states:**
  - fewer than PLAN_MIN_PULLS pulls: the existing message
  - nothing failing or tight: "Nothing failing or tight in the last N
    pulls", plus the tier-3 suggestions if the optimizer found any
- Styling: inline style objects as elsewhere (no Tailwind reset). Reuse
  `VERDICT_STYLE`, `fmtTime`, job colours (`getClassColor`) and ability
  icons (`getFFAbilityIconUrl`) from the timeline. Follow CLAUDE.md:
  typecheck and stop, no visual verification loop unless asked.

## Build order

Commit after each step once `validate.js --check` and `tsc` pass (CLAUDE.md).

1. **Debuff reach.** Write `debuff-reach.ts` and the empty overrides
   file. Add a debug print to the `mitigation-analysis` runner
   (`scripts/validate.js`), or a scratch script, that lists every
   (ability, boss, debuff) with its reached/missed counts. Run it on
   Red Hot and Deep Blue A+B+C. **Stop and show the user the table**
   before building on it: they know which attacks Feint and Addle miss
   in that fight and can confirm or correct it, and corrections go into
   the overrides file.
2. **Use the reach evidence** in `notes.ts` add options and the
   `ineffective` tooltip. Report the print delta.
3. **`marginWith`** in `analyze.ts`, with the old functions as wrappers.
   `--check` must show no diff.
4. **Baseline extraction and plan evaluation** in `optimize.ts`, plus a
   print: the baseline assignments per hit, and the window's
   failing/tight counts. Check that the baseline evaluated with no
   edits reproduces the aggregate's median and worst margins (within
   the roll buffer's effect) on Red Hot and Deep Blue.
5. **Search and grouping.** Test it on a synthetic case that recreates
   the user's three-hit Feint/Kerachole example; build it from a real
   pull by editing its cast lists. Then run it on Red Hot and Deep Blue
   windows and print the groups.
6. **Wire into `buildMitigationPlan`'s caller** (`MitigationDialog.tsx`)
   with the window input. Retire the old change-finding code and the
   `spare` output from `plan.ts` once nothing reads them. Update the
   `mitigation-analysis` runner's `PLAN` print.
7. **Rewrite the UI.**
8. **Docs:**
   - update the `plan.ts` / `optimize.ts` headers (the authoritative
     rules)
   - add a "Mitigation optimizer" entry to `docs/open-items.md` listing
     the builder's tunables as "chosen by the builder, not yet
     confirmed"
   - move this file to `docs/archive/` once built

## Tunables (start values, all "chosen by the builder" until the user confirms)

| Constant | Start | Meaning |
|---|---|---|
| `PLAN_WINDOW_DEFAULT` | 5 | pulls in the window (user) |
| `PLAN_MAX_CHANGES` | 3 | changes per round (user) |
| `PLAN_MIN_PULLS` | 3 | window pulls a hit needs to be planned |
| `CAST_LEAD_MS` | 2_000 | a placed cast's lead before its anchor |
| `BEAM_WIDTH` | 50 | search breadth |
| legality share | ½ | window pulls a change must fit |

## Open questions to raise with the user as they come up

- **Short windows lose late hits.** With a 5-pull window, hits only the
  best pull reached get no plan. That may be fine (the override exists
  for this); ask once it shows on real data.
- **Which boss a player debuffs** in a two-boss fight, when the
  evidence is mixed.
- **The tier-3 measure:** whether "back sooner at the progression edge"
  matches what the user means by leaving cooldowns open.
- **Whether `unknown` debuff reach should ever be suggested**, flagged as
  untested, instead of always counting as no reduction.
