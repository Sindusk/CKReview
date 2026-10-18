# WoWAnalyzer module audit (plan)

The WoW counterpart of [xiva-audit-plan.md](xiva-audit-plan.md): a
spec-by-spec audit of WoWAnalyzer's rules against the app's WoW damage
analysis. Written 2026-10-15 for the agent that runs it.

**Status (2026-10-17):** phases 0–3 done for all 40 specs. What's left
is the user's spec-by-spec review of the `wrong` and `no-damage` rows
and of the questions held in
[wowa-audit/PHASE3-SEQUENCE.md](wowa-audit/PHASE3-SEQUENCE.md).

Read the FFXIV plan first. This file keeps its method (extract, reconcile,
verify) and its statuses, and only spells out what's different for WoW.

## Why

Same reason as FFXIV: WoW checks grow one case study at a time
(`/damage-analysis` on Warcraft Logs), so a rule is found only when a
reviewed player happens to break it. About 40 specs exist; 15 have been
looked at once (qpZx3mWaG7gcDdYB), most of them against a single
reference. The audit gives each spec a ledger of every rule WoWAnalyzer
applies, what the app does about it, and what's still unverified.

## Read first

- [dps-analysis.md](dps-analysis.md), "Analyzing a WoW kill: method and
  lessons": what WoWAnalyzer overstates (Stasis counted as ready and active
  time, the APL accuracy), what it's right about (procs, resource
  spending), what the log can't show (cooldown reductions, passive regen
  waste, crit), and the user's leniency rules (movement, Stasis idle,
  Energy pooling, utility and defensives). Those decide most
  classifications.
- [archive/damage-analysis-plan.md](archive/damage-analysis-plan.md),
  "Borrowing from WoWAnalyzer": the licence rules below in full.
- The `/damage-analysis` skill's "WoW (Warcraft Logs)" section: reference
  logs, the WoWAnalyzer page extractor, and the verification pitfalls
  (pre-pull casts, wrong cooldown models, resource-recharged cooldowns,
  auto-casts, haste changes).
- The headers of `lib/damage/wow/specs/*.ts` and `lib/damage/checks.ts`.
  They record what each spec's case study matched, built or did not
  adopt; the audit reads that as already covered.

## Licence: reference only

WoWAnalyzer is AGPL-3.0 and the user chose not to take that on. Reading
it to learn the rules is fine. It changes the audit in four ways:
- **Ledger records are written in our own words.** No code, comments,
  data tables or constants copied, verbatim or lightly edited. A record
  says what a rule checks and its threshold ("flags a Holy Power spender
  cast below 3"), never how their code does it.
- **No spell or aura IDs from their source.** IDs come from real WCL logs
  (`scripts/analyze-report.js`, the report's `masterData.abilities`) and
  `lib/spell-data.ts`. A record names spells by name; phase 2 or 3 looks up
  the ID in a log.
- **No sync script and no vendored data**, unlike xivanalysis's
  `xiva-data.ts`.
- If a rule can only be had by copying (a hand-tuned coefficient table, a
  long proc list with no other source), stop and ask the user.

Tell the extraction agents all of this in their prompt, not just "read
the module".

## Ground rules

Same as the FFXIV plan: clone into the scratchpad
(`git clone --depth 1 --branch midnight https://github.com/WoWAnalyzer/WoWAnalyzer.git <scratchpad>/wowa`),
read only, never run, install or build it; pin the commit in every ledger;
no app code changes before phase 3; the subagent fan-out needs the user to
ask for a workflow in their own words. Work only on WoW (`--game wow`
for any validation), per CLAUDE.md.

Check the default branch on the clone first; the `midnight` branch was
current on 2026-10-06 and may since have merged. The paths below are
where things lived then; confirm them on the clone before writing the
agents' prompts.

## Phase 0: spec triage (one agent, read-only)

WoWAnalyzer's coverage is uneven, which xivanalysis's isn't. Before any
module is read, list every retail spec under `src/analysis/retail/` with:
- the patch it declares support for, and whether it's marked partial or
  unmaintained (each spec's `CONFIG`);
- the date of its last changelog entry;
- its rough size (module count).

Mark each spec `current`, `lagging` (supports an older patch of this
expansion) or `stale` (an older expansion, or partial). Show the list to
the user; it decides the order below. A `stale` spec is audited last, and
its rules start under suspicion: the premise check (phase 3) matters more
than the source.

## Phase 1: extract the rules (subagents, read-only)

As in the FFXIV plan, one agent for the shared layer, then one per spec,
not per module. A cheaper model (Sonnet) is fine.

1. **Shared pass** (one agent): the core and shared modules every spec
   uses (`src/parser/core/`, `src/parser/shared/modules/`): always-be-casting,
   cooldown tracking and efficiency, resource tracking, potions, and the
   checklist and suggestion thresholds.
2. **Class passes** (one agent per class): `src/analysis/retail/<class>/shared/`,
   for the talents and resources specs of a class share.
3. **Spec passes** (one agent per spec, given the shared and class
   output): the spec's folder in full, including its `CombatLogParser`
   (which modules it enables) and changelog.

Record fields are the FFXIV ones (`id`, `source`, `rule`, `trigger`,
`threshold`, `damage`, `log-visible`, `patch`, `fires-on`, `doubts`), with
these changes:

| Field | WoW difference |
|---|---|
| `id` | `<class>-<spec>/<Module>/<short-slug>` |
| `rule`, `trigger`, `threshold` | in our own words (see Licence) |
| `talents` | new: the talents or hero talent tree the rule requires or changes, or `none`. Most WoW rules depend on a talent; FFXIV kits are fixed |
| `log-visible` | WCL logs class resources (Holy Power, combo points, Runic Power and so on) on resource events, so fewer rules are unverifiable than with FFXIV gauges. Still `no` for cooldown reductions, passive regen at the cap, crit |
| `patch` | the patch the module was last updated for, from its changelog |
| `doubts` | also: anything counting Stasis or other forced downtime as ready or active time, and single-target APL scoring on a cleave fight |

## Phase 2: reconcile against the app (main session, read-only)

As in the FFXIV plan, against `lib/damage/wow/specs/` (the spec's role
file, `shared.ts`, `potion.ts`), `lib/damage/wow/tracked-cooldowns.ts` and
`lib/damage/checks.ts`, with the same statuses (`covered`, `verified`,
`candidate`, `no-damage`, `unverifiable`, `wrong`, `superseded`). Two more
inputs to the `wrong` status:
- the WoWAnalyzer errors already found (dps-analysis.md and the spec
  headers): Stasis as ready time, Soul Fire's ~41s cooldown model,
  pre-pull casts missed. (Idle inside a damage window is *not* a double
  count of `checkGcdGaps`: it costs more than a normal GCD. It's
  `covered` where the app has `burstGcdFindings` on that window,
  otherwise a candidate.);
- the user's leniency rules: a rule that grades what the user chose not to
  judge (movement idle, utility, defensives) is `no-damage`, not a
  candidate.

Ledgers go in `docs/wowa-audit/<class>-<spec>.md`, with the same layout
as the FFXIV ones plus a `talents` column, and one entry per spec in
[wowa-audit/STATUS.md](wowa-audit/STATUS.md).

## Phase 3: verify against logs (ongoing, one spec at a time)

The FFXIV plan's premise and firing checks, plus:
- **Talent check first.** Read the player's talents from the pull's
  CombatantInfo. A rule for a talent they didn't take neither holds nor
  fails on that pull; skip it there.
- **Value every candidate as damage lost first** (user, 2026-10-16).
  Measure what the action cost against what the player would have done
  instead, overloads, procs and DoTs included. Top players doing the same
  thing is evidence about the premise, not proof that it costs nothing:
  Elemental's first pass marked five real losses `wrong` that way.
- **Ask what it costs on the timeline** (user, 2026-10-16): would doing
  this here cost something later in the fight (a cooldown pushed out of
  a burst window, a resource or charge not there when the window opens,
  a DoT or buff due again sooner)? Count that in the loss, and in the
  case for `wrong` or `no-damage`.
- **References are the check when there's no VOD**, as in the case
  studies: run every new or covered check on a 99th/100th-percentile
  log of the spec on the same boss. A check that fires on the top player
  either matches WoWAnalyzer's page for that player (a real, common loss)
  or is wrong.
- **`wrong` and `no-damage` need the user's approval** (user,
  2026-10-16). These are the two statuses that drop a rule. The review
  waits until every spec has had its phase 3 pass (user, 2026-10-17): the
  user then goes through the unbuilt rows spec by spec. Until then, phase 3
  keeps each proposal with its evidence in the ledger and doesn't ask.
  The passes run one spec at a time, as in
  [wowa-audit/PHASE3-SEQUENCE.md](wowa-audit/PHASE3-SEQUENCE.md).
  Before marking one:
  - check the verdict yourself: measure the loss in the log, or show
    why the rule's premise fails;
  - then bring the user the evidence, one numbered item per row, with
    pull, MM:SS and numbers they can check;
  - mark the row only after the user agrees, and add "Approved by the
    user YYYY-MM-DD." to its notes;
  - an approved row isn't raised again.

  A row the user rejects goes back to `candidate`. `covered` and
  `superseded` need no approval. Phase 2's `wrong` and `no-damage` rows
  in the fan-out ledgers are proposals until their spec's phase 3 has
  this review.
- **Firing needs a weaker log.** The top parses rarely make the mistake.
  Look in lower-percentile logs of the spec on WCL rankings
  (`scripts/wow-rankings.js`), probe a candidate cheaply
  (`scripts/wow-probe.js`), and fetch only the one fight
  (`fetch-wow-report.js <code> --fight <id>`). The same rankings give the
  top parses for the premise check (`--from-pct 99`). See
  docs/dev-tooling.md.
- Spell IDs a built check needs come from that log, commented with the
  source log, per the licence rules.

## Order

1. Specs in the user's raid rosters (recent `sampledata/wow/*/meta.json`)
   that phase 0 marked `current`.
2. Specs with a case study already (their headers shorten phase 2).
3. Other `current` specs, then `lagging`, then `stale`.

Pilot one spec through phases 0–2 first, preferably one with a case study
behind it so the reconcile step has something to match against, and check
the format with the user before the fan-out.

## Refresh

Once per major patch: re-clone, run phase 0 again (specs move between
`current` and `stale`), diff against each ledger's pinned commit, and
re-extract only the changed files.

## Not in scope

- Healers and tanks beyond damage. Healing and mitigation records are
  `no-damage`; mention one to the user if it looks useful for
  `lib/mitigation/`, but don't build it here.
- Classic and other non-retail analyzers.
