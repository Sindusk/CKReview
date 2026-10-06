# Static Player Analysis Plan

Plan for per-player and per-mechanic analysis in the Statics window, so
questions like these can be answered from a static's consolidated history
instead of reopening every report:
- "Where did I mess up the most in P5?"
- "We're progging P4 but P1 is still inconsistent. Which mechanic gives
  us the most trouble over the last few sessions?"
- "Am I getting better at the spread about a minute in?"

The direction was agreed with the user on 2026-10-06; this doc is the build
brief. Applies to both games.

**Status (2026-10-06):** steps 1–5 are done: the Mechanics panel (raid
view) and the Player Analysis panel. Step 6 is done for Dancing Mad:
`lib/mechanics/occurrences.ts` anchors each grouped mechanic on the boss's
own cast. Not anchored yet: the Kefka Says instructions, the generic
Damage Down splits, and every WoW boss. Those fall back to phase or pull
exposure. Midnight Falls needs a sample report before its anchors can be
verified.

## Why this needs new data

A static stores only **counts** today: `StaticReviewPullPlayerError` holds
`majorCount` / `minorCount` per roster player per pull
(`lib/static-review-data.ts` `computeStaticReviewPullData`). Which rule
fired, when, in which phase, and what ended the pull are all discarded at
import. None of the questions above can be answered from the database.

## Decisions (settled with the user)

1. **Grouping by mechanic:** a curated mechanic label per rule; a rule
   without a label is its own entry.
2. **Rankings and trends count Majors only by default.** A toggle adds
   Minors. Avoidable damage can be genuinely hard to avoid (Vashnik pulls
   show dozens of Minors per pull even on clears), so expecting zero is
   unreasonable. Minors are still **stored**, so the toggle works on all
   new sessions.
3. **New sessions only.** No backfill and no resync of old sessions.
   Sessions imported before this feature keep their counts and stay out of
   the new mechanic and phase views.
4. **"What ended the pull" is in the first build** (definition below).

## Storage budget (measured 2026-10-06)

Measured on a copy of the production database:
- The whole statics database is **13 MB** after about two months: 4
  statics, 105 sessions, 2,516 pulls, 25,175 per-player rows.
- Current cost on disk, indexes included: about 164 B per player row and
  200 B per pull row. A night averages 24 pulls; the largest had 65.
- Errors before the wipe cutoff average 4–7 per pull (FFXIV 4.0–4.2, WoW
  7.3) and up to 17.7 on Minor-heavy WoW bosses.

Estimated cost of this plan: about 5 KB per pull, 125 KB per night, about
20 MB per static per year at 3 nights a week. Space is not a constraint.
Still, store rule names and mechanic labels once (lookup tables) rather
than repeating strings on every row.

## Data model

New Prisma models (names are suggestions). Add a migration; existing
tables are unchanged.

**`StaticReview.detailVersion Int?`**: null for sessions imported before
this feature. The new views read only sessions with a value, and say how
many earlier sessions were left out ("12 earlier sessions predate detailed
tracking"). Bump the number if the stored shape changes later.

**`StaticRule`** (lookup, one row per static per rule seen):
`id`, `staticId`, `ruleId` (string), `name` (snapshot at import),
`mechanicKey`, `mechanicLabel`, `phaseHint`. Upserted at import. Storing a
snapshot keeps old rows readable after a rule is renamed or removed (the
mitigation redesign removes one).

**`StaticReviewPullError`** (one row per error):
- `pullId` → `StaticReviewPull`
- `identityId` → `StaticPlayerIdentity`, nullable (player-less Raid errors)
- `player` (name snapshot), `ruleRef` → `StaticRule`
- `severity` (Major / Minor / Raid)
- `timestampMs` (into the pull), `phase` (nullable), `occurrence`
  (nullable: which instance of the mechanic, e.g. spread #2)
- `afterCutoff Boolean`: the error fell after the pull's first Raid error.
  Today's counts drop these; here they are stored and flagged, and the
  rankings exclude them, so counts stay consistent with the Report tab.
- Indexes: `pullId`, `identityId`, `ruleRef`.

**`StaticReviewPullPhase`** (one row per phase **segment**; alternating
encounters visit the same phase many times): `pullId`, `seq`, `phase`
(the log's phase id), `startMs`, `endMs`. This is the exposure data: "out
of the pulls that reached P5" is a distinct count over pulls. Also store the
highest phase id reached on `StaticReviewPull` (`lastPhase`, derived from
the transitions, never the API's `lastPhase`) for quick filtering.

**`StaticPhase`** (lookup, one row per static per boss per phase):
`staticId`, `bossName`, `phaseId`, `name`, `isIntermission`. Upserted at
import from the report's phase metadata, so the UI can label phases
("Intermission: Total Eclipse") without an API call. The phase filter lists
intermissions as phases of their own, in id order.

**`StaticReviewPullMechanic`** (one row per mechanic occurrence the pull
reached, failed or not): `pullId`, `mechanicKey`, `occurrence`,
`timestampMs`, `phase`. This lets a rate read "failed 4 of 9 times the
mechanic happened" instead of "out of every pull". Optional per boss: a
mechanic without occurrence data falls back to phase-level exposure.

**On `StaticReviewPull`, the wipe cause:**
- `endCauseKind`: `raidError` / `deathChain` / `called` / null (kill or
  unknown)
- `endCauseRuleRef` / `endCauseMechanicKey` / `endCauseAbility`
- `endCauseAtMs`, `endCausePhase`

## Where the data comes from

### Phases

Nothing in the app reads phases today. Both FFLogs and WCL v2 expose phase
data in fight metadata, which costs no event download:
- per fight: `phaseTransitions { id startTime }`, `lastPhase`,
  `lastPhaseIsIntermission`
- per report: `phases { encounterID separatesWipes phases { id name
  isIntermission } }` for the phase names

Add these to the report query in `lib/ffl-client.ts` (`fights(killType:
Encounters)`, ~line 422) and `lib/wcl-client.ts` (~line 364), and carry
them on `Pull`. Where the log has no phases, fall back to the rule's
`phaseHint` and leave exposure at pull level. The data check below settles
which encounters have phases and how to read them.

### Data check findings (2026-10-06)

Checked with metadata-only report queries (no events), about 100 API
points in total:
- FFLogs: all 93 Dancing Mad reports in the statics database.
- WCL: all 6 Midnight Falls reports in the database, plus one sample report
  per Venomous Abyss boss.

The field names in the plan are correct on both sites, with the same shapes:
- `ReportFight`: `phaseTransitions { id startTime }`, `lastPhase`,
  `lastPhaseIsIntermission`, `lastPhaseAsAbsoluteIndex`.
- report-level `phases { encounterID separatesWipes phases { id name
  isIntermission } }`.

**Which encounters have phase data:**

| Encounter (id) | Phases from the log | Shape |
|---|---|---|
| Dancing Mad (1085) | P1: Kefka … P5: Ultima Kefka | progression, no intermissions |
| Midnight Falls (3183) | Stage One, Intermission: Total Eclipse, Stage Two, Stage Three, Stage Four | progression; id 2 is an intermission |
| Ula'tek (3492) | Stage One, Stage Two, Intermission: The Shattering, Stage Three | progression; id 3 is an intermission |
| Nek'zali the Soulcoiler (3470) | Stage One, Intermission: Ritual of Awakening, Stage Two | progression; id 2 is an intermission |
| The Coiled Altar (3429) | Stage One, Stage Two, Intermission: The Claimed Vessel, Stage Three | progression; id 3 is an intermission |
| Entombed Sentinels (3445) | Stage One ↔ Intermission: Vitriolic Stasis | **alternating**, up to 9 segments per pull |
| Sszorak (3420) | Sszorak ↔ Howling Maelstrom | **alternating** |
| The Lost Explorers (3497) | base phase 1, plus one "Binding Anguish" phase per sub-boss (ids 2–4) | **alternating**: 1→2→1→3→1→4→1 |
| Vashnik the Malignant (3455) | none | `lastPhase` 0, no transitions, absent from report `phases` |
| The Twin Fangs (3421) | none | same |
| Nymrissa Wavecaller (3379) | none | same |

Belo'ren (3182, also in the database) alternates 1↔2 like Sentinels.
Midnight Falls pulls in the database reach only Stage Two, so Stages Three
and Four are known from the names only.

**How to read the fields:**
- **Phase identity is `phaseTransitions[].id`**, which matches
  `phases[].id`.
- **`lastPhase` is not a phase id.** It is a stage ordinal that skips
  intermissions. A Midnight Falls pull that went 1 → 2 (Intermission) → 3
  (Stage Two) reports `lastPhase: 2`; Ula'tek in Stage Three (id 4) reports
  `lastPhase: 3`. Dancing Mad has no intermissions, so the two agree there
  by coincidence.
- **`lastPhaseAsAbsoluteIndex` is the index of the last transition** (it
  reaches 8 on a 2-phase Sentinels pull), not an index into `phases`.
- Don't store either one. Derive the furthest phase and the last phase from
  the transitions.
- **Time base:** `phaseTransitions[].startTime` is report-absolute ms, the
  same base as `fight.startTime`. The first transition equals the fight
  start. Subtract the fight start to get pull-relative ms. The last segment
  ends at `fight.endTime`.
- **`separatesWipes`** is true for every progression encounter above and
  false for every alternating one. It's a useful signal, but not a
  documented contract, so don't rely on it alone.
- **Missing transitions on FFLogs.** 2 of the 93 Dancing Mad reports return
  `phaseTransitions: null` on every fight, with `lastPhase: 1`. Both are
  large P1-only nights: no pull longer than 209 s, and every pull ended
  above 91% fight progress. Fallback: when transitions are missing and
  `lastPhase` is 1, record one segment of phase 1 covering the whole pull.
  Otherwise treat the pull as having no phase data.
- **Encounters without phases** (Vashnik, Twin Fangs, Nymrissa) use the
  plan's fallback as written: `phaseHint` on the rule, pull-level exposure.

**Design changes these findings require:**
1. **`StaticReviewPullPhase` stores one row per segment, not one per
   phase.** Alternating encounters visit the same phase many times. Add a
   `seq` column (the segment's order in the pull). "Pulls that reached
   phase X" becomes a distinct count over pulls.
2. **`StaticReviewPull.lastPhase` holds the highest phase id reached**,
   derived from the transitions, not the API's `lastPhase`. For
   progression encounters that is the furthest phase. For alternating
   encounters it only shows which sub-phases came up, which is still what
   the filter needs.
3. **Phase names need a home.** Errors and segments store the integer phase
   id. Add a small lookup per static: `StaticPhase` (`staticId`, `bossName`,
   `phaseId`, `name`, `isIntermission`), upserted at import from the report
   metadata, so the UI can label "Intermission: Total Eclipse" without
   another API call.
4. **Intermissions are real phases in the filter.** They have their own ids
   and their own mechanics, so the phase filter lists them by name, in id
   order.

### Mechanic labels

Add a metadata registry, e.g. `lib/mechanics/rule-meta.ts`:
`ruleId → { mechanicKey, mechanicLabel, phaseHint? }`. Several rules can
share one `mechanicKey` (for example "hit by spread" and "spread too
close"). A rule without an entry uses its `ruleId` as the key and its rule
name as the label. There are about 200 rule IDs across `lib/error-rules.ts`
(`ERROR_RULES`) and the mechanic modules. Fill the registry per boss, active
encounters first; nothing breaks for an unlabeled rule.

### Occurrence and mechanic exposure

Boss modules already find most mechanic casts. Add an optional output per
module: a list of `{ mechanicKey, occurrence, timestamp }` for every
mechanic instance in the pull, carried on `Pull`
(`mechanicOccurrences`). An error's `occurrence` is the nearest preceding
instance of its mechanic. Modules without this output still work at phase
level. Fill it in boss by boss, the same as the labels.

### What ended the pull

Kills have no cause. For a wipe, pick the first that applies:
1. **First Raid error.** The cutoff from `getPullRaidCutoff`
   (`lib/report-data.ts`), which the Report tab already uses. The cause is
   that error's rule and mechanic.
2. **No Raid error: the final death chain.** Walk back from the last death
   while consecutive deaths are close together (start at about 10 s apart
   and tune). The cause is the killing ability of the **first** death in
   that chain. A single death the raid recovered from earlier does not
   count. Watch for raises: a raised player who dies again is part of the
   chain only if the second death is within it.
3. **Manually called wipe** (`CALL_WIPE_RULE_ID`). Record `called`, plus
   the nearest Major error or death before the call, so the wipe still
   points at a mechanic.

Compute this client-side in `computeStaticReviewPullData`, like
everything else at import.

## Import changes

Import stays client-side: "Add Review To Static" / "Resync" run
`computeStaticReviewPullData` against `displayPulls` (never `pulls`; the
cross-pull errors live only in `displayPulls`, see
`docs/app-architecture.md`). Extend that function and the reviews POST
(`app/api/statics/[staticId]/reviews/route.ts`) to also send:
- every error with its rule, severity, timestamp, phase, occurrence and
  `afterCutoff` (Raid and player-less errors included)
- phases reached, mechanic occurrences and the wipe cause

Resolve player names to identities the same way the per-player rows do
(`lib/static-player-identity.ts`). Resync on a detailed session replaces
its detail rows. On an old session, resync is allowed but not required;
when it happens, the session becomes detailed.

Keep the existing count rows exactly as they are: the existing chart and
the Players panel keep reading them, across every session.

## Queries (new API routes)

Under `app/api/statics/[staticId]/`, all filtered to detailed sessions,
taking `sessions` (last N or a date range), `phase`, `includeMinors`
(default false) and `identityId` where relevant:
- **`analysis/mechanics`:** per mechanic: errors, chances (occurrences
  reached, or pulls that reached the phase), rate, players involved, and a
  rate per session for the trend.
- **`analysis/players/[identityId]`:** the same per mechanic for one
  player, plus their error timestamps for the timeline strip.
- **`analysis/wipe-causes`:** wipe causes ranked per phase, with counts
  and a trend.

Errors with `afterCutoff` are excluded from every ranking. Return counts
alongside rates in every response.

## UI (the static page, `app/statics/[staticId]/page.tsx`)

- **Raid view (new panel):** phase filter, session range, Minors toggle.
  - Mechanics ranked by error rate per chance. Each row shows count out of
    chances ("6/14") and a small per-session trend.
  - Wipe causes ranked for the same filter. This answers "what's giving
    us trouble in P1".
- **Player dropdown:** in `components/StaticPlayersPanel.tsx`, or a
  separate panel if that one gets crowded (it's an identity-management
  tool today). Expanding a player shows:
  - their mechanics ranked for the selected phase, with count, chances
    and trend
  - "first N sessions vs last N" for each mechanic: did they improve
  - a strip across the fight timeline showing where their errors cluster
    over all pulls (the "spread about 1 minute in" case)
- **Small samples:** always show counts next to rates. Don't draw a trend
  below a minimum number of chances (start at 5 and tune).
- **Old sessions:** a single line stating how many sessions predate
  detailed tracking.

UI rules from `docs/app-architecture.md` apply: inline `style` objects,
no page scroll, panels clip internally, the shared `ck-*` theme classes.

## Suggested build order

1. **Data check (no app changes):** confirm the phase fields on one
   Dancing Mad report and one report per active WoW boss. Write the
   findings into this doc.
2. **Phases on `Pull`** from the report metadata.
3. **Schema migration** and the import changes: errors, phases, wipe cause
   and `detailVersion`. Verify by importing one session locally and
   inspecting the rows.
4. **Rule-meta registry** for the active encounters (labels first;
   occurrences can follow).
5. **API routes**, then the **raid view**, then the **player dropdown**.
6. **Mechanic occurrences** per boss module, so rates can move from phase
   to mechanic exposure.

Verify each step: `npx tsc --noEmit`, `node scripts/validate.js --check`
for anything that touches detection, and a local import against the
restored database copy. The user reviews the UI. The migration must be
applied on prod at deploy time; say so when handing the change over.
