// lib/mechanics/ffxiv/arcadion/lindwurm-1.ts
//
// Lindwurm (M12S door boss) per-pull rules. Entry point: detectLindwurmErrors.
// Self-gates on the boss's signature casts. FFLogs logs Lindwurm II as its
// own fight ("Lindwurm II"), which stays on the fallback model.
//
// -- VERIFIED AGAINST LOGS (2026-10-12) --
// Week-2 progression of several roster configurations testing different
// strategies (user: "will likely not follow the strategy perfectly"), so
// rules judge outcomes, not the selected plan's spots. 108 pulls, cited as
// A23 +2:33 (report letter, pull, mm:ss from pull start):
//   A = QwNrFkGZ4m1yKpXC (90 wipes, furthest 7:01),
//   B = H9fnVZgPA3krpCzY (first kill B3, 7:17; 4 enrages),
//   C = vFY7kHVWK19ZQ24A (kill C1, 7:13),
//   D = AYQm9Kd8Ct4FxcGp (32 wipes, kill D32; D33 is the Lindwurm II reset
//       logged under this name, which lindwurm-2.ts owns).
// Hemorrhagic Projection casts carry the owner's facing
// (sourceResources.facing), but players' own facing isn't logged near the
// cast, so ownership comes from the cast positions (D, 2026-10-14).
// B4 and C2 are Lindwurm II checkpoint stubs logged under this fight's name
// (Refreshing Overkill at +0:01, then a reset): no signature cast, no errors.
// Slots (user): roles.ts as-is. The Act 2 alpha/beta split was NOT by role
// in report A, so it is read from the Bonds debuffs, never from roles.
//
// Clock (both kills, every pull within ~1s): Fixer +0:16, Mortal Slayer
// orbs +0:41/44/47/50, Act 1 +1:10 (spotlights +1:18..+1:26, cones/spreads/
// stack +1:29, Burst +1:38, Visceral Burst + six-player Fusion +1:38),
// Fixer +1:48, Act 2 +2:00 (Cruel Coil +2:15, chains break +2:27/+2:32/
// +2:37/+2:42 pair I-IV, towers +2:33..+2:50, Constrictor +2:57), Splatter-
// shed +3:09, Act 3 +3:26 (Grand Entrance +3:33, Bring Down the House
// +3:37, spreads + Metamitosis towers +3:39), Split Scourge +3:49, Venomous
// Scourge +3:52, Fixer +4:01, Curtain Call +4:13 (Reach +4:28, chains break
// +4:36), Splattershed +4:50, Mortal Slayer +5:16..+5:25, Slaughtershed
// +5:40/+6:09/+6:38 (Serpentine Scourge or Raptor Knuckles after each),
// Refreshing Overkill +7:17: unfinished in the kills, lethal enrage in B1,
// B9, B14, B15 (+7:24).
//
// Log IDs:
// - Damage Down causes (every one, all reports): Burst 46239, Phagocyte
//   Spotlight 46238, Dramatic Lysis 46261, Skinsplitter 46398, Bring Down
//   the House 46244/46245/46246, Grand Entrance 46243, Ravenous Reach 46237,
//   Serpentine Scourge 47548, Cell Death 46253. Grand Entrance 46240 and
//   Phagocyte Spotlight 46262 only ever killed. Constrictor 46274 always
//   killed (7 deaths).
// - Mortal Slayer: green 46230, purple 46232, both cast-targeted at their
//   bait, sharing a caster and instance numbers (keyed by ability too).
//   The wave pairs are not in a fixed role order (B3 opens on the H2 and MT,
//   B3's second set on both healers), so no assignment check.
// - Act 1: Hemorrhagic Projection 46255 cones hit nobody in either kill.
//   The cone's cast sits on its owner (within 0.1y when the position is
//   fresh, B1/B2); its cast target, when present, is the VICTIM. Dramatic
//   Lysis 46250 = Bursting spreads (4); Fourth-Wall Fusion 46254 (4) and
//   47545 (the six non-tanks); Visceral Burst 46294 on both tanks.
// - Act 2: In Line I-IV 1003004/1003005/1003006/1003451 name the four pairs;
//   Bonds of Flesh alpha 1004752 / beta 1004754 turn into Unbreakable Flesh
//   1004753/1004755, and ~3s later the break hits both partners with
//   Dramatic Lysis 46260 (one instance each) plus Magic Vulnerability Up.
//   An Unbreakable chain that isn't stretched pulses Dramatic Lysis 46261
//   on the pair (~1.1s apart, each with Damage Down) until it breaks; never
//   in a kill. Towers: Roiling Mass from Blood Vessel #1-#8, cast-targeted
//   at the soaker: #1-2 In Line III, #3-4 IV, #5-6 I, #7-8 II, odd 46263 =
//   alpha, even 46259 = beta (every clean tower in all three reports; only
//   broke after deaths or early breaks, A8, A11, A50). An empty tower casts
//   with no target and Unmitigated Explosion 46258 + Sustained Damage
//   1004149 hit the raid ~1s later.
// - Act 3: Mitotic Phase 1004764 on all eight; Dramatic Lysis 46256. A
//   player's own spread hits them for 0-36k; another's for 170-300k, which
//   killed in every case. Metamitosis 47395 towers are cast-targeted at
//   their soaker; empty ones explode as 46258 too.
// - Split Scourge 46251 (two tank lines), Venomous Scourge 46248 (six
//   non-tank spreads), Cell Shedding 46252 and Slaughtershed's Dramatic
//   Lysis 46292 / Fusion 46293 are all cast-targeted.
// - Curtain Call: Rotting Flesh 1004763 holders take Ravenous Reach (the
//   cleanse) and then Cell Shedding; Reach on anyone else gives Damage Down
//   (A28 and A76 a Bursting holder). The eight chains break ~0.3s apart and
//   reuse explosion instance numbers (B3 +4:36).
// - Refreshing Overkill 46393/46394 = the timed check; it killed the raid
//   at +7:24 in all four enrages.
//
// Failure findings:
// - First deaths: Act 1's +1:29 resolution (cones, spreads and the stack
//   at once) and Mortal Slayer's first set dominate report A; Act 2 towers
//   ended 18 pulls and Act 3's towers 18 more.
// - Mortal Slayer overlaps: two baits on top of each other (both took both
//   orbs, A6, A25, B2 +5:16) or one blast catching a neighbour (B9 +0:41
//   the DRK's purple killed the SGE). Orbs retarget once anyone is dead.
// - Act 3: an empty Metamitosis tower nearly always came with spread
//   overlaps and falls in the same second (the layout failed as a whole);
//   only A69/A73 left exactly as many free players as empty towers.
// - No killing blow: falls with the collapsing floor 2.1s after Bring Down
//   the House (A15, A40), Raptor Knuckles knock-offs 2.4-2.9s after the
//   knockback (B3 twice in the kill, six at once in A74), called wipes,
//   and C1 +6:21 (the GNB at full HP, nothing near: unexplained).
// - Not seen: Rotting Flesh left on except once (B12 +4:31 Cell Death).
//
// Cutoffs (first Raid error): collapse 42, called wipe 21, Act 2 tower 18,
// Metamitosis 18, enrage 3, party knocked off 2; the kills have none.
//
// -- RULES IMPLEMENTED --
// ffxiv-lw1-avoidable (Major on Damage Down or death, else Minor): AVOIDABLE.
//   Ravenous Reach on a Rotting Flesh holder is the cleanse, not an error.
// ffxiv-lw1-cone: a Hemorrhagic Projection cone that hit someone names the
//   players standing on its cast (CONE_OWNER_MAX), never a victim. Players
//   standing together are split by pairing every cast one-to-one with the
//   players on them (least total distance; D18: the PLD's cast 0.3y from him,
//   the stacked healers' 0.2-0.5y); still tied = all named; no position =
//   player-less Minor. Major when a victim died within 3s (to the cone or
//   their own spread on top of it).
// ffxiv-lw1-orb / -overlap / -chain-clip (Major if anyone involved died to
//   it): one-bait-per-player families (PERSONAL). A player hit by another
//   player's instance or by two names the victim and the owner (cast target,
//   else the hit player whose aura ended there, else the only player hit).
//   Orbs only with all eight alive; the four waves count as one resolution;
//   players who baited no orb and tanks hit by a green are named instead of
//   whoever caught the leftovers (mortalSlayerBlame). Split Scourge: a tank
//   whose line hit non-tanks is named alone. Act 2 chain clips: the breaker
//   whose explosion hit players of other lines is named alone (Major: the
//   Magic Vulnerability Up makes their next tower lethal); victims within
//   ACT2_CENTER of the center aren't named, those elsewhere stay candidates.
//   Spread overlaps another rule already blames (Act 1 stack taken away,
//   Act 3 launch off its spot) aren't repeated.
// ffxiv-lw1-chain-clip "Left the Center Out of Turn" (Minor): at the first
//   chain break an In Line II or IV player more than ACT2_CENTER out.
// ffxiv-lw1-stack (Major): a Fusion stack that killed someone names living
//   eligible players more than 6y away; skipped with 3+ dead. Act 1: when
//   those absent players stood together (STACK_GROUP_MAX) and the Shared
//   Grotesquerie holder was more than 6y from them, the holder took it away
//   and is named instead.
// ffxiv-lw1-buster: a non-tank in Visceral Burst with both tanks up.
// ffxiv-lw1-chain (Major on Damage Down/death): Dramatic Lysis 46261 pulses
//   on an Act 2 pair name the partner who connected far from the center
//   (CHAIN_FAR), else a beta off the center (CHAIN_OFF_CENTER), else both;
//   nobody when a partner was dead before the chain connected.
// ffxiv-lw1-tower: an empty Act 2 tower names its In Line soaker (Major)
//   when alive and the order held, else player-less; a second player in a
//   tower; Raid at the first empty tower whose explosion and DoT killed 3+.
// ffxiv-lw1-metamitosis: empty Act 3 towers name the living non-soakers
//   only when they match the empty count (1-2), narrowed to whoever launched
//   off the clean spots (LAUNCH_SPOTS); else player-less; Raid at 3+ deaths.
// ffxiv-lw1-fall (Major): no-killing-blow deaths outside a called wipe:
//   knocked off by Raptor Knuckles, fell with the floor, or unexplained;
//   4+ off one knockback also add a player-less Raid. Deaths right after an
//   avoidable hit are that hit's error.
// ffxiv-lw1-enrage, -called-wipe (3+ unexplained no-killing-blow deaths in
//   10s, 2 within 5s, or any within 12s of the end), -collapse (5 dead, pull
//   over within 45s): Raid, only before any other Raid.
// VOD review 2026-10-12 (user): report A pulls 8, 25, 35, 50, 69, 74, 76,
// 85, 90, rulings in expectations/rulings.json.
// VOD review 2026-10-14 (user): report D = AYQm9Kd8Ct4FxcGp (33 pulls, kill
// D32 7:17) pulls 1, 7, 8, 11, 13, 18, 32, 33, rulings in
// expectations/rulings.json. Left unruled (the user couldn't tell): D18's
// cone on the SGE (named on the AST by the pairing), D8's other mistakes.
// Both healers dead is a cutoff for every FFXIV fight (ffxiv/common.ts).
// Exposure (rule-meta.ts): -buster targets the non-tanks, -chain each
// Unbreakable pair, -tower each tower's In Line soaker; the rest everyone.
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
//
// Not built: Mortal Slayer / Act 1 / Act 3 role-order assignments (the
// groups varied their plan); tank deaths to their own purple orb or busters
// (mitigation); The Fixer deaths (healing); Raptor Knuckles / Serpentine
// first-arm reads.
//
// -- GUIDE-DERIVED MODEL: LINDWURM (M12S P1) --
// AAC Heavyweight M4 (Savage), Arcadion, patch 7.4; door boss only.
// Research checked 2026-10-08, before any report was analyzed: the log
// signals below are the researcher's hypotheses. VERIFIED AGAINST LOGS
// above wins every disagreement.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { yd, kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals } from "@/lib/mechanics/wow/common";
import { findPlayerPosition, interpolatePlayerPosition } from "@/lib/mechanics/player-position";

export const LW1_AVOIDABLE_RULE_ID   = "ffxiv-lw1-avoidable";
export const LW1_CONE_RULE_ID        = "ffxiv-lw1-cone";
export const LW1_OVERLAP_RULE_ID     = "ffxiv-lw1-overlap";
export const LW1_ORB_RULE_ID         = "ffxiv-lw1-orb";
export const LW1_CHAIN_CLIP_RULE_ID  = "ffxiv-lw1-chain-clip";
export const LW1_STACK_RULE_ID       = "ffxiv-lw1-stack";
export const LW1_BUSTER_RULE_ID      = "ffxiv-lw1-buster";      // the non-tanks' side of Visceral Burst
export const LW1_CHAIN_RULE_ID       = "ffxiv-lw1-chain";       // the Unbreakable pair
export const LW1_TOWER_RULE_ID       = "ffxiv-lw1-tower";       // each Act 2 tower's In Line soaker
export const LW1_METAMITOSIS_RULE_ID = "ffxiv-lw1-metamitosis";
export const LW1_FALL_RULE_ID        = "ffxiv-lw1-fall";
export const LW1_ENRAGE_RULE_ID      = "ffxiv-lw1-enrage";
export const LW1_COLLAPSE_RULE_ID    = "ffxiv-lw1-collapse";
export const LW1_CALLED_WIPE_RULE_ID = "ffxiv-lw1-called-wipe";
// ── log IDs (see VERIFIED AGAINST LOGS) ─────────────────────────────────────

// Grotesquerie: Act 1/2/3/Curtain Call, Mortal Slayer, The Fixer.
const SIGNATURE        = [48829, 48830, 48831, 48832, 46229, 46295];
const DAMAGE_DOWN      = 1002911;
const WALKING_DEAD     = 1000811; // Dark Knight's Living Dead follow-up
const WALKING_DEAD_FULL_MS = 9500;
const BURSTING         = 1004761; // Bursting Grotesquerie (Act 1 / Curtain Call spreads)
const MITOTIC          = 1004764; // Mitotic Phase (Act 3 spreads)
const ROTTING          = 1004763; // Rotting Flesh (Curtain Call; Ravenous Reach cleanses it)
const BONDS_A          = 1004752;
const BONDS_B          = 1004754;
const UNBREAKABLE      = [1004753, 1004755]; // Unbreakable Flesh alpha / beta
const IN_LINE: Record<number, number> = { 1003004: 1, 1003005: 2, 1003006: 3, 1003451: 4 };
const GREEN_ORB        = 46230; // Mortal Slayer, the healers' and DPS's orbs
const PURPLE_ORB       = 46232; // Mortal Slayer, the tanks'
const ACT2_CAST        = 48830;
const ACT3_CAST        = 48831;
const HEMORRHAGIC      = 46255; // Act 1 body-relative cones
const CHAIN_BREAK      = 46260; // a chain's explosion on each partner as it breaks
const CHAIN_TICK       = 46261; // an Unbreakable chain still short: pulses on the pair, Damage Down
const TOWER_ALPHA      = 46263; // Roiling Mass, the alpha player's Act 2 tower
const TOWER_BETA       = 46259; // Roiling Mass, the beta player's
const UNSOAKED         = 46258; // Unmitigated Explosion: an Act 2 or Act 3 tower left empty
const SUSTAINED_DAMAGE = 1004149; // its raid DoT
const METAMITOSIS      = 47395; // Act 3 towers (cast target = the soaker)
const LAUNCH_CAST      = 46257; // Metamitosis launch, cast on each Mitotic Phase player
const RAVENOUS_REACH   = 46237;
const VISCERAL_BURST   = 46294;
const RAPTOR_KNUCKLES  = 47559;
const BRING_DOWN_CASTS = [48650, 46244, 46245, 46246];
const REFRESHING_OVERKILL = [46393, 46394];
// Act 2 towers in Blood Vessel instance order: 1-2 In Line III, 3-4 IV, 5-6 I,
// 7-8 II; alpha takes 46263, beta 46259 (every clean tower in all reports).
const TOWER_LINE = [3, 3, 4, 4, 1, 1, 2, 2];

// Avoidable hits. All give Damage Down when survived except Constrictor
// (always lethal in the sample).
type Avoidable = { name: string; hit: string; why: string };
const AVOIDABLE: Record<number, Avoidable> = {
  46239: { name: "Burst", hit: "Caught by a flesh blob's Burst",
    why: "The flesh blobs grow and then Burst; wait in the gap between them." },
  46238: { name: "Phagocyte Spotlight", hit: "Hit by a Phagocyte Spotlight puddle",
    why: "Each spotlight drops a puddle where the players stood a moment earlier; keep moving along the route and off the old drops." },
  46262: { name: "Phagocyte Spotlight", hit: "Hit by a Phagocyte Spotlight puddle",
    why: "Each spotlight drops a puddle where the players stood a moment earlier; step off it." },
  46398: { name: "Skinsplitter", hit: "Hit by Skinsplitter (Cruel Coil)",
    why: "Cruel Coil's opening turns 90 degrees before every Skinsplitter; follow the opening and stay off the coil." },
  46274: { name: "Constrictor", hit: "Caught inside Constrictor",
    why: "Leave Cruel Coil before Constrictor closes it." },
  46244: { name: "Bring Down the House", hit: "Caught by Bring Down the House",
    why: "The floor between the islands collapses; be on your island before it falls." },
  46245: { name: "Bring Down the House", hit: "Caught by Bring Down the House",
    why: "The floor between the islands collapses; be on your island before it falls." },
  46246: { name: "Bring Down the House", hit: "Caught by Bring Down the House",
    why: "The floor between the islands collapses; be on your island before it falls." },
  46243: { name: "Grand Entrance", hit: "Hit by Grand Entrance",
    why: "Feral Fission's islands land with Grand Entrance; don't stand where one lands." },
  46240: { name: "Grand Entrance", hit: "Hit by Grand Entrance",
    why: "Feral Fission's islands land with Grand Entrance; don't stand where one lands." },
  [RAVENOUS_REACH]: { name: "Ravenous Reach", hit: "Hit by Ravenous Reach",
    why: "Ravenous Reach cleaves one side of the arena; only the Rotting Flesh players (Curtain Call) belong in it." },
  47548: { name: "Serpentine Scourge", hit: "Hit by Serpentine Scourge",
    why: "The dragon arms sweep half the room twice; start on the second-grown arm's side, then cross." },
  46253: { name: "Cell Death", hit: "Kept Rotting Flesh past Ravenous Reach and took Cell Death",
    why: "Rotting Flesh players must stand in Ravenous Reach to cleanse it; left on, it bursts as Cell Death." },
};

// One bait per player per instance: a player hit by another player's
// instance, or by two at once, is an overlap. The owner of an instance is its
// cast target, else the hit player whose `ownerAura` ended at the hit, else
// the only player it hit, or the one player it hit who took nothing else.
// `proximity`: aimed at the nearest players; with anyone dead they retarget.
// `ownerAtFault`: a known owner whose instance hit a non-tank is named alone.
type Family = { name: string; ids: number[]; what: string; why: string; ruleId: string; gap?: number; proximity?: boolean; ownerAura?: number[]; ownerAtFault?: boolean };
const PERSONAL: Family[] = [
  { name: "Mortal Slayer", ids: [GREEN_ORB, PURPLE_ORB], what: "orb", ruleId: LW1_ORB_RULE_ID, gap: 4000, proximity: true,
    why: "Each Mortal Slayer orb takes one player: one orb each, with the baits of a wave far enough apart that an orb's blast hits only its own player." },
  { name: "Dramatic Lysis", ids: [46250], what: "spread", ruleId: LW1_OVERLAP_RULE_ID, ownerAura: [BURSTING],
    why: "Bursting Grotesquerie is a spread; take it away from everyone else, the Fusion stack included." },
  { name: "Dramatic Lysis (Act 3)", ids: [46256], what: "spread", ruleId: LW1_OVERLAP_RULE_ID, ownerAura: [MITOTIC],
    why: "Every Mitotic Phase spread launches from its player's island corner; stand on your own corner, apart from the rest." },
  { name: "Dramatic Lysis (Slaughtershed)", ids: [46292], what: "spread", ruleId: LW1_OVERLAP_RULE_ID,
    why: "Slaughtershed's spreads go in the larger open region; keep them apart and away from the stack." },
  { name: "Cell Shedding", ids: [46252], what: "spread", ruleId: LW1_OVERLAP_RULE_ID,
    why: "Ravenous Reach turns each Rotting Flesh into a Cell Shedding spread; separate inside the Reach side." },
  { name: "Venomous Scourge", ids: [46248], what: "spread", ruleId: LW1_OVERLAP_RULE_ID,
    why: "Venomous Scourge marks the three eastmost and three westmost players; spread apart while the tanks stay central." },
  { name: "Split Scourge", ids: [46251], what: "line", ruleId: LW1_OVERLAP_RULE_ID, ownerAtFault: true,
    why: "Split Scourge's two lines go to the two closest players (the tanks); keep the party out of them." },
  // Curtain Call's four pairs break ~0.3s apart and reuse instance numbers
  // (B3 +4:36), so each break is its own resolution.
  { name: "Chain explosion", ids: [CHAIN_BREAK], what: "chain explosion", ruleId: LW1_CHAIN_CLIP_RULE_ID, ownerAura: UNBREAKABLE, gap: 200,
    why: "A chain explodes on both partners as it breaks; break it away from everyone else." },
];

// Shared stacks: a stack that killed someone while a living eligible player
// stood elsewhere names that player.
type Stack = { name: string; ids: number[]; what: string; why: string; eligible: "notBursting" | "nonTank" | "notSpread" };
const STACKS: Stack[] = [
  { name: "Fourth-Wall Fusion", ids: [46254], what: "stack", eligible: "notBursting",
    why: "In Act 1, Fourth-Wall Fusion is one four-player stack for the role without Bursting Grotesquerie; all four share it." },
  { name: "Fourth-Wall Fusion", ids: [47545], what: "stack", eligible: "nonTank",
    why: "After the Act 1 Burst, Fourth-Wall Fusion is shared by the six non-tanks while the tanks take Visceral Burst." },
  { name: "Fourth-Wall Fusion", ids: [46293], what: "stack", eligible: "notSpread",
    why: "Slaughtershed's Fourth-Wall Fusion is one four-player stack for the role without spreads." },
];

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
const FALL_KNOCKBACK_MS  = 5000;
// Players thrown off by one Raptor Knuckles that make it a group error.
const MASS_KNOCKED       = 4;
// A no-killing-blow death this soon after the floor collapse cast fell with it
// (+2.1s after Bring Down the House's hit, A15).
const FALL_COLLAPSE_MS   = 6000;
const CALLED_WIPE_END_MS = 12_000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
const CALLED_WIPE_PAIR_MS = 5_000;
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;
const TANK_ENMITY_LOST_MS = 30_000;
// Deaths to an empty tower's explosion and DoT that end the pull.
const MASS_DEATHS        = 3;
const UNSOAKED_DEATHS_MS = 12_000;
// Hits this large are FFLogs' unpaired previews of lethal hits (README).
const PREVIEW_AMOUNT     = 1_500_000;
// With this many dead a stack is doomed anyway.
const STACK_DOOMED_DEAD  = 3;
// An absent player this close to the stack's center nearly made it.
const STACK_NEAR_MISS    = 600;
const RAISE_GRACE_MS     = 10_000;
// A Hemorrhagic Projection cast sits on its owner: the cast and the owner's
// position agreed within 0.1y whenever the position was fresh (B1, B2). A
// player this close to the cast is a candidate owner.
const CONE_OWNER_MAX     = 200;
const EPISODE_MS         = 3000;
// An Act 2 chain connecting with the pair this far apart can't break: clean
// pairs connected 0-4.0y apart (C1 +2:27 the worst), unbreakable ones
// 5.8-24.2y (A11, A13, A14, A17, A8 x2). A48 and A52 pulsed after
// connecting 0.8-1.6y apart (not stretched afterwards: both named).
const CHAIN_FAR          = 500;
// A beta this far from the center left their alpha too little room (A50:
// Ayumi 5.7y out at her first pulse).
const CHAIN_OFF_CENTER   = 500;
const CHAIN_PULSE_WINDOW_MS = 15_000;
// Metamitosis launch spots (46257 casts) in every resolution where all eight
// towers were soaked: two island layouts x 8, every launch within 2.3y of
// its spot (A26..A74 and A75..B6, 23 pulls). A free player launching this far
// from all of them misplaced the pair's two towers (user, 2026-10-12, A69
// +3:40: Sin 4.7y north of the spot while Yoro stood on his).
const LAUNCH_SPOTS = [
  [11096, 10404], [11873, 9639], [9597, 8603], [8905, 9610], [10417, 11387], [8120, 10381], [10400, 9383], [9589, 10610],
  [11070, 11400], [8912, 10612], [11913, 10628], [8111, 9414], [11872, 8625], [8891, 8636], [11096, 9396], [8101, 11396],
];
const LAUNCH_OFF_SPOT = 350;
// Act 2: a player waiting for their turn stands dead center. At the first
// chain break (In Line I) the In Line II and IV players stood 0-3.9y from the
// center in every pull of report D but one, the kill included; In Line III
// pre-positions on its towers. A waiting player this far out left early (user,
// 2026-10-14, D1 +2:31: the DRK 8.8y out confused the breaking pair), and a
// chain explosion on players inside it is the breaker's alone (the PCT and
// SGE at 5.3y / 0.1y).
const ACT2_CENTER        = 600;
// Players waiting together on the Act 1 stack corner: within this of their
// centroid (D8's three supports: 2.4y at most; a whole clean stack ~4y).
const STACK_GROUP_MAX    = 600;
const SHARED             = 1004762; // Shared Grotesquerie: the Act 1 stack's center

// ── shared helpers ──────────────────────────────────────────────────────────

type Hit = { p: PlayerInfo; e: PlayerEvent };

type Life = {
  alive: (p: PlayerInfo, t: number) => boolean;
  hitAlive: (p: PlayerInfo, hitT: number) => boolean;
  diedFrom: (p: PlayerInfo, hitT: number) => DeathEvent | undefined;
  outIntervals: { p: PlayerInfo; start: number; end: number }[];
};

function buildLife(players: PlayerInfo[], deaths: DeathEvent[]): Life {
  const outIntervals: Life["outIntervals"] = [];
  for (const p of players) {
    const own = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const end = rezzedAt(p, d.timestamp, next) ?? next - DEATH_EVENT_LAG_MS - 100;
      outIntervals.push({ p, start: d.timestamp - DEATH_EVENT_LAG_MS - 100, end });
    });
  }
  const alive = (p: PlayerInfo, t: number) => !outIntervals.some((w) => w.p === p && t >= w.start && t < w.end);
  return {
    outIntervals,
    alive,
    hitAlive: (p, hitT) => alive(p, hitT - 500),
    diedFrom: (p, hitT) => deaths.find((d) => d.player === p.name && d.timestamp >= hitT && d.timestamp <= hitT + DIED_FROM_HIT_MS),
  };
}

/** Hits on living players (a dead body still logs 0-damage hits). */
function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[], from = -Infinity, to = Infinity): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.timestamp < from || e.timestamp > to || e.healthBefore === 0) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

const castsOf = (casts: EnemyEvent[], ids: number | number[]) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId)).sort((a, b) => a.timestamp - b.timestamp);
};

function gotDamageDown(p: PlayerInfo, t: number): boolean {
  return p.debuffs.some((e) => e.abilityId === DAMAGE_DOWN && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= 1500);
}

/** The aura was on the player at `t`. */
function hasAura(p: PlayerInfo, id: number, t: number): boolean {
  return debuffIntervals(p, id).some((w) => w.start <= t && w.end > t);
}

/** One of the auras ended on the player within [t - before, t + after]. */
function auraEndedNear(p: PlayerInfo, ids: number[], t: number, before = 1500, after = 300): boolean {
  return p.debuffs.some((e) => ids.includes(e.abilityId) && e.debuffStatus === "removed" && e.timestamp >= t - before && e.timestamp <= t + after);
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const isTank = (p: PlayerInfo) => p.role === "Tank";
const realAmount = (e: PlayerEvent) => ((e.amount ?? 0) >= PREVIEW_AMOUNT ? 0 : e.amount ?? 0);
// Green and purple Mortal Slayer orbs share a caster and instance numbers, so
// an instance is keyed by its ability too.
const instanceKey = (e: PlayerEvent) => `${e.abilityId}|${e.source}#${e.sourceInstance}`;
const castKey = (c: EnemyEvent) => `${c.abilityId}|${c.actorName}#${c.sourceInstance}`;

function tankOutRecently(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS);
}

/** Both tanks alive and holding enmity at `t` (otherwise busters retarget as fallout). */
function tanksHealthy(players: PlayerInfo[], life: Life, t: number): boolean {
  const tanks = players.filter(isTank);
  return tanks.length >= 2 && tanks.every((p) => !tankOutRecently(life, p, t));
}

/** Raised within RAISE_GRACE_MS before `t` (or still out at `t`). */
function inRaiseGrace(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.end <= t && t - w.end < RAISE_GRACE_MS);
}

/** Players who took a listed avoidable hit within 2s of `t`: already flagged for it. */
function inAvoidable(p: PlayerInfo, t: number): boolean {
  return p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && Math.abs(e.timestamp - t) <= 2000 && realAmount(e) > 0);
}

function positionAt(p: PlayerInfo, t: number) {
  return interpolatePlayerPosition(p, t, { windowMs: 2000, maxSpanMs: 3000 }) ?? findPlayerPosition(p, t, { windowMs: 2000 });
}

/** Deaths to an empty tower's explosion or its DoT within the window after `t`. */
function unsoakedDeaths(players: PlayerInfo[], deaths: DeathEvent[], t: number): string[] {
  return uniq(deaths.filter((d) => (d.killingAbilityGameId === UNSOAKED || d.killingAbilityGameId === SUSTAINED_DAMAGE) &&
    d.timestamp >= t && d.timestamp <= t + UNSOAKED_DEATHS_MS).map((d) => d.player));
}

// ── plain avoidable hits ────────────────────────────────────────────────────

/**
 * Ravenous Reach on a Rotting Flesh holder is the cleanse (Curtain Call):
 * their Rotting Flesh ends at the hit. Every other avoidable hit is an error.
 */
function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) &&
      !(e.abilityId === RAVENOUS_REACH && (auraEndedNear(p, [ROTTING], e.timestamp, 1500, 1500) || hasAura(p, ROTTING, e.timestamp))) &&
      (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT || gotDamageDown(p, e.timestamp)));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotDamageDown(p, e.timestamp));
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: LW1_AVOIDABLE_RULE_ID, severity: dd || death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── Act 1 cones ─────────────────────────────────────────────────────────────

/**
 * Hemorrhagic Projection: a cone from every Directed Grotesquerie player,
 * turned by their facing. A clean resolution hits nobody (both kills). A
 * cone that hit someone names its owner: the player standing on the cone's
 * cast (CONE_OWNER_MAX), never one of its own victims. Several candidates are
 * all named; none leaves a player-less error.
 */
function detectCones(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const coneCasts = castsOf(casts, HEMORRHAGIC);
  for (const res of clusterByGap(hitsOf(players, life, HEMORRHAGIC), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    // Every player has a cone, so the casts pair one-to-one with the players
    // standing on them (least total distance; a cone never hits its own
    // player). That splits candidates stacked together, whose interpolated
    // positions are ~0.2-0.5y loose (user, 2026-10-14, D18 +1:29: the PLD faced
    // the boss and his cone hit the DNC).
    const wave = coneCasts.filter((x) => x.timestamp <= t + 200 && x.timestamp >= t - 3000 && x.x !== undefined && x.y !== undefined);
    const victimsOf = (inst: number | undefined) => res.filter((h) => h.e.sourceInstance === inst).map((h) => h.p);
    const options = wave.map((c) => players.flatMap((p) => {
      if (!life.hitAlive(p, c.timestamp) || victimsOf(c.sourceInstance).includes(p)) return [];
      const q = positionAt(p, c.timestamp);
      const d = q ? Math.hypot(q.x - c.x!, q.y - c.y!) : Infinity;
      return d <= CONE_OWNER_MAX ? [{ p, d }] : [];
    }));
    let best: { cost: number; pick: (PlayerInfo | undefined)[] } = { cost: Infinity, pick: [] };
    const pick: (PlayerInfo | undefined)[] = [];
    const used = new Set<PlayerInfo>();
    const search = (i: number, cost: number) => {
      if (cost >= best.cost) return;
      if (i === wave.length) { best = { cost, pick: [...pick] }; return; }
      for (const o of options[i]) {
        if (used.has(o.p)) continue;
        used.add(o.p); pick[i] = o.p;
        search(i + 1, cost + o.d);
        used.delete(o.p);
      }
      // A cast nobody fresh stood on (stale position) stays unmatched.
      pick[i] = undefined;
      search(i + 1, cost + CONE_OWNER_MAX);
    };
    search(0, 0);
    const matched = new Map<number | undefined, PlayerInfo>();
    wave.forEach((c, i) => { const p = best.pick[i]; if (p) matched.set(c.sourceInstance, p); });
    const byInst = new Map<number, Hit[]>();
    for (const h of res) if (h.e.sourceInstance !== undefined) byInst.set(h.e.sourceInstance, [...(byInst.get(h.e.sourceInstance) ?? []), h]);
    // Victims grouped by the owner candidates of the cones that hit them.
    const byOwner = new Map<string, { owners: PlayerInfo[]; victims: PlayerInfo[]; killed: PlayerInfo[] }>();
    for (const [inst, hs] of byInst) {
      const victims = uniq(hs.map((h) => h.p));
      const c = coneCasts.filter((x) => x.sourceInstance === inst && x.timestamp <= t + 200 && x.timestamp >= t - 3000).pop();
      let owners: PlayerInfo[] = [];
      if (c?.x !== undefined && c.y !== undefined) {
        owners = players.filter((p) => !victims.includes(p) && life.hitAlive(p, c.timestamp)).filter((p) => {
          const q = positionAt(p, c.timestamp);
          return q && Math.hypot(q.x - c.x!, q.y - c.y!) <= CONE_OWNER_MAX;
        });
        const m = matched.get(inst);
        if (owners.length > 1 && m && owners.includes(m)) owners = [m];
      }
      // A victim who died right after it (to the cone or their own spread on
      // top of it) died of the cone (D18: the DNC).
      const killed = victims.filter((p) => !!life.diedFrom(p, t));
      const k = owners.map((p) => p.name).sort().join("+");
      const cur = byOwner.get(k) ?? { owners, victims: [], killed: [] };
      cur.victims.push(...victims);
      cur.killed.push(...killed);
      byOwner.set(k, cur);
    }
    for (const { owners, victims, killed } of byOwner.values()) {
      const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
      const why = "Each Directed Grotesquerie cone points the way its player faces; face it away from everyone before it fires.";
      if (!owners.length) {
        errors.push(playerlessMinor(LW1_CONE_RULE_ID, "Hemorrhagic Projection Hit Someone",
          `A Hemorrhagic Projection cone hit ${namesOf(victims)}; its owner couldn't be placed from the log.${deathText} ${why}`,
          t, HEMORRHAGIC, "Hemorrhagic Projection"));
        continue;
      }
      for (const o of owners) {
        errors.push(playerError(o, {
          ruleId: LW1_CONE_RULE_ID, severity: killed.length ? "Major" : "Minor", name: "Cone Hit Someone",
          description: `${owners.length > 1 ? `Their cone or ${namesOf(owners.filter((x) => x !== o))}'s` : "Their"} Hemorrhagic Projection cone hit ${namesOf(victims)}.${deathText} ${why}`,
          timestamp: t, abilityId: HEMORRHAGIC, abilityName: "Hemorrhagic Projection",
        }));
      }
    }
  }
  return errors;
}

// ── overlapping personal baits ──────────────────────────────────────────────

/**
 * Per resolution of a one-bait-per-player family: who owns each instance and
 * who was hit by an instance that isn't theirs or by two at once. Names the
 * victim and, when known, the owner (README philosophy 3: both are
 * candidates).
 */
/**
 * A player another rule already named as the cause of a spread overlap (the
 * stack taken away, a launch off the usual spot): the overlap group they're
 * in is theirs, so its other members aren't named.
 */
type Culprit = { ids: number[]; t: number; p: PlayerInfo };

function detectPersonalOverlaps(players: PlayerInfo[], life: Life, casts: EnemyEvent[], a2: Act2 | undefined, culprits: Culprit[]): PullError[] {
  const errors: PullError[] = [];
  for (const fam of PERSONAL) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, fam.gap ?? 1500)) {
      const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
      const act2Clip = fam.ruleId === LW1_CHAIN_CLIP_RULE_ID && !!a2 && t0 > a2.t0 && t0 < a2.t0 + 60_000;
      if (fam.proximity && players.some((p) => !life.hitAlive(p, t0))) continue;
      // Instances that also hit someone in raise grace are that player's
      // bait drawn from where they were raised: drop them.
      const tainted = new Set<string>();
      for (const p of players) {
        for (const e of p.damageTaken) {
          if (fam.ids.includes(e.abilityId) && e.timestamp >= t0 - 1500 && e.timestamp <= t1 + 500 && inRaiseGrace(life, p, e.timestamp)) tainted.add(instanceKey(e));
        }
      }
      const byInst = new Map<string, Hit[]>();
      const byPlayer = new Map<PlayerInfo, Set<string>>();
      for (const h of res) {
        const k = instanceKey(h.e);
        if (tainted.has(k)) continue;
        byInst.set(k, [...(byInst.get(k) ?? []), h]);
        byPlayer.set(h.p, (byPlayer.get(h.p) ?? new Set()).add(k));
      }
      if (!byInst.size) continue;
      if (fam.ruleId === LW1_ORB_RULE_ID) {
        const blamed = mortalSlayerBlame(players, life, res, byPlayer, fam);
        if (blamed) { errors.push(...blamed); continue; }
      }
      const owners = new Map<string, PlayerInfo>();
      for (const c of casts) {
        if (!fam.ids.includes(c.abilityId) || c.timestamp < t0 - 2000 || c.timestamp > t1 || c.sourceInstance === undefined || !c.target) continue;
        const p = players.find((x) => x.name === c.target);
        if (p) owners.set(castKey(c), p);
      }
      for (const [k, hs] of byInst) {
        if (owners.has(k)) continue;
        const hit = uniq(hs.map((h) => h.p));
        if (fam.ownerAura) {
          const holders = hit.filter((p) => auraEndedNear(p, fam.ownerAura!, hs[0].e.timestamp));
          if (holders.length === 1) { owners.set(k, holders[0]); continue; }
        }
        // Split Scourge lines go to the tanks: an untargeted line through
        // exactly one tank is that tank's (A90 +3:50).
        const tanksHit = hit.filter(isTank);
        if (fam.ownerAtFault && tanksHit.length === 1) { owners.set(k, tanksHit[0]); continue; }
        const only = hit.filter((p) => byPlayer.get(p)!.size === 1);
        if (hs.length === 1) owners.set(k, hs[0].p);
        else if (only.length === 1 && hit.length > 1) owners.set(k, only[0]);
      }
      const t = t0;
      const links = new Map<PlayerInfo, Set<PlayerInfo>>();
      const link = (a: PlayerInfo, b: PlayerInfo) => {
        links.set(a, (links.get(a) ?? new Set()).add(b));
        links.set(b, (links.get(b) ?? new Set()).add(a));
      };
      const hitTwice = new Set<PlayerInfo>();
      for (const [p, ks] of byPlayer) {
        const foreign = [...ks].filter((k) => owners.get(k) !== p);
        if (ks.size < 2 && foreign.length === 0) continue;
        if (ks.size >= 2) hitTwice.add(p);
        if (!links.has(p)) links.set(p, new Set());
        for (const k of ks) {
          const o = owners.get(k);
          if (o) { if (o !== p) link(p, o); }
          else for (const h of byInst.get(k)!) if (h.p !== p) link(p, h.p);
        }
      }
      if (!links.size) continue;
      const seen = new Set<PlayerInfo>();
      for (const start of links.keys()) {
        if (seen.has(start)) continue;
        const group: PlayerInfo[] = [];
        const stack = [start];
        while (stack.length) {
          const p = stack.pop()!;
          if (seen.has(p)) continue;
          seen.add(p);
          group.push(p);
          for (const q of links.get(p) ?? []) stack.push(q);
        }
        const killed = group.filter((p) => {
          const last = res.filter((h) => h.p === p).pop()?.e.timestamp ?? t;
          const d = life.diedFrom(p, last);
          return d && fam.ids.includes(d.killingAbilityGameId);
        });
        const severity = killed.length ? "Major" : "Minor";
        const deathText = killed.length ? ` ${namesOf(killed)} died.` : "";
        if (culprits.some((c) => c.ids.some((id) => fam.ids.includes(id)) && Math.abs(c.t - t) <= 1500 && group.includes(c.p))) continue;
        // Act 2: a chain explosion on players waiting in the center is the
        // breaker's, and always Major: its Magic Vulnerability Up makes their
        // next tower lethal (user, 2026-10-14, D1 +2:31: the PLD moved inward
        // before the break; the PCT and SGE then died soaking their towers).
        if (act2Clip) {
          const atCenter = (p: PlayerInfo) => { const q = positionAt(p, t); return !!q && Math.hypot(q.x - 10000, q.y - 10000) < ACT2_CENTER; };
          const breakers = uniq([...owners].filter(([k, o]) => group.includes(o) &&
            byInst.get(k)!.some((h) => h.p !== o && a2!.line.get(h.p) !== a2!.line.get(o))).map(([, o]) => o));
          if (breakers.length) {
            for (const o of breakers) {
              const hitOthers = uniq([...owners].filter(([, x]) => x === o).flatMap(([k]) => byInst.get(k)!.map((h) => h.p))
                .filter((p) => p !== o && a2!.line.get(p) !== a2!.line.get(o)));
              const dead = hitOthers.filter((p) => !life.alive(p, t + UNSOAKED_DEATHS_MS));
              errors.push(playerError(o, {
                ruleId: fam.ruleId, severity: "Major", name: "Chain Exploded on the Group",
                description: `Their In Line ${ROMAN[a2!.line.get(o) ?? 0]} chain broke on top of ${namesOf(hitOthers)}, giving them Magic Vulnerability Up, which makes their next tower or hit lethal.${dead.length ? ` ${namesOf(dead)} died soon after.` : ""} Break the chain away from the players waiting in the center.`,
                timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
              }));
            }
            for (const p of group) {
              if (breakers.includes(p) || atCenter(p) || [...owners.values()].includes(p)) continue;
              errors.push(playerError(p, {
                ruleId: fam.ruleId, severity, name: `${fam.name} Overlap`,
                description: `Hit by another pair's chain explosion while away from the center.${deathText} ${fam.why}`,
                timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
              }));
            }
            continue;
          }
        }
        // A tank's line through non-tanks is the tank's aim (user, 2026-10-12,
        // A90 +3:50: the MT angled too far back and the line crossed the arena).
        if (fam.ownerAtFault) {
          const atFault = uniq([...owners].filter(([k, o]) => group.includes(o) && life.hitAlive(o, t) &&
            byInst.get(k)!.some((h) => h.p !== o && !isTank(h.p))).map(([, o]) => o));
          if (atFault.length && atFault.length < group.length) {
            for (const o of atFault) {
              const hitOthers = uniq([...owners].filter(([, x]) => x === o).flatMap(([k]) => byInst.get(k)!.map((h) => h.p)).filter((p) => p !== o));
              errors.push(playerError(o, {
                ruleId: fam.ruleId, severity, name: `${fam.name} Overlap`,
                description: `Their ${fam.what} also hit ${namesOf(hitOthers)}.${deathText} ${fam.why}`,
                timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
              }));
            }
            continue;
          }
        }
        for (const p of group) {
          const others = [...(links.get(p) ?? [])];
          const n = byPlayer.get(p)?.size ?? 0;
          const description = hitTwice.has(p) || [...(byPlayer.get(p) ?? [])].some((k) => owners.get(k) !== p)
            ? `Hit by ${n > 1 ? `${n} ${fam.what}s${(fam.gap ?? 1500) > 1500 ? "" : " at once"}` : `another player's ${fam.what}`}${others.length ? ` (with ${namesOf(others)})` : ""}.`
            : `Their ${fam.what} also hit ${namesOf(others)}.`;
          errors.push(playerError(p, {
            ruleId: fam.ruleId, severity, name: `${fam.name} Overlap`,
            description: `${description}${deathText} ${fam.why}`,
            timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
          }));
        }
      }
    }
  }
  return errors;
}

/**
 * Mortal Slayer: each orb goes to the nearest eligible player, so a player
 * who took two (or a neighbour's blast) was usually covering for someone who
 * wasn't close enough. With all eight alive, a player hit by no orb at all
 * missed their bait, and a tank hit by a green orb stood in the healers'
 * and DPS's baits (inside the boss's hitbox) and then took their purple
 * under Poison Resistance Down. Those players are named; the ones who caught
 * the leftover orbs are not (user, 2026-10-12, A25 +0:42: Sonder too far on
 * the left, both tanks inside the hitbox, Shiny not close enough on the
 * right; Sin and Sayacissa took the orbs meant for them). Undefined when
 * nobody fits, so the generic overlap names the pair instead.
 */
function mortalSlayerBlame(players: PlayerInfo[], life: Life, res: Hit[], byPlayer: Map<PlayerInfo, Set<string>>, fam: Family): PullError[] | undefined {
  const t = res[0].e.timestamp;
  const missed = players.filter((p) => !byPlayer.has(p) && !inRaiseGrace(life, p, t));
  const tankGreen = players.filter((p) => isTank(p) && res.some((h) => h.p === p && h.e.abilityId === GREEN_ORB));
  if (!missed.length && !tankGreen.length) return undefined;
  const killed = uniq(res.map((h) => h.p)).filter((p) => {
    const d = life.diedFrom(p, res.filter((h) => h.p === p).pop()!.e.timestamp);
    return d && fam.ids.includes(d.killingAbilityGameId);
  });
  const doubled = [...byPlayer].filter(([, ks]) => ks.size >= 2).map(([p]) => p);
  const severity = killed.length ? "Major" : "Minor";
  const outcome = `${doubled.length ? ` ${namesOf(doubled)} took two orbs instead.` : ""}${killed.length ? ` ${namesOf(killed)} died.` : ""}`;
  return [
    ...missed.map((p) => playerError(p, {
      ruleId: fam.ruleId, severity, name: "Missed Their Mortal Slayer Orb",
      description: `Took no Mortal Slayer orb: they weren't the closest player when theirs was aimed, so it went to someone else.${outcome} Stand closest to the boss on your side for your turn in the order.`,
      timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
    })),
    ...tankGreen.map((p) => playerError(p, {
      ruleId: fam.ruleId, severity, name: "Tank Took a Green Orb",
      description: `Took a green Mortal Slayer orb, which belongs to the healers and DPS, and then their own purple under its Poison Resistance Down.${outcome} The tanks stand outside the boss's hitbox for the green baits and take only the purples.`,
      timestamp: t, abilityId: GREEN_ORB, abilityName: fam.name,
    })),
  ];
}

// ── shared stacks ───────────────────────────────────────────────────────────

function detectStacks(players: PlayerInfo[], life: Life, casts: EnemyEvent[], culprits: Culprit[]): PullError[] {
  const errors: PullError[] = [];
  for (const fam of STACKS) {
    for (const res of clusterByGap(hitsOf(players, life, fam.ids), (h) => h.e.timestamp, 1500)) {
      const t = res[0].e.timestamp;
      const inIt = new Set(res.map((h) => h.p));
      const killed = [...inIt].filter((p) => {
        const d = life.diedFrom(p, res.filter((h) => h.p === p).pop()!.e.timestamp);
        return d && fam.ids.includes(d.killingAbilityGameId);
      });
      if (!killed.length) continue;
      if (players.filter((p) => !life.alive(p, t)).length >= STACK_DOOMED_DEAD) continue;
      const spreadTargets = new Set(castsOf(casts, 46292).filter((c) => Math.abs(c.timestamp - t) <= 2000).map((c) => c.target));
      const eligible = (p: PlayerInfo) =>
        fam.eligible === "nonTank" ? !isTank(p)
        : fam.eligible === "notSpread" ? !spreadTargets.has(p.name)
        : !hasAura(p, BURSTING, t - 1000);
      const at = res.filter((h) => h.e.x !== undefined && h.e.y !== undefined);
      const cx = at.length ? at.reduce((s, h) => s + h.e.x!, 0) / at.length : undefined;
      const cy = at.length ? at.reduce((s, h) => s + h.e.y!, 0) / at.length : undefined;
      const absent = players.filter((p) => eligible(p) && !inIt.has(p) && life.hitAlive(p, t) && !inAvoidable(p, t)).map((p) => {
        const q = positionAt(p, t);
        return { p, d: q && cx !== undefined && cy !== undefined ? Math.hypot(q.x - cx, q.y - cy!) : undefined };
      }).filter((a) => a.d === undefined || a.d > STACK_NEAR_MISS);
      // Act 1: the stack lands on its Shared Grotesquerie holder. With the rest
      // of their role waiting together on the corner, the holder took it away
      // (user, 2026-10-14, D8 +1:29: the SGE ~11y from the three supports on the
      // corner; the DRG's spread, on its usual spot, caught the SGE too).
      if (fam.eligible === "notBursting" && absent.length >= 2) {
        const holder = [...inIt].find((p) => auraEndedNear(p, [SHARED], t, 1500, 500));
        const qs = absent.map((a) => positionAt(a.p, t)).filter((q): q is NonNullable<typeof q> => !!q);
        const hq = holder && positionAt(holder, t);
        if (holder && hq && qs.length === absent.length) {
          const gx = qs.reduce((s, q) => s + q.x, 0) / qs.length, gy = qs.reduce((s, q) => s + q.y, 0) / qs.length;
          const together = qs.every((q) => Math.hypot(q.x - gx, q.y - gy) <= STACK_GROUP_MAX);
          const away = Math.hypot(hq.x - gx, hq.y - gy);
          if (together && away > STACK_NEAR_MISS) {
            culprits.push({ ids: [46250], t, p: holder });
            errors.push(playerError(holder, {
              ruleId: LW1_STACK_RULE_ID, severity: "Major", name: `Took ${fam.name} Away`,
              description: `Held the stack (Shared Grotesquerie) ~${yd(away)} yalms from ${namesOf(absent.map((a) => a.p))}, who waited together on the corner, so only ${inIt.size} took it and ${namesOf(killed)} died. ${fam.why}`,
              timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
            }));
            continue;
          }
        }
      }
      for (const a of absent) {
        errors.push(playerError(a.p, {
          ruleId: LW1_STACK_RULE_ID, severity: "Major", name: `Missed ${fam.name}`,
          description: `Wasn't in the ${fam.what}${a.d !== undefined ? ` (~${yd(a.d)} yalms from it)` : ""}; only ${inIt.size} took it and ${namesOf(killed)} died. ${fam.why}`,
          timestamp: t, abilityId: fam.ids[0], abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

// ── Visceral Burst ──────────────────────────────────────────────────────────

/** Visceral Burst hits the top two on enmity: a non-tank in it with both tanks up. */
function detectBusters(players: PlayerInfo[], life: Life, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of clusterByGap(hitsOf(players, life, VISCERAL_BURST), (h) => h.e.timestamp, 1500)) {
    const t = res[0].e.timestamp;
    if (!tanksHealthy(players, life, t - DIED_FROM_HIT_MS)) continue;
    occurrences?.push({ mechanicKey: LW1_BUSTER_RULE_ID, timestamp: t, players: players.filter((p) => !isTank(p) && life.hitAlive(p, t)).map((p) => p.name) });
    for (const p of uniq(res.filter((h) => !isTank(h.p)).map((h) => h.p))) {
      const d = life.diedFrom(p, t);
      errors.push(playerError(p, {
        ruleId: LW1_BUSTER_RULE_ID, severity: d ? "Major" : "Minor", name: "In Visceral Burst",
        description: `Stood in Visceral Burst, the tanks' buster.${d ? " They died." : ""} The tanks take Visceral Burst away from the party; the non-tanks stack for Fourth-Wall Fusion elsewhere.`,
        timestamp: t, abilityId: VISCERAL_BURST, abilityName: "Visceral Burst",
      }));
    }
  }
  return errors;
}

// ── Act 2: chains and towers ────────────────────────────────────────────────

type Act2 = { t0: number; line: Map<PlayerInfo, number>; alpha: Set<PlayerInfo> };

/** In Line numbers and alpha/beta chains handed out at Act 2's start. */
function act2Lines(players: PlayerInfo[], casts: EnemyEvent[]): Act2 | undefined {
  const cast = castsOf(casts, ACT2_CAST)[0];
  if (!cast) return undefined;
  const t0 = cast.timestamp;
  const line = new Map<PlayerInfo, number>();
  const alpha = new Set<PlayerInfo>();
  for (const p of players) {
    const l = p.debuffs.find((e) => IN_LINE[e.abilityId] && e.debuffStatus === "applied" && e.timestamp >= t0 && e.timestamp <= t0 + 5000);
    if (l) line.set(p, IN_LINE[l.abilityId]);
    if (p.debuffs.some((e) => e.abilityId === BONDS_A && e.debuffStatus === "applied" && e.timestamp >= t0 && e.timestamp <= t0 + 5000)) alpha.add(p);
  }
  return { t0, line, alpha };
}

const ROMAN = ["", "I", "II", "III", "IV"];

/**
 * Unbreakable Flesh that can't be broken pulses Dramatic Lysis 46261 on the
 * pair, each pulse with Damage Down, until it breaks (never in a kill). The
 * pair waits in the center of Cruel Coil until the chain connects; then
 * alpha leaves through the opening and beta stays inside.
 * - Connected far apart (CHAIN_FAR): the chain could no longer break, and
 *   the partner farther from the center left early (user, 2026-10-12, A8
 *   +2:27 the alpha Sayacissa and +2:32 the alpha Sonder left the coil one
 *   turn early). Named even if they then died: their partner's pulses are
 *   their error (Sayacissa jumped off to spare Mabel the pulses).
 * - Otherwise a beta off the center (CHAIN_OFF_CENTER, at the connection or
 *   at their first pulse) left the alpha too little room (user, A50 +2:28:
 *   Ayumi wasn't dead center, so Mabel couldn't stretch it).
 * - Otherwise both partners are named.
 * A partner already dead when the chain connected makes it fallout.
 */
function detectChains(players: PlayerInfo[], life: Life, a2: Act2 | undefined, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const partnerOf = (p: PlayerInfo) => a2 && a2.line.has(p)
    ? players.find((q) => q !== p && a2.line.get(q) === a2.line.get(p) && a2.alpha.has(q) !== a2.alpha.has(p)) : undefined;
  const tickHits = (p: PlayerInfo, from: number, to: number) => p.damageTaken.filter((e) =>
    e.abilityId === CHAIN_TICK && e.healthBefore !== 0 && life.hitAlive(p, e.timestamp) && e.timestamp >= from && e.timestamp <= to);
  const fromCenter = (q: { x: number; y: number }) => Math.hypot(q.x - 10000, q.y - 10000);
  const handled = new Set<PlayerEvent>();
  // Each Act 2 pair's Unbreakable Flesh tests both partners.
  if (a2) {
    const done = new Set<PlayerInfo>();
    for (const p of players) {
      const q = partnerOf(p);
      if (!q || done.has(p)) continue;
      done.add(p).add(q);
      const ub = p.debuffs.find((e) => UNBREAKABLE.includes(e.abilityId) && e.debuffStatus === "applied" && e.timestamp >= a2.t0);
      if (!ub) continue;
      const t = ub.timestamp;
      if (!life.hitAlive(p, t) || !life.hitAlive(q, t)) continue;
      occurrences?.push({ mechanicKey: LW1_CHAIN_RULE_ID, timestamp: t, players: [p.name, q.name] });
      const ticks = [...tickHits(p, t, t + CHAIN_PULSE_WINDOW_MS), ...tickHits(q, t, t + CHAIN_PULSE_WINDOW_MS)].sort((a, b) => a.timestamp - b.timestamp);
      ticks.forEach((e) => handled.add(e));
      if (!ticks.length) continue;
      const pair = [p, q];
      const at = new Map(pair.map((x) => [x, positionAt(x, t)] as const));
      const [qp, qq] = [at.get(p), at.get(q)];
      const apart = qp && qq ? Math.hypot(qp.x - qq.x, qp.y - qq.y) : undefined;
      const beta = pair.find((x) => !a2.alpha.has(x))!;
      const firstPulse = ticks.find((e) => beta.damageTaken.includes(e));
      const betaAt = at.get(beta) ?? (firstPulse?.x !== undefined && firstPulse.y !== undefined ? { x: firstPulse.x, y: firstPulse.y } : undefined);
      let culprits: PlayerInfo[] = pair;
      let why = "";
      if (apart !== undefined && apart >= CHAIN_FAR) {
        const far = fromCenter(qp!) >= fromCenter(qq!) ? p : q;
        culprits = [far];
        why = `Was ~${yd(fromCenter(at.get(far)!))} yalms from the center when the chain connected (the pair ~${yd(apart)} yalms apart), so it could never break. Wait in the center of Cruel Coil until the chain connects.`;
      } else if (betaAt && fromCenter(betaAt) >= CHAIN_OFF_CENTER) {
        culprits = [beta];
        why = `Was ~${yd(fromCenter(betaAt))} yalms off the center as the beta of the chain, so their partner couldn't get far enough to break it. Beta stands dead center when the chain connects while alpha leaves through the opening.`;
      }
      const hurt = uniq(ticks.map((e) => pair.find((x) => x.damageTaken.includes(e))!));
      const dd = hurt.filter((x) => ticks.some((e) => x.damageTaken.includes(e) && gotDamageDown(x, e.timestamp)));
      const died = hurt.filter((x) => life.diedFrom(x, ticks.filter((e) => x.damageTaken.includes(e)).pop()!.timestamp)?.killingAbilityGameId === CHAIN_TICK);
      const outcome = `${dd.length ? ` ${namesOf(dd)} got Damage Down.` : ""}${died.length ? ` ${namesOf(died)} died.` : ""}`;
      const lineNo = a2.line.get(p)!;
      for (const c of culprits) {
        const partner = c === p ? q : p;
        errors.push(playerError(c, {
          ruleId: LW1_CHAIN_RULE_ID, severity: dd.length || died.length ? "Major" : "Minor", name: "Chain Not Broken",
          description: `Their In Line ${ROMAN[lineNo]} chain with ${partner.name} didn't break after it turned Unbreakable and pulsed Dramatic Lysis on the pair (${ticks.length} hit${ticks.length === 1 ? "" : "s"}).${outcome} ${why || "Stretch the chain apart as soon as it turns Unbreakable."}`,
          timestamp: ticks[0].timestamp, abilityId: CHAIN_TICK, abilityName: "Dramatic Lysis",
        }));
      }
    }
  }
  // Pulses outside an Act 2 pair (Curtain Call): the player who took them.
  for (const p of players) {
    const ticks = tickHits(p, -Infinity, Infinity).filter((e) => !handled.has(e));
    for (const g of clusterByGap(ticks, (e) => e.timestamp, EPISODE_MS)) {
      const t = g[0].timestamp;
      const q = partnerOf(p);
      if (q && !life.hitAlive(q, t)) continue;
      const dd = g.some((e) => gotDamageDown(p, e.timestamp));
      const d = life.diedFrom(p, g[g.length - 1].timestamp);
      const lineNo = a2?.line.get(p);
      const outcome = [dd ? "got Damage Down" : "", d ? "died" : ""].filter(Boolean).join(" and ");
      errors.push(playerError(p, {
        ruleId: LW1_CHAIN_RULE_ID, severity: dd || d ? "Major" : "Minor", name: "Chain Not Broken",
        description: `Their ${lineNo ? `In Line ${ROMAN[lineNo]} ` : ""}chain${q ? ` with ${q.name}` : ""} stayed short after it turned Unbreakable, so it pulsed Dramatic Lysis on them (${g.length} hit${g.length === 1 ? "" : "s"}, ${kFmt(g.reduce((s, e) => s + realAmount(e), 0))}).${outcome ? ` They ${outcome}.` : ""} Stretch the chain apart as soon as it turns Unbreakable.`,
        timestamp: t, abilityId: CHAIN_TICK, abilityName: "Dramatic Lysis",
      }));
    }
  }
  return errors;
}

/**
 * At the first chain break (In Line I), the In Line II and IV players wait
 * dead center (ACT2_CENTER); In Line III pre-positions on its towers. One
 * already out has left before their turn (Minor: it confuses the breaking
 * pair; user, 2026-10-14, D1 +2:31).
 */
function detectLeftCenterEarly(players: PlayerInfo[], life: Life, a2: Act2 | undefined): PullError[] {
  if (!a2) return [];
  const first = hitsOf(players, life, CHAIN_BREAK, a2.t0, a2.t0 + 60_000)[0];
  if (!first) return [];
  const t = first.e.timestamp;
  const errors: PullError[] = [];
  for (const p of players) {
    const lineNo = a2.line.get(p);
    if ((lineNo !== 2 && lineNo !== 4) || !life.hitAlive(p, t)) continue;
    const q = positionAt(p, t);
    const d = q ? Math.hypot(q.x - 10000, q.y - 10000) : 0;
    if (d < ACT2_CENTER) continue;
    errors.push(playerError(p, {
      ruleId: LW1_CHAIN_CLIP_RULE_ID, severity: "Minor", name: "Left the Center Out of Turn",
      description: `Was ~${yd(d)} yalms from the center when the In Line I chain broke, though their own chain (In Line ${ROMAN[lineNo]}) wasn't up yet. Wait dead center until it's your turn to break or soak; moving early confuses the pair that is breaking.`,
      timestamp: t, abilityId: CHAIN_BREAK, abilityName: "Dramatic Lysis",
    }));
  }
  return errors;
}

/**
 * Act 2 towers. Each tower's assigned soaker is fixed by its order and kind
 * (TOWER_LINE; the cast target is who actually soaked it). An empty tower
 * names its assigned soaker when they were alive; Unmitigated Explosion then
 * hits the raid, and 3+ deaths to it and its DoT end the pull. A Roiling Mass
 * hitting anyone but its cast target was a second soaker.
 */
function detectAct2Towers(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], a2: Act2 | undefined, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  if (!a2) return errors;
  const towers = castsOf(casts, [TOWER_ALPHA, TOWER_BETA]).filter((c) => c.timestamp > a2.t0 && c.timestamp < a2.t0 + 80_000);
  let raidDone = false;
  for (const c of towers) {
    const k = c.sourceInstance ?? 0;
    const lineNo = TOWER_LINE[k - 1];
    const wantAlpha = c.abilityId === TOWER_ALPHA;
    // Odd towers are alpha, even beta. A tower of the other kind means the
    // sequence already broke (a death or early break moved the towers: A8
    // tower 2, A11 towers 3-4): nobody's slot is known.
    const inOrder = !!lineNo && wantAlpha === (k % 2 === 1);
    const assigned = inOrder ? players.find((p) => a2.line.get(p) === lineNo && a2.alpha.has(p) === wantAlpha) : undefined;
    if (assigned) occurrences?.push({ mechanicKey: LW1_TOWER_RULE_ID, timestamp: c.timestamp, players: [assigned.name] });
    const label = `Tower ${k}${inOrder ? ` (In Line ${ROMAN[lineNo]}, ${wantAlpha ? "alpha" : "beta"})` : ""}`;
    if (c.target) {
      const extra = players.filter((p) => p.name !== c.target && p.damageTaken.some((e) => e.abilityId === c.abilityId && e.sourceInstance === k &&
        e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + 1500 && e.healthBefore !== 0) && life.hitAlive(p, c.timestamp));
      for (const p of extra) {
        const d = life.diedFrom(p, c.timestamp);
        errors.push(playerError(p, {
          ruleId: LW1_TOWER_RULE_ID, severity: d ? "Major" : "Minor", name: "Soaked Another Player's Tower",
          description: `Stood in ${label} with ${c.target}, who was soaking it.${d ? " They died." : ""} Each Act 2 tower takes exactly one player: In Line I-IV soak towers 3, 4, 1, 2 in that order.`,
          timestamp: c.timestamp, abilityId: c.abilityId, abilityName: "Roiling Mass",
        }));
      }
      continue;
    }
    const lost = unsoakedDeaths(players, deaths, c.timestamp);
    const deathText = lost.length ? ` ${joinNames(lost)} died to the explosion and its damage over time.` : "";
    if (assigned && life.hitAlive(assigned, c.timestamp) && !inRaiseGrace(life, assigned, c.timestamp)) {
      errors.push(playerError(assigned, {
        ruleId: LW1_TOWER_RULE_ID, severity: "Major", name: "Missed Their Tower",
        description: `${label} was theirs and went unsoaked, so Unmitigated Explosion hit the raid.${deathText} In Line I-IV soak towers 3, 4, 1, 2 in that order.`,
        timestamp: c.timestamp, abilityId: c.abilityId, abilityName: "Roiling Mass",
      }));
    } else {
      errors.push(playerlessMinor(LW1_TOWER_RULE_ID, "Tower Unsoaked",
        `${label} went unsoaked${assigned ? `; its soaker ${assigned.name} was dead` : inOrder ? "" : " after the tower order had already broken"}, so Unmitigated Explosion hit the raid.${deathText}`,
        c.timestamp, c.abilityId, "Roiling Mass"));
    }
    if (lost.length >= MASS_DEATHS && !raidDone) {
      raidDone = true;
      errors.push(raidMarker(LW1_TOWER_RULE_ID, "Unsoaked Tower Killed the Raid",
        `${label} went unsoaked and its explosion and damage over time killed ${lost.length} (${joinNames(lost)}). Treated as the cutoff point.`,
        c.timestamp, UNSOAKED, "Unmitigated Explosion"));
    }
  }
  return errors;
}

// ── Act 3: Metamitosis towers ───────────────────────────────────────────────

/**
 * Eight Metamitosis towers land with the Act 3 spreads; each cast's target is
 * the player who soaked it. An empty tower names the living players who
 * soaked none when they account for every empty tower (one or two);
 * otherwise the layout failed as a whole and the error is player-less.
 */
function detectMetamitosis(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], culprits: Culprit[]): PullError[] {
  const errors: PullError[] = [];
  const act3 = castsOf(casts, ACT3_CAST)[0];
  if (!act3) return errors;
  const towers = castsOf(casts, METAMITOSIS).filter((c) => c.timestamp > act3.timestamp && c.timestamp < act3.timestamp + 25_000);
  const empty = towers.filter((c) => !c.target);
  if (!empty.length) return errors;
  const t = empty[0].timestamp;
  const soakers = new Set(towers.map((c) => c.target).filter(Boolean));
  const free = players.filter((p) => !soakers.has(p.name) && life.hitAlive(p, t) && !inRaiseGrace(life, p, t));
  const lost = unsoakedDeaths(players, deaths, t);
  const deathText = lost.length ? ` ${joinNames(lost)} died to the explosion and its damage over time.` : "";
  const why = "Each Metamitosis tower lands on the island opposite its spread; every player soaks the one their partner's spread sends to their corner.";
  if (empty.length <= 2 && free.length === empty.length) {
    // A free pair mirrors each other's misses; the one who launched off the
    // usual spots misplaced both towers (LAUNCH_SPOTS).
    const launches = castsOf(casts, LAUNCH_CAST).filter((c) => Math.abs(c.timestamp - t) <= 1500 && c.x !== undefined && c.y !== undefined);
    const offSpot = new Map<PlayerInfo, number>();
    for (const p of free) {
      const q = positionAt(p, t);
      const own = q ? launches.map((c) => ({ c, d: Math.hypot(c.x! - q.x, c.y! - q.y) })).sort((a, b) => a.d - b.d)[0] : undefined;
      if (own && own.d <= 400) offSpot.set(p, Math.min(...LAUNCH_SPOTS.map(([x, y]) => Math.hypot(own.c.x! - x, own.c.y! - y))));
    }
    const misplaced = free.filter((p) => (offSpot.get(p) ?? 0) >= LAUNCH_OFF_SPOT);
    const named = misplaced.length && misplaced.length < free.length ? misplaced : free;
    for (const p of named) {
      const off = offSpot.get(p);
      // On the wrong island their spread also lands on that island's players:
      // that overlap is theirs too (user, 2026-10-14, D11 +3:39: the DRG went
      // bottom right instead of bottom left; everyone else was correct).
      let clipped: PlayerInfo[] = [];
      if (named === misplaced) {
        culprits.push({ ids: [46256], t, p });
        const mine = new Set(p.damageTaken.filter((e) => e.abilityId === 46256 && Math.abs(e.timestamp - t) <= 1500).map((e) => e.sourceInstance));
        clipped = players.filter((x) => x !== p && x.damageTaken.some((e) => e.abilityId === 46256 && Math.abs(e.timestamp - t) <= 1500 && mine.has(e.sourceInstance)));
      }
      errors.push(playerError(p, {
        ruleId: LW1_METAMITOSIS_RULE_ID, severity: "Major", name: "Missed a Metamitosis Tower",
        description: `Soaked no tower while ${empty.length === 1 ? "one Metamitosis tower" : `${empty.length} Metamitosis towers`} went empty, so Unmitigated Explosion hit the raid.${named === misplaced && off !== undefined ? ` They launched their spread ~${yd(off)} yalms off the usual spot, which sent their tower away from their partner and left them off the one their partner sent.` : ""}${clipped.length ? ` Their spread overlapped with ${namesOf(clipped)} there.` : ""}${deathText} ${why}`,
        timestamp: t, abilityId: METAMITOSIS, abilityName: "Metamitosis",
      }));
    }
  } else {
    errors.push(playerlessMinor(LW1_METAMITOSIS_RULE_ID, "Metamitosis Towers Unsoaked",
      `${empty.length} of ${towers.length} Metamitosis towers went empty${free.length ? ` (soaking none: ${namesOf(free)})` : ""}, so Unmitigated Explosion hit the raid.${deathText} ${why}`,
      t, METAMITOSIS, "Metamitosis"));
  }
  if (lost.length >= MASS_DEATHS) {
    errors.push(raidMarker(LW1_METAMITOSIS_RULE_ID, "Unsoaked Towers Killed the Raid",
      `${empty.length} Metamitosis tower${empty.length === 1 ? "" : "s"} went empty and the explosions killed ${lost.length} (${joinNames(lost)}). Treated as the cutoff point.`,
      t, UNSOAKED, "Unmitigated Explosion"));
  }
  return errors;
}

// ── deaths with no killing blow: falls ──────────────────────────────────────

/**
 * No-killing-blow deaths that are the wipe being called, not mistakes. Falls
 * with the collapsing floor or after a Raptor Knuckles knockback are kept out
 * even near the end (A15: three fell with the floor 5s before the end).
 */
function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], casts: EnemyEvent[], pullEnd: number): Set<DeathEvent> {
  const collapses = castsOf(casts, BRING_DOWN_CASTS);
  const explained = (d: DeathEvent) => collapses.some((c) => c.timestamp <= d.timestamp && c.timestamp >= d.timestamp - FALL_COLLAPSE_MS) ||
    !!players.find((p) => p.name === d.player)?.damageTaken.some((e) =>
      (e.abilityId === RAPTOR_KNUCKLES || AVOIDABLE[e.abilityId]) && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - FALL_KNOCKBACK_MS);
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !explained(d));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
    // Two jumping off together mid-pull is the wipe being called while the
    // rest practise on (user, 2026-10-12, A85 +4:08 / +4:12).
    const pair = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_PAIR_MS);
    if (pair.length >= 2) pair.forEach((x) => out.add(x));
  }
  return out;
}

function detectFalls(players: PlayerInfo[], deaths: DeathEvent[], casts: EnemyEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  const collapses = castsOf(casts, BRING_DOWN_CASTS);
  const knockOf = (d: DeathEvent) => players.find((x) => x.name === d.player)?.damageTaken
    .filter((e) => e.abilityId === RAPTOR_KNUCKLES && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - FALL_KNOCKBACK_MS).pop();
  // Four or more thrown off by one knockback also end the pull. Each player
  // still owns their side or their knockback immunity (user, 2026-10-12, A74
  // +5:58: all eight, the first time the group saw it).
  const knocked = deaths.filter((d) => !d.killingAbilityGameId && !called.has(d) && knockOf(d));
  for (const g of clusterByGap(knocked, (d) => knockOf(d)!.timestamp, 1500)) {
    if (g.length < MASS_KNOCKED) continue;
    const kb = knockOf(g[0])!;
    errors.push(raidMarker(LW1_FALL_RULE_ID, "Party Knocked Off the Edge",
      `${g.length} players were knocked off the edge by the same Raptor Knuckles (${joinNames(g.map((d) => d.player))}). Treated as the cutoff point.`,
      kb.timestamp, RAPTOR_KNUCKLES, "Raptor Knuckles"));
  }
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    const wd = debuffIntervals(p, WALKING_DEAD).find((w) => Math.abs(w.end - hitT) <= 500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
    if (wd) {
      errors.push(playerlessMinor(LW1_FALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        wd.end, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    // A death right after an avoidable hit is that hit's error.
    if (p.damageTaken.some((e) => AVOIDABLE[e.abilityId] && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - DIED_FROM_HIT_MS)) continue;
    const kb = p.damageTaken.filter((e) => e.abilityId === RAPTOR_KNUCKLES && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - FALL_KNOCKBACK_MS).pop();
    const collapse = collapses.filter((c) => c.timestamp <= d.timestamp && c.timestamp >= d.timestamp - FALL_COLLAPSE_MS).pop();
    errors.push(playerError(p, {
      ruleId: LW1_FALL_RULE_ID, severity: "Major",
      name: kb ? "Knocked Off the Edge" : collapse ? "Fell With the Floor" : "Fell Off the Edge",
      description: kb
        ? `Knocked off the edge by Raptor Knuckles (${sec(d.timestamp - kb.timestamp)}s before the death). Stand so the hand's knockback carries you across the arena, or use knockback immunity.`
        : collapse
          ? "Fell when Bring Down the House collapsed the floor between the islands. Be on your island before the floor falls."
          : "Died with no killing blow mid-pull: fell off the edge of the arena or an island.",
      timestamp: kb ? kb.timestamp : collapse ? collapse.timestamp : hitT,
      abilityId: kb?.abilityId ?? collapse?.abilityId ?? 0,
      abilityName: kb ? "Raptor Knuckles" : collapse ? "Bring Down the House" : "Fall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Lindwurm (M12S door boss) errors. Self-gates on the boss's signature casts.
 * Lindwurm II is a separate fight in the log (and on the fallback).
 */
export function detectLindwurmErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(players, deathEvents, enemyCasts, pullEnd);
  const a2 = act2Lines(players, enemyCasts);
  // Stacks and Metamitosis first: the overlaps they explain aren't repeated.
  const culprits: Culprit[] = [];
  const stacks = detectStacks(players, life, enemyCasts, culprits);
  const metamitosis = detectMetamitosis(players, life, enemyCasts, deathEvents, culprits);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectCones(players, life, enemyCasts),
    ...detectPersonalOverlaps(players, life, enemyCasts, a2, culprits),
    ...stacks,
    ...detectBusters(players, life, occurrences),
    ...detectChains(players, life, a2, occurrences),
    ...detectLeftCenterEarly(players, life, a2),
    ...detectAct2Towers(players, life, enemyCasts, deathEvents, a2, occurrences),
    ...metamitosis,
    ...detectFalls(players, deathEvents, enemyCasts, called),
  ];

  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  // Refreshing Overkill ends P1 either way: it kills the raid when the boss
  // wasn't brought low enough (the kills never let it finish).
  const enrage = players.flatMap((p) => p.damageTaken.filter((e) => REFRESHING_OVERKILL.includes(e.abilityId) && life.diedFrom(p, e.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    errors.push(raidMarker(LW1_ENRAGE_RULE_ID, "Refreshing Overkill (Enrage)",
      "Refreshing Overkill killed the raid: the boss wasn't brought low enough before the timed transition to Lindwurm II.",
      enrage.timestamp, enrage.abilityId, "Refreshing Overkill"));
  }
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  const calledPair = calledList.some((d, i) => i > 0 && d.timestamp - calledList[i - 1].timestamp <= CALLED_WIPE_PAIR_MS);
  if ((calledList.length >= CALLED_WIPE_COUNT || calledPair) && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(LW1_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow together (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(LW1_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
