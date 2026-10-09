// lib/mechanics/ffxiv/arcadion/lindwurm-1.ts
//
// -- GUIDE-DERIVED MODEL: LINDWURM (M12S P1) --
// AAC Heavyweight M4 (Savage), Arcadion, patch 7.4; door boss only.
// Research checked 2026-10-08. Comments only; no detector registered.
// No report analyzed: every proposed LOG SIGNAL is guide-inferred.
// After the transition, lindwurm-2.ts owns Lindwurm II and its checkpoint.
// Selected plan: Modified 3VJ0 / Role Mortal Slayer. The strategy board
// identifies its P1 as Toxic/Shabin with role-based Mortal assignments.
// P2 choices and the user's Static Staging Rep2 belong in lindwurm-2.ts.
//
// -- SOURCES AND CONFIDENCE --
// [W] Selected strategy board, diagrams and role selectors inspected:
//     https://wtfdig.info/74/m12s#modified:::bc:dnuptime
//     Modified 3VJ0 text linked there (text fetch unavailable):
//     https://pastebin.com/qXLm3VJ0
// [T] Toxic P1, including cardinal/intercardinal platform diagrams:
//     https://raidplan.io/plan/44JJjqZ6Mcgaxnnn
// [R] Selected Role Mortal Slayer, linked from W:
//     https://raidplan.io/plan/KbxeCHoPkzWbt_HB
// Kitten ERP's authored explanations; its JP assignments are alternatives:
// [K0] https://kitten-erp-guides.moe/savage/m12s_p1
// [KM] https://kitten-erp-guides.moe/savage/m12s/mortal_slayer
// [K1] https://kitten-erp-guides.moe/savage/m12s/act_1
// [K2] https://kitten-erp-guides.moe/savage/m12s/act_2
// [K3] https://kitten-erp-guides.moe/savage/m12s/act_3
// [KC] https://kitten-erp-guides.moe/savage/m12s/curtain_call
// [KS] https://kitten-erp-guides.moe/savage/m12s/slaughtershed
// [IV] Lyra's original door-boss guide, January 2026:
//      https://www.icy-veins.com/ffxiv/aac-heavyweight-m4-door-boss-savage-raid-guide
// [TL] A'rhaeda Vhil, updated 2026-05-19; provisional hit/apply clock:
//      https://thaliak.com/raids/m12s1/
// [ID] Original Splatoon Mortal script, game IDs rather than FFLogs proof:
//      https://raw.githubusercontent.com/PunishXIV/Splatoon/refs/heads/main/SplatoonScripts/Duties/Dawntrail/M12S%20P1%20Mortal%20Slayer.cs
// No confirmed mechanic-changing hotfix established in this research.
// Exact damage, aura durations and later-patch behavior need log evidence.
// Source disagreements are collected under OPEN QUESTIONS, not resolved
// by treating one guide's terminology as an observed event.
//
// -- SEVERITY AND LOG VOCABULARY --
// README's FFXIV exception: attributable Damage Down is Major even alive.
// Other avoidable, healable damage is Minor unless it causes death/loss.
// Major names the root-cause player; Raid marks an inevitable wipe and
// may be player-less. An unknown offender is not an attributed Major.
// In the failure blocks below, "escalates" means death, Damage Down or
// demonstrated pull loss. Receiving a clip is not proof of victim fault.
// Missing partners after an earlier death are fallout, not fresh errors.
// Player damage gives the victim's position, not the cone/orb controller's.
// Visual blobs, facing, tether pairs and objects may be absent from logs.
// Cast, damage, penalty and aura IDs are separate. Names below are search
// terms; none has a verified FFLogs ID or removal signature in this model.
// Auras: Directed/Bursting/Shared Grotesquerie, Mitotic Phase, Rotting Flesh,
// Bonds of Flesh Alpha/Beta, Unbreakable Flesh Alpha/Beta, In Line I-IV,
// Poison Resistance Down II, Magic Vulnerability Up, Bind, Damage Down.
// Greek Alpha/Beta may appear as symbols in the ability table.
//
// -- SHAPE AND REFERENCE CLOCK --
// Rectangular arena; wall boss to true north. Auto-attacks pressure the
// first TWO enmity holders. Forced movement and missing islands can kill
// without a conventional killing blow. Boss forms are not killable adds.
// Timed acts; no established player-driven energy/resource mechanic.
// [TL] Approximate mm:ss from P1 pull start, hit/apply rather than cast
// start. These are research anchors, not detector timing tolerances:
//   00:16 The Fixer; 00:41/44/47/50 Mortal Slayer's four orb waves.
//   01:10 Act 1 auras; 01:20-25 four puddle baits; 01:28 Reach;
//   01:29 spread/cones/stack; 01:37 Burst; 01:38 busters + stack.
//   01:48 Fixer; 02:00 Act 2 auras; 02:15 Cruel Coil;
//   02:21-51 seven Skinsplitters; 02:27-42 chains; 02:33-49 towers;
//   02:57 Constrictor; 03:09 Splattershed.
//   03:26 Act 3 auras; untargetable 03:29-42; 03:33 islands;
//   03:37 platform collapse; 03:39 spreads/towers;
//   03:49 Split Scourge; 03:52 Venomous Scourge; 04:01 Fixer.
//   04:13 Curtain Call; 04:17-25 five puddle baits;
//   04:28 Reach + spreads; ~04:38 tether breaks; 04:41 Burst.
//   04:50 Splattershed; 05:16/19/22/25 second Mortal orb waves.
//   ~05:43/06:12/06:41 three Slaughtershed cycles.
//   ~07:14-19 failed check or successful Refreshing Overkill transition.
// MT/OT = tanks; H1/H2 = healers; M1/M2 = melee; R1/R2 = ranged.
// Supports = MT, OT, H1, H2. DPS = M1, M2, R1, R2. Numeric markers in
// the selected drawings are positioning aids, not logged assignments.
//
// -- THE FIXER, SPLATTERSHED AND ORDINARY TANK DAMAGE --
// What happens: repeated unavoidable raid damage; two-tank auto pressure.
// Correct play: party mitigation/healing and two controlled enmity slots.
// Failure: non-tank takes ordinary autos -> LOG SIGNAL: consecutive boss
//   autos on a non-tank while both tanks live; FAULT: only established by
//   enmity/swap evidence, otherwise unknown; CONSEQUENCE: Minor, escalates.
// Failure: raidwide kills -> LOG SIGNAL: Fixer/Splattershed deaths;
//   FAULT: not determined by deaths alone; CONSEQUENCE: Raid only if lost.
// Not errors: unavoidable hits or deaths already caused by a prior mistake.
//
// -- MORTAL SLAYER: ROLE BAITS, TWICE [KM, R] --
// What happens: eight orbs in four two-orb waves, ~3s apart. Each arena
// half receives four; six green and two purple, both purple on one half.
// An orb chooses a nearby eligible player; a simultaneous same-side pair
// needs two distinct baits. The upper orb takes the closer bait in R's
// diagram. Each hit is a small AoE and applies Poison Resistance Down II.
// Correct play: supports take the purple half: MT first purple, OT second;
// H1 first green, H2 second. DPS take the all-green half M1, M2, R1, R2
// in order. Separate the paired baits so one player's AoE cannot hit the
// other. Purple hits require substantial mitigation; one orb per player.
// Failure: bait steals another orb -> LOG SIGNAL: a second orb damage hit
//   under Poison Resistance Down II; FAULT: overlapping/repeated bait if
//   assignment and position establish it; CONSEQUENCE: Major if lethal.
// Failure: carrier clips a neighbor -> LOG SIGNAL: extra same-wave orb
//   recipients and vulnerability/death; FAULT: misplaced bait, not every
//   damaged recipient; CONSEQUENCE: Minor, escalates.
// Failure: no eligible living bait -> LOG SIGNAL: missing intended soak
//   plus raid penalty, exact penalty name unknown; FAULT: assigned living
//   bait only if established; CONSEQUENCE: Raid if the result is terminal.
// Removal: resistance debuff normally expires. Death removal does not
// prove a successful soak; absence of a death-time orb hit is unresolved.
// Not errors: eight intentional hits, purple mitigation, green hits on
// supports. JP H/M/R flex priorities are valid alternatives to Role.
// Candidate IDs [ID]: cast/begincast 46229; action-effect/damage 46230 and
// 46232, color mapping UNKNOWN. Actor data IDs 19200 purple / 19201 green
// are object identifiers, not spell IDs. Game action != proven FFLogs ID.
//
// -- GROTESQUERIE ACT 1 [K1, T] --
// What happens: all eight get a body-relative Directed Grotesquerie cone,
// whose direction rotates with facing. One role gets four Bursting
// Grotesquerie spreads; the other has one Shared Grotesquerie four-person
// stack. Hemorrhagic Projection = cones; Dramatic Lysis = spreads;
// Fourth-wall Fusion = stack. Four Phagocyte Spotlight puddle baits precede
// Ravenous Reach's one-sided cleave. Five flesh blobs grow then Burst.
// Correct play: Toxic route NW/1 -> A -> center, leaving successive baits.
// Reach safe side determines the spread/stack corner. Supports and DPS
// each use MT/OT/H1/H2 or M1/M2/R1/R2 north-to-south order respectively.
// Spread role separates; stack role uses safe corner 1 or 2. Face each
// personal cone away from others, then occupy the gap between blob bursts.
// Follow-up: Visceral Burst hits both top-enmity tanks; Fourth-wall Fusion
// stacks the six non-tanks. Tanks can stack their busters away from the
// party under mitigation: this buster does not impose a separating vuln.
// Failure: wrong facing -> LOG SIGNAL: extra Hemorrhagic Projection hits;
//   FAULT: cone owner if identifiable, otherwise unknown; CONSEQUENCE:
//   Minor, escalates. Victim positions alone do not establish facing.
// Failure: spread overlaps or stack splits -> LOG SIGNAL: extra Dramatic
//   Lysis recipients or lethal small Fourth-wall Fusion group; FAULT:
//   misplaced carrier/missing assigned helper with evidence; CONSEQUENCE:
//   Minor, escalates; Raid when too many die to finish the sequence.
// Failure: puddle/Reach/Burst clip -> LOG SIGNAL: corresponding avoidable
//   damage, Damage Down or death; FAULT: mover, or bait owner if misplaced
//   puddle caused it; CONSEQUENCE: Minor, escalates.
// Removal: ordinary Grotesquerie expiry launches its attack; death-time
// removal/early explosions are not established by the guides inspected.
// Not errors: cone owner's own resolution, spread's own hit, split stack,
// mitigated double-tank busters and planned six-player Fusion damage.
//
// -- GROTESQUERIE ACT 2: GLOOPER [K2] --
// What happens: role-separated Alpha/Beta chain pairs, each numbered
// In Line I-IV. Bonds of Flesh becomes Unbreakable Flesh when its timer
// resolves; four ordered breaks. Alpha has four sequential blob towers;
// Beta leaves four towers at its break locations. Eight total one-player
// soaks, one per player. Cruel Coil pulls/binds the party inside; its gap
// moves 90 degrees between ~5s Skinsplitters. Constrictor ends the section.
// Correct play: compact center until chains form; Alpha leaves through
// the opening, Beta takes its opposite inside position. Break I/II/III/IV.
// Tower order is III/IV/I/II: number I soaks tower 3, II tower 4, III tower
// 1, IV tower 2. Beta's placement must leave its towers reachable by the
// later assigned soakers; a player cannot simply soak their own fresh
// tower while locked out. Both roles follow the moving opening and leave
// the coil before Constrictor. Breaks cause Dramatic Lysis and temporary
// magic vulnerability; tower soaks cause poison resistance vulnerability.
// Failure: early/late/wrong-location break -> LOG SIGNAL: break damage or
//   chain removal outside the expected numbered sequence, then missing
//   tower/overlap; FAULT: chain controller if timing/position is proven;
//   CONSEQUENCE: Minor, escalates; Raid on unsolvable subsequent towers.
// Failure: tower missed/repeated -> LOG SIGNAL: absent assigned tower hit
//   plus raid penalty, or second tower hit under resistance vulnerability;
//   FAULT: assigned living soaker if tower identity known; CONSEQUENCE:
//   Major on death; Raid on an unrecoverable miss. Penalty name unknown.
// Failure: retained chain -> LOG SIGNAL: Unbreakable Flesh persists into
//   penalty damage/death; FAULT: failed breaker unless partner already
//   died; CONSEQUENCE: Major if lethal, Raid if required towers impossible.
// Failure: coil collision/remaining inside -> LOG SIGNAL: Skinsplitter
//   hit, knockback/Damage Down, or Constrictor death; FAULT: mover with
//   position evidence; CONSEQUENCE: Major on Damage Down/death.
// Removal: normal distance break resolves the chain; forced death removal
// may strand the partner. Debuff removal alone cannot identify a break.
// Not errors: forced pull/Bind, break damage, one tower hit, its temporary
// vulnerability. Alternate clockwise priorities can change assignments.
//
// -- GROTESQUERIE ACT 3: PLATFORM PROJECTIONS [K3, T] --
// What happens: eight Mitotic Phase marks in four world-cardinal blob
// directions, two per direction, one support/one DPS. Facing does NOT
// rotate this direction. Feral Fission/Grand Entrance creates four islands,
// cardinal or intercardinal; Bring Down the House removes connecting floor.
// Eight Dramatic Lysis spreads project eight Metamitosis towers onto other
// islands; brief Bind fixes the launch locations. Boss is temporarily gone.
// Correct play: take the island opposite your blob; for intercardinals,
// rotate that choice clockwise 45 degrees: N blob -> SW, E -> NW,
// S -> NE, W -> SE. Selected cardinal island corners:
//   N/S island: support NW corner, DPS SE corner.
//   E/W island: support SW corner, DPS NE corner.
// Selected intercardinal islands: support SW corner, DPS NE corner.
// These launch spots align each projection with its opposite-role partner's
// later tower. Spread while launching, then soak the arriving partner tower.
// Follow-up: two closest-player Split Scourge line busters, then Venomous
// Scourge on three eastmost and three westmost players. Tanks bait the
// northern lines and move central to exclude themselves from the six
// spreads. Tank invulnerability covering both hits is another valid plan.
// Failure: bad launch or wrong tower -> LOG SIGNAL: missing Metamitosis
//   soak/raid penalty; FAULT: launch owner vs soaker only with projection
//   identity and positions, otherwise unknown; CONSEQUENCE: Raid if lost.
// Failure: spread/line overlap -> LOG SIGNAL: extra Dramatic Lysis, Split
//   Scourge or Venomous Scourge recipients; FAULT: misplaced carrier/bait
//   if proven; CONSEQUENCE: Minor, escalates.
// Failure: fall during collapse -> LOG SIGNAL: death at missing floor,
//   possibly no killing ability; FAULT: mover if position proves it;
//   CONSEQUENCE: Major, or prior forced-movement fallout.
// Removal: Mitotic Phase expires into spread/projection; tower completion
// is a separate hit. Death-created/suppressed projections remain unknown.
// Not errors: own spread/tower hits, downtime, tank invuln double hits.
//
// -- CURTAIN CALL: INTENTIONAL CLEAVE AND CHAINS [KC, T] --
// What happens: five Spotlight baits. Four players of one role get Rotting
// Flesh, the opposite four Bursting Grotesquerie. Ravenous Reach removes
// Rotting Flesh through intentional contact, producing Cell Shedding
// spreads; Bursting players avoid Reach and spread their Dramatic Lysis.
// Then eight Bonds of Flesh Alpha holders form four cross-role chains;
// there is no Beta set here. Five new blobs Burst after distance breaks.
// Correct play: Toxic NW route; cardinal floor uses the north arc,
// intercardinal floor loops around NW island. Rotting holders separate
// INSIDE the Reach side; Bursting holders separate on the safe side.
// All regroup center until chain snapshot, then supports west / DPS east
// in role order north-to-south. Separate chain explosions, then avoid blobs.
// Failure: uncleansed Rotting Flesh -> LOG SIGNAL: retained aura past
//   Reach followed by penalty/death; FAULT: living holder who missed Reach;
//   CONSEQUENCE: Major on death/Damage Down. Guides disagree on penalty.
// Failure: wrong role takes Reach -> LOG SIGNAL: Reach damage without
//   Rotting Flesh, penalty/death; FAULT: mover; CONSEQUENCE: escalates.
// Failure: spread/break clips partner -> LOG SIGNAL: extra Cell Shedding
//   or Dramatic Lysis hits; FAULT: misplaced carrier/breaker with evidence;
//   CONSEQUENCE: Minor, escalates; Raid for terminal chain loss.
// Removal: Reach cleanses Rotting Flesh; ordinary expiry is failure, not
// successful cleanse. Alpha distance break resolves chain; partner death
// can leave no achievable break. Death-time spread behavior is unverified.
// Not errors: Rotting holders' Reach hits, Cell Shedding, chain explosions.
//
// -- SLAUGHTERSHED: THREE CYCLES [KS] --
// What happens: raidwide, five growing blobs, four role spreads and one
// opposite-role four-player Fusion stack, then two arm attacks. Regrowth
// order previews which attack goes first. NW/NE are usable spread/stack
// regions: smaller region containing a blob = stack, larger region = spread.
// Dragon arms: Serpentine Scourge opposing half-room hits; begin on the
// second-grown arm's side then cross. Hand arms: Raptor Knuckles two corner
// knockbacks; begin at first-grown hand then move back for the second.
// Knockback immunity is valid. Burst still constrains the final safe spots.
// Failure: arm/blob contact -> LOG SIGNAL: Serpentine Scourge/Burst damage
//   or Raptor Knuckles fall; FAULT: mover if geometry proves it;
//   CONSEQUENCE: Minor, escalates.
// Failure: wrong stack/spread region -> LOG SIGNAL: spread clips or lethal
//   small Fusion; FAULT: misplaced living carrier/helper if established;
//   CONSEQUENCE: Minor, escalates; Raid if terminal.
// Removal: spread/stack markers resolve normally; regrowing arms are boss
// objects, not adds the party must kill. Death-time markers unknown.
// Not errors: opening raidwide, own spreads, stack share, safe knockbacks.
//
// -- PULL END AND EXPECTED TRANSITION --
// P1 is a timed damage check. TL describes failure to reach 15% by ~07:08
// as untargetability -> lethal Fixer ~07:14, and Refreshing Overkill at
// ~07:19 as successful transition only after reducing the boss to 1 HP.
// IV places enrage about 07:17. Exact gates need verification; transition
// damage and scripted untargetability alone are not evidence of failure.
// Successful transition enters P2's checkpoint, with a separate phase
// clock. A P2 wipe normally restarts Lindwurm II, not this door boss.
// Potential terminal failures: missing mandatory orbs/towers, chain loss
// making later towers impossible, collapse falls, or multi-player spread
// kills. Raid cutoff belongs to the first irreversible consequence, not
// every subsequent expected death. Enrage is Raid, without invented blame.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Which casts/damage/aura IDs and NPC instances represent each form,
//    orb color, tower, cone and chain? Are candidate game IDs unchanged?
//    What are the distinct unsoaked-orb and unsoaked-tower penalty names?
// 2. Which actions apply Damage Down? Confirm resistance/lockout durations,
//    repeated-hit lethality and whether purple orbs bypass invulnerability.
// 3. Does ordinary vs death/dispel aura removal launch Grotesquerie,
//    Mitotic Phase or chain explosions? Can dead partners strand chains,
//    and do their pending projections still create towers?
// 4. Act 2 guides disagree on clockwise vs counterclockwise gap movement
//    and cardinal vs intercardinal gaps. What geometry and chain-expiry
//    penalty does the current patch actually log?
// 5. Is missed Rotting Flesh lethal or Damage Down? What event proves
//    cleansing, and is Cell Shedding distinct from generic Dramatic Lysis?
// 6. Are blob/facing/projection/tether identities captured? What positional
//    tolerance is valid for these Toxic corners? With no visual identity,
//    which errors can name a player rather than remain player-less?
// 7. Confirm exact P1 HP/time gates, failed Fixer vs successful Refreshing
//    Overkill IDs, P1/P2 encounter splitting and checkpoint reset signatures.
