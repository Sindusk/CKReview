# The Venomous Abyss: replay review

What each boss's replay draws (`lib/mechanics/wow/va/<boss>-replay.ts`,
art in `components/replay-art/va.tsx`), what it can't, and the VOD checks
that would confirm it. Built by the /build-replay skill, one boss at a
time, starting 2026-10-18. Nothing here is VOD-verified and nothing is a
ruling.

## Shared limits (WoW engine, 2026-10-18)

- WCL gives no telegraphs, cones, tethers or hitboxes. An AoE is placed
  by the players it hit, so an impact nobody stood in isn't drawn, and a
  shape the spec doesn't build shows only 1s before its hit.
- Objects with no events (totems, orbs, fountains, cavities) have no
  position and can't be drawn.
- Replays fetched from 2026-10-18 carry every debuff enemies put on
  players (the fetch used to ask only for a few ids), so a boss can draw
  debuff carriers. The older saved Vashnik kill (19WyTrzgQRvdc4Z8 fight
  5) has only Plague Froth.
- `scripts/replay-fitcheck.js` scores each shape against every player the
  ability hit in that window. When several impacts of one spell land
  together (Catalytic Bile's five), each circle "misses" the other
  circles' soakers, so its counts look bad when the placement is right.

## Vashnik

Pulls: Vashnik kill, Pull 1 (phzkLrdNBgtfCmW9 fight 54, 4:31; every debuff)
and Pull 3 (19WyTrzgQRvdc4Z8 fight 5, 6:24; Froth only).

Drawn:
- **Plague Froth** (already built 2026-10-17): a 4.5y circle on each
  carrier for its 6s, then the four axis lanes of Plague Wave 2s before
  expiry.
- **Catalytic Bile**: each soaked impact as a green 6y soak circle from
  the second Malignant Catalyst cast to the impact, 7.0s later in all 15
  volleys of both kills, at the spot its soaker stood when it landed.
- **Dripping Fangs**: a purple tankbuster ring on the tank during the 2s
  cast.
- **Exploding Infection**: an orange ring on its carrier, one mote per
  ~1.5s stack. **Stygian Infection**: a purple ring on its carrier.

Not drawn: Malignant Totems (no position until one completes its cast;
cleared ones log nothing), the cavity and Catalyst orb, the fountains, an
unsoaked Bile impact (its penalty has no spot), Imbibe (cast bar only).

Open questions:
- Do the Bile circles show in game from the Catalyst cast (7s), or only
  for the last few seconds?
- Is the green right for Bile, and is the Plague Wave lane width (5y) and
  2s warning close to what players see?

VOD checks, Pull 1 (phzkLrdNBgtfCmW9 fight 54):
1. Pull 1, 0:08-0:10: the replay rings the current tank for Dripping
   Fangs. Check the same tank takes the hit.
2. Pull 1, 0:14-0:19: five Plague Froth circles, then lanes along north,
   south, east and west from each carrier at 0:17-0:19. Check the waves
   in game travel along those compass axes (not the carrier's facing).
3. Pull 1, 0:35-0:42: five green Bile circles appear at 0:35 and are
   soaked at 0:42. Check that the soak circles show on the floor from
   0:35, and that their spots match where the soakers stand at 0:42.
4. Pull 1, 0:44-0:50: orange rings (Exploding Infection) and purple
   rings (Stygian Infection) on their carriers. Check the carriers match
   the players with those debuffs, and that each orange ring ends at a
   Caustic Explosion.

## The Coiled Altar

Pull: Coiled Altar kill, Pull 3 (vRPGT4MN6VALQWFh fight 38, 8:20).

Drawn:
- **Venom orbs**: every Coalesced Venom (green) and Virulent Mutation
  (purple) orb, at its spawn spot (each orb is its own actor, placed by its
  spawn cast). It ends when a player picks it up (the carrier debuff goes on
  within 6y), when a Sever / Blighted Sever cone covers it, or when Venom
  Rupture lands on the raid away from a Sever (Zul'jan's defeat, 2:18.4:
  11 orbs at once; the header says 9-11). 122 orbs in the kill.
- **Toxic Deluge**: a drop ring at each orb's landing spot from the cast
  to the orb appearing (3s).
- **Carriers**: a green 5y circle (Volatile Venom) or purple 6y circle
  (Mutagenic Venom) riding on the carrier for its 5s.
- **Sever, Soul Sever, Blighted Sever**: cones from the boss toward the
  tank they hit, shown for the 3-4s cast, 60° wide (assumed; db2 has no
  angle), 35y / 45y. The kill's last Blighted Sever (7:54.3) hit nobody,
  so it's drawn along Zul'jan's facing, and it does point through the
  purple orbs. Fit check: every cone matches who it hit; the closest
  unhit player stood 43° off the tank line, so the cone is at most ~86°.
- **Guillotine / Grim Guillotine**: an orange shared-soak circle (9y) on
  the marked player until the impact.
- **Gloombomb**: a dark purple 15y circle on each marked player for 5s.
- **Axegrinder axes**: a spinning axe for a moment where an axe struck a
  player (the axes log a position only then).
- **Unnerving Fixation**: a pale violet ring on each fixated player.

Not drawn: ghosts (Manifestations of Dread log only their spawn),
Noxious Ground (no position), Dreadmarch (no debuff in the fetch), Soul
Fragments and intermission Fragments of Malacrass (no actors), the
Soulcoilers' shields (the adds themselves are drawn).

Can't check from the log: how many orbs each Sever destroyed (Venom
Rupture's per-orb stacks are applydebuffstack events, which the replay
fetch leaves out), so the cone's 60° is a guess the orbs can't confirm.

Open questions:
- Sever's real cone angle, and does it follow the tank or the boss's
  facing at the end of the cast?
- Does the green / purple orb look match the game, and is a Deluge drop
  telegraphed on the floor for those 3s?

VOD checks, Pull 3 (vRPGT4MN6VALQWFh fight 38):
1. Pull 3, 0:02-0:05: yellow rings where the first Deluge's orbs land
   (four green, four purple at 0:05). Check the orbs appear at those spots
   and whether the game shows the landing spots beforehand.
2. Pull 3, 0:06-0:15: carriers pick orbs up (green or purple circle on
   them) and the orbs reappear where the circle ends. Check the orbs are
   dropped where the carriers stood at the end.
3. Pull 3, 0:20-0:23: Sever's cone from Zul'jan through the dropped
   orbs, which vanish at 0:23. Check the cone's width against the in-game
   frontal and that the same orbs are destroyed.
4. Pull 3, 0:43-0:48: Guillotine's soak circle on the marked player.
   Check the marked player and that five stood in it at 0:48.
5. Pull 3, 2:18: every orb vanishes at Zul'jan's defeat. Check that's
   when the game clears them.
6. Pull 3, 2:46-2:52: four Gloombomb circles on the marked players.
   Check the bomb size (15y) against the in-game circles.
7. Pull 3, 7:51-7:54: the last Blighted Sever, drawn along Zul'jan's
   facing because it hit nobody. Check where the frontal really went.

## Entombed Sentinels

Pull: Sentinels kill, Pull 1 (nHavrDhPVtBYkMXA fight 48, 4:22).

Drawn:
- **Toxic Droplets**: each picked-up orb as a green bead from the cast to
  its pickup, at the collector's spot (orbs nobody took have no spot).
- **Living Venom**: from each pickup a 3y green line to Breath, shown for
  the 4s until it fires. The log's hits sit within 1.6y of such a line and
  land along its whole length within ~50ms of +4.0s, so it fires as a line
  at once rather than travelling. Fit check: 79 of 139 lines exact; the
  rest are simultaneous lines sharing one ability name (see Shared limits).
- **Blood Venom pools**: a dark red 4y pool where each Clinging Murk ends,
  where an undispelled Blighted Blood runs its 18s, and where Bloodvenom
  Injection's DoT ends; shown for 60s (assumed).
- **Unstable Miasma**: an orange shared-soak circle (7.5y) on its target
  until the split hit.
- **Shifting Protovenom**: a magenta ring on each of the 8 marked players
  until they pair.
- **Empowering Slam / Bloodvenom Injection**: a tankbuster ring on the
  tank for the 1.5s cast.
- Mark of Acid / Blood hits (40y around each boss every tick) are hidden:
  they're the Mark aura, not something to dodge.

Not drawn: missed droplets, Helical Toxins (no debuff in the fetch, and
the 1/2/3 count isn't logged), the bosses' Dominance range.

Open questions:
- How long does a Blood Venom pool last? The log shows players entering
  pools 35-47s after a Murk drop, so 60s is a guess.
- Is the droplets' Living Venom a line that fires at once (what the log
  suggests) or a bolt flying back to Breath?

VOD checks, Pull 1 (nHavrDhPVtBYkMXA fight 48):
1. Pull 1, 0:15-0:20: green beads where the first Toxic Droplets were
   collected. Check the orbs were there and how they look in game.
2. Pull 1, 0:19-0:26: green lines from each pickup to Breath, firing 4s
   after each pickup. Check whether the game shows a line, a travelling
   bolt, or nothing until it hits.
3. Pull 1, 0:17-0:26: Unstable Miasma's soak circle on its target. Check
   the target and how many stood in it at 0:26.
4. Pull 1, 0:32-0:38: red pools where the Miasma soakers' Murk ran out
   (0:32). Check the pools' spots and size, and note when they disappear.
5. Pull 1, 0:36-0:40: magenta rings on the eight Protovenom players.
   Check the marked players and that each ring ends as a pair meets.
