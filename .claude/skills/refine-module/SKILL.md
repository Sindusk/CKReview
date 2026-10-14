---
name: refine-module
description: Refine an existing WoW or FFXIV boss detection module against a log the user supplies. Runs the module on that report, finds the calls it isn't sure of (candidate pairs, player-less errors, unexplained deaths, generic cutoffs, kill errors, thresholds near their edge), asks numbered VOD questions, then applies the user's answers as narrow fixes with rulings, validates and commits. Use when the user gives a report to review or refine a boss's detection with, or answers VOD questions about one.
argument-hint: <report URL or code> [boss / fight name] [pull numbers]
---

# Refine a boss module with a reviewed log

The loop from the Lindwurm review of QwNrFkGZ4m1yKpXC (2026-10-12):
1. Analyze the report with the existing module.
2. Ask about what the log can't settle.
3. Turn the user's VOD answers into narrow fixes and rulings.
4. Validate, commit, then ask about the pulls the new rules changed.

**The user's review is ground truth** (README philosophy 6). CLAUDE.md
applies throughout:
- give times as MM:SS;
- the user writes up a whole batch, so take it all;
- commit and push without asking;
- never deploy;
- no character names in code or docs.

## 0. Read the module first

- Find the boss's module. It's listed in the tree at the top of
  [lib/mechanics/README.md](../../../lib/mechanics/README.md); WoW
  modules are also in `wow/registry.ts`. Read its header **in full**:
  VERIFIED AGAINST LOGS, RULES IMPLEMENTED and the model.
- Read [lib/mechanics/PITFALLS.md](../../../lib/mechanics/PITFALLS.md) and
  the README's attribution philosophy.
- Check `expectations/rulings.json` for earlier rulings on this boss;
  they are the user's past calls.

## 1. Get the report and a baseline

1. Fetch only the boss's fights, in the background:
   `fetch-ff-report.js <url> --boss-exact "<fight>"` or
   `fetch-wow-report.js <url> --boss "<boss>"`. Skip this if
   `sampledata/<game>/<code>/` already has them.
2. If the report is new, snapshot the module's current output first:
   `node scripts/validate.js --update sampledata/<game>/<code>`. Later
   `--check` diffs then show exactly what the refinement changed.

## 2. Analyze with the existing detection

Per-boss view, from the real pipeline (what the app shows):

```
node .claude/skills/refine-module/tools/pull-errors.js <ff|wow> <code> "<fight>" --summary
node .claude/skills/refine-module/tools/pull-errors.js <ff|wow> <code> "<fight>" --pulls 3,8-12 [--rule <prefix>] [--all]
```

The per-pull mode marks each cutoff and lists **UNEXPLAINED DEATH**
lines: deaths no error accounts for.

Collect the calls the module isn't sure of. Look for:
- **Candidate sets:** one failure naming two or more players, e.g. "Their
  cone or X's", both chain partners, both baits that stood together.
- **Player-less errors** where a player might be at fault: owner couldn't
  be placed, sequence already broken, layout failed as a whole.
- **Unexplained deaths,** especially no-killing-blow ones classed as a
  fall, and any death the tool lists.
- **Cutoffs from generic markers** (collapse, called wipe): what started
  the collapse?
- **Errors in a kill,** which should be rare.
- **Rules firing far more often** here than in the header's reports.
- **Values near a threshold.** Compare them with the header's clean and
  failure extremes.
- **IDs the module doesn't know:** run `analyze-report.js <code> sweep`
  against the module's constants, for a new patch or a different strategy.
- **Model failure modes listed as not built** that occur in this report.

Use `analyze-report.js` (`timeline`, `window`, `resolutions`, `nokb`) and
scratchpad probes (`.claude/skills/build-module/tools/probe-pulls.js`) to
learn what the log shows at each one before asking.

## 3. Ask (CLAUDE.md's VOD format)

- If you don't know which VOD the user has loaded, ask. Ask only about
  pulls in that VOD.
- Write one numbered list, 1, 2, 3 …, with no sub-letters, ordered by
  pull. Each item gives:
  - the pull and its MM:SS, written "Pull X 6:12", never with a report
    letter (CLAUDE.md);
  - what detection currently says, with the players it names;
  - the exact thing to look at.
- Ask a question that applies to several pulls once, at the first pull.
- Prefer the questions whose answer would change a rule. Keep a round to
  about a dozen.

## 4. Apply the answers

Take the whole batch, and group the answers by mechanic. For each answer:

- **Confirmed as detected:** it becomes a ruling.
- **Wrong player or wrong severity:** find a log signal that separates the
  user's account from the alternative, then check it on **every report on
  disk** for the boss. Signals that worked before:
  - the position at the moment the mechanic snapshots;
  - distance from the arena center or from clean-pull reference spots;
  - who baited nothing;
  - an aura that ended at the hit;
  - process of elimination.

  Encode it as a **narrow override** with the thresholds' clean and
  failure extremes in a comment, citing the ruling ("user, <date>, A50
  +2:28: …").
- **The user says the log can't settle it**, or no signal separates it:
  keep the current behavior. Leave that player unruled and note it in the
  header.
- **A new failure kind:** add a rule, or a rule id when a different group
  is responsible, with its exposure.

Don't fit a rule to one pull. Run `pull-errors.js --summary` on the boss's
other reports too, and read every new or removed error the change causes.

## 5. Validate and record

1. Run `node scripts/validate.js --check <mechanic> <the boss's report
   folders>` and read the whole diff. Scope it the way CLAUDE.md's
   Validation fact says: only the reports holding this boss, unscoped only
   for cross-boss code. Each added, removed or changed line must be an
   intended consequence, and every one of the boss's reports counts, not
   just this one. Fix anything unexpected before going on.
2. Write the rulings **by hand** into `expectations/rulings.json`, at the
   end, once detection has settled. Follow the file's `_doc` schema:
   `{ report, mechanic, boss, pull, mustFlag, mustNotFlag, note, date }`.
   - Pin the decision with ruleId + player. Add `name` or `t` only when
     the same rule fires on that player for something else in the pull.
   - Leave unruled whatever the user couldn't settle.
   - Pin only the confirmed part of a disputed account, and ask about the
     rest.
   - Add new rulings only; never edit an existing one (CLAUDE.md). An
     on-disk ruling your change breaks is reported to the user, not
     rewritten.
3. Run `--check` again (rulings must pass), then
   `--update sampledata/<game>/<code>` for the reports whose diff you
   reviewed, then `npx tsc --noEmit`.
4. In the module header:
   - add a "VOD review <date> (user): report X pulls …, rulings in
     expectations/rulings.json" line;
   - update RULES IMPLEMENTED for every changed rule;
   - add new log facts to VERIFIED.

   Add anything that generalizes to
   [PITFALLS.md](../../../lib/mechanics/PITFALLS.md).
5. Commit (with CLAUDE.md's co-author trailer) and push. Say it's ready to
   deploy.

## 6. Follow up

Reply with what changed per answer and which pulls' cutoffs moved. Then
send a short numbered follow-up list in the same format, about the pulls
in the same VOD where the new rules made a call the user hasn't seen yet.
Stop when the user says to.
