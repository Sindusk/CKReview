# WoW simulation pipeline (plan)

Plan for an in-app simulation layer for WoW damage analysis: our own code,
built in stages, that says what a player's pull could have looked like,
so findings can be measured against it. Written 2026-10-15 for the agents
that build it. Not started.

## Why

The WoW damage analysis reads everything from the log, and the log doesn't
say what the player's talents do. CombatantInfo lists talent nodes with no
effects attached, so today:
- cooldowns are measured, not known: `tracked-cooldowns.ts` uses the
  shortest interval seen across a survey, an upper bound that hides drift
  when a talent shortens the recast, and leaves out any cooldown with
  resets or charges;
- the GCD model (`haste.ts`) fits haste from casts and can't separate
  passive talent haste from a slow press rhythm, so pace (`pace.ts`)
  rests on an inference ("the peer's pace is reachable with this player's
  talents");
- what a resource, proc or reset should have produced is only known where
  a case study rebuilt it by hand (Retribution's Holy Power, Arms' Rage
  recharge);
- nothing says what the best use of a pull's budget was, only where the
  player fell short of their own average or a top parse.

A simulation fills that gap, staged so each step is useful before the next
one starts, and checked against SimulationCraft at every stage.

## Licence and the clean-room rule

SimulationCraft is GPL-3.0 (GitHub licence API, 2026-10-15); WoWAnalyzer
is AGPL-3.0. This repo is MIT and public. Neither may be ported. Both may
be read to learn how the game works, because mechanics and numbers are
facts; their code, comments and data tables are not ours to copy.

AI makes translating simc's C++ into TypeScript trivial, and a
translation is a port. So every spec goes through two separate agents:
1. **Extractor** reads simc's class module (and WoWAnalyzer's, and the
   game data) and writes the spec's **rule records** in plain English
   (format below): what generates and spends each resource, each
   cooldown's recast and charges, each proc's chance or rate, each
   talent's effect on any of those. Records cite where each fact came
   from (simc file:line, a DB2 table and row, a log).
2. **Builder** writes the spec's model from the rule records alone. It
   never opens simc's or WoWAnalyzer's source.

The builder's session must not have the clone in its working tree or its
context. Records go in `docs/wow-sim/<class>-<spec>.md`.

**simc's binary is a test oracle, dev only.** Running the official
release as a separate program to compare against is allowed: it's
arm's-length use, not a derivative. It lives outside the repo (path from
an environment variable, e.g. `SIMC_PATH`), is never committed, modified
or bundled, and never runs in production or from the app's UI. Ask the
user before installing it.

Downloaded source and binaries are untrusted: clones go in the
scratchpad, read only; the binary is the official GitHub or
simulationcraft.org release.

## Data source: the game's own tables

Talent and spell effects come from the game client's DB2 tables, exported
by wago.tools (CSV, per game build), not from simc's generated tables:
- talents: TraitTree, TraitNode, TraitNodeEntry, TraitDefinition (node →
  spell)
- spells: SpellName, SpellEffect (effect type, base points, the spell or
  category it modifies), SpellMisc (cast time, duration), SpellCooldowns,
  SpellCategories / SpellCategory (charges, recharge)

Confirm the table and column names on a current export before writing
the sync; they change between expansions.

A sync script (`scripts/sync-wow-game-data.js`) downloads one build's
tables into the scratchpad, parses them (never executes anything), and
writes a generated, slimmed file under `lib/damage/wow/` holding only the
rows for player specs' spells and talents. Its header records the build
number. Blizzard owns this data; every analyzer site uses it, but say so
in the file header and keep only what the app needs.

**Ask the user before building the sync** whether pulling Blizzard's game
data into the public repo is acceptable, or the generated file should be
gitignored and built locally like `sampledata/`.

## Stages

Each stage ends with its validation gate (next section). Don't start a
stage until the previous one passes for the specs it covers.

### Stage 0: talent decoding and effects (all specs at once)

- Decode each player's talents from CombatantInfo into
  `{ node, entry, spell, rank }`. Check the field shape on a fresh fetch
  first (`scripts/fetch-wow-report.js` keeps the whole CombatantInfo).
- Resolve each talent spell to its effects from the game data, keeping
  only effects that change the **budget**: recast, charges, cast time, GCD,
  haste, resource generation and cost, cooldown reduction per event,
  proc chance, duration. Damage modifiers are recorded but not used until
  stage 3.
- First uses, each a narrow change to an existing mechanism:
  - `tracked-cooldowns.ts`: the player's real recast and charges instead of
    the survey's shortest interval; resource- and charge-gated cooldowns can
    then join the drift check when stage 1 models their gate.
  - `haste.ts` / `pace.ts`: passive talent haste becomes a known factor in
    the fit, and pace compares players with their talent haste divided out.
  - cast-time and GCD changes from talents feed `game.ts`.

### Stage 1: the budget model, calibrated from the log

The core of the pipeline, and useful on its own. For one player in one
pull, from the pull's own data:
- **Time:** the pull, minus forced windows (death, the boss's damage
  context in `lib/mechanics/wow/va/*-damage-context.ts`, movement as the
  engine already reads it).
- **Speed:** the GCD at each moment (`haste.ts`), with stage 0's talent
  haste.
- **Budget:** how many GCDs fit; how many uses of each cooldown fit given
  its recast, charges and resets; resource generated and spent per the
  spec's rule records; procs at their expected count.
- **Value:** each cast at the player's own observed damage per cast, so
  crit, mastery, gear and damage talents are already in the number. No
  damage formulas.

Output: budget vs actual per spell and resource, and the gap priced in
observed damage. This replaces case-by-case rebuilds (Holy Power at the
cap, the Rage recharge) with one model per spec, and its findings go
through the engine like any other check (`lib/damage/checks.ts` shapes,
one basis line each).

Per-spec code lives in `lib/damage/wow/sim/<class>-<spec>.ts`, a few
hundred lines each, with the shared machinery (event loop, resources,
cooldowns, charges, procs) in `lib/damage/wow/sim/core.ts`.

### Stage 2: a rotation model

Turns the budget into a plan. A short per-spec priority (from the rule
records: keep the main buff up, don't cap the resource, line cooldowns up
with burst, spend in the empowered window) plays through the pull's time
and forced windows. Procs either at expected value or rolled across many
runs (seeded, so results repeat). Damage per cast is still observed: the
player's own, or a top reference's for casts the player never made.

Output: the plan's cast counts and timing against the actual, and an
estimated loss with a spread. It answers "what would a good player have
done with this pull", not "what's the theoretical maximum".

Not every spec needs this stage. Build it for a spec when its case
studies show the budget can't explain the gap to the top parse.

### Stage 3: full damage simulation (gated, maybe never)

Damage from formulas: spell coefficients, primary and secondary stats,
crit, mastery, versatility, damage talents from the game data. Needed
only for questions the log can't price: a talent build the player didn't
take, a different gear set, a spell they never cast. Start it only when
stages 1–2 match simc on real pulls for that spec and the user asks for
those questions.

## Validation

Three references, at every stage:
1. **The log.** A model that says a cooldown fit 5 times when the player
   cast it 6 is wrong. Actual counts can never exceed the budget; check
   every spec on every WoW sample on disk.
2. **Top parses.** The 99th/100th-percentile references from the case
   studies (`damage-compare-wow`). Their actual counts should land near
   the budget (stage 1) and the plan (stage 2). A top player far under
   the model points at the model.
3. **simc as oracle.** A dev-only script (`scripts/simc-compare.js`)
   builds a simc profile from the log (gear, enchants, gems, the talent
   loadout encoded from stage 0's decode) and `raid_events` from the
   boss's damage context, runs the binary with JSON output over enough
   iterations to get a spread, and prints simc's cast counts, uptimes and
   GCDs next to ours. It reads simc's output only; it doesn't share code.
   Stage 1 is compared on counts and resources; stage 2 also on cast
   timing; stage 3 on DPS spread.

**Gate per spec and stage:** within an agreed tolerance of simc on three
pulls of different bosses, and no log contradictions on any sample. Agree
the tolerance with the user on the first spec; a starting point is ±1 use
for cooldowns and ±3% for GCD count and buff uptime. Where ours and simc
disagree and the log sides with ours, record it in the spec's header (simc's
priority list is hand-written and can lag a patch; it's an oracle, not
ground truth).

Record each spec's gate results in its sim module header, the way the job
and spec headers record case studies.

## Spec order and workflow

1. A pilot spec through stages 0–1 and the full validation: Destruction
   Warlock or Arms Warrior (the qpZx3mWaG7gcDdYB case study's notes on
   Soul Fire's real cooldown and Arms' Rage recharge are ready-made
   checks).
2. Then specs in the user's raid rosters, then specs with a case study,
   then the rest.

Per spec: extractor agent → rule records → builder agent → validation
script → the user's review of the first findings. The per-spec extraction
fits the WoWAnalyzer audit ([wowa-audit-plan.md](wowa-audit-plan.md)):
run them together so one agent reads WoWAnalyzer and simc for the spec
once. Fanning specs out to many agents is a workflow and needs the user's
explicit opt-in.

## Upkeep

On a new game build: rerun the sync, diff the generated file against the
last build, and list the specs whose rule records cite a changed row.
Those specs rerun validation. simc's own updates are only a trigger to
rerun validation; nothing of ours derives from them.

## Fit with the app's rules

- Runs in scripts and the analysis pipeline, never on navigation; any
  result shown in the UI comes from the analysis already computed for the
  pull (CLAUDE.md, "No hidden costs on navigation").
- WoW only: `--game wow` for every validation and baseline run.
- FFXIV is out of scope. Its kits are fixed per level and xivanalysis
  covers its rules; there's no simc to check against.

## Questions for the user before stage 0

1. Game data in the public repo, or gitignored and built locally?
2. The pilot spec: Destruction or Arms?
3. Installing simc locally for the oracle (dev machine only).
4. The validation tolerance, decided on the pilot's first results.
