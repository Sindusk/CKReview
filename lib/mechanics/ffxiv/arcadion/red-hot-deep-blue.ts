// lib/mechanics/ffxiv/arcadion/red-hot-deep-blue.ts
//
// -- GUIDE-DERIVED MODEL: RED HOT / DEEP BLUE (M10S) --
// The Xtremes, AAC Heavyweight M2 (Savage), Arcadion, patch 7.4; Savage only.
// Research stage, checked 2026-10-08. Comments only; no detector registered.
// No report supplied or analyzed. ALL failure signals below are hypotheses,
// not observed-log findings. The user selected Hector on WTFDIG.
//
// -- SOURCES AND CONFIDENCE --
// [H] WTFDIG Hector preset, all eight role selectors read; Parallel Aerial
//     and cleanse diagrams inspected. Selected Toxic/nomnom/Parallel:
//     https://wtfdig.info/74/m10s#hector
//     Hector video linked there: https://www.youtube.com/watch?v=17J1p4f2rIw
//     Original plans referenced by WTFDIG's text and diagrams:
// [TF] Toxic Friends: https://raidplan.io/plan/syjvfhacdxz7awet
// [N] nomnom snaking: https://raidplan.io/plan/Cmo_RpCDbsUSMV5c
// [P] Parallel Aerial: https://raidplan.io/plan/qWue79_md0YHCrnW
// [IV] Lyra, updated 2026-01-15, general encounter/raid damage:
//      https://www.icy-veins.com/ffxiv/aac-heavyweight-m2-savage-raid-guide
// Kitten ERP explains mechanics; its JP assignments differ from Hector:
// [KF] https://kitten-erp-guides.moe/savage/m10s/flame_floater
// [KT] https://kitten-erp-guides.moe/savage/m10s/sickest_takeoff
// [KA] https://kitten-erp-guides.moe/savage/m10s/insane_air
// [KN] https://kitten-erp-guides.moe/savage/m10s/snaking
// [KG] https://kitten-erp-guides.moe/savage/m10s/watery_grave
// [KS] https://kitten-erp-guides.moe/savage/m10s/split_arena
// [KX] https://kitten-erp-guides.moe/savage/m10s/xtreme_snaking
// [TL] A'rhaeda Vhil, updated 2026-01-31; provisional resolution clock:
//      https://thaliak.com/raids/m10s/
// [ID] Splatoon presets; candidate game IDs, not verified FFLogs IDs:
//      https://github.com/PunishXIV/Splatoon/blob/main/Presets/Dawntrail/Raids/The%20Arcadion%2010%20Savage.md
// No mechanic-changing hotfix established here. Counts/timers describe 7.4;
// later-patch damage, target selection and status duration need comparison.
//
// -- SEVERITY, ATTRIBUTION AND EVENT VOCABULARY --
// README's FFXIV exception: attributable avoidable hits/Damage Down are
// Major even when survived. Major names the root-cause player. Raid marks
// an unresolvable pull, possibly player-less. Ambiguous failures remain
// player-less Minor unless their outcome warrants a Raid cutoff.
// A clipped victim is not automatically responsible for the misplaced AoE.
// Retargets and reduced stack membership after deaths are downstream fallout.
// Spell names below cover casts, damage and auras; their IDs/event types are
// unknown unless labeled. Initial hits and aftershocks can have separate IDs.
// [ID] Candidate begincast/cast: Double-dip 46557, Reverse Alley-oop 46560.
// Normal snaking player-status candidates: game 4974/4975; FFLogs aura
// 1004974/1004975. Element-to-ID mapping is not established here.
// Deep Blue/Red Hot NPCNameIDs 14369/14370 and zone 1323 are NOT spell IDs.
// Fire object data IDs 2015025/2015026 are NOT Burns damage/tick IDs.
// Victim coordinates can show a hit location; they do not by themselves
// identify the bait owner, tether endpoint or fire puddle's original owner.
// Visual orbs, surfboards and tethers may be absent from captured log events.
//
// -- SHAPE, CLOCK AND ASSIGNMENTS --
// Red solo -> Blue solo -> both bosses -> Air 1 -> normal snaking -> prison
// -> split arena -> Xtreme snaking/Air 2 -> combined finish -> hard enrage.
// Scripted progression, no established boss-HP phase thresholds [IV]. Square
// deathwall arena becomes circular for Deep Aerial, then split by fire.
// Brotherly Love prevents either boss dying alone; Epic Brotherhood syncs
// their HP [TL]. Guides use both "shared" and "separate" HP terminology;
// the precise transfer events, not simultaneous player killing blows, matter.
// [TL] Approximate mm:ss from pull; hit times where labeled, otherwise
// reference mechanic events (not a proven cast/impact distinction):
//   0:14 Hot Impact; Floater hits 0:30/0:33/0:37/0:40; Inferno 0:53;
//   Cutback 1:03; Pyrotation hits 1:09/1:11/1:13; Dare 1:22; Blue 1:30.
//   Take-off 1:55, stack/spread 1:58; proteans 2:06/2:08; Impact 2:17;
//   Dare 2:24; both 2:32; Spectacular 2:41-2:54; Air 1 3:15-3:37;
//   Dare 3:50; snaking 4:05; proteans/fire 4:18/4:21; Hot Impact 4:29;
//   Varial 4:37; circles 4:40; Aerial hits 4:50/4:53/4:55/4:57;
//   Take-off 5:02; circles 5:04; Cutback 5:08; Impact 5:14; Dare 5:21.
//   Tower 5:36; prison targetable 5:39; waves 5:47/5:56/6:04/6:13/
//   6:22/6:30; reference prison break B=6:32; Dare 6:40; divide 6:56;
//   Inferno 7:05; proteans 7:11/7:13; pairs 7:19; Take-off 7:27;
//   stacks 7:29; Dare 7:34; Xtreme 7:50; Air 2 starts 8:04; Dare 8:48;
//   final proteans 9:05/9:07, fire 9:07; stacks 9:16/9:18/9:20;
//   Impact 9:16; Dares 9:29/9:38; Over the Falls 9:59.
// B depends on the prison's destruction; later offsets are reference times,
// not proven fixed pull deadlines. Air 2 timing entries in TL are ambiguous.
// [TF] G1=MT/H1/M1/R1, G2=OT/H2/M2/R2; actual roster mapping unsupplied.
// Opening proteans BOSS-relative: MT N, OT S, H1 W, H2 E, M1 SW, M2 SE,
// R1 NW, R2 NE. First Take-off: G1 left/G2 right when facing Blue.
// Air 1 starts G1 NW/Blue, G2 SE/Red. Air spreads: M-T-H-R clockwise.
// Normal snaking follows actual color; MT generally Blue, OT generally Red.
//
// -- FIRE, STEAM, ARENA EDGE AND RAID DAMAGE [IV, KF, KA, KN] --
// What happens: Red's ground attacks leave shaped persistent fire; entering
// active fire gives Burns (player aura/periodic damage). Water through fire
// creates Steam Burst circles with Damage Down. Divers' Dare clears fire.
// Newly placed fire has a short activation grace [KF], not a proven log
// threshold. Spectacular sends both bosses across the arena with proximity
// damage and repeated raid hits; move north/south away from their paths.
// Correct play: preserve routes for future water attacks; heal/mitigate Dare,
// Spectacular Hit/Finale, normal/Xtreme snaking raid damage and boss autos.
// Failure: fire contact -> LOG SIGNAL: Burns application/ticks; FAULT:
// entrant if voluntary, otherwise earlier forced-movement cause; Major.
// Steam hit -> LOG SIGNAL: Steam Burst damage plus Damage Down; FAULT:
// misplaced water bait or obstructing fire placement if established, otherwise
// unknown; Major if attributable, Raid only at an unrecoverable collapse.
// Deathwall -> LOG SIGNAL: lethal environment hit or death without killing
// ability after movement; FAULT: entrant/knockback cause if established;
// Major. A no-ability death alone also fits a called reset.
// Removal: Dare removes ground fire; leaving fire ends exposure, not
// necessarily the same instant as Burns removal. Death effects unestablished.
// Not errors: ordinary raid hits, scripted steam detonations away from
// players, fire's inactive grace and planned proximity damage taken safely.
//
// -- HOT IMPACT / DEEP IMPACT [IV, KN, TF] --
// What happens: Hot Impact is a shared physical tankbuster on Red's eligible
// enmity leader. Normal water status excludes direct targeting. Deep Impact
// is a physical AoE tankbuster on Blue's furthest eligible player, with KB.
// Correct play: tanks share Hot Impact, then separate. During snaking the
// water tank can intentionally help the fire tank. Blue tank baits Deep
// Impact away and uses KB immunity; non-tanks stay closer to Blue.
// Failure: wrong bait/party cleave -> LOG SIGNAL: Impact on non-tanks or
// multiple nearby victims; FAULT: tank placement or player stealing far bait
// if distances establish it; Major. A lone dead tank is not proof of a
// missed share without membership, mitigation and invulnerability evidence.
// Removal: no persistent assignment aura established for either Impact.
// Not errors: intended tank damage, water tank helping Hot Impact, planned
// solo invulnerability and correctly mitigated knockback immunity.
//
// -- FLAME FLOATER [KF, TF] --
// What happens: four random carriers get First/Second/Third/Fourth in Line;
// Red dashes to each in order, leaving rectangular fire. Distance tethers
// require sufficient length AT THAT DASH, from Red's previous endpoint.
// Intended hits give Fire Resistance Down II through the sequence [TL].
// Correct play: TF wall route #1 CCW corner, #2 next CCW wall, #3 corner
// nook, #4 original start; keep untargeted players outside each dash path.
// Failure: short tether -> LOG SIGNAL: lethal Floater Hit on numbered
// carrier, supported by dash origin/target distance; FAULT: carrier; Major.
// Collateral dash -> LOG SIGNAL: extra victims/second hit under fire vuln;
// FAULT: off-path entrant or misplaced carrier, whichever geometry supports;
// Major. Merely receiving the intended hit does not prove a short tether.
// Removal: numbered assignments resolve with their dash; fire vuln clears
// by sequence end. Carrier-death retargeting/early effects are unestablished.
// Not errors: four carrier hits/vulns, untargeted melee keeping safe uptime.
//
// -- ALLEY-OOP INFERNO / CUTBACK BLAZE / PYROTATION [IV, TF, KN] --
// What happens: Inferno personal fire circles leave puddles (eight normally,
// four fire players during snaking). Cutback aims broad ~330-degree fire at
// the furthest eligible player, leaving the narrow opposite slice safe.
// Pyrotation shares three successive circle hits, each leaving fire.
// Correct play: Inferno spread near edges; Cutback group between Red and
// previous fire to aim the safe slice into clear floor. Move together after
// each Pyrotation hit. Normal snaking excludes water players from fire baits.
// Failure: overlapping Inferno -> LOG SIGNAL: extra fire hits/vuln deaths;
// FAULT: misplaced circle owner if established; Major. Bad Cutback aim ->
// LOG SIGNAL: new fire obstructing escape, then Burns/steam casualties;
// FAULT: furthest bait owner if established, not each escaping victim; Major.
// Missed stack -> LOG SIGNAL: deficient Pyrotation recipients/deaths;
// FAULT: absent required helper if established, else unknown; Major if named,
// Raid only when recovery is impossible. Later hits after deaths are fallout.
// Removal: circles persist until Dare; intended vulnerabilities expire.
// Not errors: assigned spread hits, shared stack damage and Cutback's
// unavoidable damage component; avoidable ground exposure is separate.
//
// -- SICK SWELL / SICKEST TAKE-OFF / DEEP VARIAL [KT, KN, N] --
// What happens: wall wave knocks everyone across the arena; Blue's chosen
// lane has the dangerous Take-off line/stronger KB. Then Awesome Splash
// spreads or Awesome Slab stacks: opening eight orbs/eight spreads, two
// orbs/two healer stacks; normal snaking four water spreads or one water stack.
// Varial is a wide N/S cone with the same four/one water follow-up.
// Correct play: avoid Blue's lane, allow safe KB or use immunity, then
// resolve actual stack markers. N puts water west/fire east and dodges the
// Varial cone; WTFDIG describes Blue opposite the wave (TL says same side).
// Failure: lane/cone hit -> LOG SIGNAL: Take-off/Varial avoidable damage,
// extreme KB or wall death; FAULT: player in lane/cone; Major. Bad water
// placement -> LOG SIGNAL: Splash overlap or Slab missing recipients/steam;
// FAULT: bait owner/missing helper if established; Major. Missing visual
// orb data alone cannot establish that a stack was mistakenly spread.
// Removal: wave/line are single events; splash/stack vulnerabilities expire.
// Not errors: Sick Swell's ordinary hit/KB, intended water circles, choosing
// immunity; N's Blue tank saves immunity for the subsequent Deep Impact.
//
// -- ALLEY-OOP DOUBLE-DIP / REVERSE ALLEY-OOP [KT, KS, TF, ID] --
// What happens: targeted water cones apply intended Magic Vulnerability Up;
// aftershock repeats old cones (Double) or strikes their flanks/gaps (Reverse).
// Initial personal cones are expected; aftershock hits give Damage Down.
// Correct play: opening boss-relative clocks; Double move into a free gap,
// Reverse retain the safe original angle. Normal snaking only targets water
// players, but their cone paths can still cross fire players/ground.
// Nomnom's tight normal-snaking baits dodge inward for BOTH aftershocks;
// its restricted corner angles override the opening Reverse stay rule.
// Failure: missed dodge -> LOG SIGNAL: Aftershock damage/Damage Down;
// FAULT: victim if their safe route remained available; Major. Initial
// cone clipping -> LOG SIGNAL: multiple initial hits/vuln-assisted death;
// FAULT: misplaced aim or entrant if geometry establishes it; Major.
// Removal: initial vulnerability expires; no dispel required by the plan.
// Not errors: one initial cone hit per target, and planned role clockspots.
//
// -- INSANE AIR 1 [KA, TF] --
// What happens: four destination volleys per boss, independently ordered;
// surfboard up=Vertical Blast/Plunge (nearest circular tankbuster), side=
// Re-entry Blast/Plunge (nearest aimed four-person cone stack), down=
// Blasting Snap/Plunging Snap (four nearest players' separate cones).
// Blast names belong to Red; Plunge names to Blue. Each has one tankbuster,
// one stack and two spreads. Red leaves fire; Blue can detonate that fire.
// Correct play: nearest tank handles buster, aim stack/spreads outward using
// MTHR order; preserve landing space, particularly Red-first/Blue-last spread.
// Failure: wrong nearest bait or overlapping cone -> LOG SIGNAL: attack on
// non-tank, double damage under Magic Vulnerability Up, deficient stack
// membership or Steam Burst; FAULT: bait/placement owner if established;
// Major, Raid at unrecoverable loss of the required groups.
// Removal: intended magic vuln expires between mechanics; fire until Dare.
// Not errors: every assigned hit/vuln, four-person stack participation,
// different simultaneous mechanics on the two bosses in Air 1.
//
// -- NORMAL FIRESNAKING / WATERSNAKING AND HOT AERIAL [KN, N] --
// What happens: proximity assigns four fire and four water statuses; near/
// far can give either color. Normal statuses filter targeting, not immunity.
// The sequence overlaps water proteans, fire puddles, shared Hot Impact,
// Varial/circles, four far-target Hot Aerials, Take-off, Cutback/Deep Impact.
// Correct play: bait G1 near Blue/G2 near Red, then follow the received
// color, including tanks provoking the matching boss when necessary.
// N: water tight 2/2 in Blue's NW/SW corner, DPS cornerward/supports inward;
// fire box along east wall. Aerial farthest FIRE order T-H-M-R: T/M use far
// positions, H/R nearer corner fire, others near original fire; leave for
// middle after own jump. Fire tank aims Cutback's safe slice at D (west).
// Failure: wrong distribution/rotation -> LOG SIGNAL: unexpected status
// recipients, repeat Aerial under Fire Resistance Down II or cross-element
// Steam Burst; FAULT: proximity/bait owner if established; Major. Assigned
// G1/G2 alone cannot prove fault when the debuff required swapping groups.
// Removal: normal color/vuln statuses end by their scripted duration;
// opposite-element contact is not the Xtreme cleanse mechanic below.
// Not errors: normal color swaps, water tank helping Hot Impact, each
// intended Aerial/vuln; the original JP bait order T-H-R-M is another plan.
//
// -- DEEP AERIAL / WATERY GRAVE / XTREME WAVE [KG, P] --
// What happens: central two-person tower traps its soakers in one targetable
// Watery Grave; bosses untargetable until it breaks. Inmates cannot move,
// can still cast, and need healing. About 60s to destroy it or expiry kills
// inmates and detonates the prison for a raid wipe. Six paired distance
// dashes follow, random tethers among free players; no consecutive repeat.
// Red through bubble removes ~15% max HP and causes intended Scathing Steam
// raid damage; Blue through bubble grants temporary Vulnerability Down.
// Six correct Red hits supply ~90%; players supply the remaining damage.
// Correct play: both healers take tower. P first fire tether goes to A/C
// through center; water goes straight N/S along the offset outer lane.
// Second water returns to its initial corner, then parallel separated paths
// repeat; every Red dash crosses prison, every Blue dash misses it. Stretch
// each tether from the CURRENT boss location; bystanders avoid both lanes.
// Failure: short/cleaving dash -> LOG SIGNAL: Xtreme Wave lethal damage or
// extra victims; FAULT: tether owner or lane entrant if established; Major.
// Water touches bubble -> LOG SIGNAL: Vulnerability Down on prison;
// FAULT: Blue tether carrier if known; Major. Fire misses -> LOG SIGNAL:
// missing expected bubble hit/Scathing Steam; FAULT: Red carrier if known;
// Major, but absence alone needs proof of a completed dash and valid capture.
// Tower miss -> LOG SIGNAL: tower penalty (name unknown)/wrong prisoners;
// FAULT: assigned healer if eligibility established; Major. Failed release
// -> LOG SIGNAL: Watery Grave expires with inmates alive, lethal prison
// detonation (name unknown); FAULT: known earlier miss, otherwise unknown;
// CONSEQUENCE: Raid at the demonstrated failed deadline.
// Removal: destroying prison releases inmates/removes Watery Grave. Natural
// expiry is lethal. Inmate-death/raise effects before expiry unestablished.
// Not errors: tower hits, inmate periodic damage, stretched tether hits,
// Scathing Steam, delaying burst until bosses return; no personal DPS blame
// follows solely from an intact prison. Blue's buff is not the same as steam.
//
// -- SPLIT ARENA / FREAKY PYROTATION [KS, TF] --
// What happens: fixed Floater burns N-S center; G1 west/G2 east. Inferno
// spreads, Blue jumps west/east for proteans, four two-person fire stacks on
// supports OR DPS, then Take-off KB and two light-party stacks (always stack).
// Correct play: personal drops at side edges: T/R north, H/M south, still
// separate. Pair MT/R1 NW, OT/R2 NE, H1/M1 SW, H2/M2 SE. Near-side proteans
// fan normally; far side compresses north/south angles. Far T/M move toward
// intercardinal gaps for Double, toward cardinal middle for Reverse; far
// H/R retain their Reverse angles. Immunity keeps the two groups on their
// sides for KB/stacks; clear the dive lane and subsequent steam explosions.
// Failure: far-side wrong dodge -> LOG SIGNAL: Aftershock/Damage Down;
// FAULT: player if correct bait was available; Major. Missing pair/LP stack
// -> LOG SIGNAL: Freaky Pyrotation/Slab reduced recipient set and casualties;
// FAULT: missing assigned partner/helper if established; Major. Crossing
// divide or water/fire collision -> Burns/Steam Burst as modeled above.
// Removal: center strip and circle fire clear with next Dare.
// Not errors: fixed unbaited Floater, two-person hits, KB immunity, far
// melee moving during Reverse; the opening "Reverse=stay" rule differs here.
//
// -- XTREME FIRESNAKING / WATERSNAKING, INSANE AIR 2 [KX, H, TF] --
// What happens: proximity again gives four of each color. These XTREME
// auras do not filter boss targeting. Opposite-element attack cleanses an
// aura and produces Bailout damage/brief nearby Magic Vulnerability Up.
// Unremoved aura expires lethally. Four Air volleys reuse the first set's
// attacks; the tankbuster volley is synchronized, other pattern matching
// differs between sources. Multiple nearby cleanses can kill their group.
// Correct play: start matching color except healers already opposite;
// cleanse H -> M -> R over the three non-tankbuster volleys, exchanging
// corresponding players permanently before their turn. Tanks exchange for
// the synchronized tankbuster, immediately if it comes first. Each tank
// must remain nearest on the opposite boss; healers wait for the first
// non-buster. Groups remain far enough apart that Bailouts do not overlap.
// Failure: simultaneous nearby cleanses -> LOG SIGNAL: multiple aura
// removals/Bailouts with repeated vuln-assisted damage; FAULT: extra early
// swapper if order/positions establish it; Major. Missed cleanse -> LOG
// SIGNAL: lethal expiry without a prior opposite hit/Bailout; FAULT: living
// carrier who missed their required turn, unless earlier fallout; Major.
// Wrong buster bait -> LOG SIGNAL: Vertical hit on non-tank or stacked
// victims; FAULT: wrong closest player if established; Major. Raid cutoff
// requires unrecoverable loss, not just one surviving Xtreme aura.
// Removal: intended opposite hit triggers Bailout; expiry kills. Aura
// removal on carrier death, dispel, or resurrection is not established.
// Not errors: one planned cleanse per separated group, both tanks cleansing
// on the same volley, Bailout/brief vuln, permanent cross-group swaps.
//
// -- FINAL DOUBLE ALLEY-OOP / ENRAGE [KX, TF] --
// What happens: eight water proteans plus eight fire circles; then triple
// Pyrotation overlaps far Deep Impact. Two late Dares precede Over the Falls.
// Correct play: TRUE-north clocks (same slot mapping as opening); Double
// rotate CW, Reverse stay, then clear personal fire. Party stacks under
// Blue and moves CW around Red; Blue tank alone goes far for Impact/KB.
// Failure: overlapping cones/circles or stolen Impact -> LOG SIGNAL: extra
// hit/vuln death, Aftershock/Damage Down or buster on party; FAULT: bait/
// placement owner if established; Major. Over the Falls completion/deaths
// -> LOG SIGNAL: enrage cast/damage; FAULT: collective damage shortfall;
// CONSEQUENCE: player-less Raid. Approximate reference hard deadline 9:59.
// Removal: final Dare clears fire; intended stack vulnerabilities expire.
// Not errors: planned combined hits and late raid damage. No modeled stacking
// resource soft enrage; prison's deadline is a separate objective check.
//
// -- STRATEGY VARIANCE --
// Hector selects Toxic opening/Air/split, nomnom normal snaking, Parallel
// prison and HMR Xtreme cleanses. JP wall Floater, JP T-H-R-M Aerial,
// nonparallel prison lanes and attack-type-based cleanse priorities also
// exist. Nomnom allows 1/3 instead of tight 2/2 water angles to protect fire.
// These change assignments/normal positions, not the underlying failures.
// A non-Hector position, burst choice or supported invulnerability is not
// itself an error. Named slot blame requires the group's actual roster/plan.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Which cast, initial/aftershock damage, Burns tick, penalty and aura IDs
//    map to each name? Confirm 46557/46560 and normal status color mapping;
//    distinguish normal vs Xtreme auras and their apply/remove/death events.
// 2. What are actual dash minimum lengths, fire grace, cone/circle widths,
//    KB distances, snapshots and vuln durations? Cutback ordinary hit vs
//    avoidable ground, Steam Burst vs Scathing Steam need distinct IDs.
// 3. Does Varial originate opposite/same side as the wave? Are Air 2's
//    non-buster types paired or independent? What are all four hit offsets?
// 4. Which actors expose dash endpoints, numbered carriers and far/near bait
//    targets? Can initial hits name owners despite log-source boss/helper?
// 5. What are Watery Grave's spawn HP, defense-buff duration, actual 60s
//    deadline/penalty, under/over-soak result and inmate-death behavior?
//    Does early destruction shorten later phases or move hard enrage?
// 6. Do dead Floater/Xtreme carriers trigger effects or retarget? Can raise
//    preserve/reset assignments? What is Bailout's delay, range and expiry
//    death ability? Does tank invulnerability permit intentional variants?
// 7. What events implement Brotherly Love/Epic Brotherhood? Do missing
//    helpers have distinct stack/tower penalty spells or only larger hits?
// 8. Which Hector slots are actual roster players? Which failures were
//    observed versus guide-only, and which deaths represent called resets?
