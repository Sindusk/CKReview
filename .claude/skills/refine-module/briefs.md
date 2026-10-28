# refine-module brief templates

Copy a template into the Agent call's prompt and fill every `<…>`.
- Analyst and Opus implementers: `subagent_type: refine-worker`.
- Small implementer groups (1–2 answers, small modules; SKILL.md step 4's
  A/B trial): `subagent_type: refine-worker-light`.
- Don't pass `model`; the agent file sets it.

Paths are from the repo root (`<repo root>`: its absolute path);
`<scratchpad>` is the session scratchpad's absolute path. Subagents' cwd
resets between commands, so give absolute paths.

**Reading rules both briefs carry** (`<reading rules>` below): paste this
block verbatim.

```
Reading rules (token budget; these files are large):
- Module headers: read the DIGEST block at the top of each module first
  (from "── DIGEST" to "── END DIGEST", usually the first ~80 lines). Then
  read only the header sections the DIGEST names for the rules in your
  task: Grep the quoted heading text with -n, then Read with offset/limit
  around it. Never Read a file over ~40 KB whole (phase1.ts is 275 KB).
- lib/mechanics/PITFALLS.md: Read its Index (the top), then only the
  sections named in your task or that the Index points to for this
  mechanic kind, by offset/limit.
- lib/mechanics/README.md: only "## Attribution philosophy" (and severity
  definitions), by offset/limit.
- expectations/rulings.json (250 KB): never Read it. Filter with node,
  e.g. node -e "const {rulings}=require('<repo root>/expectations/rulings.json');
  console.log(JSON.stringify(rulings.filter(x=>x.boss==='<fight>'
  || x.report==='<code>'),null,1))"
```

## Analyst

```
You are the analyst for a /refine-module session in <repo root>. Read
CLAUDE.md first; its rules apply. You analyze only: don't edit tracked
files, don't write rulings, don't commit.

Report: <code> (<ff|wow>), fight "<exact fight name>", module(s)
<lib/mechanics/... paths>. The user's VOD covers <pulls / "all pulls">.

<reading rules>

Read first, in this order:
1. The DIGEST of each module above, then the sections it names for
   VERIFIED AGAINST LOGS, RULES IMPLEMENTED and the cutoffs. Open other
   sections only when a question needs them.
2. PITFALLS.md: the Index, the general sections it names, and the topic
   sections for this boss's mechanic kinds.
3. README.md's attribution philosophy and severity definitions.
4. The rulings for this boss and report (filtered; the user's past calls).

Then:
1. Fetch only this fight, in the background, unless
   sampledata/<game>/<code>/ already has it:
   node scripts/fetch-ff-report.js <code> --boss-exact "<fight>"
   node scripts/fetch-wow-report.js <code> --boss "<fight>"
   Work from pulls on disk while the rest download.
2. New report (no expectations/<game>-<code>.json): snapshot first,
   node scripts/validate.js --update sampledata/<game>/<code>
3. node .claude/skills/refine-module/tools/pull-errors.js <game> <code> "<fight>" --summary --jobs
   then per pull: --pulls <list> --jobs [--rule <prefix>] [--all].
   Its output matches the app (cross-pull passes included); UNEXPLAINED
   DEATH lines are deaths no error accounts for.
4. For each VOD pull, fix its "pull is over" point: the first error or
   death after which the pull can't lead to a clear (a tank death, a
   failed tower that kills, a Damage Down followed by a called reset, the
   detection cutoff, whichever comes first). Ask NOTHING about events
   after it: the user dismisses those ("not worth analyzing", "the pull
   is effectively over from an analysis standpoint", 2026-10-28). The one
   exception: if detection's cutoff itself looks wrong (too early, too
   late, wrong cause), ask about the cutoff only.
5. Probes, before asking anything the log could settle:
   scripts/analyze-report.js (timeline, window, resolutions, nokb, sweep),
   .claude/skills/build-module/tools/probe-pulls.js from a probe in
   <scratchpad>, and for The Omega Protocol
   .claude/skills/refine-module/tools/top-probes.js (fire-spots,
   blaster-trace). Print jobs, never names.

Look for the calls the module isn't sure of, before each pull's "pull is
over" point:
- candidate sets: one failure naming two or more players;
- player-less errors where a player might be at fault;
- unexplained deaths, especially no-killing-blow ones;
- cutoffs from generic markers (collapse, called wipe): what started it?
- errors in a kill; rules firing far more often than in the header's
  reports; values near a threshold (compare the DIGEST's / header's clean
  and failure extremes);
- IDs the module doesn't know (analyze-report.js sweep against its
  constants); model failure modes listed as not built that occur here.

Return (your final message, nothing else):
(i) The numbered VOD question list, CLAUDE.md's format: one list
    1, 2, 3 … with no sub-letters, ordered by pull, only the VOD's
    pulls; each item "Pull X MM:SS", what detection says with the jobs
    it names, and the exact thing to look at. A question for several
    pulls is asked once, at the first. About a dozen; prefer questions
    whose answer would change a rule. None after a pull's "pull is over"
    point, except about the cutoff itself.
(ii) The path of <scratchpad>/<code>-evidence.md, which you write. It
    starts with a table: per VOD pull, its "pull is over" point (MM:SS,
    what, jobs) and the detection cutoff if different. Then per question
    number: the pull, MM:SS, what detection says (rule id, jobs), what
    the log shows, and the candidate signals with their values for each
    job involved (positions, distances, timings, aura windows), plus the
    clean range of each signal across the report. Compact: tables or one
    line per job, no tool dumps.

Budget: about 120 tool calls. If you reach it, stop and return
"OVER BUDGET" with what you've finished, the list so far, and what's
left.
```

## Implementer

```
You are an implementer for a /refine-module session in <repo root>.
Read CLAUDE.md first; its rules apply. Edit files with the Edit/Write
tools only. Do NOT edit expectations/rulings.json, do NOT run
validate.js --update, do NOT commit.

Mechanic group: <name>. Files you may touch: <module paths, and only
these>. Rules involved: <rule ids>. Report: <code> (<game>); the boss's
other reports on disk: <sampledata folders>.

Players are named by job (the main thread mapped the user's names with
pull-errors.js --roster): <job map lines relevant to these answers, e.g.
"the user's 'our healer' = SGE">.

The user's VOD answers for this group, verbatim (names replaced by jobs):
<answers>

The analyst's evidence for these questions (<evidence file path>):
<the matching entries>

<reading rules>

Read first:
1. The DIGEST of each module you'll edit, then the header sections it
   names for the rules above (Grep the heading, Read offset/limit), and
   the code of those rules (Grep the rule id).
2. PITFALLS.md: the Index, then <the named sections for this mechanic>.
3. README.md's attribution philosophy.

For each answer:
- Wrong player or severity: find a log signal that separates the user's
  account from the alternative and check it on EVERY report on disk for
  the boss. Signals that worked before: the position when the mechanic
  snapshots; distance from the arena center or from clean-pull reference
  spots; who baited nothing; an aura that ended at the hit; process of
  elimination.
- Encode it as a narrow override, with the threshold's clean and failure
  extremes in a comment citing the call ("user, <date>, Pull X MM:SS:
  ..."). Don't fit a rule to one pull: if the signal rests on one pull,
  stop and say so instead.
- A new failure kind: a rule (or a rule id when another group is
  responsible), with its exposure.
- Update the module header's RULES IMPLEMENTED for every changed rule,
  VERIFIED for new log facts, and the DIGEST (rule lines, thresholds,
  open items, section names) so it stays true.

Check with, and only with:
node scripts/validate.js --check <mechanic(s)> <folders> --diff-only
node .claude/skills/refine-module/tools/pull-errors.js <game> <code> "<fight>" --pulls <list> --jobs
npx tsc --noEmit

Return (your final message): the files changed; the diff summary, each
+ - ~ line with its pull, MM:SS and why it changed (intended, or not and
what you did); the threshold values used with their clean and failure
extremes; pulls in the VOD where the change makes a call the user hasn't
seen yet; anything left unsettled.

Budget: about <80> tool calls (<40> for a light group). If you reach it,
stop and return "OVER BUDGET" with what's done and what's left.
```
