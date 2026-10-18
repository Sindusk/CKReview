# Dancing Mad replay review

Built with `/build-replay`, one phase at a time. Spec:
`lib/mechanics/ffxiv/dancingmad/replay.ts`; art:
`components/replay-art/dancingmad.tsx`. Two kills on disk play every phase:
**2T1HzdPKgbhM43am Pull 9** (fight 10, 18:37) and **yBKPqGwHparm7Tk4 Pull 5**
(fight 5, 18:41); both were refetched on 2026-10-18 so they carry statuses,
head markers and tethers. Before this file, only Revolting Ruin III's cone,
Blizzard III Blowout 47771 and the untagged towers came from a VOD review.
Nothing here is VOD-checked yet, and nothing becomes a ruling.

Phase clock on both kills: P1 0:00, P2 3:29, P3 7:09, P4 12:16, P5 15:00.

## Phase 1: Kefka (0:00 to 3:29)

Looks from thaliak.com/ultimates/umad and materiaraiding.com/ultimate/dmu.

### What's drawn

| Mechanic | How |
|---|---|
| Revolting Ruin III | Unchanged (90° purple cone, user's VOD review). Its tank marker (218) now reads "Tank buster". |
| Mystery Magic rings | New cue: one ring per element around Kefka from the ring markers (673-678) until the cast resolves, fire orange, ice pale blue, thunder violet, each with two orbs; an inverted ring is dashed with "?" orbs. The text under Kefka says what it means ("Ice ?: shown quadrants safe"). The marker → ring mapping is read from what resolved after each marker, and both kills agree on all eight occurrences. |
| Blizzard III Blowout, Thrumming Thunder III | Normal ones (47768 cleaves, 47775 lines) now show for their whole 4.7s cast, as the game's floor telegraph does. An inverted ring's shown telegraph (47771 / 47776, hits nobody) is a dashed empty outline with "?" marks, gone when the cast ends; the real ones (47774 / 47777) flash where they land. 47771 was hidden after the user's review; it now shows only as that outline, never filled. |
| Flagrant Fire III | Stack (47779) orange; spread (47778) red. Markers read "Stack" (128) and "Spread" (127). |
| Wave Cannon towers | Game data was right; each shows a soaker count of 1. |
| Double-Trouble Trap | New: an orange 6y stack circle rides on each holder for the last 6s before it goes off, and flashes there. The cast's own circles sat on helpers parked at old spots (7y off at 0:50.6). |
| Hyperdrive | Purple tankbuster circles. |
| Graven Image tethers | New look: yellow (statue's right hand: Vitrophyre, Indulgent Will) and purple (left hand: Gravitas, Idyllic Will) with a bead running down them. Needed a small engine change: one tether id (45) with two meanings. Graven Image I's tethers (Pulse Wave) stay pink: nothing logs who they knock back. |
| Gravitas wells | New: a dark violet bubble where each Gravitas stack lands, until Gravity III soaks it (or Gravitational Explosion). Gravitas and Gravity III draw as stacks. |
| Gravitational Wave / Intemperate Will | Now a 180° half-room cleave: Wave on the west half, Will on the east. They drew as 90° cones from the helper's facing, which is a placeholder in Pull 5. |
| Tele-Trouncing sigils | New: a 2y pad with a gold arrow wherever each Tele-Portent dropped (from the 47802 hit), pointing its direction, until the Confused players' status ends. |
| Ave Maria / Indolent Will | New cue: the statue's eye at the arena's north edge for 5s before the gaze resolves, gold with "?" for Ave Maria (look at it), purple for Indolent Will (look away; not in either log). |

### Fit check after the changes

Every ability that hits someone is exact once simultaneous casts are taken
together; the script compares each circle with every hit of the same name,
so stacks and spreads read as "hit 8, drawn 4". What's left is expected:
- The shown fake telegraphs (47771, 47776) have players inside them who
  weren't hit (that's the point: the shown area is safe).
- One player at a real cleave's edge at 0:54.5 (Pull 9) and 0:38.1 (Pull 5),
  2° inside.
- Hyperdrive: three drawn on the tank with no hit logged (2:16.9-2:21.1),
  probably an invulnerability.

### Couldn't find out / not drawn

- **Graven Image I's knockback** (Pulse Wave) has no shape in the data and
  no hit, so it isn't drawn; the tethers show who is tethered.
- **The sigils' lifetime** isn't logged; they stay until Confused ends.
  In game they're single-use and expire.
- **Spread markers for an inverted stack:** Pull 9's 3:02.8 shows the two
  stack markers and then resolves as a spread (fire inverted); the game
  may show something else on the other six.
- **Light of Judgment** and the enrage are raidwide: not drawn.

### VOD checks: Pull 9 (2T1HzdPKgbhM43am)

1. **0:33.2:** the replay draws two rings round Kefka (orange fire inside,
   pale blue ice outside, both with plain orbs) and "Stack" over the
   Astrologian and the Dragoon. Do the game's rings match: which ring is
   which colour, and are the orbs plain?
2. **0:33.3 to 0:38.3:** the ice cleaves (NW and SE quadrants) show for the
   whole cast. Does the game show the quadrant telegraph that long?
3. **0:49.4:** the ice ring is dashed with "?" orbs and a dashed outline
   covers the SW and NE quadrants; the real cleaves flash NW and SE at
   0:54.5. Does the game draw the SW/NE telegraph here (the fake one)?
4. **0:50.6:** the Double-Trouble Trap circles ride on the two holders
   from 0:44.6. Is that where the knockback came from, and does the game
   show a circle on the holder before it goes off?
5. **1:22.2:** the statue's tethers draw yellow to four players and purple
   to four. Were the purple ones the players stacked into Gravitas, and
   are the colours right (yellow right hand, purple left)?
6. **1:28.7 to 2:02.0:** violet wells at the north stack (from 1:28.7) and
   the south stack (from 1:47.1) until Gravity III. Do the wells look like
   bubbles that sit there until the soak?
7. **1:42.5 and 1:55.7:** Gravitational Wave hits the west half, then
   Intemperate Will the east half. Right halves?
8. **2:40.8 / 2:43.8:** arrow pads appear under each player as their
   Tele-Portent runs out. Do they point the right way, and when do they
   vanish (the replay keeps them to 3:01.5)?
9. **3:02.8:** fire ring dashed (inverted) with "Stack" over the Sage and
   Viper, then everyone takes a spread at 3:09.3. Does the game show the
   stack markers here, as the log says?
10. **3:03.0:** the statue's gold eye at the north edge with "Ave Maria:
    look at the statue". Is the eye gold with a "?" in game?

### VOD checks: Pull 5 (yBKPqGwHparm7Tk4)

1. **0:33.0:** "Spread" over all eight, fire and ice rings plain, spread
   circles at 0:38.9. Do the spread markers show on all eight?
2. **1:42.2 and 1:55.3:** two Gravitational Waves, both on the west half
   (everyone stood east both times). Right half for the second one too?
