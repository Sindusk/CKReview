# The Omega Protocol: replay review

Built with `/build-replay`, one phase at a time, on **bNcrLh7Y4dkHxM9q
fight 17** (a kill, 18:52; called "Pull 17" below). Spec:
`lib/mechanics/ffxiv/top/replay.ts`; art: `components/replay-art/top.tsx`.
Nothing here is VOD-checked yet, and nothing becomes a ruling.

## Phase 1: Omega (0:00 to 2:10)

### What's drawn
- **Program Loop towers:** each round's two towers show from when they
  appear (the previous round's resolution, the first after Program Loop
  at 0:15) until soaked, as 3y one-soaker towers at the spot the log puts
  each tower's helper. The game-data circle sat on the soaker instead.
- **Blaster tethers:** crimson Omega-to-holder beams. They now end when
  someone takes them (new engine option `passed`), and after the last
  round at the Blaster hit. The 15y Blaster flashes on the holder.
- **Pantokrator:** Flame Thrower cones from game data (60°, correct in
  25 of 28). Ballistic Impact puddles go under each living player at each
  wave's begincast, as faint rings that close in and flash on landing
  (the log has no puddle position at all).
- **Missile / line sets:** for the last 3s before each set, the missile
  carrier's 5y circle (yellow, a drop) and the shared line as a line stack
  aimed at its target's group; they flash as they land.
- **Diffuse Wave Cannon Kyrios:** purple 120° tank cones aimed at the
  tanks hit (fit 10 of 10; the data's facing drew them east at 180°).
  **Wave Cannon Kyrios:** marker 23 reads "Wave Cannon" over the three
  marked players until their lines fire.

### Fit check
Left over: only rows where two shapes of one name land together (towers,
Blasters, missiles, lines), which the tool can't tell apart; each shape
holds exactly its own targets. Ballistic Impact: 9 "drawn-not-hit" are
players standing on a puddle at the moment it lands, likely sample lag.

### Couldn't find out
- How Blaster's tether looks in game (no text source describes it).
- Whether Ballistic Impact snaps at the begincast or a little later.
- Whether the line for Condensed Wave Cannon shows before it fires.

### VOD checks: Pull 17 (bNcrLh7Y4dkHxM9q)
1. Pull 17, 0:16: two towers appear right after Program Loop (N and W).
   Do the first towers appear then, at those spots?
2. Pull 17, 0:21: the Blaster tethers start on the PCT and SCH, and a third
   forms on the RPR for a moment. Who holds the two tethers at 0:22?
3. Pull 17, 0:29 to 0:33: the tethers stay on the PCT and SCH after their
   Blasters, until the RPR and DRK take them at 0:32. Does the tether stay
   on its holder after the Blaster until taken? What colour is it?
4. Pull 17, 1:19 to 1:22: Ballistic Impact puddles drawn where each player
   stood as the cast began. Do the puddles appear at the players' feet then?
5. Pull 17, 1:18.4: missile ring on the WHM and DNC, line stacks aimed at the
   DRG (east group) and the RPR (west group) for 3s. Does the game show anything for the
   missile or the line before it fires, beyond the debuff timers?
6. Pull 17, 1:48: purple 120° cones on the tanks in the north. Do the
   Diffuse cones look about that wide?

## Phase 2: Omega-M and Omega-F (2:10 to 4:37)

### What's drawn
- **Solar Ray:** marker 343 reads "Tank buster" on both tanks; 5y purple
  busters.
- **Party Synergy:** the four PlayStation symbols (markers 416-419) under
  each pair in their usual colours, and a teal partner tether between the
  two of each symbol, both until the Fire spreads. The eye on the arena
  edge where its laser enters (the unit logs one spot, 45y out), labelled
  with the pull's glitch ("Remote Glitch: partners 35y+").
- **The clones:** each real clone shows 5.1s before its attack (BossMod's
  timing), as a glowing ring with its weapon: Omega-M's sword ("Sword:
  out") or shield ("Shield: in"), Omega-F's staff ("Staff: cross") or legs
  ("Legs: sides"). Blue for M, magenta for F: my pick, not the game's.
  Their attacks flash as they land: sword 10y circle, shield 10-40y donut,
  staff cross, and the legs as two sides 4-40y off Omega-F's line (BossMod;
  the game data's rect drew over the strip everyone stood in).
- **Spotlight:** "Stack" on the two marked players, with their 6y stacks
  riding on them from the marker until they land; Discharger's knockback
  arrows from the middle as it lands.
- **Limitless Synergy:** purple Bladedance tethers from the two outer
  clones, passed to the tanks, and 90° purple cones at the tanks (BossMod's
  angle). Sagittarius Arrow's 10y line from its cast start (the party
  baits it, then steps out). Marker 346 reads "Meteor"; Beyond Defense as
  a buster, Pile Pitch as a stack.

### Fit check
Clean except rows where several shapes of one name land together (Fire,
Spotlight, Solar Ray, Bladedance), which the tool can't tell apart, and one
Superliminal Steel edge (a player 0.5y inside the side at 2:44.9, not hit).
Sagittarius Arrow shows 5 "drawn-not-hit": the party stood about 5y from
its centre, on the edge of the 10y line.

### Couldn't find out
- The clones' and symbols' in-game colours; only BossMod's shapes and
  timing are sourced.
- Whether the five swords after Discharger also show 5.1s ahead.
- The symbol markers still get the generic "Marker 416..." text for their
  first 5s: the engine names a marker only when a hit follows within 12s,
  and the Fire lands 13.8s later. A way to hide a label the fight draws
  itself is a small engine follow-up (left alone tonight: another session
  was editing the same lines).

### VOD checks: Pull 17 (bNcrLh7Y4dkHxM9q)
1. Pull 17, 2:39.8 to 2:44.9: an Omega-M clone with a sword west of the
   bosses and an Omega-F with bare legs east, among the party. Are these the
   real clones, where are they, and when do they appear?
2. Pull 17, 2:44.9: the legs hit both sides of Omega-F's line, leaving an 8y
   strip through her (the party stood in it). Does the safe strip look that
   wide?
3. Pull 17, 2:37.5 to 2:51.3: symbols and partner tethers. Do the
   tethers show in game, and what colour are the symbols?
4. Pull 17, 2:37.5: the eye drawn on the south-east edge. Is the eye there,
   and does it show from the symbols on?
5. Pull 17, 3:31.7 to 3:39.9: Bladedance tethers from the NE and SW clones;
   the WAR takes the SCH's at 3:34.2. Do the 90° cones match what hit the
   tanks at 3:39.9?
6. Pull 17, 3:32.1: the Arrow's line shown from the cast start, aimed at
   the party. Does the game telegraph it that long?
7. Pull 17, 3:51.0 to 3:55: Beyond Defense jumped the WAR, and Pile Pitch
   then hit the WAR too (Doom). Did the WAR stay in the stack?
