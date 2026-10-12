---
name: build-module
description: Build per-pull mechanic detection for a WoW or FFXIV boss from a comment-only research model the user points at (a module file whose header holds the GUIDE-DERIVED MODEL) and the report(s) they supply. Verifies the model against the logs, writes the rules, wires the module in, validates, commits, and ends with the wipe cutoffs and VOD questions. Use when the user asks to build, implement or "do detection for" a boss module from logs.
argument-hint: <module file with the model> <report URL or code> [more reports...]
---

# Build a boss module from its model and logs

The procedure behind every module since Entombed Sentinels; Lindwurm
(`lib/mechanics/ffxiv/arcadion/lindwurm-1.ts`) is the latest full run. It
was built 2026-10-12 from three reports, 108 pulls and two kills.
CLAUDE.md's working preferences apply throughout:
- give times as MM:SS;
- commit and push to `CKReview main` without asking, with a co-author
  trailer;
- never deploy;
- the repo is public, so no character names in code or docs.

## 0. Read before touching anything

1. Read the target module's header **in full**: the research model, its
   sources, failure modes, open questions and any recorded plan or
   assignments. Grepping it isn't reading it.
2. Read [lib/mechanics/README.md](../../../lib/mechanics/README.md) from
   "Architecture" through "Data-shape knowledge":
   - the three kinds of detection
   - the attribution philosophy and severities (FFXIV: avoidable damage
     that gives Damage Down is Major)
   - the working method
   - position, event and coordinate semantics
3. Read [lib/mechanics/PITFALLS.md](../../../lib/mechanics/PITFALLS.md),
   the per-boss lessons as a checklist.
4. Skim one reference module of the same game for structure and helpers:
   - **FFXIV:** `ffxiv/arcadion/lindwurm-1.ts` or `tyrant.ts`. Entry point
     `detect<Boss>Errors(players, deaths, enemyCasts, occurrences?)`, with
     the generic PERSONAL/STACKS families, avoidable table, falls, called
     wipe, collapse and enrage.
   - **WoW:** a `wow/va/*.ts` module plus `wow/common.ts`. Entry point
     `detect<Boss>Errors(ctx: WowPullContext)`, with `pullOverMarker` for
     the generic cutoff.

## 1. Ask once, before fetching

Use one AskUserQuestion with only what the header doesn't already answer.
- **Raid plan and assignments** (CLAUDE.md): are these the user's
  static's logs, and do they follow the header's plan? Options: yes / a
  different plan (they'll say what) / not ours (outcome-only,
  log-unattributable failures stay player-less).
- **Party slots**, when a rule would need them: does `roles.ts` match
  (FFXIV: MT by first auto, H1 pure healer, R1 physical ranged, R2
  caster, M1/M2 by roster order)?
- **Scope** for a multi-phase fight: which phases this module owns.
Then start. Anything that comes up later goes into the end-of-run
questions, not a mid-run stop.

## 2. Fetch only the fights the task uses

- Each report in the background, **one at a time**, kills first:
  - `node scripts/fetch-ff-report.js <url> --boss-exact "<fight>"` (or
    `--boss` when no other fight name contains it);
  - `node scripts/fetch-wow-report.js <url> --boss "<boss>"`.
- Phase-limited work: add `--to-minutes` / `--from-minutes`, as in
  PITFALLS "Fetching".
- Probe the first report while the next downloads. If a filter caught
  unrelated fights, stop the fetch and delete those pull files.
- Label the reports A, B, C… in the order you'll cite them, kill reports
  included.

## 3. Survey

`node scripts/analyze-report.js <code> <command>` (`--help` lists them):

1. `pulls`, `players <pull>`: roster, kills, pull lengths.
2. `sweep`: every ability ID per stream (cast, begincast, damage, debuff,
   buff, enemy debuff), with counts, pulls, sources and targets. Map each
   model term to its real IDs here; the model's IDs are guide or journal
   links.
3. `timeline <kill>`: the fight's clock. Every pull runs within ~1s of it
   for timed fights.
4. `deaths` and `nokb`: what killed people first, pull by pull.
5. FFXIV: list every Damage Down cause from the debuff's `causeAbilityId`.
   That is the avoidable-damage table. WoW has no equivalent; use damage
   that never happens in the kill.
6. `collapse`: survival after N dead, which sets the cutoff threshold.

## 4. Verify the model, mechanic by mechanic

For each mechanic in the model:
- `profile <ids>`: per-resolution hit counts, overlaps, deaths, and the
  kill's resolutions as the clean baseline.
- `resolutions <ids> --auras <debuffs>`: cast targets by caster#instance,
  each hit, the auras held, and deaths.
- `window <pull> <from> <to> <ids>`: one moment in detail.
- `hits`, `bursts`, `soakers`, `adds`, `after` when the shape calls for it.

When the CLI can't answer, write a probe in the session scratchpad with
the Write tool (the shell gate blocks heredoc and redirect writes):

```js
const { pulls, mmss } = require('<repo>/.claude/skills/build-module/tools/probe-pulls.js');
for (const pl of pulls({ game: 'ff', reports: { A: '<code>', B: '<code>' }, boss: '<fight>' })) { … }
```

Find, for each mechanic:
- **What a clean resolution looks like in the kill**, e.g. "cones hit
  nobody", "8 towers, each cast-targeted at its soaker".
- **What separates failures from clean play.** Record the worst clean
  value and the best failure value, with pull citations (`A23 +2:33`).
- **Who owns each instance.** Possible sources: a cast target (check it
  isn't the victim), an aura that ends at the hit, a numbered debuff, the
  position of a cast sitting on its owner, or process of elimination.
  When the log can't name anyone, the error stays player-less and the
  header says why.
- **Which failures end the pull**, and what a death with no killing blow
  means here (PITFALLS "Deaths with no killing blow").

## 5. Build the rules

- **Self-gate on signature casts** no other fight uses, so the module is
  safe on every pull. Check fights that share a name, such as checkpoint
  stubs.
- **Start from the generic families,** then add mechanic-specific rules:
  - avoidable table: Major on Damage Down or death, else Minor;
  - one-bait-per-player overlaps;
  - shared stacks.
  Gate proximity baits on everyone alive, and drop raise-grace players'
  baits.
- **One rule id per responsible group** (exposure: everyone, targeted or
  assigned).
- **Cutoffs:** every wipe gets one Raid error, emitted only before any
  other Raid error. It is either mechanic-specific, or a generic marker:
  - called wipe (several no-killing-blow deaths together, or near the end)
  - collapse (N dead with the pull ending soon after)
  - tank death (WoW)
  - enrage (only hits that killed)
- **Descriptions** say what happened with numbers ("~5.7 yalms"), the
  outcome (Damage Down, who died) and the correct play.
- **Thresholds** carry a comment with both extremes and their pulls.

## 6. Wire it in

**FFXIV:**
1. Import and call it in `lib/log-transforms.ts` (`transformFFightToPull`,
   with `reportedOccurrences`).
2. Add an entry to `scripts/validate.js` MECHANICS (copy `lindwurm`).
3. Add the fight name to `COVERED_ENCOUNTERS` in `lib/mechanics/fallback.ts`,
   or its phase ids to `MODULE_PHASES`.
4. Add the module's Damage Down causes to `ffxiv-damage-down`'s
   `excludeCauseAbilityIds` in `lib/error-rules.ts`.

**WoW:**
1. Add one line in `lib/mechanics/wow/registry.ts`.
2. Add the fight to `COVERED_ENCOUNTERS`.

**Both:**
- Add `mechanic()` and `exposure()` calls in `lib/mechanics/rule-meta.ts`
  for targeted or assigned rules.
- Report every instance, clean ones included, through the occurrences
  sink.
- Add the module to the directory tree at the top of the README.

## 7. Check it against every pull

1. Get every pull's output after each change:
   `node .claude/skills/refine-module/tools/pull-errors.js <ff|wow> <code> "<fight>" --summary`.
   It shows counts per rule, each pull's cutoff and the kill's errors.
2. Fix until three things hold:
   - the kills are near-clean, and anything left in a kill is explained;
   - every wipe has a cutoff (no `NONE: wipe without a cutoff`);
   - each rule's sample reads right when you open a few per rule (per-pull
     mode, `--pulls`, `--rule`).
3. `node scripts/validate.js --check`. Existing reports must not change,
   unless a shared file was touched on purpose; read that diff line by
   line. The new reports show "no baseline". Then
   `node scripts/validate.js --update sampledata/<game>/<code>` for each
   new report, and `npx tsc --noEmit`.

## 8. Write it up, commit, report

1. Put the header in this order, top to bottom:
   - **VERIFIED AGAINST LOGS**, dated: reports A/B/C with their pull
     counts and kills, the clock, log IDs by mechanic, failure findings
     with citations, unexplained wipes, and the cutoff tally.
   - **RULES IMPLEMENTED**: rule ids and severities, the exposure
     classification, and what was not built and why.
   - The **GUIDE-DERIVED MODEL** stays below; the log wins disagreements.
2. Add anything that generalizes to PITFALLS.md under its section. Add
   new tooling flags to docs/dev-tooling.md.
3. Check the diff for character names. Commit and push. Say it's ready to
   deploy.
4. Reply with:
   - each cutoff kind and its count, and the kill status;
   - the attribution calls you were unsure of, as numbered questions in
     CLAUDE.md's VOD format (pull, MM:SS, what detection says with the
     players named, what to look at), ordered by pull. If the user has a
     VOD loaded, ask only about that report; otherwise suggest
     `/refine-module` with the report they'll review.
