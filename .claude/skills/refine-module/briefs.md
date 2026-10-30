# refine-module brief templates

Copy a template into the Agent call's prompt and fill every `<…>`.
- Analyst: `subagent_type: refine-worker` (Opus, high effort).
- Implementers: `subagent_type: refine-worker-light` (Sonnet; SKILL.md's
  Subagent types trial).
- Don't pass `model`; the agent file sets it.
- Keep the brief short: evidence goes by file path and question number,
  never pasted.

Paths are from the repo root (`<repo root>`: its absolute path);
`<scratchpad>` is the session scratchpad's absolute path. Subagents' cwd
resets between commands, so give absolute paths.

**Reading rules both briefs carry** (`<reading rules>` below): paste this
block verbatim.

```
Reading and output rules (every output stays in your context, so each
token you pull in is paid for again on every later request):
- Read through python -I tools/docs.py (run from <repo root>):
    digest <module>                    the module's DIGEST: read it first
    <module> "<heading>" [--grep re]   one header section the DIGEST names
    fn <module> <name>                 one function / const, whole
    rule <ruleId>                      where a rule is emitted + header lines
    rulings --report <code> [--pull N] [--rule <prefix>]   filtered rulings
    pitfalls / pitfalls "<heading>" / pitfalls --grep <re>
    <README.md> "Attribution philosophy"
    tools <game>/<area>                the fight's existing probes
  Read a file directly only by offset/limit to place an Edit. Never a file
  over ~40 KB whole, never expectations/rulings.json, never the same
  range twice.
- Cap output: probes and validate.js | head -c 3000 (or a tool's summary
  mode); npx tsc --noEmit 2>&1 | head -20; one line per pull or player.
- A probe you'd run again goes in tools/<game>/<area>/ (tools/README.md),
  not the scratchpad; check docs.py tools first.
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
   <scratchpad> (only after `python -I tools/docs.py tools <area>` shows
   no tool for it; a probe you'd reuse goes in tools/, see tools/README.md),
   and for The Omega Protocol tools/ffxiv/top/*.js. Print jobs, never names.

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
    line per job, no tool dumps. Give each question its own "## Q<n>"
    heading so implementers can read one with
    python -I tools/docs.py <evidence path> "Q<n>".
Keep (i) and the rest of your final message under ~6000 characters; the
detail belongs in the evidence file.

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

The analyst's evidence: <evidence file path>, questions <Q numbers>
(read each with python -I tools/docs.py <evidence file path> "Q<n>", and
its "Pull is over" table the same way).

<reading rules>

Read first:
1. docs.py digest of each module you'll edit, then the sections it names
   for the rules above, and those rules' code (docs.py rule / fn).
2. docs.py pitfalls, then <the named sections for this mechanic>.
3. README.md "Attribution philosophy".

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

Check with, and only with (the baseline is current: every diff is yours):
node scripts/validate.js --check <mechanic(s)> <folders> --diff-only | head -c 3000
node .claude/skills/refine-module/tools/pull-errors.js <game> <code> "<fight>" --pulls <list> --jobs
npx tsc --noEmit 2>&1 | head -20

Return (your final message, under ~2500 characters, in this shape):
FILES: <paths>
DIFF: one line per + - ~ entry: report, Pull X MM:SS, job, rule, why
  (intended / not, and what you did)
THRESHOLDS: name = value; clean extreme; failure extreme
NEW CALLS: VOD pulls where the change makes a call the user hasn't seen
PINS: one JSON line per confirmed call, ready to paste into a ruling's
  mustFlag / mustNotFlag ({"ruleId": ..., "player": "<JOB>"}), with the
  pull
UNSETTLED: one line each

Budget: about <60> tool calls. If you reach it, stop and return
"OVER BUDGET" with what's done and what's left.
```
