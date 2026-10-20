# WoW replay: what's left

The WoW replay works (built 2026-10-17): Load replay on a WoW pull fetches
or reads the tracks (`lib/replay/wow-replay.ts`, `fetchWowReplayData`,
`scripts/fetch-wow-replay.js`), and the shared panel draws players, enemies,
facing, cast bars, basic AoE circles and the roster's HP / power bars on
the zone's in-game map. How it
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
   Done 2026-10-18 (/build-replay, every Venomous Abyss boss):
   - Every boss has a spec (`lib/mechanics/wow/va/<boss>-replay.ts`) and
     art in `components/replay-art/va.tsx`; what each draws and its VOD
     checks are in [replay-reviews/va.md](replay-reviews/va.md).
   - Cones: implicit target 104 draws a cone from the caster toward the
     players hit, from its begincast; angle from the spec's override
     (default 60).
   - The fetch keeps every debuff on a player (not only the drawn ones),
     so a boss spec can use any debuff without a refetch. Replays saved
     earlier (the 19WyTrzgQRvdc4Z8 Vashnik kill) have only Plague Froth.
   - WoW pulls draw fight `effects`; spec `overrides` apply `hidden`,
     `style` and `soakers` to hit circles; `lib/replay/wow-helpers.ts`
     has the readers specs share (debuff spans, casts with their begin,
     impacts placed by hits, cast-target rings, last player in a pool).
   - Many objects have no track of their own but ARE placed once by
     their spawn cast's sample (Coiled Altar orbs, Twin Fangs' Barbed
     Bulwarks, Ula'tek's Spectral Coils and wave casters): a spec draws
     them from that sample until the event that ends them.
   Left:
   - **Unsoaked impacts are invisible.** A circle is placed by the players
     it hit, so a missed Catalytic Bile (1282616, raid-wide penalty) or a
     dodged impact isn't drawn.
   - **Cone angles and pool sizes** are guesses wherever the review file
     says so; the VOD checks there settle them.
   - **A VOD check of placements**, with item 1.

   Licensing: db2 data are game facts; don't port GPL/AGPL code
   (docs/wow-sim-plan.md, clean-room rule).
3. **Map art: done, low resolution.** `lib/wow-map-art.ts` builds it on
   the server from Blizzard's BLP tiles (2026-10-17). On the Vashnik kill
   the party stands inside the room's walls. Left:
   - **Sharper art.** The Venomous Abyss map is 1002×668px over 930×620
     yards. A higher-detail source would need the game's minimap or terrain
     textures, which aren't calibrated the same way.
   - **Multi-floor zones.** The fight's first `fights.maps` entry is used.
     A boss on a different floor would need the UiMap per position.
   - **Hosting.** The art is built at request time, never committed. If
     the production server can't reach wago.tools, the arena stays blank.
4. **Hitboxes.** Creature id → display → model bounds in db2, or measured
   from melee players' median distance (as FFXIV's were checked). Until
   then the target ring is a fixed size, unless the fight's spec sets
   `hitboxes` by enemy name (2026-10-19: Sszorak 7y, from melee distances
   8.4-10.3y and the VOD; the icon grows with it). Other bosses: measure
   the same way.
5. **Fetch size.** Every hit on the boss carries its position (~300 events
   a second); the builder thins them, but they're still downloaded. A
   server-side filter that drops most player→boss damage while keeping
   enough boss and add positions would roughly halve the pages.
