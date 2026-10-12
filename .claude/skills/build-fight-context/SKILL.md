---
name: build-fight-context
description: Build a boss's damage context (phase pools, HP checks, holds, multi-target phases, the phase that decides the enrage, per-player forced windows, gap labels) for the Damage dialog, from the boss's detection-module headers plus HP measured in kills and wipes. Use when a boss has detection modules but the damage analysis says "context MISSING", or after a damage case study on a kill.
argument-hint: <boss name> [kill report code(s)]
---

# Build a fight's damage context

A damage context (`lib/damage/types.ts` `DamageContext`) tells the damage
analysis which lost damage was the player's to lose. Without one, only
log-inferred untargetable time is forced: damage past a phase's HP check,
during a planned hold or on a carried debuff counts as lost. Built for
Dancing Mad, FRU (2026-10-12) and the Venomous Abyss bosses; read two of
them before starting:

- `lib/mechanics/ffxiv/dancingmad/damage-context.ts` — HP checks, fixed
  pools, a hold anchored on an enemy cast (Stompies).
- `lib/mechanics/ffxiv/fru/damage-context.ts` — a run of checks, a hold
  located from HP curves, a multi-target kill check, an add whose damage
  stops counting, gap labels.
- `lib/mechanics/wow/va/vashnik-damage-context.ts` — per-player forced
  windows from a debuff (`lib/damage/wow/context-helpers.ts`:
  `debuffWindows`, `castWindows`, `enemyBuffWindows`, `phaseSpans`).

CLAUDE.md applies (MM:SS times, commit and push without asking, never deploy).

## 1. Read the model

Read the boss's detection-module headers **in full**: the research model
and VERIFIED sections usually state each phase's check ("must be below
20% by X"), the enrage, transitions, adds, untargetable stretches, raid
plans and the rule ids. For a multi-module fight, have an agent read every
header and report, with file:line, what a damage context needs: per phase
the pool / check / transition / carry-over; holds; adds and whether damage
on them counts; multi-target phases; the enrage; per-player duties with
timing; rule keys without a `mechanicLabel` in `lib/mechanics/rule-meta.ts`;
measured values; open questions.

## 2. Measure from the logs

Use kills first, then wipes; partial (late-start) captures still carry HP
for the phases they cover.

```
node .claude/skills/build-fight-context/tools/phase-hp.js <ff|wow> <code> "<boss>" all [--target <name>]
```

Per pull and phase, each enemy's max HP, damage dealt, and when it crossed
75 … 5% and 1 HP. Read off:

- **Phase clock.** If every kill ends each phase within a few seconds, the
  phases end on the boss's script, so damage past a check is wasted.
- **Fixed pools.** The raid's damage on the target in the phase ≈ its max
  HP on every kill (FRU P1: 21.9–22.25M against 22.29M). A pool killed to
  1 HP counts as `fixedPool`; overkill past it is wasted.
- **Checks.** Compare where passing pulls and enrage wipes sit at the
  phase's end (FRU P3: passes 13.4–17.8%, wipes at the check 19.9–38%).
  Prefer the line the module header states; the data confirms it.
- **Holds.** An HP curve that slows to a crawl before a transition while
  the boss is targetable (FRU P1: 10%→5% in 5.5s, the last 5% in 13.7s,
  kills always at 2:38–2:41). Several players' GCD gaps in the same
  stretch are the same signal.
- **The deciding phase.** The last phase with a hard enrage, unless a
  study shows otherwise; holding cooldowns into it isn't drift.

## 3. Ask only what's left

Ask once, in one message, only what the headers and data don't settle:
whether and where groups hold (show the HP curve and MM:SS); which add
route the static uses when several are valid (FRU's Dark crystals). If the
user says groups hold but not where, place the hold where the data shows
it and say so in the reply, inviting correction.

## 4. Write it

`lib/mechanics/<game>/<boss-folder>/damage-context.ts`, exporting
`<BOSS>_DAMAGE_CONTEXT`, registered by boss name in `lib/damage/contexts.ts`.

- Header comment: sources (module headers by file, reports and pulls
  measured, the user's answers with the date) and per phase what it is and
  why. Every number cites where it came from.
- `phases` keyed by the log's phase id (`pull.phaseSegments`; an
  intermission is often inside a phase): `pool`, `fixedPool`,
  `carriesOver`, `decidesEnrage`, `multiTarget`, `damageCounts`, `note`.
- `forcedWindows(pull)`:
  - a check passed: from the first hit leaving the target(s) under the
    line to the phase end (or to when the target leaves, when later adds
    in the same phase still count);
  - multi-target kill checks: from when **every** target has crossed (one
    at 1 HP means switching, not waiting);
  - holds: anchored on an enemy cast (`pull.enemyCasts`) the modules
    already use, from it to the phase end;
  - per-player duties (carriers, soakers): `debuffWindows` / `castWindows`
    with `players`; measure that the duty really stops damage first
    (Vashnik: melee carriers dealt a third, ranged 0.97).
- `mechanicLabel`: `mechanicLabelForKey(key) ?? LABELS[key]` for rule keys
  without one, so gaps read "during <mechanic>".

Leave out what the data can't judge (damage on adds the route may kill),
and say so in the header.

## 5. Verify

```
node .claude/skills/build-fight-context/tools/context-diff.js <ff|wow> <code> "<boss>" <pull>
```

It prints every forced window the context adds (MM:SS, cause) and lost
damage per phase and per player/kind, with and without the context. Check:

- each window starts where the header/data says and covers only what it
  should (a check window that swallows an add phase is wrong);
- totals move only in phases the context touches;
- `validate.js damage-analysis <folder>` shows `context <name>` and the
  causes on findings, on the kill and on a few wipes from start-of-pull
  captures (late-start captures skip the damage analysis).

Then `node scripts/validate.js --check`, `npx tsc --noEmit`, commit and
push (trailer per CLAUDE.md), and report per phase: kind, pool, what's
forced from when, with the kill's before/after lost totals.
