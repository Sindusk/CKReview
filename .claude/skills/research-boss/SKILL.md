---
name: research-boss
description: Write the comment-only research model (GUIDE-DERIVED MODEL) for a WoW or FFXIV boss's detection module from public guides, journal/patch data and community strategy, following lib/mechanics/MODEL-RESEARCH-GUIDE.md. Creates the module file with the header and no detector code, commits it as "Document <difficulty> <Boss> mechanics", and hands off to /build-module. Use when the user asks to research, document or "write the model for" a boss or mechanic before detection exists.
argument-hint: <boss name> [game] [difficulty] [strategy notes or guide links]
---

# Research a boss model

Stage 1 of the detection workflow (CLAUDE.md "Roles"). The output is a
module file whose header is the model `/build-module` verifies against
logs. No logs and no detector code at this stage. CLAUDE.md's working
preferences apply: MM:SS times, commit and push to `CKReview main` with a
co-author trailer, never deploy, no character names (the repo is public).

## 0. Read before writing

1. [lib/mechanics/MODEL-RESEARCH-GUIDE.md](../../../lib/mechanics/MODEL-RESEARCH-GUIDE.md)
   **in full**: what a model must contain, the per-mechanic template, the
   severity definitions, and every "Lessons from …" section. The lessons
   are corrections from earlier models; each one is a check below.
2. The **latest model of the same game** for house style and density:
   - **WoW:** a `lib/mechanics/wow/va/*.ts` header (e.g. `ulatek.ts`).
   - **FFXIV:** a `lib/mechanics/ffxiv/<tier>/*.ts` header (e.g.
     `arcadion/lindwurm-1.ts`).
3. If a file for the boss already exists, read its header in full first:
   extend it, don't overwrite it, and never touch a `VERIFIED AGAINST
   LOGS` section.

## 1. Ask once, before researching

One AskUserQuestion with only what the request doesn't already say:
- **Difficulty** (normally Mythic / Savage / Ultimate only).
- **Strategy and assignments**: does the user's static run a known plan
  (soak groups, kick orders, carriers, positions)? Options: yes (they'll
  paste or describe it) / community default / not ours (public logs only,
  so failures stay player-less where the log can't tell).
- **Scope** for a multi-phase fight: one module or one per phase.

Anything that comes up later goes into the model's open-questions list,
not a mid-run stop.

## 2. Research

- Sources: the in-game journal / Wowhead / the FFXIV equivalent for
  ability names and candidate IDs, two or more community guides, and patch
  notes or hotfix posts. Record each with the date you checked it.
- Use `WebSearch` / `WebFetch` (or the built-in browser for pages that
  need JS). Read, don't copy: summarize in your own words, no pasted guide
  text.
- Note **patch sensitivity**: hotfixes that change counts, damage, timers
  or target numbers, with their dates.
- Collect **counts** wherever a guide gives them (impacts per cast, stacks,
  adds per wave); they turn "was something missed?" into arithmetic.
- List **every strategy the community actually uses** and what each makes
  normal. A strategy choice is never an error.

## 3. Write the header

Follow the guide's "What a model must contain" in order, as a `//` block
of about 78 columns with `-- SECTION --` headings, 150–250 lines:
1. Scope and sources (difficulty, sources with dates, patch notes).
2. Shape and chronology (phases and their triggers; timed or
   kill-dependent, said explicitly).
3. One block per mechanic, from the guide's template: what happens,
   correct play, failure modes (each with LOG SIGNAL / FAULT /
   CONSEQUENCE), removal, not errors. Mark IDs as candidates, unverified.
4. What ends a pull: hard and soft enrages, every unrecoverable failure.
5. Strategy variance.
6. Not errors.
7. The plan and assignments, if the user gave them.
8. Open questions for log verification, in one list. Implementation
   advice ("don't hard-code X") goes here as a question, not in the text.

Before finishing, walk the guide's "Lessons from …" sections as a
checklist against your draft (separate causes from effects; say whether a
section is timed; say what the log shows when a player *doesn't* act).

## 4. Create the module and commit

- File: `lib/mechanics/wow/<tier>/<boss>.ts` or
  `lib/mechanics/ffxiv/<tier>/<boss>.ts`. Header only: **no detector code,
  no exports, not wired into any registry** (that's `/build-module`).
- Run `npx tsc --noEmit` (a comment-only file must still compile).
- Commit as `Document <difficulty> <Boss> mechanics` and push. No
  `validate.js` run is needed: nothing executes yet.

## 5. Hand off

End with:
- the file path and line count;
- the open questions that most need a log (top 3–5);
- which fights to fetch for `/build-module`: a kill plus wipes reaching
  each phase, and whether the user's own logs exist;
- whether assignments are still missing (they decide how many failures
  can name a player).
