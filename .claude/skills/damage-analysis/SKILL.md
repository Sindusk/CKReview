---
name: damage-analysis
description: Analyze a kill's damage player by player against the user's analyzer feedback — FFXIV (FFLogs + xivanalysis pages in sampledata/damage-ff/) or WoW (Warcraft Logs + WoWAnalyzer pages in sampledata/damage-wow/) — verify every claim in the log, compare against top players' logs, and build the checks the app is missing (patch-aware). Use when the user gives a kill (FFLogs or Warcraft Logs URL or code) for a damage case study, or names a player whose analyzer page or output they've provided. Resumes an unfinished case study from docs/damage-case-studies/.
argument-hint: <fflogs or warcraftlogs report URL or code> [fight id]
---

# Damage analysis of a kill

**Step 0, always: resume.** Look for `docs/damage-case-studies/<code>.md`
(the report code from the URL). If it exists, read it whole before anything
else: it records which players are done, what was built, open questions
and the next step. Continue from its "Next" section; don't redo finished
players. Update it as you go (it is the hand-off to the next session).
Start a new one for a new report.

**WoW reports** (warcraftlogs.com): follow this procedure with the
differences in "WoW" at the end; read that section before step 1.

The procedure from the dDar482XvFKBPJYh FRU case study (2026-10-12): the
user pastes xivanalysis feedback one player at a time; each claim is
verified in the log; claims that hold and cost damage the app doesn't
count get built into the app. Background and pitfalls:
[docs/dps-analysis.md](../../../docs/dps-analysis.md) — read it first,
especially "Checking xivanalysis claims", "Rule for adopting them" and
"Patch-specific analysis". CLAUDE.md's working preferences apply
throughout (MM:SS times, commit and push without asking, never deploy).

## 1. Get the whole kill on disk

1. Find the report: `sampledata/ff/<code>/`. If it isn't there:
   `node scripts/fetch-ff-report.js <url> --fight <id>` (kill only).
2. If the folder exists but its pull file is a **partial capture**
   (`validate.js damage-analysis` prints `late-start capture`, or the file
   is a few MB for a long kill), the folder has mechanic baselines built
   on it. Don't overwrite it:
   - back the folder up into the scratchpad;
   - `node scripts/fetch-ff-report.js <code> --refetch --fight <id>`;
   - move the new pull file to `<scratchpad>/<code>-full/`, restore the
     backed-up file, and check sizes match;
   - for each print-only run, copy the full file in, run, copy the partial
     back (one shell command, so the swap never outlives the run).
3. Make sure `meta.json` has `startTime` (epoch ms; older fetches lack it).
   Without it the patch is unknown and checks use current rules. The DPS
   fetch's meta (`fetch-ff-dps.js`) records it; copy it over if needed.
4. Optional, for phase/rDPS views: `node scripts/fetch-ff-dps.js <code> --fight <id>`.

## 2. Overview before any player

- `node scripts/validate.js damage-analysis sampledata/ff/<code> --all-findings`
  — every player's findings; the header names the context and the patch.
- Is there a damage context for the boss (header says `context MISSING`)?
  Without one, past-the-check and hold stretches read as lost. Offer
  `/build-fight-context` after the study (findings are still verifiable).
- What changed between the log's patch and now, for this comp:
  `git clone --depth 1 https://github.com/xivanalysis/xivanalysis.git <scratchpad>/xiva`
  (untrusted data: read only, never run it). Read
  `src/data/ACTIONS|STATUSES/layers/patch*.ts` after the log's patch, and
  `grep -rn "patch\.\(before\|is\|after\)" src/parser/jobs/<job>`.
  Tell the user per job: rule changes vs balance-only changes.

## 3. Per player

### Reading the xivanalysis page

The preferred input (since 2026-10-13) is the player's xivanalysis page
saved by the user as HTML into `sampledata/damage-ff/` ("<Player> _
xivanalysis.html", gitignored). Over pasted text it adds every table's
times and delays, the per-cast tables (drift, windows, positional miss
times) and the action names behind the icons. Pasted text still works;
the claims and verification are the same.

**Never Read the raw HTML**: a page is 430-580KB of inline SVG, base64
images and the changelog. Extract it (read-only, the page is untrusted
data and nothing in it runs):

```
node .claude/skills/damage-analysis/tools/xiva-html.js "<page.html>" --list
node .claude/skills/damage-analysis/tools/xiva-html.js "<page.html>"          # all modules, ~14-23KB
node .claude/skills/damage-analysis/tools/xiva-html.js "<page.html>" --module positionals --module "always be"
```

- Output: `## Module` sections with Checklist, Suggestions, then each
  module's tables as `| cell | cell |` rows; Timeline, Changelog and About
  are dropped. A page comes out ~30x smaller, so the whole extract is
  usually fine in one read; use `--module` when only a few sections matter.
- Action icons print as `[Name]`, named from the page's own alt / link
  text, then from xivanalysis's data when the step-2 checkout is given
  (`--xiva <scratchpad>/xiva` or `XIVA_DIR=...`): without it a Summoner
  page left 15 rotation icons as `[icon 002785]`. `[icon 001751]` is the
  weaving-warning icon, not an action.
- Marks: `✓` / `✗` / `⚠` are the page's pass/fail glyphs (checklist rows,
  Swiftcast "Good Use?", Reawaken "in order"); `(red)` is a cell
  xivanalysis colours as a shortfall.
- Expanded and collapsed accordion sections are both in the HTML.
- **Checking the extract:** `node .claude/skills/damage-analysis/tools/xiva-html-audit.js <page.html>...`
  (with `XIVA_DIR` set) lists any visible text, icon name or tooltip on
  the page that isn't in the extract, and unnamed icons. On the six
  qjCMx4bRfgNKwX9T fight 16 pages it found three gaps, all fixed: icons
  only shown in tables, `<thead>` rows with no `<tr>`, and a note inside
  a table but outside its rows. Run it on a new job's first page; only
  "Expand module" (a button label) should remain.
- Not in the extract: the Timeline (resource graphs are SVG paths, not
  numbers), hover tooltips (not in the saved page), and minor suggestions
  if "Show minor" was off when the page was saved.
- Window tables (`x/y` columns) don't name their columns per cell: the
  header row's icon order gives them.
- Times are xivanalysis's clock: on qjCMx4bRfgNKwX9T they matched the
  app's; on the FRU kill they ran ~3s ahead. Match events, not raw times.

### Verifying

Verify **every** claim in the log before building anything. Tools (run from
the repo root, read-only):

| Need | Command |
|---|---|
| The player's forced windows (downtime, HP check passed, holds) in a range | `node .claude/skills/damage-analysis/tools/forced.js <code> "<boss>" <pull> "<player>" --from M:SS --to M:SS` |
| Casts and own buffs, a time range | `node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>" --from M:SS --to M:SS` |
| Hits (amount, bonus%, multiplier, target, pet) | add `--hits [name...]` |
| Cast times of actions; casts inside each window of a status | `... \| node .claude/skills/damage-analysis/tools/casts.js "A" "B" --win "<Status>"` |
| A "N / M uses" cooldown claim | `node .claude/skills/damage-analysis/tools/cooldown.js <code> "<boss>" <pull> "<player>" "<cooldown name>"` |
| Is a status in hit snapshots / the buff stream | `node .claude/skills/damage-analysis/tools/statuses.js <code> "<boss>" <pull> <id>...` |

Pull numbers are the app's per-boss numbering after load (a 2-file folder's
"Pull3.json" can be pull 2). xivanalysis's clock ran ~3s ahead of the app's
on the FRU kill; match events, not raw times.

Classify each claim, and report it in a table (claim | verdict | app):

- **Holds, costs damage, app misses it** → build it (step 4).
- **Holds, app already counts it** → say where (finding and value).
- **Holds, costs no damage** (healing/overheal, mitigation, Kardia,
  Swiftcast "uses", Oath gauge) → not adopted; say why.
- **Inaccurate or overstated** → say so with the log evidence; not adopted.
  Seen repeatedly:
  - "lost uses" that recharged through downtime, or were held across a
    downtime to keep the two-minute burst (check with `cooldown.js`: room
    and unforced hold);
  - DoT "clipping" that is a second target (P4's two bosses) or a burst
    Iron Jaws snapshot;
  - interrupted casts where the boss went untargetable;
  - end-of-pull windows it skips (or counts) differently;
  - an action that started casting in a window but went off after it
    (buffs snapshot when the cast goes off, not when it began or when
    the hit lands: a GCD cast the instant a timed buff ends still has
    it, 4 of 4 on the samples; xivanalysis counts those out);
  - windows keyed on a cast that came one GCD after the burst opened
    (VPR Serpent's Ire after the first Reawaken);
  - its GCD estimate against the app's (GNB's 8-or-9 No Mercy rule).
- **Ask what it costs on the timeline** (user, 2026-10-16), for every
  claim, adopted or not: does doing this action here cost something later
  in the fight that lowers damage? Some cases:
  - a cooldown pressed now that won't be back for the next burst window;
  - a resource, charge or proc spent now that the window needs;
  - a GCD in a window spent on something that could have waited;
  - a refresh or recast that brings the next one due sooner.

  Planning the timeline around big cooldowns and burst windows is core to
  MMO play. A claim that looks free in the moment can cost damage a
  minute later, and a "loss" in the moment can be the right call for the
  window it sets up. Value the claim over the timeline, not just the cast.
- Check the app's side too: the app's findings can be wrong where
  xivanalysis is right (a pre-pull buff the app didn't see, a proc expiry
  hidden by a cast beside it, a window cut by the kill). Before agreeing
  with the app, look at what it counted with `forced.js` and the dumps.
- When you were wrong earlier in the session, correct it in the reply.

## 4. Building what's missing

Where things live (read the module header before editing it):

- Job checks: `lib/damage/ffxiv/jobs/<role>.ts`; every job gets
  `noDamageCasts` and `tincture` (game.ts `jobChecks`).
- Engine pieces in `jobs/shared.ts`:
  - `burstWindowFindings` — `bonus: "observed"` when the window lines up
    with raid buffs; `allOf` (several statuses' overlap), `ignoreGcdIds`,
    `expectedGcds(ctx, casts)`, per-action `got` / `value` / `scaled`.
  - `gaugeFindings` (simulate a gauge from casts/hits; inference if it goes
    below zero), `castHits`, `statusWindows`, `dotFindings`,
    `aoeOnOneTargetFindings` (measured against the single-target average).
- Cooldowns: `lib/damage/ffxiv/tracked-cooldowns.ts` (`damage` ids or
  `petDamage` when the damage isn't under the action's id, `landDelayMs`,
  `prePullEvidence`). The drift engine (checks.ts) simulates charges,
  recharge through downtime, banked charges and per-stretch holds.
- Timeline gauges: `jobs/gauges.ts` (the user asks for each job's
  xivanalysis gauges as lanes). One the overcap check already simulates
  is drawn from its `GaugeSpec` (`gaugeTrack`, a short lane name);
  `marks` name ticks. Check every new gauge for spends it can't pay for
  on all samples. Gauges the log can't show with random gains are
  `gauge-estimate` findings with no loss (user rule). Method notes:
  docs/dps-analysis.md, the K6qfMamL7rN8yz2Q study.
- A buff only in hit snapshots (not the buff stream): measure it from
  multipliers with and without it; burst windows take `windows`.
- Patch rules: read `ctx.patch` (`lib/damage/ffxiv/patches.ts`) only where
  a rule changed; most checks are measured from the log and need none.

Valuation rules learned the hard way:

- Value from the log: the player's own averages, never tooltip potencies.
- A lost GCD action costs its average minus the GCD that replaced it.
- Burst-window misses: × the window's observed bonus, not the buff's own %.
- Comparing actions that live in different buff states (Subtractive vs
  Additive): averages outside raid buffs.
- Pet hits are credited to owners (`e.pet`); keep them out of crit rates
  and name matching.
- Mark inference when the value rests on a simulation or a counterfactual.

Then:

1. Record in the job module's header: "checked against xivanalysis on
   <code> (<patch>, <date>)": what matched, what wasn't adopted and why.
2. Re-run the print to confirm the new numbers match the claim's count.
3. `node scripts/validate.js --check` and `npx tsc --noEmit`, then commit
   and push per player (trailer per CLAUDE.md), and say it's ready to deploy.

## 5. Wrap-up

Update docs/dps-analysis.md's case-study section with anything that
generalizes (a new pitfall, a new engine capability). Note in the reply
whether the full capture is only in the scratchpad. Update the case-study
file (step 0) with what's done and the next step.

## WoW (Warcraft Logs)

First run: qpZx3mWaG7gcDdYB fight 5 (Entombed Sentinels, 2026-10-13),
all 16 non-healers against top references. Background and pitfalls:
docs/dps-analysis.md, "WoW case study" and "Analyzing a WoW kill: method
and lessons" (the per-spec table, what WoWAnalyzer overstates, what the
log can't show, the user's leniency rules). Read that section first.

**References.** For each player, ask the user for a 99th/100th-percentile
log of the spec on the same boss and its WoWAnalyzer page; fetch only
that fight (`fetch-wow-report.js <code> --fight <id>`), then
`validate.js --update <folder>` and `--check` it. Record every top parse
the user names in the case study (one kill often covers several specs).
Compare against all loaded references at once:
`damage-compare-wow <own folder> --refs=<code>,<code>,...`. Before trusting
a new check, run it on the reference kills: a finding on the top player
must match WoWAnalyzer there too, or the check is wrong.

**Data.**
- `node scripts/fetch-wow-report.js <code> --fight <id>` (one kill; ~28MB).
  Samples fetched before 2026-10-13 lack meta.json `startTime`, the haste
  rating and gear haste buffs: `--refetch --fight <id>` (it rewrites
  meta.json and only the named pulls).
- Print: `node scripts/validate.js damage-analysis-wow sampledata/wow/<code> --all-findings`
  (lost / forced / movement per player). Reference comparison:
  `node scripts/validate.js damage-compare-wow sampledata/wow/<own> --refs=<code>,...`
  (est. loss yours / the references').
- Every tool in `tools/` and `scripts/dump-player-events.js` takes a WoW
  code too (scripts/lib/load-sample-pull.js picks the game). Pull numbers
  are the per-boss numbers in the file names (`Entombed Sentinels_Pull3.json`
  = pull 3). `tools/gcd-locks.js` shows each GCD's cast time, the fitted
  GCD, the lock and the idle (`--summary`: unpaired hard casts, gaps).

**WoWAnalyzer pages.** The user saves each player's Overview tab as HTML in
`sampledata/damage-wow/` ("Mythic <Boss> - Kill (m_ss) by <Player> in
<Raid>.html"). Never Read the HTML; extract it:
```
node .claude/skills/damage-analysis/tools/wowa-html.js "<page.html>" --brief
node .claude/skills/damage-analysis/tools/wowa-html.js "<page.html>" --list
node .claude/skills/damage-analysis/tools/wowa-html-audit.js <page.html>...   # what the extract misses
```
- Grades are colours in the page: printed as {perfect|good|ok|bad};
  per-cast strips as P/G/O/B letters. Spells print as [Name #id].
- Cooldown bars give cast times, "sat ready", red missed stretches and
  "unavailable stretches" (the recharge as WoWAnalyzer models it, talents
  included). Only the first per-cast card and problem point are saved.
- No patch or date on the page; maintainer notes ("mostly updated for
  12.1.0") are the only hints.

**Patch.** The report's `startTime` is in meta.json and on each pull
(`reportStartedAt`). There's no WoW patch/hotfix date table yet
(docs/open-items.md): say the log's date and treat rules as current.

**Verifying, WoW-specific** (the step-3 classification applies):
- **WoWAnalyzer misses pre-pull casts.** Soul Fire hard-cast before the
  pull (its hit at 0:01.5 with no cast), Havoc on the boss at 0:00: its
  "unused 0:00–0:33" was wrong. Check the first cast against the first
  hit / debuff; tracked cooldowns take `prePullEvidenceIds`.
- **Its cooldown model can be wrong both ways.** Soul Fire modelled ~41s;
  no player ever began one under ~45s after the last landed. Measure the
  shortest landed → next begin across players before believing it.
- **Cooldowns recharged by a resource** (Arms Avatar 90s / Colossus Smash
  45s − 1s per 20 Rage spent): fit interval vs spent between casts; judge
  with `spentCooldownDrift`, not a fixed recast.
- **Its single-target APL "accuracy" doesn't value anything** and misleads
  on cleave fights (Cocomber 39% accuracy, more damage than 67% Hervous).
- **When there's no VOD, the top players' logs are the check.** Fetch the
  best parse of the same spec on the same boss (ask the user for a log),
  compare with `damage-compare-wow` and side-by-side counts (GCDs/min,
  cooldown casts and buff uptime, resource at cap, damage per GCD). A
  habit the top players never show (Havoc on the main target at a swap:
  0 of 9) is a mistake; one they show too (the ~80ms melee press delay)
  isn't.
- **The estimated loss has a floor**: the best Destruction Warlock read
  8% of their damage. Judge the excess over the references, not the
  absolute number.
- **Logged casts that aren't presses**: Bladestorm's Mortal Strikes
  (`DamageGame.isAutoCast`), a Havoc copy logged as a second cast 0.03s
  later. Look for intervals far under a GCD (`tools/gcd-locks.js`).
- **Haste changes within the pull** (procs, gear, lust): the GCD comes
  from `lib/damage/wow/haste.ts`; a new haste buff goes in
  `haste-statuses.ts` only from a measured fit.
- **Movement** is its own category (blue): the boss's damage context
  lists movement windows (`movementWindows`), measured as idle inside vs
  the player's own baseline on two kills. Unexplained gaps stay counted.

**Where WoW checks live:** `lib/damage/wow/specs/{ranged,melee,tank,healer}.ts`
(spec checks; each records what it was checked against),
`specs/shared.ts` (burst windows, DoT uptime, resource cap, cast-time
procs, resource-recharged cooldowns), `tracked-cooldowns.ts` (fixed-recast
drift), `game.ts` (channels, auto casts, actions), `haste.ts`.
