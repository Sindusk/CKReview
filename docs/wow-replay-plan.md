# WoW replay: build plan (handoff)

Goal: the top-down replay the app already has for FFXIV pulls, for WoW
pulls from Warcraft Logs. Same panel, same controls, same roster HP bars;
WoW data underneath. Written 2026-10-17 at the end of the FFXIV build, for
the agent that picks this up. Read CLAUDE.md first (commit/push rules,
co-author trailer, "show, don't describe", fetch-only-what-you-need).

## What exists (FFXIV) and how much carries over

Read these before designing; their headers explain every decision.

| File | Role | WoW |
|---|---|---|
| `lib/replay/ffxiv-replay.ts` | Raw events → per-actor tracks (`ReplayData`), `poseAt` interpolation, `sampleNear`, `fitReplayView`, `playerVitalsAt`, map pixel maths | Track model, interpolation, view fit and vitals carry over unchanged. Event parsing and map maths are FFXIV-specific (nested `sourceResources`/`targetResources`, XIVAPI textures). |
| `lib/replay/action-shapes.ts` | AoE shapes from XIVAPI's Action sheet, per-ability `OVERRIDES`, tethers, hitboxes from BNpcBase/ModelSkeleton | Shape rendering contract (`AoeShape`, `aoesAt`) carries over. The data sources don't: WoW has no XIVAPI. |
| `components/ReplayPanel.tsx` | Drawing (map, AoEs, towers, target ring, job icons, hover card, Layers menu, icon scale, grid/rings), clock (VOD-synced or own) | Almost all of it. Swap job icons for class/spec icons (`getPlayerSpecIcon("wow", …)` exists), slot labels for WoW roles, yalms for yards. `pull.game !== "ffxiv"` currently shows "FFXIV-only". |
| `app/page.tsx` `handleLoadReplay` | Explicit Load replay click → sample file or live fetch, enrich, cache per pull | Branch on `pull.logSource === "wcl"`. |
| `lib/ffl-client.ts` `fetchFFReplayData` | One fight, `dataType: All, includeResources: true`, server-side filter, paged | Mirror in `lib/wcl-client.ts`. |
| `scripts/fetch-ff-replay.js` | Saves a pull's tracks to `sampledata/<game>/<code>/replay/fight<N>.json` (subfolder: every report-folder loader treats top-level `*.json` as fight files) | Mirror as `fetch-wow-replay.js` into `sampledata/wow/…/replay/`. The sample route (`app/api/sample-report/[source]/[code]/replay/[fight]`) already accepts `wcl`. |
| `components/RosterPanel.tsx` | HP/MP strip from `vitals` | Works as-is once WoW tracks carry HP and a power fraction. |

Suggested shape: rename the FFXIV-neutral parts to `lib/replay/replay-core.ts`
(or keep them where they are and import), add `lib/replay/wow-replay.ts`
for parsing and `lib/replay/wow-shapes.ts` for AoEs. Don't fork the panel.

## WoW data facts (probed 2026-10-17, report 19WyTrzgQRvdc4Z8, Ula'tek)

- **Positions:** WCL events carry ONE flat resource block (`x`, `y`,
  `facing`, `mapID`, `hitPoints`, `maxHitPoints`, `classResources`,
  `absorb`, …) plus `resourceActor`: 1 = the block is the SOURCE's, 2 =
  the TARGET's. 237 of 409 events in a 2s window had x/y. So one event gives
  one actor's position, unlike FFLogs' two. `lib/wcl-client.ts` already
  types `x`/`y`/`facing` on resources.
- **Units:** look like WoW world coordinates × 100 (yards × 100):
  `x -2501, y 154876`. Axis orientation (which way is north on screen)
  is NOT verified. Check against something known before drawing (a boss
  that faces the tank, as `facingToCompassBearing` was checked on FFXIV:
  boss auto-attacks land along the boss's facing).
- **Facing:** present (`facing: -278`); the FFXIV formula (centi-radians,
  +90°) is unverified for WoW. Measure it the same way.
- **Power:** `classResources: [{ amount, max, type }]` (type 0 = mana) is
  the roster's second bar. Pick the primary resource per class/spec.
- **Maps:** `fights.maps { id }` and `gameData.map(id) { id, name }` only.
  No image, scale or offsets in the API (FFLogs has `filename`,
  `sizeFactor`, `offsetX/Y`). `fights.boundingBox` exists. Map art for WoW
  is an open research item (below). A blank arena with 5y-equivalent
  rings/grid works without it.
- **Event types:** same enum as FFLogs (All, Casts, DamageTaken, …). No
  `tether` or `headmarker` types were seen; raid target markers appear as a
  `targetMarker` field on events. Waymarks/world markers: assume not
  available, as on FFLogs (the FFXIV hunt is recorded in
  docs/app-architecture.md).
- **Actors:** `masterData.actors { id name type subType icon gameID }`.
  NPC `gameID` is the creature id (hitbox lookup, below).

## Open research items (do these first, report findings to the user)

1. **Coordinate orientation and facing formula** from a real pull (above).
2. **Map art.** Candidates: WCL's own replay assets (the site's replay
   view; check the network panel, as was done for FFLogs, but don't build
   on routes behind Cloudflare: the app can't reach them), or Blizzard
   UiMap art via community db2 exports (wago.tools) with UiMapAssignment
   bounds for calibration. If no clean source, ship blank arenas.
3. **AoE geometry.** No XIVAPI equivalent. Options: SpellEffect radius via
   db2 (wago.tools `SpellEffect` → `EffectRadiusIndex` → `SpellRadius`),
   which gives circle radii but not cones/lines reliably; per-boss
   override tables (the `OVERRIDES` pattern in action-shapes.ts) built
   from the boss modules under `lib/mechanics/wow/va/`; or hit-derived
   shapes (centre on hit players, as FFXIV stacks do). Expect a mix.
   Licensing: db2 data are game facts; don't port GPL/AGPL code
   (docs/wow-sim-plan.md, clean-room rule).
4. **Hitboxes.** Creature id → display → model bounding/combat reach in
   db2 (CreatureDisplayInfo / ModelFileData). Verify against melee
   distances the way FFXIV was (median melee distance ≈ hitbox + melee
   range).
5. **Boss icon.** FFXIV uses FFLogs' `assets.rpglogs.com/img/ff/icons/
   Boss.png`. Check whether `img/warcraft/icons/Boss.png` exists (the app
   already loads WoW ability icons from `assets.rpglogs.com`).

## Build order

1. `fetchWowReplayData` (one fight, `dataType: All, includeResources:
   true`, filter to types that carry resources) + `buildWowReplayData`
   producing the same `ReplayData` (`resourceActor` decides whose sample
   each event is). Script + sample file for one Venomous Abyss pull.
2. Panel renders WoW pulls: dots/icons, facing, hover (name, spec, role,
   coordinates in yards, HP), roster HP/power bars, blank arena + rings/
   grid scaled in yards. Verify orientation with the user on a VOD moment
   (one numbered question list per loaded VOD, pull + MM:SS, per CLAUDE.md).
3. Enemy casts bar (same as FFXIV) and casts/hits stored in `ReplayData`.
4. AoEs from whatever research item 3 settles, starting with one boss.
5. Map art if research item 2 finds a clean source.

## Done means

- Load replay works on a WoW pull from sample data and live, one fetch
  per pull, never on navigation.
- Positions and facing verified against a VOD moment the user confirms.
- `npx tsc --noEmit` passes; `validate.js` untouched unless shared code
  changed (`lib/wcl-client.ts` is shared fetch code: run `--check --game
  wow` after touching it).
- docs/app-architecture.md's replay section covers WoW; this file is
  archived or trimmed to what's left.
