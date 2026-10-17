# Handoff: WoWAnalyzer audit fan-out, phases 1–2 for every spec

For the session that runs the fan-out. Written 2026-10-16, after the
Elemental pilot ([shaman-elemental.md](shaman-elemental.md)) and the core
ledger ([core.md](core.md)) went through phases 0–3. The plan is
[../wowa-audit-plan.md](../wowa-audit-plan.md); this file says what the
pilot settled and how to run the rest in one workflow.

The user asked for this fan-out in their own words (2026-10-16): one
workflow over all specs, Sonnet 5.5 subagents (`model: "sonnet"`). That
is the opt-in the Workflow tool needs. Their paste into the new session
repeats it. Load the `workflow-authoring` skill before writing the
script.

## Read first (main session)

1. [../wowa-audit-plan.md](../wowa-audit-plan.md) (licence, record
   fields, statuses, phase 2 rules).
2. [core.md](core.md): the shared-core ledger, and its "What a spec can
   configure" section. Spec agents get this file instead of a fresh core
   extraction. Its key fact: every WoWAnalyzer percentage divides by the
   whole fight.
3. [shaman-elemental.md](shaman-elemental.md): **the format to copy.**
   That covers the header bullets (clone, spec facts, app files, case
   study) and the ledger table's columns:
   `id | status | app check | talents | fires-on | notes`.
   Ignore its phase 3 bullet; this fan-out stops at phase 2.
4. [../dps-analysis.md](../dps-analysis.md), "Analyzing a WoW kill":
   what WoWAnalyzer overstates, and the user's leniency rules.

## Clone

The scratchpad is per session, so clone again into the new one, pinned
to the pilot's commit so every ledger cites the same source:

```
git clone --depth 50 --branch midnight https://github.com/WoWAnalyzer/WoWAnalyzer.git <scratchpad>/wowa
git -C <scratchpad>/wowa checkout 0ffe84575780ee3d3fae9ef29f0791dd135d0fc9
```

If that commit has fallen out of the shallow history, fetch it by hash
(`git fetch --depth 1 origin 0ffe845…`). Read only: never run, install
or build anything in it.

## What the pilot settled

- **Separate the steps.** One agent extracts the rules, another
  reconciles them. Extraction agents never see app code. Reconcile is
  judgment against `lib/damage/`.
- **Spot-check each extraction:** open three records at their `source`
  lines and confirm the summary. Re-run a spec whose check fails. The
  pilot's checks matched 9 of 9; the extractors were accurate but
  sometimes gave approximate line ranges.
- **Layout:** the old `src/parser/core/modules/` path is gone. Shared
  modules are in `src/parser/shared/modules/`; specs are under
  `src/analysis/retail/<class>/<spec>/`, each with a `CONFIG.tsx`,
  `CHANGELOG.tsx` and `CombatLogParser`. Some specs have no priority
  list (APL) or checklist, only guide sections. Grades live in guide
  sections; record those too.
- **Reconcile rules learned:**
  - A section that grades active time inside a damage window is **not**
    a double count (corrected 2026-10-16): idle there costs more than a
    normal GCD (Elemental's Ancestors did 58.4k/s while the player cast,
    25.7k/s while idle), and `checkGcdGaps` prices only the normal GCD.
    `covered` where the app has `burstGcdFindings` on that window,
    `candidate` where it doesn't, `no-damage` for a healing window.
  - Whole-fight cast efficiency: `covered` by `checkCooldownDrift`, with
    a note that WoWAnalyzer counts forced time as ready.
  - A spender-only "efficiency" target is `superseded` by the resource-cap
    check.
  - Utility, defensives and healing are `no-damage`.
  - Display-only statistics go on one `no-damage` row.
  - Hand-maintained models (pre-pull normalizers, event links) are listed
    under "Not rules".
- **Candidates are cheap to list, and most fail phase 3.** Five of
  Elemental's seven failed once checked against top parses: the top
  players did the same thing as often. In each candidate's notes say
  what would separate a mistake from normal play. List the candidates
  by expected value at the end of the ledger.
- **A cooldown the app doesn't track because its recharge "spreads too
  far"** (`tracked-cooldowns.ts` comments) often has a talent-driven
  reduction WoWAnalyzer models in its spec code (Stormkeeper: Offering
  From Beyond, 3s per Ancestor). Name the reduction rule; `spentCooldownDrift`
  (`lib/damage/wow/specs/shared.ts`) now takes a fixed reduction per buff
  event (`reduceOn`), a pre-pull cast from the window buff
  (`prePullFromBuff`), and a per-use value (`valuePerUse`).

## Specs

Elemental is done. The other 39, in the plan's order (the status column
is from phase 0, at WoWAnalyzer 12.1.0):

| Tier | Specs |
|---|---|
| 1. In the user's roster, `current`, with a case study | Windwalker, Havoc, Arcane, Demonology |
| 1. In the roster, `current`, no case study | Affliction, Arms, Preservation, Mistweaver, Resto Druid, Resto Shaman |
| 2. In the roster, `lagging` | Beast Mastery, Balance, Retribution, Frost DK, Vengeance, Guardian |
| 3. In the roster, `stale` | Assassination, Marksmanship |
| Not in the roster, `current` | Feral, Augmentation, Devastation, Brewmaster, Shadow, Subtlety, Enhancement, Destruction, Fury |
| Not in the roster, `lagging` | Blood, Unholy, Devourer, Survival, Fire, Frost Mage, Holy Paladin, Discipline, Holy Priest, Outlaw, Protection Warrior |
| Not in the roster, `stale` | Protection Paladin |

Case-study notes for 15 specs are in the headers of
`lib/damage/wow/specs/{melee,ranged,tank}.ts`: Destruction, Demonology,
Arms, Assassination, Retribution, Marksmanship, Windwalker, Havoc, Arcane,
Balance, Elemental, Beast Mastery, Devastation, Protection Paladin, Blood.

For a `stale` or `lagging` spec, note in its header which patch it
declares. Mark rules for talents that have since changed as doubtful,
not as candidates.

## Workflow shape

The user accepted a large workflow for this, well past the default
under-10-agents guideline. Roughly 13 + 39 + 39 agents:

1. **Class passes**: 13 agents (12 classes, plus Shaman again, since the
   pilot's class extract lived in the old scratchpad). Each one covers
   `src/analysis/retail/<class>/shared/` and writes
   `<scratchpad>/wowa-extract/<class>-shared.md`. Use the Shaman class
   prompt pattern in the next section.
2. **Spec extraction**: 39 agents, each pipelined after its class pass.
   Each gets `docs/wowa-audit/core.md` plus its class extract, and
   writes `<scratchpad>/wowa-extract/<class>-<spec>.md`. Use the
   Elemental prompt pattern in the next section.
3. **Spot-check**: a cheap step per spec that opens three records at
   their source and returns pass/fail. Re-run extraction once on a fail.
4. **Reconcile draft**: 39 agents, each pipelined after its spec's
   spot-check. Each reads:
   - the spec's extract;
   - `docs/wowa-audit/core.md`, `shaman-elemental.md` (format) and
     `wowa-audit-plan.md`;
   - the app side: the spec's role file in `lib/damage/wow/specs/`
     (`melee.ts`, `ranged.ts`, `tank.ts` or `healer.ts`), plus
     `shared.ts`, `potion.ts`, `lib/damage/wow/tracked-cooldowns.ts`
     and `lib/damage/checks.ts`.

   It writes `docs/wowa-audit/<class>-<spec>.md` in the Elemental
   format. Read-only on app code.

   File names: lower case, no spaces, e.g. `hunter-beastmastery.md`,
   `deathknight-frost.md`, `mage-frost.md`, `druid-restoration.md`.
5. **Main session, after the workflow:**
   - Read every ledger. Check the statuses against the rules above, and
     that no code, constants, ids or tables were copied.
   - Add one pointer line per spec under the WoWAnalyzer audit entry in
     `docs/open-items.md`.
   - Commit and push (the user's standing authorization; credit the
     model). The ledgers document no infrastructure; still look before
     pushing to the public repo.

Phases 1–2 change no app code, and don't run validate.js. Phase 3
(premise and firing checks against top parses, building checks) stays
one spec at a time afterwards, in the plan's order. It needs WCL fetches.
Elemental's phase 3 is the model (a scratch measuring script, rankings
via the WCL API's `characterRankings`, fetching only the one fight).

## Prompt patterns

Every extraction prompt must carry the licence rules verbatim, not just
"read the module":
- Read only.
- Write records in your own words; copy no code, comments, data tables
  or constants.
- Use no spell or aura IDs from their source. Name spells by name.
- Numbers and thresholds are fine as facts.
- Write "table, not extracted" for anything only a copy would give.
- Describe priority rules one sentence each, in your own words.

Record fields (`id`, `source`, `rule`, `trigger`, `threshold`, `talents`,
`damage`, `log-visible`, `patch`, `fires-on`, `doubts`) are as in the
plan. `patch` comes from the spec's changelog. `doubts` must check for:
- whole-fight denominators;
- Stasis or forced time counted as ready or active;
- grading active time inside a window;
- single-target priority scoring on cleave fights;
- pre-pull casts;
- hard-coded durations.

A spec extract also lists the spec's per-ability cast-efficiency
targets, and its display-only statistics on one line each.

Each reconcile prompt carries the statuses and the reconcile rules
above. It also says: no app edits; phase 3 isn't done; a candidate's
notes say how it would be valued from the log and what would separate a
mistake from what top players do.

## Open question for the user, still unanswered

Should consumables and gear at the pull (flask, food, rune, enchants,
gems) stay out of scope? WoWAnalyzer grades them. core.md marks them
`no-damage` for now; ask once, in the final report.
