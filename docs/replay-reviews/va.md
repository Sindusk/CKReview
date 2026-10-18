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
