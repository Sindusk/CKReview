# Per-player exposure (build plan)

Status: **planned 2026-10-11, not started.** This is a system-wide change
to how the Statics analysis counts a player's chances, for both games.

Read first:
- the `lib/static-analysis.ts` header (the current counting rules)
- `lib/mechanics/occurrences.ts` and `lib/mechanics/rule-meta.ts`
- `components/StrategyDialog.tsx`
- [docs/archive/static-player-analysis-plan.md](archive/static-player-analysis-plan.md)

## Why

Some mechanics only ever test certain players:
- **Targeted by luck:** a debuff, bait or cast lands on a random player,
  and only that player can fail it. A player targeted often gets more
  chances to fail. One never targeted can't fail at all.
- **Assigned by the raid lead:** The Lost Explorers' fish carrier, kick
  orders, soakers. Only the assignee can fail. In FFXIV: a tank-only job,
  such as a tower a tank must be knocked across from (P10S, as an
  example only; no module exists).

Today every player's chances are the raid's chances:
- `computeMechanicStats` with a player counts every instance in the
  pulls they played.
- The Players panel ranks on Majors per pull (`errorRatePct`).
- Most mechanics have no per-instance data at all. Only Dancing Mad has
  occurrence anchors; everything else falls back to phase or pull
  exposure.

So bad luck, or being given a job, reads as playing worse. The stats must
show how well a player executes **what they were actually tested on**.

## Decisions (user, 2026-10-11)

1. **The direction is approved** as an overarching change for both games.
2. **Assigned duties live in the Strategy dialog**, not in the player
   ranking. The dialog will grow into a coherent place for a group's
   assignments.
3. **Assignments are auto-detected, with a user override** in the
   Strategy dialog (as the Dancing Mad Black Hole strategy already
   works).
4. **Keep errors per pull, but phrase the adjusted number well.**
   "Versus expected" was rejected: it reads as if the app expects people
   to make errors.
5. **Classifying every rule is a sweep** of the boss modules: Sonnet 5.5
   subagents propose, the Opus 5.5 agent running the sweep verifies and
   applies (see "The sweep").

## The model

### 1. Exposure scope, per mechanic

Add `exposure?: "everyone" | "targeted" | "assigned"` to `RuleMeta` in
`rule-meta.ts`. The default is `"everyone"`, which is today's behavior,
so nothing changes for a mechanic until it's classified.
- **everyone:** every player in the pull is exposed at every instance.
  Dodges, positioning, raidwide stacks.
- **targeted:** the log names who was responsible at each instance. The
  debuff target, the bait, the cast's target.
- **assigned:** a job given to a player or a rotation. The responsible
  player at each instance comes from the log (who performed it), from
  the detected assignment, or from the user's override.

**One scope per mechanic.** A mechanic whose rules mix scopes is split
into two mechanic keys. A bait-and-dodge becomes "<X> bait" (targeted:
the baiter misplaced it) and "<X> hit" (everyone: someone walked into
it). Stats are per mechanic, so a mixed key would mix denominators.

### 2. Who was responsible at each instance

Extend `MechanicOccurrence` with `players?: string[]`: the responsible
players for a targeted or assigned instance. Leave it undefined for
everyone mechanics.

- **Who reports instances.** WoW modules have no occurrence anchors yet.
  Rather than a central anchor table, the boss module reports its own
  instances with their responsible players, since it already computes
  who was involved in order to detect the failure.
  - Research how detectors return results (`lib/mechanics/wow/registry.ts`
    and the FFXIV equivalents) and add an occurrence channel alongside
    the errors.
  - Dancing Mad's anchors stay; targeted mechanics there gain a players
    list from their modules.
- **Assigned instances where nobody acted** ("no fish"):
  - With a detected or overridden assignment, the assignee is
    responsible, and the failure is attributed to them.
  - Without one, the instance has no responsible player. It counts in
    the raid's stats, not any player's. The failure stays player-less,
    as today.
- **Storage:** a child table of `StaticReviewPullMechanic`, for example
  `StaticReviewPullMechanicPlayer { mechanicId, identityId }`. Resolve
  identities at import the same way `StaticReviewPullPlayerError` does.
  Bump `detailVersion` so older sessions are marked for re-import.
  Sessions without the data fall back to today's counting.

### 3. Assignments in the Strategy dialog

- **Detection:** per boss module, the assigned mechanics detect their
  assignee per pull from who performed the job: the fish thrower, the
  kicker of each cast in a rotation. When one player did it in most
  pulls, that's the session's assignment. An alternating rotation (Lost
  Explorers report A: two fish carriers) is detected as a rotation.
  Midnight Falls' Terminate kick and crystal detectors are the existing
  pattern, but Midnight Falls itself is deprecated, so don't extend it.
- **Override:** the dialog shows each assigned duty with its detected
  player(s). The user can pick someone else, or set "nobody assigned".
  - The current Black Hole override is page state only (`app/page.tsx`)
    and isn't saved. Assignment overrides must be persisted, because
    the static import reads them.
  - Store them per report, e.g. a JSON column on the report or review
    record keyed by boss and duty.
  - An override applies when the report is imported into a static, and
    on re-import.
- **Assigned stats live here:** each duty with its assignee's record,
  e.g. "Fish carrier: Nama · 11/12 clean". Assigned mechanics are left
  out of the player ranking (decision 2).

### 4. Player stats

- **Per mechanic:** a player's rate is their failed chances over **their
  own** chances: instances they were responsible for (targeted), or every
  instance (everyone). A mechanic where they had no chances shows "—",
  never 0%. Dim low chance counts (fewer than 5) rather than hiding
  them.
- **Headline, replacing Majors per pull** (decision 4). Proposed wording,
  to confirm with the user:
  - **Errors / pull:** the raw number, as today.
  - **Adjusted / pull:** what their error rate would be had they faced
    the raid's typical set of mechanics. Computed as the raid's errors
    per pull × (their errors ÷ the errors the raid's per-chance rate
    predicts for the chances they actually had). It counts only
    everyone and targeted mechanics; assigned duties are in the
    Strategy dialog.
  - The tooltip says: "Adjusted for which mechanics they were targeted
    by. Assigned duties are in Strategy." Never use the words "expected
    errors" in the UI.
- **Where:** the Players panel (`app/api/statics/[staticId]/players/route.ts`,
  `StaticPlayersPanel.tsx`), the player analysis
  (`computeMechanicStats` with a player, `StaticPlayerAnalysisPanel.tsx`),
  and the mechanic panel, which gains per-player chances.

## The sweep (classifying every rule)

The user's process (decision 5). This needs a Workflow or a set of
Agent calls. The user asked for it, so it counts as opted in when they
start it.

1. **Prerequisite:** steps 1–2 of the build order below are in place, so
   a classification has somewhere to go.
2. **One Sonnet 5.5 subagent per boss module.** It reads the module's
   header model and its rules, then returns a list, without editing
   anything:
   ```
   { ruleId, currentMechanicKey, proposed: "targeted" | "assigned",
     evidence: "<quote or paraphrase from the model / rule>",
     responsible: "<how the module knows who: debuff target, cast target, performer>",
     split?: { newKey, label, ruleIds } }   // when the mechanic mixes scopes
   ```
   Everything not listed stays everyone. Skip Midnight Falls
   (deprecated).
3. **The Opus 5.5 agent verifies each proposal** against the module code:
   - Does the module really know the responsible player at each
     instance?
   - Is the scope right? Remember random targeting versus a raid-lead
     job: assigned means a raid lead could choose who does it.
   It applies the ones that check out: the `rule-meta.ts` entries,
   mechanic splits, and the module's occurrence reporting. It runs
   `validate.js --check` and `tsc`, commits per boss, and collects
   anything doubtful into one list for the user.

## Build order

Commit after each step once `validate.js --check` and `tsc` pass.

1. **Model and plumbing:**
   - `exposure` in `RuleMeta`
   - `players` on `MechanicOccurrence`, plus the module occurrence
     channel
   - the storage table, the import, and the `detailVersion` bump
2. **Stats:**
   - per-player chances in `computeMechanicStats`
   - the adjusted headline in the players route
   - "—" for no chances
   With every mechanic still `everyone`, the numbers must match today's
   (apart from the new column).
3. **Pilot on The Lost Explorers:**
   - classify the fish (assigned) and its targeted mechanics by hand
   - detect the carrier
   - re-import report B (`8PQFgdDh3R9BW71t`) into a test static and check
     the numbers with the user
4. **Strategy dialog:** assigned duties with detection, a persisted
   override and the duty records. Ask the user about the layout before
   building it; they want this dialog made more coherent.
5. **The sweep** over the remaining modules.
6. **Docs:**
   - `static-analysis.ts` and `rule-meta.ts` headers
   - [lib/mechanics/README.md](../lib/mechanics/README.md): a new boss
     module must classify its mechanics' exposure and report responsible
     players. Add it to the working method.
   - open-items, then archive this file

## Open questions to raise with the user as they come up

- **The adjusted headline's wording and formula** (above is a proposal).
- **Rotations:** for an assigned duty that rotates between two players,
  is each player responsible for their own turns only? (Proposed: yes.)
- **Where overrides are stored** (per report vs per static and week),
  once the Strategy dialog layout is discussed.
