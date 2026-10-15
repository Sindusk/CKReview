# xivanalysis module audit (plan)

Plan for a one-time, job-by-job audit of every xivanalysis module against
the app's FFXIV damage analysis. Written 2026-10-15 for the agent that
runs the audit. Not started yet.

## Why

The app's damage checks grow reactively today. A gap is found only when a
case study (`/damage-analysis`) lands on a log where someone happens to make
the mistake and the user pastes xivanalysis's feedback for it. Many
xivanalysis modules have never been read at all, and many of the app's
ported checks have never been seen firing on a real log (see "Unverified
jobs and specs" in [open-items.md](open-items.md)).

The audit turns that into a checklist: for every job, a ledger of every
rule xivanalysis applies, what the app does about it, and what is still
unverified. Case studies then work down the ledger instead of finding gaps
by luck.

## Read first

- [dps-analysis.md](dps-analysis.md), especially "Checking xivanalysis
  claims", "Rule for adopting them" and the list of xivanalysis's own
  known errors. Those decide every classification below.
- [archive/damage-analysis-plan.md](archive/damage-analysis-plan.md),
  "Borrowing from xivanalysis": what's worth taking, what isn't (their
  event layer, UI, percentage targets), and the MIT attribution rule.
- The headers of `lib/damage/ffxiv/jobs/*.ts` and `lib/damage/checks.ts`.
  The job headers already record which xivanalysis modules were ported and
  what each case study matched, built or did not adopt. The audit must not
  redo that work; it reads it as "already covered".

## Ground rules

- **Untrusted source.** Clone xivanalysis into the scratchpad, never into
  the repo:
  `git clone --depth 1 https://github.com/xivanalysis/xivanalysis.git <scratchpad>/xiva`.
  Read it only; never run, install or build anything inside it.
- **Pin the commit.** Record the cloned commit hash in every ledger file so
  a later refresh can diff against it.
- **Patch awareness.** The app applies the vendored 7.4 data
  (`lib/damage/ffxiv/xiva-data.ts`) and maps each log to a patch
  (`DamageGame.patchOf`). Note every `patch.before / is / after` branch a
  rule takes; a rule that only applies before the current patch is
  recorded as such, not dropped.
- **No code changes during the reading phases.** Phases 1 and 2 produce
  ledger files only. Building checks happens in phase 3, one job at a time,
  under the normal rules (tsc, scoped validation, commit and push).
- **Multi-agent fan-out needs the user's opt-in.** Phase 1 is meant to run
  as a workflow of subagents. Don't launch it unless the user has asked
  for a workflow in their own words.

## Phase 1: extract the rules (subagents, read-only)

Run one agent for the shared core, then one per job. Don't split by
module: job modules extend core ones (DoTs, Procs, Combos, Gauge,
Cooldowns, Tincture, Positionals, AlwaysBeCasting), and an agent that sees
one file misreads it. A cheaper model (Sonnet) is fine here; this is
extraction, not judgment.

1. **Core pass** (one agent): `src/parser/core/modules/` plus
   `src/parser/core/modules/Suggestions/`. Output: one record per
   rule, plus a short note per module saying which per-job hooks it
   exposes (what a job module can override or configure).
2. **Job passes** (one agent per job, run after the core pass, given its
   output): `src/parser/jobs/<job>/` in full, including the job's
   `index.ts` (which core modules it enables or replaces) and changelog.

Every record has these fields:

| Field | Content |
|---|---|
| `id` | `<job>/<Module>/<short-slug>`, stable across refreshes |
| `source` | file:line(s) in the clone, required |
| `rule` | what it checks, in one or two sentences |
| `trigger` | the exact condition that produces a suggestion or a bad mark |
| `threshold` | numbers and severity tiers (Minor/Medium/Major), if any |
| `damage` | `yes` / `no` / `indirect`, with one line on why |
| `log-visible` | `yes`, or `no (gauge / hidden state)` with how xivanalysis infers it |
| `patch` | patch branches it depends on, or `all` |
| `fires-on` | what kind of pull would make it fire (the mistake to look for) |
| `doubts` | anything that looks fight-blind: target counts, downtime, untargetable phases, uptime denominators |

The agent returns records only. It doesn't compare against the app; that
needs judgment and the app's code (phase 2).

Spot-check each batch before using it: open three records per job at their
`source` lines and confirm the summary. A job whose spot-check fails is
re-run.

## Phase 2: reconcile against the app (main session, read-only)

For each job, compare its records with `lib/damage/ffxiv/jobs/` (the job's
file, `gauges.ts`, `shared.ts`, `tincture.ts`), the generic engine checks
in `lib/damage/checks.ts`, and the job's header. Give each record one
status:

| Status | Meaning | Next step |
|---|---|---|
| `covered` | the app has a check for it | firing test (phase 3) unless the header already records it firing on a log |
| `verified` | covered, and the header records a log where it fired and matched | none |
| `candidate` | holds in principle, costs damage, the app misses it | build after the premise check (phase 3) |
| `no-damage` | healing efficiency, mitigation, utility | skip, per the adoption rule |
| `unverifiable` | depends on state the log doesn't show | simulate from the log (as the DNC Esprit work did) or leave it |
| `wrong` | its premise fails in context (a known xivanalysis error, or fight-blind) | record why; never adopt |
| `superseded` | the app checks the same thing differently (lost potency instead of a percentage) | none; note the mapping |

Write the result to `docs/xiva-audit/<job>.md`, one file per job:
- a short header: clone commit, date, patch, job file(s) in the app;
- the ledger table: `id`, status, the app's check name or `—`,
  `fires-on`, and a notes column (doubts, links to case studies);
- an "Open" list at the bottom: every `covered` without a firing test and
  every `candidate`, in priority order (biggest damage cost first).

Add one line per job to [open-items.md](open-items.md) under "Analysis
systems" pointing at its ledger and giving its open count. Don't copy the
records into open-items.md; at 15–25 rules per job they'd bury everything
else.

## Phase 3: verify against logs (ongoing, one job at a time)

This is the slow part and isn't meant to finish in one session. It runs
whenever a log with the job is on disk, and inside every `/damage-analysis`
case study for that job.

- **Premise check** (any pull with the job): does the rule's logic hold for
  this fight? Downtime, adds, untargetable windows, forced movement. A
  `candidate` whose premise holds can be built; one whose premise fails
  becomes `wrong`.
- **Firing check** (needs a pull where the mistake happens): does the app's
  check fire where xivanalysis's does, and with a sensible cost? A clean
  pull proves nothing here: both tools report zero. Look for the mistake in
  more pulls of the job, including weaker parses from FFLogs rankings, not
  only the user's static. Use `scripts/dump-player-events.js` to confirm
  the moment in the log.
- Where no pull with the mistake turns up, leave the row as
  `covered (firing untested)` rather than calling it done.
- When a case study confirms or builds a row, update the ledger row and
  the job header together. The header remains the authority for what the
  app checks; the ledger is the audit's working list.

## Order

1. Jobs the user's statics play (check the rosters in recent
   `sampledata/ff/*/meta.json` and the case studies in
   [damage-case-studies/](damage-case-studies/)).
2. Jobs with no case study yet.
3. The rest.

Do a pilot on one job through phases 1 and 2 before the fan-out. Then
check with the user that the ledger format works for them.

## Refresh

When xivanalysis moves on (new patch layers, new modules), re-clone,
diff against the commit pinned in each ledger, and run phase 1 only on the
changed files. Records keep their `id`, so statuses carry over.

## Not in scope

- WoW / WoWAnalyzer. The same method would work there, but WoWAnalyzer is
  AGPL and reference-only (see the damage-analysis plan): rules may be
  read, no code or data copied. Plan it separately if wanted.
- Mechanic detection and mitigation. Mitigation records found along the
  way are `no-damage`; mention them to the user if one looks useful for
  `lib/mitigation/`, but don't build them here.
