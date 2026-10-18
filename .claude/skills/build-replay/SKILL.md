---
name: build-replay
description: Build the top-down replay's visuals for one FFXIV phase or one WoW boss — research how the fight looks in game, inventory what the log shows, check the game-data shapes against who was really hit, decide what to draw, write it into the fight's own replay spec and art files, render frames and review them, commit, and end with numbered VOD checks. Use when the user asks to build, extend or "do the replay for" a fight, phase or boss.
argument-hint: <fight> <phase or boss> [report URL or code]
---

# Build a fight's replay visuals

The replay draws every enemy AoE from game data on its own
(`lib/replay/action-shapes.ts` for FFXIV, `wow-shapes.ts` for WoW). This
skill adds what the data gets wrong or can't say, for one phase (FFXIV) or
one boss (WoW) at a time, the way Futures Rewritten P1-P2 were built
(the user's VOD calls in `lib/mechanics/ffxiv/fru/replay.ts` are the
reference for taste: the game's own colours, cues shown for as long as the
game shows them, nothing that hides where players must stand).

CLAUDE.md's preferences apply: MM:SS and "Pull X" when talking to the
user, commit and push to `CKReview main` without asking (co-author
trailer), never deploy, no character names in code or docs (the repo is
public), one game at a time, rate-limited fetches.

## Where things go

Read the header of [lib/replay/fight-spec.ts](../../../lib/replay/fight-spec.ts)
first: it is the contract. Each fight has, already registered:
- a **spec** beside its detection modules:
  `lib/mechanics/ffxiv/<fight>/replay.ts`, `lib/mechanics/wow/va/<boss>-replay.ts`
- an **art** file: `components/replay-art/<fight>.tsx` (`va.tsx` for every
  Venomous Abyss boss); the props are in `components/replay-art/types.ts`.

**Edit only your fight's two files** (plus the phase module's header, your
sample data and your review file below). Other agents may be building other
fights in this same checkout at the same time. So:
- `git add` only the paths you changed, never `-A` or `.`; never `stash`,
  `checkout --`, `reset` or switch branches.
- If the engine really needs something the spec can't express (a new
  `Override` option, a new generic look), keep it generic and small, edit
  `action-shapes.ts` / `ReplayPanel.tsx` / `fight-spec.ts`, run the
  snapshot check below, and commit that file on its own at once, so no one
  else's half-done edit rides along. Prefer `shapes` / `effects` builders
  and your own art over engine changes.
- The WoW engine (`wow-shapes.ts`, `wow-replay.ts`,
  `wow-spell-geometry.json`) belongs to whoever builds WoW; there is one
  WoW track.
- `npx tsc --noEmit` errors in another fight's files aren't yours: leave
  them, mention them in your report.

## 0. Read

1. The phase module's header **in full** (its model, sources, verified log
   ids, VOD reviews, open questions). Grepping it isn't reading it. The
   detection module already knows the ids, timings and who does what.
2. [docs/app-architecture.md](../../../docs/app-architecture.md), "Top-down
   replay", for what the panel already draws (statuses, head markers,
   tethers, line stacks, towers, knockbacks, puddles, cages, slide trails).
   WoW: [docs/wow-replay-plan.md](../../../docs/wow-replay-plan.md) too
   (no cones, tethers or hitboxes from WCL yet).
3. Your fight's spec and art as they stand, and FRU's
   (`lib/mechanics/ffxiv/fru/replay.ts`, `components/replay-art/fru.tsx`)
   as the worked example.

## 1. Data: one or two pulls that play the phase out

- Saved replays: `sampledata/{ff,wow}/<code>/replay/fight<N>.json`.
- None reaching your phase: find a report on disk whose `meta.json` title
  names the fight and pick the pull that got furthest (a kill if there is
  one), then fetch only it:
  `node scripts/fetch-ff-replay.js <code> --fight <N>` or
  `node scripts/fetch-wow-replay.js <code> --fight <N>`
  (WoW then: `node scripts/fetch-wow-spell-geometry.js`). One or two pulls
  per phase, one fetch at a time; work from what's on hand rather than
  waiting on more.
- Phase start and end times: the module header's clock, or the inventory.

## 2. Inventory

`node scripts/replay-inventory.js <replay.json> --from M:SS --to M:SS`
lists every enemy ability (game-data shape, casts, hits, casters and their
sample counts, first times, any override already set), tethers, head
markers, player statuses and enemy actors. Map every line to a mechanic in
the header. Note what has **no** game-data shape (castType 1, raidwide
range): setup casts, spawns, buffs on the boss, debuffs that decide where
players go. Those are the cues the replay can't draw on its own.

## 3. Fit check

`node scripts/replay-fitcheck.js <replay.json> --from M:SS --to M:SS`
compares each drawn shape with who it really hit. Abilities that miss
again and again have a wrong angle, origin, aim, size or placement: fix
them with `overrides` (see the `Override` type) and rerun until what's
left is sampling noise. Write the evidence in a comment on the entry (pull,
MM:SS, what the fit check showed). Common causes, from FRU:
- helpers parked far from where the AoE really is (`originAt`,
  `originCaster`, `holdCaster`, `holder`)
- cones with no angle in the data (`angle`), aimed by the caster's facing
  when the game aims at players (`aim: "hits"`), or behind (`flip`)
- delayed resolutions that land where a player *was* (a snapshot), not
  where they are: these need a `shapes` builder that places them from the
  log's own hit positions
- something that isn't damage at all (a knockback, a tower, a stack): `style`

## 4. Research how it looks

The goal is what a player sees in game that tells them what to do, not
decoration. For each mechanic of the phase, find:
- the telegraph's shape and colour, how long it shows before it resolves;
- cues on the boss or arena (auras, orbs, glowing weapons, spawned objects,
  floor changes) and which cast or status the log shows them by;
- markers and tethers: their in-game look and meaning.
Sources, best first: the header's own SOURCES (guides with their text
descriptions); the game data (FFXIV: XIVAPI v2 sheets, e.g.
`https://v2.xivapi.com/api/sheet/Action/<id>?fields=Name,Omen.Path,CastType`,
`Lockon/<marker id>`, `Channeling/<tether id>`, `Status/<id - 1000000>`;
omen names like `gl_fan20_...` carry a cone's angle); wiki pages
(consolegameswiki), community write-ups. Text pages only (WebFetch,
WebSearch); don't download files. Record what you learn and where in the
spec's comments. When sources disagree or say nothing, pick the plainest
rendering and list it as a VOD check.

## 5. Decide what to draw

One line per mechanic, before writing code: game data is right / an
override / a new cue (effect) / a new look (style or shape art) / skip
(and why). Draw what a player reads to resolve the mechanic: where the AoE
is going to be, who carries what, what the boss is telling them. Reuse
built-in looks first (styles: aoe, stack, tower, tankbuster, knockback,
lightning, light, ice, drop, puddle; star crosses, line stacks, cages,
element tethers, ElementTether / JailCage in `components/ReplayEffects.tsx`).
Keep the game's colours (lightning blue, light gold, ice white, fire
orange, dark purple); keep shapes faint enough that players stay visible.

## 6. Build

- Data in the spec: `overrides`, `headMarkers` (label + the abilities that
  confirm it), `markerAoes`, `tethers` (element + payoff), `effects`
  (a builder returning `CasterEffect`s), `floorStatuses`, `slideStatuses`,
  `jailStatuses`, `shapes`, WoW `wowAuraShapes` / `hiddenHits`.
- Art in your art file: `effects` by kind, `colors` / `shapes` by style,
  `tethers` by element. Name new kinds and styles with your fight's key
  (`top-...`, `va-nekzali-...`). Deterministic animation from `t` only
  (the shared `rand(seed)`), so a paused frame holds still.
- Comment each entry with what it is, its ids, and the evidence (pull,
  MM:SS), as FRU's are.
- Write anything you learned about the fight back into the phase module's
  header (one line, dated), as the CLAUDE.md asks.

## 7. Verify

1. `npx tsc --noEmit` (yours clean).
2. Fit check again: no new misses.
3. **Look at it.** Render the moments that matter, a frame every second or
   two through each mechanic:
   `ALLOW_SHELL_EDITS=1 node scripts/render-replay.js <replay.json> --from M:SS --to M:SS --every 1.5 --cols 4 --out <scratchpad>/x.png`
   (or `--at M:SS,M:SS,...`; `--helpers` shows helper actors). The env var
   is the shell gate's override; the script writes only the PNG and an
   HTML beside it. Read the PNG and check it the way a raid lead would:
   does each frame show what's about to happen, from the right place, for
   the right time, without hiding the players? Iterate until it does.
4. Engine edits only: the other fights' output must not change. Run
   `node scripts/replay-fitcheck.js` on another fight's saved replay before
   and after, and say so in the commit.

## 8. Commit

One commit per phase / boss (more if an engine edit went first):
`Replay: <Fight> P<N> <what it draws>`, body with what each cue is and
what's unverified, `Co-Authored-By` trailer. `git add <your paths>`,
`git commit`, `git push CKReview main`; if the push is rejected,
`git pull --rebase CKReview main` and push again.

## 9. Report and VOD checks

Append the phase's section to `docs/replay-reviews/<fight>.md` (create it;
your file only): what's drawn, what the fit check still misses and why,
what you couldn't find out. Then **numbered VOD checks** for the user, one
list per pull you used, ordered by time: each gives Pull X (report code)
and MM:SS, what the replay draws there, and the one thing to compare on
VOD. Slots or jobs, never character names. Nothing becomes a ruling;
rulings come only from the user's VOD review.

Then move on to the next phase or boss, unless told otherwise.
