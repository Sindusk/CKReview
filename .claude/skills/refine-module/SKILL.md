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

**Models.** Analyst and implementers: the Agent tool, `subagent_type:
general-purpose`, `model: opus`. Haiku (`Explore`) only for a lookup that
needs more than one Grep across files nobody will edit. Never the
Workflow tool unless the user asks for it.

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

## 1. Analyst (one Opus subagent)

Send briefs.md's **Analyst** brief. It reads the module header(s) in
full, the PITFALLS index plus the general and relevant sections, and the
boss's prior rulings; fetches; snapshots a new report; runs the tools;
probes. It returns:
1. the numbered VOD question list, in CLAUDE.md's format, for the loaded
   VOD's pulls only;
2. the path of the evidence file it wrote in the session scratchpad.

Read only those two. If it returns OVER BUDGET, decide from its progress
whether to continue it (SendMessage) or ask what it has.

## 2. Ask

Check the list against CLAUDE.md's VOD format before sending: one list,
1, 2, 3 … with no sub-letters, ordered by pull; each item gives "Pull X
MM:SS", what detection says with the players it names, and the exact
thing to look at; a question for several pulls asked once, at the first.
About a dozen, preferring questions whose answer would change a rule.

## 3. Check the answers before encoding them

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

## 4. Implementers (Opus, one per mechanic group)

Group the answers by the files the fix would touch. One implementer per
group; run them in parallel only when their files don't overlap,
otherwise one after another. Send briefs.md's **Implementer** brief
with the user's answers for that group **verbatim** and the matching
evidence entries.

Implementers never edit `expectations/rulings.json`, never run
`--update`, never commit. Each returns its diff summary (every `+ - ~`
line explained) and the clean/failure threshold values it used.

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
   IMPLEMENTED and VERIFIED. Add anything that generalizes to
   [PITFALLS.md](../../../lib/mechanics/PITFALLS.md), under its section.
6. Commit (CLAUDE.md's co-author trailer) and push. Say it's ready to
   deploy.

## 6. Follow up

Reply with what changed per answer and which pulls' cutoffs moved. Then
send a short numbered follow-up list in the same format, about the pulls
in the same VOD where the new rules made a call the user hasn't seen yet
(the implementers' summaries name them). Stop when the user says to.
