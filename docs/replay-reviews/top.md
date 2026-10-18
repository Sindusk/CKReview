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
