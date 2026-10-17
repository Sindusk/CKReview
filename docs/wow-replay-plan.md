# WoW replay: what's left

The WoW replay works (built 2026-10-17): Load replay on a WoW pull fetches
or reads the tracks (`lib/replay/wow-replay.ts`, `fetchWowReplayData`,
`scripts/fetch-wow-replay.js`), and the shared panel draws players, enemies,
facing, cast bars, basic AoE circles and the roster's HP / power bars on
a blank arena. How it
works is in the "Top-down replay" section of
[app-architecture.md](app-architecture.md); the units, axes and facing
evidence are in the header of `wow-replay.ts`. Sample: Vashnik kill,
`sampledata/wow/19WyTrzgQRvdc4Z8/replay/fight5.json`.

Read CLAUDE.md first (commit/push rules, co-author trailer, "show, don't
describe", fetch-only-what-you-need).

## Open

1. **VOD check of orientation and facing.** Measured from the log (UiMap
   bounds, player casts, boss auto-attacks) but not yet seen on a VOD. Ask
   the user for one pull they have a VOD of, per CLAUDE.md's numbered list
   (pull + MM:SS, what the replay shows, what to look at): a boss turning
   toward a tank swap, and the party moving in a known compass direction.
2. **AoEs beyond circles.** Basic shapes work (2026-10-17,
   `lib/replay/wow-shapes.ts`): db2 circle radii placed by hits, Vashnik's
   Plague Froth and Plague Wave lanes from a per-boss table, room-wide
   labels. Checked in the app on the Vashnik kill at 0:15 (5 Froth
   circles), 0:18 (lanes), 0:41 (Bile soaks), 0:24 (Expulsion labels).
   Left:
   - **Cones and lines.** 4 spells in the table use implicit target 104
     (a cone); the angle isn't in SpellEffect (wago has no
     SpellTargetingRestrictions table), so estimate it from hits as
     action-shapes.ts does for FFXIV.
   - **Unsoaked impacts are invisible.** A circle is placed by the players
     it hit, so a missed Catalytic Bile (1282616, raid-wide penalty) or a
     dodged impact isn't drawn.
   - **Other bosses' per-boss tables.** Only Vashnik has one
     (`WOW_AURA_SHAPES`, `HIDDEN_HITS`). Each module header under
     `lib/mechanics/wow/va/` says which debuffs are drawn around a player.
     A new debuff there also needs a refetch of saved replays, since the
     fetch asks for those debuffs only.
   - **A VOD check of placements**, with item 1.

   Licensing: db2 data are game facts; don't port GPL/AGPL code
   (docs/wow-sim-plan.md, clean-room rule).
3. **Map art.** WCL's API has only a map id and name, and
   `assets.rpglogs.com/img/warcraft/maps/…` guesses return 403. The
   calibration exists: wago.tools `UiMapAssignment` gives the world bounds
   per UiMap (2608 The Venomous Abyss: X 265–885, Y −802.5–127.5; WCL x =
   −Y, y = X). The art itself is BLP tiles (UiMapArt → UiMapArtTile) that
   would need converting and hosting; check licensing before shipping any.
4. **Hitboxes.** Creature id → display → model bounds in db2, or measured
   from melee players' median distance (as FFXIV's were checked). Until
   then the target ring is a fixed size.
5. **Fetch size.** Every hit on the boss carries its position (~300 events
   a second); the builder thins them, but they're still downloaded. A
   server-side filter that drops most player→boss damage while keeping
   enough boss and add positions would roughly halve the pages.
