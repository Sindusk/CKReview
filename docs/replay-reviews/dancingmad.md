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

## Phase 2: Kefka, Forsaken and Trines (3:29 to 7:09)

Looks from thaliak.com/ultimates/umad; the mechanics from forsaken.ts.

### What's drawn

| Mechanic | How |
|---|---|
| Ultimate Embrace | Purple shared tankbuster; marker 259 reads "Shared tank buster". |
| Forsaken towers | Now built in the spec: each pair of 4y towers (soaker count 2) at its helper's spot, from the previous pair's resolution (the first pair from Forsaken's cast at 3:56.9). Their rows have no omen, so they drew only as they resolved. |
| Forsaken spell markers | 715 "Stack", 716 "Circle", 717 "Cone": they match the holder's status 32 of 32 times in Pull 9. The label stays until the holder's next soak, else 5s. |
| Spelldriver / Spellscatter / Spellwave | Now built in the spec: planted at the soaker's spot as their status runs out, until they fire ~0.6s later. Stack orange, circle red, cone a 90° cone at the player it hit. The helpers casting them log stale spots ((99.3, 87.7) at 4:11.4 while the plant was at (104.5, 104.7)). |
| Future's End / Past's End | New cue: a ghost ring on each clone and a red half-disc on the side All Things Ending will cleave (front for Future's, behind for Past's), from the jump until the cleave; the text under Kefka says which. |
| All Things Ending | 180° cones; Past's End's (47837) flipped behind. With no angle they drew 90°, and Past's drew in front over six to eight players who took nothing. Now exact in both kills (16 of 16 each). |
| Trine | Now built in the spec: each tip a 6y gold ring with a turning triangle for 12s before it explodes, filling in over its last 2s. Only tips whose helper logged a position at its own explosion are drawn: the helpers are reused between sets. Pull 9's first set and Pull 5's third set have none. |
| Wings of Destruction | Half-room: the 80×40 rect now runs from Kefka to his right (47822) or left (47821) through the 3.7s cast. Drawn along his facing it covered the north half, with players in it. Then purple 7y tankbusters on the nearest and farthest. |
| Aero III Assault | New: a pale blue knockback from the middle through its 2.7s cast. Its 40y range made the engine skip it as raidwide. |

### Fit check after the changes

All Things Ending, Trine, Ultimate Embrace and Wings' half-room are exact.
Spellwave's 90° cone catches a second player twice in Pull 9 (4:10.8,
4:52.9) and is otherwise exact, so the angle may be a little narrower. The
towers, Future's End and the spells read "hit 4, drawn 2" (one shape per
target, compared with every hit of the same name). Aero III Assault has
everyone inside and no hit: it's a knockback.

### Couldn't find out / not drawn

- **When each tower pair appears:** not logged.
- **Trine's triangles:** only the tips are drawn, and Pull 9's first set
  (6:07.4) isn't drawn at all.
- **The wing's glow** on Kefka isn't drawn; the half it cleaves shows instead.
- **Light of Judgment** (5:43.3) and the enrage are raidwide: not drawn.

### VOD checks: Pull 9 (2T1HzdPKgbhM43am)

1. **3:57 to 4:10:** the first tower pair (SE and NE of the middle) shows
   from Forsaken's cast. When do the towers appear in game, and are all
   sixteen visible at once?
2. **3:58.6:** "Stack" over the Paladin and Dragoon, "Circle" over three,
   "Cone" over three. Do the in-game markers match those spells?
3. **4:10.8:** Spellwave from the Black Mage's spot toward the Sage, drawn
   as a 90° cone. How wide is the cone in game?
4. **4:13.4 to 4:31.0:** Future's End: the clones' half-discs face north
   (the cleave side) with the party south. Do the clones face that way,
   and does the game show any telegraph for All Things Ending?
5. **5:08.0 to 5:13.1:** Past's End: the half-discs sit behind the clones
   (south) with the party north. Right side?
6. **5:57.7 to 6:01.7:** Wings of Destruction covers the east half from
   Kefka's cast (players west). Is it his right wing glowing, and does
   the game show the half or only the wing?
7. **6:07.4:** the first Trine set explodes with nothing drawn (no
   position logged). Where were those three triangles?
8. **6:25.5:** Aero III Assault draws a knockback from the middle. Does
   the game telegraph it?

### VOD checks: Pull 5 (yBKPqGwHparm7Tk4)

1. **5:57.6 to 6:01.6:** Wings of Destruction covers the west half (47821,
   players east). Is it his left wing?
2. **6:11.4:** the third Trine set explodes with nothing drawn. Where were
   its triangles?

## Phase 3: Exdeath and Chaos (7:09 to 12:16)

Looks from thaliak.com/ultimates/umad (it calls this "Definition of
Insanity"); the mechanics from exdeath.ts, limitcut.ts, blackhole.ts and
stompies.ts.

### What's drawn

| Mechanic | How |
|---|---|
| Bowels of Agony sigils | New cue: a fire triangle, water square and wind diamond on the floor from Bowels of Agony until their element goes off, where that element's helper logged a sample (Pull 9: fire NW, wind SW, water SE; Pull 5: fire NE, wind NW, water not logged). |
| Inferno | Now built in the spec: a 10y donut on the two players nearest the fire sigil, following them. It drew on the sigil itself. The donut's hole size is a guess (a third of its range). |
| Stray Spray | Now on each Dynamic Fluid holder as the status runs out. Its helpers had no position near the cast, so it wasn't drawn. |
| Stray Flames, Tsunami, Cyclone, Thunder III | Game data was right; Cyclone draws as a stack, Thunder III's hits on the tank as tankbusters. |
| Latitudinal Implosion | Now built in the spec: Shockwave's two 90° cones out of Chaos's sides, then front and back, from Chaos himself. In Pull 9 the first pair came from helpers last seen 2s and 14s earlier, one 9y away. |
| Vacuum Wave | New: a pale blue knockback from Exdeath through its 7.7s cast. Its 100y range made the engine skip it. |
| Limit Cut | New: the eight clones on the rim as pale numbered ghosts, from their pulse until their dash, and a violet number badge over each player from the marker until their dash. The numbers are head markers 336-339 / 437-440 (1-8); in Pull 9 dash k hit marker k's player, all eight. |
| Black Hole | New look: the black holes as dark swirls and their tethers (84) dark violet until Nothingness fires down them. |
| Slap Happy | Its 6y centre burst shows through its 1.2s cast. Its Shockwave (47851) hit all eight both times, so it's now hidden: drawn as 180-270° cones it covered the arena. |
| Damning Edict, Look upon Me and Despair | Now shown through their cast bars (both have a ground omen). |
| Stompies | Blizzard III puddles show for their 2.7s cast as ice circles. Stomp-a-Mole towers take 2. Knock Down is a stack, and marker 161 reads "Stack". |

### Fit check after the changes

Most abilities are exact. What's left:
- Implosion's front/back pair in Pull 9 (8:15.8) has two players inside
  who weren't hit. Pull 5 is exact. The 90° angle is a guess.
- Thunder III's 5y tankbuster drawn on a tank with no hit logged
  (9:57.5, 10:00.5), in both pulls.
- One Blizzard III puddle in Pull 9 (11:44.7) and three in Pull 5 have a
  player inside who took nothing, probably because the puddle's helper
  logs a stale spot.
- Vacuum Wave has everyone inside and no hit: it's a knockback.

### Couldn't find out / not drawn

- **Headwind / Tailwind** (the gaze before Limit Cut): only their status
  icons show; which one means "face Exdeath" isn't pinned down
  (limitcut.ts).
- **The Ultima Blaster pulses** (8:29 to 8:43) are raidwide; only the
  clones that cast them are drawn.
- **Bowels of Agony's water sigil in Pull 5:** its Tsunami came from
  reused helpers parked elsewhere, so no spot.
- **Umbra Smash, White Hole, Earthquake, Meteor** are raidwide: not drawn.

### VOD checks: Pull 9 (2T1HzdPKgbhM43am)

1. **7:31.7:** the three sigils appear (fire NW, wind SW, water SE). Do
   they appear with Bowels of Agony, and are those the right shapes and
   corners?
2. **7:51.9:** Inferno draws donuts on the Bard and the Black Mage (the
   two nearest the fire sigil). Were they the ones it targeted, and how
   big is the donut's hole?
3. **8:13.0 to 8:15.8:** Shockwave cones out of Chaos's sides, then his
   front and back. Is the order right, and are they quarter cones?
4. **8:29.0 to 8:53.0:** numbered clones on the rim and number badges on
   the players. Do the in-game numbers match (the Viper 1, the
   Astrologian 2, the Dragoon 3, the Paladin 4, the Sage 5, the Bard 6,
   the Dark Knight 7, the Black Mage 8)?
5. **9:40 onward:** black holes on the cardinals, violet tethers to their
   players until Nothingness. Do the tethers look like that, and are the
   holes where the replay puts them?
6. **9:38.4:** Slap Happy's Shockwave is hidden because it hit everyone.
   Is there a cone to dodge there?
7. **11:42.0:** Blizzard III puddles under every player 2.7s before they
   go off. Is that how long the game shows them?

### VOD checks: Pull 5 (yBKPqGwHparm7Tk4)

1. **7:31.7:** fire sigil NE, wind NW; the water sigil isn't drawn. Where
   was it (SE or SW)?

## Phase 4: Kefka Says (12:16 to 15:00)

The mechanics from kefka-says.ts (its model is from the wtfdig analyzer).

### What's drawn

| Mechanic | How |
|---|---|
| Kefka's rings and dodges | P1's ring cue and telegraphs work here unchanged: ice and thunder rings (dashed with "?" when fake), the shown fake telegraph as a dashed outline, the real cleaves and lines flashing as they land. kefka-says.ts's marker table (675 ice fake ... 678 lightning real) agrees with what P1's casts showed. |
| Mana Charge / Mana Release | The release's rings read "Mana Release · Ice: ? + ? = real" and so on, from the rings recorded after Mana Charge (double fake is real). In Pull 9 the replay at 14:15.7 was the normal cleaves and lines, as the rule says. |
| Flood of Naught | New look: White and Black Antilight as a white and a dark half-room through their 5.2s cast, with Edge of Death down the middle. The colours are the ones that hit (Pull 9 13:23.0: White hit the five players west of the line, Black the three east). |
| Death Wave / Death Bolt | Death Wave draws as a stack; Death Bolt was already right. |
| Stray Flames | Shown through its 4.7s cast (it has a ground omen). |
| Stray Spray | Now built in the spec: a 40y donut with a 6y hole (omen gl_circle4006), one per group of stacked holders. The engine guessed a 13y hole, and eight overlapping copies turned the arena solid red. |
| Cursed Shriek | New cue: a violet eye over each holder for the 5s before their gaze goes off. |

### Fit check after the changes

Flood's halves, Edge of Death, Stray Flames and Stray Spray are exact in
both kills. The fake telegraphs have players inside, as they should. Pull 9's
Mana Release lines at 14:15.7 show seven players "inside" at 0.4y from the
edge: the safe spot is where the stripes meet. Death Wave and Death Bolt
read "hit 6, drawn 3" (two stacks compared together).

### Couldn't find out / not drawn

- **Grand Cross and Flood real/fake:** the signal (status 1002056 on Neo
  Exdeath and Chaos) is on the bosses, and the replay fetches only player
  statuses. So the replay can't say whether a Grand Cross was fake, which
  way a Cursed Shriek must be looked at, or whether Flood's telegraph
  showed swapped colours. Fetching it would need an engine change to the
  replay fetch.
- **Acceleration Bomb, Compressed Water, Forked Lightning, the wounds:**
  only their status icons show.
- **Grand Cross, Ultima Upsurge, Death Surge** are raidwide: not drawn.

### VOD checks: Pull 9 (2T1HzdPKgbhM43am)

1. **13:17.4 to 13:22.9:** Flood of Naught: white half west, dark half
   east, a line down the middle. Is that what the game showed, or were
   the colours swapped (a fake Flood)?
2. **13:52.3 / 14:03.5:** the Mana Release rings read "Thunder: ? + ? =
   real" and "Ice: ? + ? = real". Do the release rings show "?" orbs for
   both?
3. **14:09.9 to 14:14.9:** one red donut with a 6y hole round the stacked
   party (Stray Spray). Is the hole that small?
4. **13:35.2 and 13:59.2:** violet eyes over the Cursed Shriek holders
   for 5s before their gaze. Do the eyes sit on the holders in game?

## Phase 5: Ultimate Kefka (15:00 to the end)

The mechanics from ultimate-kefka.ts (its model is from four guides; both
kills here are the first P5 kills on disk).

### What's drawn

| Mechanic | How |
|---|---|
| Fell Forces | Role stacks: tank purple (3y), healer and DPS orange (5y). |
| Flood | Now built in the spec: each line shows as its 1.2s laser telegraph (49539), then again as it lands 4.6s later (49769) from the same spot. The telegraph cast alone flashed over players who were never hit, and the lines weren't drawn at all. Chaotic Flood draws as a stack. |
| Maddening Orchestra | Flare and Chaotic Flare as tankbusters. Flare Diffusion (25y) and Chaotic Holy (a 6y stack) now land on the Surprise Flare / Surprise Holy holders. Their helpers sit at (100, 100), where Diffusion drew over all eight. |
| Celestriad towers | Now built in the spec: each tower in its element's colour (fire orange, ice pale blue, thunder violet) with "2", each wave from the previous wave's resolution (the first from Celestriad's cast). The rows have no omen, so the towers drew only as they resolved. Towers whose helper logged no position at their own cast aren't drawn (one in Pull 9). |
| Catastrophic Choice | New cue: a yellow (Quake) or green (Tornado) ring on Kefka through the cast, labelled "Tornado: inner half of the towers". The text comes from the cast that resolves it, since the Choice's own id doesn't name the element. |
| Stray Apocalypse, Stray Entropy | Game data was right. |
| Forsaken | The bait (47928) shows through its cast. The dark grounds (47927) now stay as black pools with a violet rim until Forsaken Null. Bonds is a stack, and marker 161 reads "Stack". |

### Fit check after the changes

Flood, Chaotic Flood, Chaotic Flare, Tornado, Forsaken and Bonds are exact
in both kills; Stray Apocalypse is 63 of 64 (Pull 9) and 61 of 70 (Pull 5),
with the misses at its end (16:55-16:59 in Pull 5) where helpers log stale
spots. Fell Forces, Holy, Stray Entropy and the towers read "hit N, drawn
2-4": one shape per target, compared with every hit of that name. Chaotic
Holy shows on the invulnerable holder with no hit logged.

### Couldn't find out / not drawn

- **Whether Flood's lines show between telegraph and landing:** the
  replay hides them for those 4.6s, since the landing cast has no omen.
- **Catastrophic Choice's staff colour** is inferred from the resolving cast.
  Neither kill has a Quake.
- **Celestriad's other five towers** (nine visible, four lit a wave) aren't
  drawn: only lit towers that resolved are in the log.
- **Ultima Repeater, Forsaken pulses, Forsaken Null** are raidwide: not drawn.

### VOD checks: Pull 9 (2T1HzdPKgbhM43am)

1. **15:19.1 to 15:28.2:** each Flood line flashes as a short telegraph,
   then nothing until it lands 4.6s later. Does the game keep the lines
   on the floor in between?
2. **15:44.7:** Flare Diffusion draws as a 25y circle on the Surprise
   Flare tank at the north edge. Right size and spot?
3. **15:58.9 to 16:20.1:** the lit towers in fire / ice / thunder colours,
   one wave at a time. Do the colours match the game's towers?
4. **16:03.1 to 16:08.2 (and 16:15.2 to 16:20.3):** a green ring on Kefka
   with "Tornado: inner half of the towers". Is Kefka's staff green for
   both Choices?
5. **17:44.1 onward:** the Forsaken grounds stay as dark pools until the
   end. Do they look and last like that in game, and is the first one in
   the middle?


