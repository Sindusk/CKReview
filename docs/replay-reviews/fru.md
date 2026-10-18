# Futures Rewritten replay reviews

What each phase's replay draws, what is still unverified, and the VOD checks
for the user. Built with the `/build-replay` skill; the spec is
`lib/mechanics/ffxiv/fru/replay.ts`, the art `components/replay-art/fru.tsx`.
P1-P2 were built and VOD-checked by hand (2026-10-17) before this file.
Nothing here is a ruling.

## P3 Oracle of Darkness (2026-10-18)

Pull used: JZ1KXhDbqkNH3jxR Pull 24 (P3 from 7:21 to 10:02, enrage at
Memory's End). Look from the NAUR P3 guide (naurffxiv.com); no VOD yet.

### What's drawn

| Mechanic | How |
|---|---|
| Ultimate Relativity hourglasses | New cue: eight green three-lobed hourglasses from Speed's tethers (7:43.8) until each one's last shot, ringed yellow (Quicken, fires first), purple (Slow, fires last) or green (fires second). |
| Speed tethers 134 / 133 | New look: yellow and purple lines with an orb in the middle. Nothing logs their end, so they last the default 15s (to 7:58.8). |
| Sinbound Meltdown spin | New cue: a yellow clockwise or blue counterclockwise arrow circling each hourglass from its begincast to its last shot. Direction from the shooters' logged facing. |
| Sinbound Meltdown first beam (40235) | Game data was right (every one exact). |
| Sinbound Meltdown follow-ups (40292) | Now built in the spec: the first beam's bearing turned 15° a shot. The log's facing put the first follow-up back through the middle, onto six players who took nothing. |
| Fires, Unholy, Blizzard, the rewind's Eruptions and Water | The game data was already right: each was exact once simultaneous casts are compared together. The fit-check script compares each circle with every hit of the same name, so it reported 0 of 12 Eruptions exact. |
| Return | New cue: a blue clock face on each player's recorded spot, from when Spell-in-Waiting: Return runs out (7:56.5 / 8:06.5) until the rewind (8:20.5). |
| Shadoweye | New cue: a red-violet eye and a pulsing ring on the three holders for the last 5s before it goes off (8:23.6). |
| Apocalypse explosions (40297) | Now built in the spec: wave k explodes the ring points max(0, k-3)..k-1 of two opposite arms (14y out, turning 45° a wave). The start axis and turn are fitted to every ring point the helpers logged; some waves log stale (100, 100) (Pull 24 wave 3; the DWbAwTGQrYznK1jL clear's waves 1 and 6). There's no centre explosion: waves 1-2's two extra casts log the centre, but a player stood 2-6y from it through both untouched in the clear. Each circle shows as a thin white ring 10.4s before it explodes (the guide's +10 appear / +21 explode), filling in over its last 2s. |
| Apocalypse lights | New cue: on each side one light starts on the ring and two leave the centre 2s apart, all running round 45° every 2s, with "Apocalypse: lights turn (counter)clockwise" under the arena. Its start and turn are worked out from waves 1 and 2. |
| Shell Crusher, Black Halo, Darkest Dance jump, Spirit Taker | Game data was right. |

### Fit check after the changes (grouped by time)

Every ability exact except edge cases. Apocalypse: no misses, 9 players drawn
inside who weren't hit, all 9.0-9.5y from a circle's centre (radius 9, plus
the check's 0.5y hitbox). Spirit Taker: one player drawn at its edge.

### Couldn't find out / not drawn

- **Wave 3 of Apocalypse:** all six helpers logged (100, 100). The model puts
  it at NW/W/SW and SE/E/NE. Two of its three hits fit; the third player's
  logged spot (9:27.5) is 11y away, probably lagging their run in.
- **Head marker 62** (8:56.6, six players): the Refrain's fake stack markers
  on the six Water holders (40272 gives them Waters at 9:01.8). It still
  reads "Marker 62" for 5s. A label needs a small engine change, since the
  marker is confirmed only by a cast *at* the player. The TOP session was
  mid-edit on `action-shapes.ts`, so it's deferred.
- **Speed tethers' end:** not logged. They might end at Speed's resolution
  (7:49.4) instead of after 15s.
- **The Darkest Dance knockback** (40183, 9:36.3) is raidwide-sized, so the
  engine skips it: nothing is drawn.
- The arena's floor pattern for Apocalypse (axis lines and rings) isn't drawn.

### VOD checks: Pull 24 (JZ1KXhDbqkNH3jxR)

1. **7:43.8:** the replay shows the eight hourglasses from here, with
   tethers (three yellow in a Y, two purple across). Do the hourglasses
   appear here or earlier (with Ultimate Relativity's cast at 7:39.7), and
   do the tethers vanish at Speed (7:49.4) or stay longer?
2. **7:52.6:** the replay draws a turning arrow round the three yellow
   hourglasses from their Sinbound Meltdown cast. Does the clockwise /
   counterclockwise indicator show at the cast, earlier, or only as the
   beams fire? Do its colours match (yellow clockwise, blue counter)?
3. **7:56.7 to 8:07.3:** after the first beam, each follow-up is drawn turned
   15° further the arrow's way. Does the drawn sweep match the beams in game
   (the north hourglass sweeps clockwise from the Dancer)?
4. **7:56.5 / 8:06.5:** a blue clock marks each player's recorded spot until
   the rewind at 8:20.5. Is the game's marker on the floor there for that
   whole time?
5. **8:18.6 to 8:23.6:** an eye shows on the three Shadoweye holders (the
   Warrior, Scholar and Dancer) for the last 5s. Is there an eye over them in
   game, and from when?
6. **9:12.4:** the first Apocalypse circles (NW and SE) appear 10.4s before
   they explode at 9:22.8, then a wave every 2s. Does the first circle appear
   about here? The guide says wave 1 has a third circle in the middle; the
   replay draws none there, since nobody standing in the middle was ever hit.
   Is there a circle in the middle in game?
7. **9:12.4 to 9:22.4:** the replay runs two lights round the ring
   counterclockwise from NW and SE, plus two pairs leaving the centre. Does
   that match the lights in game?
8. **9:26.9 (wave 3):** the replay explodes NW, W, SW and SE, E, NE. Is that
   the third explosion, or does the middle go off again? (The log puts all
   six at the centre, but most players standing there weren't hit.)

## P4 Enter the Dragon (2026-10-18)

Pull used: DWbAwTGQrYznK1jL Pull 18, a clear. P4 runs from Materialization
(10:15) to the transition (~13:08). Pull 17 of the same report (a wipe at
11:33) was checked for Darklit too. No VOD.

### What's drawn

| Mechanic | How |
|---|---|
| Akh Rhai, Darklit towers and cones, Spirit Taker, Waters, Somber Dance, Akh Morn, Morn Afah, Longing of the Lost, Crystallize Time's Spell-in-Waiting resolutions | The game data was right (all exact). |
| Darklit's half-room Hallowed Wings (40228) | Now built in the spec. The game data centred the 40y band on Shiva, which covered the whole north half and four players who weren't hit. It's now the half on her right: east, since she faced north in both pulls, while everyone stood west. 40227 is drawn as the left half, unseen. |
| Crystallize Time hourglasses | The P3 hourglass cue, extended to the six sorrow's hourglasses: yellow N/S (Maelstrom first, 11:54.4), purple pair (last, 12:04.9), green pair (11:59.9), from Speed's tethers (11:46.6). |
| Dragon heads | New cue: two pale wyrm heads leave the north at ~11:50.7, one each way round, ~12.5y out at ~12°/s. They shrink after their first pop and are gone at the second. Their run is fitted to the four pops (the log has a head only where it popped). |
| Blue beacons | New cue: a blue marker where each head popped, until a blue player's Wyrmfang ends on it (all four were taken within 2.5y). |
| Tidal Light | New look: sea-green 10y bands, each shown through its own cast bar, so the wave reads as it travels from the west wall (12:01-12:10), then from the south (12:07-12:16). Nobody was hit; the fit check flags players standing on a band's edge or walking in behind it. |
| Return | The P3 clock markers, now for Crystallize Time's Return (12:16.2 to the rewind at 12:23.2). |
| Rewind Hallowed Wings (40332) | Knockback style: a wild charge across the whole arena from the first Tidal Light's wall (12:25.7), then the second's (12:30.2). It hits all eight. |
| Darklit chains (tethers 110 / 111) | Unchanged: the default tether look, Chain until Fate replaces it. |

### Couldn't find out / not drawn

- **Marker 62** (10:35.9) on the two Darklit Water holders still reads
  "Marker 62". The same engine change as in P3 is pending.
- **The heads' look and lap:** the fit says one lap takes ~30s. The model's
  "a head finishing its lap wipes" wasn't seen.
- **Hallowed Wings 40227** (left) is unseen in any pull on disk.
- **The heads' true start:** they're drawn leaving the north at 11:50.7.
  Nothing logs when they appear.

### VOD checks: Pull 18 (DWbAwTGQrYznK1jL)

1. **10:55.2 to 11:00.2:** Shiva's half-room Hallowed Wings is drawn over
   the east half. Was the east half the one hit?
2. **11:46.6 to 12:04.9:** six hourglasses, yellow N/S, purple and green
   pairs, exploding in that order. Do the colours match the tethers in game?
3. **11:50.7:** the two dragon heads leave the north here, one each way. Do
   they start here, and do they meet the red players at 11:57.6 (east) and
   11:57.8 (west), then at 12:02.2 (SE and SW)?
4. **11:57.6 to 12:12.6:** a blue beacon stays where each head popped until
   a blue player takes it. Does the game's beacon look like that and last
   until taken?
5. **12:01.1 to 12:16.4:** Tidal Light is drawn as four bands from the west
   wall, then four from the south, each lit for its cast bar. Does the wave
   in game start from those walls, in that order?
