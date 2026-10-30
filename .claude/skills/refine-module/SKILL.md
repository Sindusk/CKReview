---
name: refine-module
description: Refine an existing WoW or FFXIV boss detection module against a log the user supplies. Runs the module on that report, finds the calls it isn't sure of (candidate pairs, player-less errors, unexplained deaths, generic cutoffs, kill errors, thresholds near their edge), asks numbered VOD questions, then applies the user's answers as narrow fixes with rulings, validates and commits. Use when the user gives a report to review or refine a boss's detection with, or answers VOD questions about one.
argument-hint: <report URL or code> [boss / fight name] [pull numbers]
---

# Refine a boss module with a reviewed log

The loop:
1. An analyst subagent runs the module on the report and writes the VOD
   questions plus the evidence behind them.
2. The main thread asks; the user answers a whole batch.
3. Implementer subagents turn the answers into narrow fixes.
4. The main thread writes rulings, validates, commits, follows up.

**Why subagents:** a session's cost is requests × context. Module
headers, PITFALLS, tool output and probes stay in the subagents; the main
thread holds only the question list, the evidence file, the answers and
the implementers' diff summaries.

**The user's review is ground truth** (README philosophy 6). CLAUDE.md
applies throughout:
- times as MM:SS, pulls as "Pull X" (no report letters, no +SSS);
- the user writes up a whole batch, so take it all;
- rulings only from a VOD review, written by hand, never by `--update`;
  never edit an existing ruling;
- scope `--check` to the boss's reports (CLAUDE.md's Validation fact);
- commit and push without asking; never deploy;
- no character names in code or docs: use jobs (`--jobs` on the tools).

**Subagent types** (user, 2026-10-30). Both have only
Read/Edit/Write/Bash/Grep/Glob and a short system prompt, so each starts
far below a `general-purpose` agent's ~56k tokens:
- **Analyst:** `subagent_type: refine-worker` (Opus, high effort).
- **Implementers:** `subagent_type: refine-worker-light` (Sonnet), every
  group, as a trial. Judge it at the end of the session: did each fix
  match the user's answers on the first try (no send-back, no wrong
  verdict in step 5.1)? Log the verdict with the cost. If a Sonnet fix is
  wrong, the next session sends that kind of group to `refine-worker`.

Don't pass `model`: the per-call value overrides the agent file. Haiku
(`Explore`) only for a lookup that needs more than one Grep across files
nobody will edit. Never the Workflow tool unless the user asks for it.

**What agents read** (the briefs say it; check yours do): everything
through `python -I tools/docs.py` (`help` lists it). It prints a module's
DIGEST, one header section by heading, a function, where a rule id is
emitted, filtered rulings, a PITFALLS section, and the fight's tools.
Never a whole file over ~40 KB, never `expectations/rulings.json` whole.
A module with no DIGEST gets one before its first refine (`docs.py
check` lists them).

**What agents run:** the fight's tools first (`docs.py tools
<game>/<area>`; tools/ mirrors lib/mechanics, see tools/README.md). A
probe worth running again goes into tools/, not the scratchpad (user,
2026-10-30). Output is capped: probes and `validate.js` through `| head
-c 3000`, `tsc` through `| head -20`.

Brief templates: [briefs.md](briefs.md). Fill every `<…>`; a subagent
knows only its brief.

## 0. Identify the boss (main thread)

- If `sampledata/<game>/<code>/meta.json` exists, read the fight names
  from it. Otherwise run `node scripts/fetch-<ff|wow>-report.js <code>
  --meta-only`: one call, no pulls fetched, prints the title and the
  fights by name. **The fight names decide the boss, never the title**
  (a report titled "TOP Day 3" was once taken for Dancing Mad).
- Find the module's path: the tree at the top of
  [lib/mechanics/README.md](../../../lib/mechanics/README.md); WoW modules
  are also in `wow/registry.ts`. Don't read the header here.
- If you don't know which VOD the user has loaded (which pulls it
  covers), ask now.

## 1. Analyst (one `refine-worker` subagent)

Send briefs.md's **Analyst** brief. It reads the module DIGEST(s) and the
sections they name, the PITFALLS index plus the relevant sections, and
the boss's prior rulings (filtered); fetches; snapshots a new report;
runs the tools; probes. **It first fixes each pull's "pull is over"
point** (below) and asks nothing about later events. It returns:
1. the numbered VOD question list, in CLAUDE.md's format, for the loaded
   VOD's pulls only;
2. the path of the evidence file it wrote in the session scratchpad,
   which starts with each pull's "pull is over" point.

Read only those two. If it returns OVER BUDGET, decide from its progress
whether to continue it (SendMessage) or ask what it has.

**Stop at the first unrecoverable failure.** A pull is over at the first
error or death after which it can't lead to a clear: a tank death, a
failed tower that kills, a Damage Down followed by a called reset, the
detection cutoff. Events after it aren't worth a question: on
2026-10-28, 3 of 15 questions were about such events and the user
dismissed them ("not worth analyzing", "the pull is effectively over
from an analysis standpoint"). The one exception: when detection's
cutoff itself looks wrong (too early, too late, or the wrong cause), ask
about the cutoff only.

## 2. Ask

Check the list against CLAUDE.md's VOD format before sending: one list,
1, 2, 3 … with no sub-letters, ordered by pull; each item gives "Pull X
MM:SS", what detection says with the players it names, and the exact
thing to look at; a question for several pulls asked once, at the first.
About a dozen, preferring questions whose answer would change a rule.
Drop any item that falls after its pull's "pull is over" point (unless
it questions the cutoff itself).

## 3. Check the answers before encoding them

**Roster first.** Before reading the answers, run
`node .claude/skills/refine-module/tools/pull-errors.js <game> <code> "<fight>" --roster`
(character name → the `--jobs` label, from the sample data, no fetch).
Map every name in the user's answers to a job from its output, not from
memory: a character name was once mis-mapped to the wrong job. Briefs
carry the verified jobs, never names. The roster output is the only
place names are printed; keep it out of files.

Take the whole batch. For each answer, compare the user's account with
the evidence file (and the log, when the file doesn't cover it):
- **They agree:** encode it.
- **They disagree** (a job named in the answer isn't the one the log
  shows there; a Spotlight call the row positions contradict): pin only
  the confirmed part, and ask about the rest in the next round.
- **The user says the log can't settle it,** or nothing separates it:
  keep the current behavior, leave it unruled, note it in the header.

Don't build a rule fitted to one pull and then remove it: if the
evidence has a single pull for a signal, ask or wait for more.

Sort the encodable answers:
- **Confirmed as detected:** a ruling only (step 5).
- **Wrong player or severity, or a new failure kind:** an implementer.

## 4. Implementers (one per mechanic group)

Group the answers by the files the fix would touch. **Merge tiny groups**
(one answer each) into one implementer when their files don't need
separate review; every implementer pays its startup and its reading. One
implementer per group (`refine-worker-light`, Sonnet; see Subagent
types). Send briefs.md's **Implementer** brief with the user's answers
for that group **verbatim** (names mapped to jobs from `--roster`).
**Brief by reference:** give the evidence file's path and the question
numbers, not pasted evidence; the implementer reads them itself, and
input costs less than the main thread writing it.

**Waves, so each `--check` shows only its own diff** (2026-10-30: a
shared-helper change running beside two module fixes made both explain
diffs that weren't theirs and cost a send-back):
- A fix that touches a shared helper (a `common.ts`, `player-position`,
  `error-rules`, anything several modules import) runs **first and
  alone**.
- After each wave, review its summaries (step 5.1), run its scoped
  `--check`, and `--update` those folders, so the next wave starts from
  a clean baseline. Rulings still wait for step 5.3.
- Within a wave, run implementers in parallel only when their files
  don't overlap and none of them touches shared code.

Implementers never edit `expectations/rulings.json`, never run
`--update`, never commit. Each returns briefs.md's short report: its
diff summary (every `+ - ~` line explained), the thresholds it used, and
the ruling pins as JSON lines.

## 5. Validate and record (main thread)

1. Read each summary. Every diff line must be an intended consequence
   on every one of the boss's reports, not just this one. Send anything
   unexpected back to its implementer.
2. Run the scoped cross-report check yourself:
   `node scripts/validate.js --check <mechanic(s)> <the boss's
   sampledata folders> --diff-only` (all of a game for cross-boss code).
3. Write the rulings **by hand** into `expectations/rulings.json`, now
   that detection has settled. Follow its `_doc` schema: `{ report,
   mechanic, boss, pull, mustFlag, mustNotFlag, note, date }`.
   - Pin ruleId + player; add `name` or `t` only when the same rule fires
     on that player for something else in the pull.
   - Only what the VOD review confirmed; nothing the user couldn't settle.
   - New rulings only. An on-disk ruling a change breaks is reported to
     the user, not rewritten.
4. `--check` again (rulings must pass), then `--update` the folders whose
   diff you reviewed, then `npx tsc --noEmit`.
5. Module header: a "VOD review <date> (user): Pulls …, rulings in
   expectations/rulings.json" line; check the implementers updated RULES
   IMPLEMENTED, VERIFIED and the DIGEST (rules, thresholds, open items).
   Add anything that generalizes to
   [PITFALLS.md](../../../lib/mechanics/PITFALLS.md), under its section.
6. Commit (CLAUDE.md's co-author trailer) and push. Say it's ready to
   deploy.

## 6. Follow up

Reply with what changed per answer and which pulls' cutoffs moved. Then
send a short numbered follow-up list in the same format, about the pulls
in the same VOD where the new rules made a call the user hasn't seen yet
(the implementers' summaries name them). Check each item against the
evidence file's "pull is over" table before sending: on 2026-10-30 a
follow-up about Pull 20 5:40 fell after that pull's 4:56 over point and
the user dismissed it. Stop when the user says to.

## Cost

At the end of the session (after the commit), measure it from Git Bash:

    python -I ~/Documents/CCT/cost-analysis/session_costs.py --session <session id prefix>

The user's cost-analysis scripts live outside the repo; `--session`
finds the session under `~/.claude/projects/`, dedupes by `message.id`
and prints one row per agent (requests, tokens, first and average
context, cost) plus the total, and Splitrail's figure once Splitrail has
scanned the session. Append one line to [cost-log.md](cost-log.md):
date, boss, questions asked, answers encoded, implementers (and
send-backs), total cost, cost per answer, main/analyst/implementer split,
and the Sonnet implementer trial's verdict. Compare per answer with earlier lines before
changing this skill's procedure.
