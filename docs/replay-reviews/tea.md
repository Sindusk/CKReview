# The Epic of Alexander: replay review

Built with `/build-replay`, one phase at a time. Spec:
`lib/mechanics/ffxiv/tea/replay.ts`; art: `components/replay-art/tea.tsx`.
Main pull: **Q9zqJb4VLmjhd1B6 Pull 4** (a kill, 15:46), which plays every
phase. Nothing here is VOD-checked yet, and nothing becomes a ruling.

## Phase 1: Living Liquid (0:00 to ~1:47 on the kill)

The kill skips Living Liquid's second protean sequence, so the phase was
also checked on **1NG4Zah79yKYHCDv Pull 35** (Living Liquid died at 2:09),
with **1NG4Zah79yKYHCDv Pull 19** and **HwjvVh3TNAZmMQyq Pull 21** for the
two Embolus collisions on disk.

### What's drawn
- **Tank cleaves** (Fluid Swing, Fluid Strike): 90° purple tank cones.
  Fit check exact, all five on the kill.
- **Visible Protean Waves** (the boss's eight, each tornado's one): thin
  30° cones shown for the 2.7s cast bar, aimed where the players stood when
  the cast began: all eight players for the boss, the nearest player for
  each tornado. The log's own aim for these (the helpers' facing) points
  only north or south. With this aim nobody stood in a cone when it
  landed and nobody was hit, in both pulls.
- **Hidden Protean Waves** (the boss volleys, the tornadoes' second wave,
  the frontal): a flash as they land, no telegraph (the game shows none),
  30° on the players they targeted. Exact on every volley.
- **Sluice:** 5y circles on the four players farthest from Living Liquid
  when the cast begins, shown through the cast. The log doesn't place them
  (three helpers sit on the boss, the fourth on a dummy spot).
- **Tornadoes:** a blue water swirl at each of Cascade's three tornadoes,
  from Cascade until Drainage clears them (or the next Cascade, or Living
  Liquid's death).
- **Embolus orbs:** a small dark-blue orb from each Pressurize tornado,
  drifting at 0.9y/s toward where Living Liquid or the Hand stood, until
  it bursts (Outburst), the tornadoes go, or the phase ends. Measured on
  report B Pull 21, where the drawn orb reaches the dragoon right where
  the log's Outburst went off (0:52.6).
- **Hand of Parting / Prayer:** an open palm ("bosses together") or a
  closed fist ("bosses apart") over Liquid Hand for 4s before its check.
- **Drainage:** water tethers from two tornadoes to the tanks, then the
  6y tank buster on each holder.
- Exhaust circles, doll tethers, Throttle and Water Resistance Down
  statuses come from the engine as they were.

### Fit check
Everything fits. What the script still lists is its own grouping: all six
Protean Wave abilities share one name, so each cone is compared against
every wave hit in the same 1.5s (the frontal "hit 4 drawn 0" rows are the
boss volley's hits), and the same for the four simultaneous Exhausts.
Two boss-wave cones caught a player on a 1-second-old position (kill
1:09.1, Pull 35 1:46.7) with no hit: sampling.

### Not known
- The tornado puddle's size: drawn at the tornado actor's 4y hitbox.
- How long the Hand shows its fist or palm: the log has only the check.
- What an Embolus does when it reaches its spot without touching anyone
  (drawn waiting there until Drainage).

### VOD checks: Q9zqJb4VLmjhd1B6 Pull 4
1. **Pull 4, 0:21** — three tornado puddles drawn at N, E and S (west
   open). Are they there, and is the drawn 4y swirl about the size of the
   puddle on screen?
2. **Pull 4, 0:31-0:35** — the replay shows an open palm ("bosses
   together") over Liquid Hand for 4s before Hand of Parting at 0:35.
   When does the palm actually appear on the Hand?
3. **Pull 4, 0:33-0:36** — each tornado's visible wave drawn at its
   nearest player when the cast starts: the black mage (S tornado), the
   dancer (N) and the warrior (E). Does each telegraph point at that
   player?
4. **Pull 4, 0:41-0:58** — two Embolus orbs drawn leaving the N and E
   tornadoes and drifting to the bosses, arriving about 0:58. Do they
   follow that path at that speed, and are they still on the floor at
   1:20?
5. **Pull 4, 1:06-1:09** — the boss's eight visible waves drawn pointing
   at where each player stood at 1:06.4 (most of the party west, tanks
   east). Is that where the telegraphs pointed?
6. **Pull 4, 1:11.5-1:14.5** — Sluice drawn on the dancer and sage
   (north-west) and the white mage and black mage (south-west). Are the
   four circles there?
7. **Pull 4, 1:19-1:26** — water tethers from the N and S tornadoes to the
   two tanks, then Drainage on each. Do the tornadoes and puddles vanish
   with Drainage at 1:26?

### VOD checks: 1NG4Zah79yKYHCDv Pull 35
1. **Pull 35, 1:50-1:53** — the three tornadoes' visible waves in the
   second sequence, each drawn at its nearest player as the cast began.
   Right lanes?
2. **Pull 35, 1:59-2:09** — the second Pressurize's two orbs drawn from
   the W and E tornadoes; Living Liquid dies at ~2:09. Do the orbs vanish
   with it?

## Intermission: Limit Cut (1:45 to 2:16 on the kill)

Checked on the kill (Pull 4) and 1NG4Zah79yKYHCDv Pull 35 (2:07-2:30).

### What's drawn
- **Numbers:** head markers 79-86 read 1-8 over each player until their
  sword (odd) or charge (even) lands. The engine confirmed a marker only
  if its hit came within 12s, so #5-#8 read "Marker 8x" and vanished;
  a generic per-marker lookahead was added (commit 167dcdf, default
  unchanged for other fights).
- **Hawk Blaster:** 10y circles 15y out, two at a time, turning 45° per
  step, then the middle one, twice. Shown 2s before each lands. The casts
  don't say where the circles are, so each set's first pair and direction
  is the one that fits the pull: no hit outside a drawn circle (a hit's
  source position is its circle's centre: Pull 35, 2:20.7, 15y west), then
  the fewest players standing in a circle as it lands. The kill fits
  clockwise from NE/SW in both sets with nobody inside; Pull 35's second
  set starts W/E.
- **Alpha Sword** 90° cones and **Super Blassty Charge** 10y lines from
  game data, exact on the kill (all eight).

### Fit check
Hawk Blaster 17 of 18 exact on the kill; the miss is a player at the
middle blast's edge (9.7y) on a stale sample. Pull 35's misses are the
script pairing its one hit with the wrong circle of the pair.

### Not known
- How long before landing each Hawk Blaster circle shows in game (2s
  drawn; 3s stacked two steps on screen).

### VOD checks: Q9zqJb4VLmjhd1B6 Pull 4
8. **Pull 4, 1:45-1:47** — the first Hawk Blaster pair drawn NE and SW,
   then turning clockwise (E/W at 1:49.4). Do the in-game circles start
   NE/SW and turn clockwise?
9. **Pull 4, 1:45-1:47** — when do the circles first show, compared with
   the drawn 2s before each lands?
10. **Pull 4, 1:45 onward** — numbers drawn: 1 dragoon, 2 dancer,
    3 warrior, 4 white mage, 5 monk, 6 sage, 7 paladin, 8 black mage.
    Same on screen?
11. **Pull 4, 1:56-1:58** — the second set's first pair, drawn NE/SW again
    at 1:58.2. Right?
