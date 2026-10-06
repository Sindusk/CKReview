# Static Player Analysis Plan

Plan for per-player and per-mechanic analysis in the Statics window, so
questions like these can be answered from a static's consolidated history
instead of reopening every report:
- "Where did I mess up the most in P5?"
- "We're progging P4 but P1 is still inconsistent. Which mechanic gives
  us the most trouble over the last few sessions?"
- "Am I getting better at the spread about a minute in?"

The direction was agreed with the user on 2026-10-06; this doc is the build
brief. Nothing in it is implemented yet. Applies to both games.

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

**`StaticReviewPullPhase`** (one row per phase the pull reached):
`pullId`, `phase`, `startMs`, `endMs`. This is the exposure data: "out of
the pulls that reached P5". Also store the furthest phase on
`StaticReviewPull` (`lastPhase`) for quick filtering.

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
them on `Pull`. **Verify on real reports first:** which encounters return
phase data (Dancing Mad should; check Midnight Falls and the Venomous Abyss
bosses), and the field names. Where the log has no phases, fall back to the
rule's `phaseHint` and leave exposure at pull level.

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
