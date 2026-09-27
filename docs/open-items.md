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

### Midnight Falls (WoW)

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
- **Mitigation:**
  - Paused.
  - Next threads: one player showing 0/12 on the Heatmap, and the user's
    color-scale and grouping feedback once they've used it.

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
