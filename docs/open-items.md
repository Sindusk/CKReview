# Open Items

This page lists unfinished work and questions waiting on a user decision,
collected from past sessions. Treat it as a starting point, not a
commitment: ask the user before picking an item up, and delete it here once
it's resolved. Module headers carry the full context for mechanic items.

## Mechanic detection — questions for the user

### The Venomous Abyss (WoW)

- **Entombed Sentinels** (report Mvz3r1AnVKYpdFTH; no VOD ground truth yet):
  - **Living Venom blame.** Should it fall on the victim (current), the
    orb collector, or both?
  - **Protovenom eruption.** It flags both the marked and the unmarked
    player. Keep that?
  - **Undispelled Blighted Blood** with no one else hit is a player-less
    Minor. Keep it?
  - **Not built yet:**
    - Mark-refresh (carrying the old Mark indefinitely)
    - Ula'tek's Dominance
    - tank-swap misses
    - non-lethal Blighted Blood ticks
- **Vashnik** (report kGVX7tafBT2pM1N3; no VOD ground truth yet):
  - **Plague Wave blame.** Should the Froth carrier whose lane it was also
    be blamed? The description already names the carrier.
  - **Stygian Burst on non-holders** (92 Minors). It may not be dodgeable.
    Keep it, drop it, or make it a raid-wide healing error?
  - **Player-less errors.** Missed totems and undispelled Exploding
    Infection name no player. Should they?
- **Sszorak** (report rNL38zFGMbyADRTh; not the user's group, no VOD —
  ask once the user's group reaches the boss):
  - **Tempest volume.** Every tornado pass is flagged (~15 per pull, ~4 on
    tanks). Should tank hits count, and should a single hit stay Minor?
  - **Missed Mutilate soaks.** The most frequent misses were a player
    skipping their group's first soak, players knocked back by Crosswinds
    7s before the +55 soak, and the Serpent's Fury mark holder. The
    description names the knockback / mark. Real errors, or assigned
    exceptions to exclude?
  - **Virulence blame.** A reinfection flags both the spreader and the
    reinfected player. Correct, or only one of them?
  - **Early cyst pops** blame whoever stood nearest the drop spot (within
    8yd). A tank dragging the boss is often nearest. Is that the real
    popper, or is the boss/tank pathing the cause?
  - **Two cysts in one gale** is player-less and names both droppers.
    Should blame go to a dropper (placement) or the raid's positioning?
  - **Crosswinds fall** flags only the player who fell and names their
    opposite-direction partners. Should a partner share the blame?
  - **"5 dead" marker** ended two pulls 20-70s before Unbound Ferocity
    actually wiped them. Keep 5 as the threshold?
  - **Not flagged:** Caustic Claws (no target in the log) and Caustic
    Residue (constant brief contact, one death in 36 pulls). Wanted?
- **Nek'zali** (report nRGxQ1b8LdMvzC4D; only 6 pulls exist, one a kill; no
  VOD ground truth yet — most thresholds rest on one or two failures):
  - **Latent Cultist volume.** Every pool contact is flagged (31 Minors in
    the kill). Groups of 4+ at once are annotated "pool may have moved onto
    the group". Keep all, drop single ticks, or drop the group cases?
  - **Vessel revival blame.** Revivals are player-less: every revived corpse
    was a first-wave phase 1 Amani, but flames detonated 0.4-10yd from some
    corpses that still rose, and pulls 3/4 revived only after the fourth
    Pyre. What actually decides which corpses rise, and who should own it?
  - **Possession Barrage** blames the targeted tank when the median raid
    hit is ≥100k (clean 50-68k, one failure at 137k). Is it the tank's
    distance, or could the raid have been stacked on the path?
  - **Pyre under-soak** (≤6 soakers) and **uncompleted Curse** are
    player-less. Is there an assignment (soak group, kick order) that
    would let them name players?
  - **Invoke silence** is a Minor per silenced caster (8 in the kill). Keep?
  - **Well re-entry with Soul Exhaustion** is only flagged when the player
    died; the kill re-entered with 5-13s left every phase 2 window.
  - **Unverified rule:** `wow-nek-unscheduled-rite` (Rite outside Ignition/
    Invoke). Its only firing is 4 +355.3, after the Vessel cutoff — likely a
    revived Amani reaching the well; not confirmed.
  - **Not flagged:** Hollowing Strikes stacks (17-18 on the Blood DK in the
    kill), Swirling Spirit ticks, Grasping Depths/Uncoiling raid damage.
  - **Tank-death marker** only fires when the pull ends within 30s (5
    +452.9 lost a tank at 12% and fought 67s more). Right call?
- **The Lost Explorers** (A = nRGxQ1b8LdMvzC4D, 15 wipes; B =
  8PQFgdDh3R9BW71t, 19 wipes + kill in pull 20; no VOD ground truth yet —
  cutoffs per pull are in the module header's wipe survey):
  - **Late fish blame.** A Final Ascension that completes before the Command
    blames the fish thrower (Major if it killed anyone): A1 +66.7, A6
    +185.8, B7 +312.8 (Raid-level) and B1 +187.5, B12 +183.9 (no deaths).
    Is the thrower the right owner, or was the fish late for another
    reason (crate opened late, carrier moving, the call)?
  - **No fish at all** (B2 +65, 12 dead) is player-less. What happened to
    the fish that cycle? The log can't show who picked it up.
  - **Blast Wave.** Every player hit flags, with the timing in the text:
    no bounce, bounced too late (hit 0.1-1.4s into the Bounce) or too early
    (landed 0.1-1.1s before the wave). Several "too early" deaths bounced
    exactly 2.5-2.6s before the wave — stepping on the mushroom too soon, or
    a mushroom auto-launch? Should any of these not be the victim's fault?
  - **Nobody bounced** over a wave five times (A15 +381, B3/B4/B6/B10
    second wave), player-less. The mushroom existed in the log each time.
    Who places the mushroom — was it baited somewhere unreachable?
  - **Elemental Explosion** flags every Burning Flames holder within 12.5yd
    of a Frost missile's target (A5: 2, A8: 4, A10: 1; A9: nobody placeable).
    Should the missile's target also share blame, and is 12.5yd too wide?
  - **Mighty Thud under-soak** (≤8 soakers) is player-less and names the
    marked player. B11 +327.8 and B7 +333.4: the marked player was alone.
    Did they run from the group, or did the group not follow?
  - **Icebound Flames** completions are player-less Minors (15, one in the
    kill). Is there a kick rotation that would let them name the missed
    kicker?
  - **Shredding Shards** flags a tank at 9+ stacks (two casts without a
    swap). Should the other tank (who didn't taunt) share it?
  - **Splinters overlap isn't flagged.** Nobody can be named (the stomper
    isn't in the log), and the kill ran 3-4 stacks routinely. B3 +98.7 junk
    landed on the stacked raid and opened five at once (10 dead) — the
    Throw Junk hits are flagged, the generic 7-dead marker is the cutoff.
    Want a Raid error for "5 crates at once"?
  - **Blink Nova deaths aren't flagged** (damage didn't fall off with
    distance in the log). Any positioning or defensive expectation that
    should make them someone's fault?
  - **Minor volume:** Aftershock (84), Throw Junk (72), Evil Eyes (43) and
    Spreading Flames (19) flag every hit. The kill had 5 Aftershock, 3 Evil
    Eyes, 2 Spreading Flames, 1 Throw Junk. Keep all?
  - **Not flagged:** United Defense (the kill had 4.7s windows; wipes up to
    8.9s), Shell Spin stuns (14 in the kill), Steady Strikes stacks, Fire/
    Frost patch ticks, Haunting Spirits debuffs, Falling.
  - **Thresholds changed from other bosses:** the collapse marker is 7 dead
    (5-6 was survived 50-120s here), and a burst of deaths with no killing
    blow logged is read as a called wipe. Right calls?

- **The Twin Fangs** (A = 6Jnq8ycwgkYZpHND, 24 wipes + kill in pull 25;
  B = xKP1M6gwC8WpnrBc, 14 wipes; no VOD ground truth yet — each wipe's
  cutoff is in the module header's wipe survey):
  - **Venom cap deaths** name the player as Major (67 of them), with the
    10th stack's source and their stack history in the text. Most final
    stacks came from Venomous Emergence (unavoidable) or a globule pickup.
    Is the player at fault, or should an Emergence cap be player-less
    unless they took avoidable stacks earlier?
  - **Soft enrage.** 3+ players capped by one Emergence is a Raid
    "overflow". The kill lost 2 at its +407 Emergence (flagged as 2
    Majors). Should the +407 Emergence cap count as the enrage regardless
    of how many die?
  - **Globule bursts** are player-less (who should have taken the globule
    isn't in the log). Is there a soak assignment (groups, markers) that
    would let detection name someone? Bursts from globules released by
    deaths killed 13-18 at once (A1 +58.5, A12 +300.8, B8 +126.5, B13
    +155.3) — who is meant to pick those up?
  - **Globule pickup deaths** (52) blame the picker; many took 2-3
    globules within 2s at low health. Double pickups were survived 47
    times, so they aren't flagged alone. Right?
  - **Visceral Burst** completions are player-less: the kick order changed
    every pull. Is there a kick assignment (by spawn order or marker) the
    raid uses? A declared order would let detection name the missed kicker.
  - **Feast raid bite** (A13, A14, B1, B11, B12) is player-less. Can the
    under-soaked bite group be named — who was assigned to it?
  - **Stone Breaker** blames the tank whose set it was (the one soaking the
    other impacts, or the one who didn't soak the previous set). Right
    owner, or could a DPS be assigned to help?
  - **Corrosive Spit** flags an unmarked player in the line and names the
    marked target. Should the target share blame for aiming it at people?
  - **Stir the Depths waves** (debuff 1292807) land all through the pull,
    not only during the Stir cast — 240 Minors in A, 21 in the kill,
    several on tanks. What are they on screen, and are they avoidable?
  - **Minor volume in the kill:** Stir waves 21, Sanguine Storm 13,
    Congealed Gore 9, Noxious Slick 7, Deadly Venom 6, Deluge splash 2.
    Keep all, drop some, or exempt tanks?
  - **Out-of-range casts** (Concentrated Spittle / Clotted Bolt) are
    player-less Minors naming who was hit. Should the tank of that boss be
    named instead?
  - **Collapse marker at 6 dead** (every pull reaching 6 ended within
    31s). Right threshold?
  - **Not flagged:** Coiling Ichor damage (the marked players' own DoT),
    Tainted Blood absorb ticks, Blood Torrent, Caustic Deluge on its tank,
    deaths to Eternal Venom ticks below the cap, marked Spit targets dying,
    Barbed Bulwark kill/stun assignments.
- **The Coiled Altar** (report wThYvpJkbK6Pjrdc, 30 pulls with the kill in
  pull 30; only pulls 1-17 are fetched because WCL rate-limited the
  download, so there is **no kill baseline yet**; no VOD ground truth yet
  — each wipe's cutoff is in the module header's wipe survey):
  - **Fetch pulls 18-30,** especially the kill, and re-check every
    threshold and Minor volume against it
    (`node scripts/fetch-wow-report.js wThYvpJkbK6Pjrdc --fight 23 ...
    --fight 35`).
  - **Orb collisions** name every carrier whose Volatile/Mutagenic Venom
    was picked up or dropped early in the 0.4s before the eruption (P7 two
    purple carriers, P12 a fresh purple pickup, P5 the tank grabbing a
    purple while carrying a normal orb). Who actually caused each one on
    VOD — the purple carrier, the player they walked into, or both?
  - **Deluge eruptions** (P6 +172.2 at the stage-1 overrun, P9 +529.7 in
    stage 3) are player-less: a Mutation was still out when Toxic Deluge
    was cast. Who was meant to clear it?
  - **Tank-death cutoffs** that may have a better cause: P8 +232.1 (the
    tank died with no killing blow — a fall?), P11 +509.7 (tank died to an
    uncollected Soul Fragment), P12 +157.7 (tank died to axes; Sever then
    hit a healer and an orb collision killed 15 at +168.1). Which event
    really ended each pull?
  - **Malevolent Resonance** flags both players whose ghosts touched, Major
    for both if either died; a ghost inherited from a player who just died
    is exempt. 48 flags in 17 pulls. Is the pair the right blame, or only
    the player who walked their ghost into the other?
  - **Dreadmarch falls** are player-less Minors naming the victim (the
    raid's job to break the absorb). Should they be Major on anyone, e.g.
    assigned damage dealers?
  - **Wail of Terror** completions are player-less (no kick order in the
    log). P14 +204.0 was the first Wail of the pull, never kicked at all.
    Is there a kick assignment per add that would let detection name
    someone?
  - **Soulcoiler shield** flags an add whose Spirit Shield survived a
    Gloombomb wave. It's player-less because add positions are stale
    (adds relocate after each kick). Is there a bomb-to-add assignment?
  - **Spirit Erasure deaths** are player-less; the log doesn't show who
    intercepted a fragment. P15 +413.3 (11 dead) is the only intermission
    wipe.
  - **Gloombomb bystanders** (14) and **Soul Sever on non-tanks** (19):
    are some of these deliberate (e.g. immunities soaking ghosts)? Zero-
    damage hits are already skipped.
  - **Not flagged:** roaming Axegrinder hits (150-370 per pull) and
    Noxious Ground (90-160) are flagged only when they kill; carrier-
    proximity Volatile/Mutagenic ticks on bystanders; Widow's Touch.
    Should any of these count?
  - **Collapse marker at 6 dead** (every pull ended within 45s of it).
  - **Soulbound** (the survivor's berserk) was never reached in pulls
    1-17; no rule yet.

- **Ula'tek** (report JZp82Rm7TzycM94a, 25 pulls with the kill in pull 25;
  first pass built from pulls 1-20 and the kill; no VOD ground truth yet —
  each wipe's cutoff is in the module header's wipe survey):
  - **Fetch pulls 21-24** if the queued retry after the rate limit didn't
    land (`node scripts/fetch-wow-report.js JZp82Rm7TzycM94a --fight 25
    --fight 26 --fight 27 --fight 28`), then `--check` and `--update`.
  - **Egg carriers in Caustic Waves.** Every stage-1 wipe except P7 began
    with Ula'tek's +113 waves hitting a second-wave egg carrier at +117-129
    (P1 +121.3, P6 +117.2, P10 +118.9/+122.6, P15 +121.0/+128.9). The
    carrier is blamed (Major, plus a Raid marker). Was it the carrier's
    movement, or the carriers' assigned spot / the wave's aim?
  - **Noxious Splash** blames both carriers (P1 +132.5, P10 +128.0). Or only
    the one who walked into the other?
  - **Hatches with no one to blame** are player-less Minors: a carrier
    dying with the egg (P8 +342.5/+344.5 to Coils, P14 +244.1 to Noxious
    Shell), a Slithering Clutch reaching the venom (P3 +413.9). P19 +379.9
    had no carrier event at all, at the stage-3 platform break, and is that
    pull's Raid cutoff. What hatched there?
  - **Caustic Waves volume:** 122 flags in 21 pulls, ~46 of them on the two
    tanks, 4 in the kill (3 on tanks). Are tank hits avoidable, and should
    a hit that didn't kill stay Minor?
  - **Spectral Coils** are player-less: ≤3 mitigators (clean impacts had
    5-10) is Minor, 3+ Coil deaths in one impact is Raid. P11 +355.1 had 5
    mitigators and still lost 6. Is there a soak-group assignment that would
    let detection name who was missing?
  - **Calcified Corpse** is a player-less Raid naming the Bite targets and
    helpers (P5 +585.7: 3 helpers, 4 needed). Should the missing fourth
    helper's group be named? P3 +570.0: a player died to Necrotic Vapors
    just as the Bite went out and calcified — their death, or the Bite?
  - **Volatile Purge deaths** are Major on the helper (the kill lost one at
    +421.8; also P3, P12, P17, P18). Each took ~1.0-1.2M alone. A missing
    defensive, or expected? Tanks overlapping purges isn't flagged (the kill
    did it too).
  - **Shrieker's second Acidic Expulsion** is the P2 cutoff (+551.3, 3
    dead). Both Shriekers' first cast (~+519) is routine and not flagged.
    Rawling Expulsions (P2, P4, P8, P16) are player-less Minors.
  - **Mother's Wrath on the raid:** P12 +540.2 (both tanks dead) and P19
    +387.2 (both tanks alive, the raid collapsing). Right as player-less?
  - **Blight Vein (P16 +220.6):** two tethered players died to Grasping
    Fangs (Major each) and the last tether broke 6s after the rest (6
    stacks, 12 dead). Should the late breaker be named?
  - **Falling Debris** flags every hit, including tanks (2 in the kill).
    Do tanks take debris on purpose?
  - **Fester Burst** flags players when 3+ are hit by one cast (P18 +70.6:
    9). The kill had one player hit per cast. Right threshold?
  - **Not flagged:** Necrotic Vapors, Mephitic Thrash, Noxious Shell
    ticks, Warden's Protection, Poisonous Bite, Toxic Burn, Blight Vein ≤5
    stacks, Weakened Doomscale death spread (2.1s in the kill, up to 11s in
    wipes; Revenge had no visible effect), Unchecked Rage, non-lethal
    Deadly Venom. Wanted?
  - **Never observed:** Mother's Boon (unintercepted Incubation), Mass
    Gestation and Rattler Slam have no rule. A completed Hatching Doom
    (Ravenous Doomscale) is flagged by `wow-ula-add-cast` but never fired.

### Midnight Falls (WoW) — deprecated

The user deprecated this fight on 2026-10-06. Nothing below will be
picked up; it stays only as a record.

- **Resume point.** VOD review of report Dn87j4ARzNwYqLvV should resume at
  pull 3. Pulls 1/2/5/16/22 are done. Phase 2 has never been reached in any
  capture.
- **Open questions:**
  - **Crystal-holder-hit.** Is a Dark Quasar landing on a crystal carrier
    intended strategy?
  - **Self-break severity.** Should a Starsplinter breaking your *own*
    crystal be Major on that player instead of Raid?
- **Unmapped:**
  - Dark Rune assignment order
  - Starsplinter blast radius
  - spec 1480
- **Late-kick Terminate misses** are unattributable: WCL has no per-matrix
  instance id.

### Fallback model (`lib/mechanics/fallback.ts`)

Built blind against Vamp Fatale (jN3XDrf2z8PmLgRJ), which now has its own
module. Open:
- **Blame on a double-up.** The victim is named. When the second hit was
  another player's bomb or spread, should the carrier share it?
- **WoW.** Enabled for FFXIV only. Turn on when a WoW boss without a
  module is tested (Nymrissa Wavecaller is the obvious candidate).

### Vamp Fatale (FFXIV)

Report jN3XDrf2z8PmLgRJ; pulls 1 and 3 partly reviewed (rulings in
expectations/). Header of `lib/mechanics/ffxiv/arcadion/vamp-fatale.ts`
has the evidence.
- **Stomp overlap blame** goes to whoever stood further from their clock
  spot (45+ degrees), both when neither did. Confirm on pulls 1/3/13.
- **Third Brutal Rain deaths (pulls 5, 7)** are a player-less Raid
  (healing check). Should anyone be named?

### Red Hot and Deep Blue (FFXIV)

Reports jN3XDrf2z8PmLgRJ (A), xFAfGP3qX4yJhDrV (B), d3vRbwfpNBLzJ2Xh (C,
kill = C4); VOD answers 2026-10-09 cover overlaps (boss-relative clock
spots), Cutback (aim described, nobody named), Deep Impact (farthest
player), busters on non-tanks, Xtreme Wave lanes and deaths during Xtreme
snaking, split-arena puddles and stacked tether holders. Header of
`lib/mechanics/ffxiv/arcadion/red-hot-deep-blue.ts` has the evidence;
rulings so far cover A8/A10/A14 and B1/B2/B3.
- **Other overlap layouts.** Only the all-party Double-Dip / Reverse
  volleys have known spots. Snaps, Inferno, Splash and the snaking /
  split-arena cones still name every player hit twice. VOD calls so far:
  B7 +3:41 Snaps the R2 belonged on the boss's left (the M2 was fine);
  B5 +4:18 snaking Inferno the H2 belonged against the wall (the M2 was
  fine). Neither separates in the log yet: Snap cones' source names don't
  identify the snapping boss, and clean Inferno drops sit 3-9y off the
  wall. Needs the Air spread and snaking fire layouts.
- **Deep Impact during snaking** with the water tank alive: B8 +5:15 the
  H1 (Water, 17.5y) and B20 +5:15 the M2 (Water, 17.6y) baited it. Right?
- **Unreviewed B1-B26 checks** (list given 2026-10-09): B8 +7:06 R2/M2
  split drops swapped north/south; B12 +7:11 split Double-Dip overlap;
  B13 +5:36 / B15 +5:05 OT wall deaths; B17 +5:48 / B25 +5:47 stacked
  tether holders; B18 Floater; B8/B12 tether deaths at 26-29y.
- **Xtreme Wave holders dying at 23-29y** (surviving holders 28-39y) are
  called a short tether. Right?
- **Same-color Xtreme cleanses** flag every cleanser on the volley; with
  the static's cleanse order, only the out-of-turn ones could be.
- **Walked into the wall** with nothing before it (A6 +0:28 OT, A2 +1:16
  R1, A17 +4:18 OT): real, or resets?
- **Not built:** Blue dash through the bubble (Vulnerability Down on the
  Watery Grave is an enemy buff the module isn't given), Awesome Slab
  membership, lethal Xtreme aura expiry (never seen).

### The Tyrant (FFXIV)

Reports d3vRbwfpNBLzJ2Xh (A), L3YxvqnNVdzBcj7t (B), gmX1Ac9PqWdfDR7B (C,
kill = C20); built 2026-10-09, no VOD review yet. Evidence is in the
header of `lib/mechanics/ffxiv/arcadion/tyrant.ts`.
- **Kill, Two-Way Fireball (C20 +9:35):** the M2 died taking the front
  with Fire Resistance Down II, and the H2 joined no line, leaving it one
  short. Both flag. Right?
- **Scythe cone / tornado overlaps** name both players hit twice (no
  clock-spot attribution yet). With the Hector spots (MT N, OT S, H1 W,
  H2 E, M1 SW, M2 SE, R1 NW, R2 NE) the off-spot player could be named
  instead, as for Red Hot and Deep Blue. Wanted?
- **Merged Sharp Taste lines** (A18 +1:35, C5 +3:21) blame both healers.
  Or the one on the wrong side?
- **Comet drop on the party** (B1 +5:13 healers, B4 +5:23 ranged) blames
  the drop's two baiters. Or the players who stood under it?
- **Heartbreak Kick:** a non-tank killed in a kick tower is a Major
  (tank-only plan). Tank deaths in the towers aren't flagged. Right?
- **Lone mid-pull falls with nothing before them** (A29 +1:34 R2, B8 +1:50
  R1): real, or resets?
- **Not built:** Shockwave line of sight (no damage logged), rock
  collisions, Wall front swaps, kick cooldown timing, tank deaths to their
  own busters.

### Dancing Mad (FFXIV)

- **Phase 1 (graven-image / phase1.ts):**
  - **Graven 2 Puddle Linger** (report h2JvDkntZCaBgmLF pull 41). The user
    flags only one player, but every metric ranks that player mid-pack. No
    ruling yet.
  - **Pull 49 bait positions.** The user named a different pair than
    detection flags.
  - **Not built:**
    - the Graven 3 Spread variant
    - the second Confetti resolution
    - relative Confetti stack cohesion
    - a "Phase 4 enrage / died to Meteor" Raid error
  - The 15% enrage floor has no confirmed-passing sample.
- **Display decision:** should Raid errors after the pull's cutoff be
  hidden too? The user's expected readings suggest yes; not decided.
- **Forsaken:**
  - **Post-death missed towers.** Should a missed-tower flag after a death
    be suppressed?
  - **Not modeled:**
    - the 47807 failed-tower kill
    - the Spread follow-up victim count
    - clone-overlap positioning geometry (the rule is outcome-gated only)
- **Limit Cut:**
  - The 47843/47864 raid pulses are unmodeled.
  - A 4+-player scramble goes unflagged.
  - The gaze look-at vs look-away IDs are unmapped.
- **Black Hole:**
  - **Incorrect Direction** is gated to the SDA strategy until the Support
    vs DPS convention for DSA/Double Tether is confirmed.
  - The DSA/SDA display label is a guess.
  - Earthquake soaks after tethers, and the mechanic past tether 10, are
    unmodeled.
- **Exdeath:**
  - **Thunder III marking two non-tanks** is a distinct, unexplained
    failure. It may be Phase 5's Lightning Resistance Down II, which shares
    ID 1002998 and goes to two players at once. exdeath.ts now ignores
    marks whose cause isn't Thunder III (47884), so recheck whether the
    observation survives.
  - The Warrior/Gunbreaker mitigation name lists are empty.
  - Shockwave role-stack markers are unmodeled.
- **Stompies:**
  - Slides 4-7 of the raidplan are unmodeled.
  - The drop-time offsets are single-pull estimates.
  - Bait-too-close is unfixable on report PM8HY9nJ7kTR4tdQ pull 3: the
    puddle positions are duplicated and grid-snapped.
- **Phase 5 / Ultimate Kefka (`ultimate-kefka.ts`)**: first pass built
  2026-09-27 from 12 reports (29 pulls reach Phase 5, no kill; no VOD
  ground truth yet). Pulls are cited as `<first 4 chars of the report
  code>#<pull>` with offsets from Ultima Repeater #1's begincast; the
  module header maps the prefixes to full codes and has the full evidence.
  - **VOD review — please verify:**
    - **Third tank Fell Forces after Orchestra 2 (+145).** The tank who
      invulned for Surprise Holy soloed it and died (KZXy#7, ZADQ#3, ZADQ#5,
      dQ8w#2), where pulls that shared it survived. The rule flags the other
      tank for not joining. Is that the owner, or was the invuln used too
      early? ZADQ#1 the Paladin died at the second volley (+142.6) with
      Hallowed Ground already gone; q4K9#9 the Dark Knight soloed the first
      volley while the Paladin used no invuln. Both flag the absent tank.
    - **Enmity at Orchestra 1** (1Vxz#7, bpAx#5): the Viper got a Flare
      while both tanks lived. The rule blames the tank without a Surprise
      aura (the Dark Knight). Tank stance off, or the Viper's enmity?
    - **On-time Flare Diffusion hits** (1Vxz#5 Black Mage, 2aVk#4 White
      Mage, q4K9#9 Sage, 3kzF#2 Dragoon): each victim stood 20-26y from the
      carrier, who was ~19y from center. The victim is flagged. Did they
      stand too close, or did the carrier go to the wrong edge?
    - **n3Td#17**: the Surprise Flare Paladin died with no killing ability
      at ~20.6y from center, and Diffusion wiped the party. Arena edge?
    - **Missed towers** flag the living player(s) who soaked nothing when a
      tower was left solo or empty (ZADQ#7, KZXy#7, q4K9#3, rWVf#16,
      KZXy#10: three idle players for three missing slots). Right owners?
    - **Group errors name nobody:** Flood lines q4K9#7 (5 caught, Raid) and
      1Vxz#7 (3 caught, 2 dead, Minor); Quake 2aVk#4 (5, Raid); Tornado
      rWVf#16 (3, Minor). Group movement, or someone leading it wrong?
    - **Missed role stacks:** healers split after Repeater 2 (rWVf#16 +91.8,
      q4K9#3 +91.8/+95.0, ZADQ#11 +139.0), a DPS out at NW9t#4 +95.0. Real
      mistakes, or a deliberate spread?
    - **Holy overlap** fires only with three living eligible baiters.
      1Vxz#5 Orchestra 1 was skipped because the Bard was mid-raise. Right?
    - **Severity:** every Stray Apocalypse hit is Major, because it applies
      Damage Down (40 in 29 pulls), matching the generic Damage Down rule.
      Keep that, or make survived hits Minor?
    - **Collapse marker at 4 dead** (17 of 29 cutoffs). No pull recovered
      from 4 mid-phase. Right threshold?
    - **Not flagged:** deaths to Ultima Repeater (rWVf#16, PQVa#15, NW9t#7,
      ZADQ#7, all at Repeater 2), to Forsaken Bonds/pulses with everyone in
      the stack (e.g. ZADQ#1 +186), and tank deaths to shared Fell Forces
      after Repeater 2. Want healing or mitigation errors for these?
  - **Model research:** lessons for the next model are in
    MODEL-RESEARCH-GUIDE.md ("Lessons from Ultimate Kefka").
  - **Implementation notes:**
    - The module anchors on Ultima Repeater's completed cast; every P5 ID
      is unique to the phase.
    - `EnemyEvent` gained optional `sourceInstance`/`x`/`y` (FFXIV casts)
      to tie each tower or Holy circle to its hits.
    - Flood lines, Quake, Tornado, Stray Apocalypse and Stardust are
      excluded from the generic `ffxiv-damage-down` rule; the module owns
      them.
    - Fallout gates assume the observed strategy (tanks hold both Surprise
      auras; the Holy tank solos under an invuln). A group that plays it
      differently may need a declared-strategy override.
    - **Not built:** a missed Chaotic Flood / Forsaken Bonds stack (never
      observed), Forsaken bait placement (no signal), Stray Entropy overlap
      (built but never fired).
- **Roles (`ffxiv/roles.ts`):**
  - M1 vs M2 has no signal and is always tentative.
  - MT/OT misses on very short or anomalous-opening pulls.
## Analysis systems: Damage, Mitigation, Statics

All three were built on 2026-10-06 and are waiting on the user's review.
Their plans are archived in [archive/](archive/) as the design record.
Module headers hold the current rules.

**Unverified jobs and specs** are the main risk across Damage and
Mitigation: their checks were written from game data and xivanalysis or
WoWAnalyzer rules, but never run against a real log. When a static or a
reference clear includes one, fetch it as a sample and check its findings
before anyone relies on them.

### Mitigation (FFXIV)

Reviewed with the user on 2026-10-08 against their own week-1 Vamp Fatale
log (`jN3XDrf2z8PmLgRJ`). Settled by the user: verdict bands (fail on a
death, under below 15%, good 15–30%, over 30%+), droppable only on over
hits down to good, hits within 3s joined and judged as landing at once,
DoTs and auto-attacks never hits, rare hits hidden in all-pulls, pulls
grouped by exact roster. The module headers hold the rules.

- **Chosen by the builder, not yet confirmed:**
  - a tank-only hit counts only when buster-sized (raw at least 40% of
    max HP); 4+ targets otherwise
  - a joined hit stops growing after a 10s span
  - rare = taken in under 25% of the pulls that got that far, once 3+
    did. Red Hot and Deep Blue's Vertical Plunge (7/39) and Re-Entry
    Plunge #2 (7/34) get hidden and may be variants, not mistakes.
  - invulnerable tanks are left out of HP% like vulnerable players
  - on tank-only hits, tank cooldowns count for droppable and notes
- **Known rough edges:**
  - A joined hit's cross-pull key is its first ability, so when a join
    starts with a different ability in different pulls, the rows don't
    line up (Red Hot and Deep Blue's Plunging Snap / Re-Entry rows).
  - No minimum size for 4+-target hits: a 25k-raw Bloody Bondage gets
    a row.
  - Notes and the hit details estimate added shields as nothing (their
    size isn't logged per hit), so a shield is never "enough alone".
- **UX pass (2026-10-09, from the user's direction):** Plan renamed
  Analysis and opened first with 3+ pulls; a player selector replaced
  the role filter; the timeline hides uneventful raid hits (no death,
  full HP going in) behind a checkbox, folds its number columns into one
  Outcome cell, marks only used / free-on-a-short-hit / ineffective, and
  opens a details panel on click. Notes list only adds that lift the hit
  to good alone. Waiting on the user's review.
- **Analysis view (built 2026-10-09 as "Plan", waiting on the user's review):**
  `lib/mitigation/plan.ts` header has the rules. Chosen by the builder:
  - at most 3 changes; a hit needs 3+ pulls; a change must fit the
    cooldowns in at least half the hit's pulls
  - tight = good median but the worst pull under 15%, given a change
    only when it fixes the worst pull
  - a short hit whose median lowest HP is below -50% is labelled a
    mechanic failure, not planned (Red Hot and Deep Blue's Plunging
    Snap #3 at -674%)
  - one change per hit, even when it leaves the hit still short
  - the player selector dims items that don't involve that player
- **Unverified catalog entries:** Warrior, Machinist (Dismantle), Red Mage,
  Ninja, Monk, Summoner.
- **Deferred:** what-if sandbox (reuse `marginWithout`), an optional
  published plan to compare against, a WoW port.
- **Not built: tank gauge overcap.** The PLD on the Vamp kill overcapped
  Oath gauge: xivanalysis says 260, and a simulation (+5 per auto-attack,
  −50 per Holy Sheltron) gives about 170. That's 3–5 Holy Sheltrons
  never pressed. It costs mitigation, not damage, so it belongs here if
  anywhere.

### Damage (both games)

- **Nothing reviewed yet.** The user will refine each job or spec with
  the people who play it. The validate runners are print-only;
  snapshots and rulings come once findings survive player feedback.
- **Deferred:** automatic search for comparable clears.
- "All loaded pulls" on a 25-pull WoW report takes several seconds.

**FFXIV:**
- **Unverified jobs:** PLD, WAR, WHM, SGE, MNK, DRG, NIN, RPR, BRD, MCH,
  BLM, SMN, RDM. `jN3XDrf2z8PmLgRJ` (the user's Vamp Fatale prog, no
  damage context) has PLD, SGE, RPR, DRG and RDM; the user is reviewing
  it job by job against VODs and xivanalysis.
- **Dancer review on jN3XDrf2z8PmLgRJ, started 2026-10-08.** xivanalysis's
  claims on the Vamp kill were checked in the log. Built from them:
  - proc overwrites (Dancer only)
  - dropped combos (every job)
  - a later expiry tolerance for lost procs

  Rejected: the late Devilment (no loss) and feather overcap (not in the
  log). Its one "weaving" delay was 0.3s, which already counts toward
  the pull's small GCD delays (under one GCD in total, so not shown).
- **Paladin, same kill.** The Fight or Flight check matched xivanalysis
  (7 missed actions, 1 missed GCD) once the window end stopped counting
  casts after the buff's removal. The "incorrect weaving" lines are
  already GCD gaps or small delays; a gap now names its weaves from two
  up. One is a 1.3s gap holding Passage of Arms, counted as a loss;
  confirm with the player whether it was planned.
- **Dark Knight, same kill.** The death, the 4 broken combos and the
  missed Delirium GCD were already found. New from xivanalysis: a check
  for damage casts that hit nothing, for every job (Salt and Darkness at
  8:39). Not checked: Tincture windows. xivanalysis didn't name the 2
  actions it expected, and its potion module isn't vendored. The second
  potion lacks Salted Earth, which came up at 6:47 and went in at 6:55,
  3s after the potion ended.
- **Astrologian, same kill.** Cancelled casts now match xivanalysis (7):
  a cast cancelled and restarted was credited to the first attempt. The
  GCD timeline had the same pairing, so gaps after a restarted cast
  moved. New: hardcast AoE spells (Gravity II, Holy III) on one target.
  Not built:
  - the missed Lightspeed for Divination, whose cost is already in the
    GCD gaps
  - the Horoscope/Neutral Sect planning note, a healing plan
  - overheal %, which the heal-GCD check covers per cast

  Our Combust III clipping is lower than xivanalysis's because it's per
  target.
- **Dragoon, Vamp kill.** Positionals (3 missed of 21, 21 and 22) and the
  broken combo matched. Lance Charge now matches (5 missed actions, 1
  missed GCD): burst windows no longer expect an action on a longer
  cooldown than the window's cycle (Dragonfire Dive in a 60s window)
  when it was on cooldown throughout, unless it was pressed within 10s
  before. New:
  - Life Surge spent on a weak combo step. Like xivanalysis, Fang and
    Claw, Wheeling Thrust and Chaotic Spring are accepted; both find
    the same 4 (Raiden Thrust ×2, Lance Barrage, Spiral Blow).
  - Chaotic Spring DoT uptime

  Not built: Life of the Dragon and Battle Litany window checks, which
  overlap Lance Charge (the same actions would count twice).
- **Reaper, Vamp kill.** Positionals, cancelled Harpes, broken combos
  and weaving already matched. Gluttony drift is found (1 use; xivanalysis
  says 8 of 10). New: the Arcane Circle window (2 Communios, 1 Plentiful
  Harvest; 1 Communio in the opener) finds the 8:22 window's second
  Communio 2s late; xivanalysis says 2 missed, and the other isn't
  visible. Not built:
  - Soul gauge, because casts don't account for all gains
  - AoE on too few targets, which needs per-job AoE → single-target pairs
    (Whorl of Death at 5:00 hit 2)
- **Red Mage, Vamp kill.** Already matched: deaths, the 17 cancelled
  casts, the out-of-order combo and the expired Verfire. New, all
  matching xivanalysis:
  - Mana Stacks dropped: Grand Impact after Redoublement at 5:04 lost the
    whole finisher chain, about 156k
  - Dualcast spent on an instant (Enchanted Riposte at 4:59)
  - Verfire / Verstone procs overwritten (4 + 5)

  Not built: White Mana overcap (3 mana). Our cooldown drift counts
  fewer lost Fleche / Contre Sixte / Corps-a-corps uses than its x/y
  (whole lost uses, dead time forced).
- **Healer DoT applications are valued against the filler** (user,
  2026-10-08), two ways:
  - an early refresh on an enemy that stays costs (seconds left ÷ 30s)
    of a filler cast, because the next refresh comes sooner; the ticks
    themselves aren't lost
  - a DoT cut short (the enemy leaves, goes invulnerable with 0-damage
    ticks, or dies, or the kill ends) is its added ticks plus hit,
    against a whole filler cast

  Bard (Stormbite, Caustic Bite) and Black Mage still value clipping as
  ticks overwritten, which overstates it about 3×; switch them over once
  someone checks them against a log. On the Vamp kill the SGE clipped
  64.3s (6 refreshes, read from the log), but xivanalysis says 17.5s a
  minute (about 171s). That gap isn't explained. Open questions:
  - movement: the DoT is instant, so a refresh while moving cost little.
    The finding says so but still counts it (Dia refreshes with 25s left
    are common on dQ8wmb1VhKt6yBXk). Needs VOD checks.
  - a kill's last refresh counts, valued only to the kill.
- **Per-player busy windows** (tower soaks, debuff carriers, baits) aren't
  in the Dancing Mad context. Gaps during a mechanic are labelled but
  still counted. Candidate: the DRK's 4.6–4.9s idle after LB3 during Limit
  Cut, in every pull.
- **P4 is marked `damageCounts: false`** because its damage doesn't carry
  over. Revisit if P4 turns out to have its own damage check.
- **PCT Hammers:** every Starry Muse on `dQ8wmb1VhKt6yBXk` holds only one
  Hammer. Consistent across pulls, so probably a chosen line; confirm with
  the player.
- **Not built:** proc overwrites for jobs other than Dancer, "the right actions inside buffs" beyond
  the ported windows, Arcane Circle's window, and a "motif painted in
  uptime" check (needs knowledge of upcoming downtime).

**WoW:**
- **Built against groups the user doesn't know**, with no WoW static yet.
  It's a raw implementation to refine.
- **Unverified specs:** Brewmaster and Vengeance (tracked cooldowns only),
  Mistweaver (its 740ms observed GCD is suspect), Discipline, Frost DK,
  Fury, Feral, Survival, Outlaw, Augmentation, Fire, Devourer, Frost Mage,
  Destruction. Guardian Druid and Protection Warrior have nothing.
- **Fight-context gaps:**
  - Multi-target is set per phase, so fights without log phases
    (Vashnik's Venoms, Twin Fangs, Nymrissa's Bubblefins) can't mark add
    windows.
  - Partial losses (a mechanic that halves a melee's uptime) are excused
    in full or not at all.
  - Enrage timers are mostly unobserved in the sample wipes.
  - Nymrissa has no detection module, so its context has no forced
    windows.
- **Not judged or not valued:**
  - drift on cooldowns with no direct damage (Combustion, Bestial Wrath,
    Breath of Eons) or whose damage logs under another ID (Halo): found,
    marked inference, not valued
  - Augmentation's support damage in the rDPS split
  - Frost Mage's window (Icy Veins wasn't cast in the samples)
  - overcap for resources logged only on spenders (Holy Power, Soul
    Shards, Essence); Energy and Focus waste is mostly invisible
  - shields that expire unused
- **Data slack:**
  - A few non-DoT debuffs pass the enemy-debuff filter (Rune of
    Lingering, Banish, Mortal Coil) because they share an ID with
    something a spec casts.
  - On-GCD inference needs 5+ casts, so rare abilities are unknown.
  - Cooldown recasts are the shortest measured interval, an upper bound,
    so drift errs lenient.
  - Subtlety's Energy-cap gain estimate includes regen.

### Statics analysis

- **Mechanic anchors missing** for the Kefka Says instructions, the
  generic Damage Down splits and every Venomous Abyss boss. Those fall back
  to phase exposure, or pull exposure on bosses without log phases.
- **Values never tuned with the user:** death-chain gap 10s and end window
  15s (`lib/static-review-data.ts`), a trend needs 5+ chances
  (`MIN_CHANCES`), "first vs last" compares 3 sessions
  (`COMPARE_SESSIONS`).

## App

- **Statics:**
  - Importing a different log keeps the previous report's VOD list on
    screen, and it gets saved into the new session.
  - Sessions are ordered by `addedAt`, so out-of-order imports show dates
    that don't ascend.
  - The MVP pedestal ranks by raw counts rather than per-pull rates.
- **Severity picker.** `AddErrorDialog`'s picker is a native `<select>`, so
  it shows text only, with no icons.
- **Stale reference.** The `lib/spec-data.ts` comment near line 165
  references the dead `ckreviewv9.png`.

## Workflow backlog (deferred ideas, in recommended order)

1. **A `/build-boss-detection` skill** — see the plan below.
2. **A reusable "review pull" command/skill.** It would take the user's
   VOD account, run the harness on that pull, propose the narrowest fix,
   and record the ruling. Same mechanism as item 1.
3. **Fixture curation.** Keep the smallest set of reports that exercises
   every rule's known failure modes.
4. **Baselines for cross-pull strategy output** (Black Hole lanes, kick
   chains) in `expectations/`. Do this only if a regression slips through.
5. **npm script aliases** (`npm run check`).

### Plan: a `/build-boss-detection` skill

**What a skill is.** A skill is a folder in the repo, `.claude/skills/<name>/`,
holding a `SKILL.md` file: a short description at the top plus
instructions in plain Markdown. Claude Code lists every skill's
description at the start of a session. When the user types `/<name>` (or
asks for something the description matches), the full instructions load
into that session and the agent follows them. It is a saved, versioned
prompt that lives with the code. Committing it means every future session,
and anyone who clones the repo, gets the same procedure. A skill can also
ship helper files (checklists, templates) next to `SKILL.md`, which it
reads only when needed.

**Why it helps here.** Today a new session has to find and read
CLAUDE.md, lib/mechanics/README.md (~45KB, mostly per-boss lessons),
the research guide and dev-tooling before it knows the procedure. The
skill would hold only the procedure, in order, and point to the long docs
for reference. The kickoff prompt becomes:
`/build-boss-detection https://www.warcraftlogs.com/reports/<code> <Boss>`.

**Rough implementation:**
1. Create `.claude/skills/build-boss-detection/SKILL.md` with a description
   such as "Build per-pull mechanic detection for a new WoW/FFXIV boss from
   a report URL", and arguments: the report URL and the boss name.
2. Body: the checklist, each step naming the exact command.
   - Read the boss module's research header; ask the user whether they have
     raid assignments or a raid plan (see CLAUDE.md).
   - Fetch in the background: `fetch-wow-report.js <url> --boss "<Boss>"`.
   - `analyze-report.js`: `pulls`, `sweep`, `timeline` of the kill, `deaths`,
     then `hits`/`bursts`/`soakers`/`adds` per mechanic.
   - Write the VERIFIED section with the wipe survey; build rules using
     `wow/common.ts` helpers and `pullOverMarker`.
   - Register in `wow/registry.ts`; `validate.js --check`, then `--update`
     for the new report; `tsc --noEmit`.
   - Update the README lessons, the research-guide lessons and open-items;
     check the diff for player names; commit and push; report cutoffs and
     questions.
3. Move the per-boss "Lessons from ..." sections out of the README into a
   `lessons.md` next to the skill, distilled into a checklist of pitfalls.
   The skill reads it at the verification step.
4. Try it on the next boss, then fix whatever step the session stumbled on.

The same pattern fits the backlog's item 2 (`/review-pulls` for a night's
VOD notes) and a `/research-boss` skill for the model-writing stage.

CI was explicitly rejected: sample data and expectations are local by
design.
