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
| Apocalypse explosions (40297) | Now built in the spec: wave k explodes the ring points max(0, k-3)..k-1 of two opposite arms (14y out, turning 45° a wave), plus the centre in waves 1 and 2. The helpers match it in waves 1, 2 and 4-6. Each circle shows as a thin white ring 10.4s before it explodes (the guide's +10 appear / +21 explode), filling in over its last 2s. |
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
6. **9:12.4:** the first Apocalypse circles (centre, NW, SE) appear 10.4s
   before they explode at 9:22.8, then a wave every 2s. Does the first circle
   appear about here?
7. **9:12.4 to 9:22.4:** the replay runs two lights round the ring
   counterclockwise from NW and SE, plus two pairs leaving the centre. Does
   that match the lights in game?
8. **9:26.9 (wave 3):** the replay explodes NW, W, SW and SE, E, NE. Is that
   the third explosion, or does the middle go off again? (The log puts all
   six at the centre, but most players standing there weren't hit.)
