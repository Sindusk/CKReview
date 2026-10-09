// lib/mechanics/ffxiv/arcadion/red-hot-deep-blue.ts
//
// Red Hot and Deep Blue (M10S) per-pull rules. Entry point:
// detectRedHotDeepBlueErrors. Self-gates on Hot Impact / Flame Floater /
// Divers' Dare, so it is safe on every pull.
//
// -- VERIFIED AGAINST LOGS (2026-10-09) --
// One static, week-1 progression, 96 pulls over three reports. Cited as
// A12 +213.3 (report letter, pull, seconds from pull start):
//   A = jN3XDrf2z8PmLgRJ (53 wipes, reached the prison at best),
//   B = xFAfGP3qX4yJhDrV (39 wipes, prison through enrage; B35 enraged),
//   C = d3vRbwfpNBLzJ2Xh (3 wipes + the kill, C4, 579.8s).
// Roster slots (user): MT PLD, OT DRK, H1 AST, H2 SGE, M1 RPR, M2 DRG,
// R1 DNC, R2 RDM. The strategy was mixed week-1 improvisation, NOT Hector
// (user): no rule depends on a clock spot or group assignment.
//
// Clock (kill; every pull within ~1s): Hot Impact +15, Floater dashes
// +31/+34/+38/+41, Inferno +54, Cutback +64, Pyrotation +70/+72/+74, Dare
// +84; Sick Swell/Take-Off +116, Slab or Splash +119, Double-Dip/Reverse
// +127 (aftershock +129), Deep Impact +137, Dare +145; Spectacular +170;
// Air 1 volleys +199/+206/+213/+221; Dare +230; snaking +246, Inferno +259,
// Double-Dip/Reverse +259, Hot Impact +270, Varial +277, Inferno +281,
// Aerial +291..+298, Take-Off +303, Cutback +309, Deep Impact +315, Dare
// +322; Deep Aerial tower +337; Xtreme Waves +348..+392 (6, every 8.6s);
// prison deadline +396 (Impact Zone); Dare +401; split Floater +417,
// Inferno +426, Reverse +432, Freaky Pyrotation +440, Slab +451, Dare +455;
// Xtreme snaking +471; Air 2 volleys +489/+499/+510/+520; Dare +529;
// Reverse +545, Pyrotation +557, Deep Impact +557; Dares +570/+579; Over
// the Falls (enrage) +600 (B35, Red Hot at 5.9%). The prison phase is fixed
// length: breaking the bubble early doesn't move later mechanics.
//
// Log IDs (model candidates corrected where brackets say so):
// - Burns 1003065/1003066: the fire-contact status (no Damage Down). Cutback
//   Blaze's own fire lights 3.0-3.3s after its hit [model: "short grace"].
// - Damage Down causes (only these four): Double-Dip aftershock 46559,
//   Reverse aftershock 46562, Deep Varial 46547, Steam Burst 46587 (an
//   Xtreme Aether cast with the victim as its target). The initial cones
//   (46558/46561) give Magic Vulnerability Up, not Damage Down.
// - Sickest Take-Off 46542 (the lane) kills without Damage Down.
// - Flame Floater dashes 46523-46526 in order; carriers hold First..Fourth
//   in Line 1003004/1003005/1003006/1003451, removed at their dash. Clean
//   carrier hits 17-136k; a carrier dying alone took 186-296k [short tether].
// - Hot Impact 46518 = opening shared buster (2 tanks; 28 of 96 had one
//   tank, nobody died). 46464 = snaking version on Red Hot's top-enmity
//   Firesnaking player; the fire tank often eats it alone under an invuln.
// - Deep Impact cast 46519, hit 44486 (target named on the cast when only
//   one player is hit; ground-targeted otherwise). Knockback: a tank with
//   no immunity hits the deathwall and dies with NO killing blow ~2.6s
//   later (C4 +557, A10, A34, A41, A46, B3, B22).
// - Snaps: Blasting 46577 / Plunging 46578, eight cones per volley, one per
//   target, targets named on the casts. Instance numbers collide between
//   Red Hot and Deep Blue (A12 +213: Red Hot #5 and Deep Blue #5 in one
//   volley), so a cone's owner is caster + instance.
// - Vertical Blast/Plunge 46585/46586: nearest-player buster (1 hit clean).
// - Re-Entry Blast/Plunge 46581/46582: four-person cone stacks.
// - Pyrotation 46531: three stacks; the MT routinely sits out hits 2-3
//   (C3/C4/B5/B9 all 7 of 8), so a missing player is only counted when the
//   stack killed someone.
// - Xtreme Wave 46545 (Red) / 46546 (Blue); inmates hold Watery Grave
//   1004829. Clean holder hits 0-60k; deaths are single 188-296k hits (full
//   HP, a short tether) or a holder taking both colors in one wave.
// - Impact Zone 46572 at +396 = the prison's deadline: kills all 8.
//   Unmitigated Explosion 46565 = Deep Aerial tower unsoaked (once, A).
// - Xtreme Firesnaking/Watersnaking auras 1004827/1004828. Each cleanse
//   (aura removed by an opposite attack) casts Bailout 46512/46513 on the
//   cleanser, shared by players near them (~15k each in the kill). No
//   lethal aura expiry was seen; the failures were several same-color
//   cleanses on one volley (B11 +488.6 four Fire, six dead; B17, B24, B32).
// - Over the Falls 46588/46589: the enrage.
// - Walking Dead 1000811 (OT's Living Dead) running its full 10s ends in a
//   no-killing-blow death 2s later (A23 +280.5).
// - The huge (1-13M) amounts on some hits are FFLogs' unpaired previews of
//   lethal hits; they are counted as hits but never as evidence.
//
// Failure findings (all pulls):
// - Floater: 34 errors before the cutoffs (collateral hits and carriers
//   killed by their own dash); the 4th carrier knocked into the wall (A2
//   +40.5, A12 +34.0).
// - Cutback fire caught 4-8 players at once 14 times (A5/A6/A45/B7: all
//   8); 0 burns after 102 of 139 Cutbacks.
// - Insane Air 1 Snap overlaps ended many day-1 pulls (A9-A16 +199..+221):
//   players took 2-5 cones each.
// - Deep Impact hit 3-7 players during snaking (+315) in 9 pulls, each a
//   cutoff; a lone non-tank took it as the farthest twice (A42 +138,
//   A36 +315).
// - Snaking Hot Impact killed a non-tank when no tank had Firesnaking
//   (A13-A20 +270).
// - Prison deadline missed: A44, B3, B4, B9, B19, B20, B25, B31, B37.
// - Collapse: 5 dead was survived 63-125s three times (A2, A35, A42); the
//   other pulls reaching 5 dead ended within 45s, so the marker is 5 dead
//   with the pull ending within 45s.
// - Called wipes: players walk into the deathwall (no killing blow), often
//   through fire, in the last seconds.
//
// Cutoffs (first Raid error): collapse 39, called wipe 26, Deep Impact 9,
// prison 9, Cutback fire 7, Xtreme cleanses 4, enrage 1 (B35); the kill
// has none. Its only errors: Reverse aftershock x2 and Steam Burst (Damage
// Down) and the MT knocked into the wall by the last Deep Impact (C4 +557).
//
// -- RULES IMPLEMENTED --
// ffxiv-rhdb-avoidable (Major; Take-Off Minor unless it killed): the four
//   Damage Down causes plus Sickest Take-Off. Steam on a prison inmate is
//   skipped (they can't move).
// ffxiv-rhdb-fire (Minor; Major if they died burning): Burns episodes.
//   4+ players lighting up with Cutback's fire is one player-less Minor
//   naming the Cutback target (farthest player from Red Hot) and whether
//   the safe slice opposite them landed on earlier Inferno/Pyrotation fire
//   (user, 2026-10-09: a geometry puzzle; A5 the R1 put it on the dropped
//   puddles), plus a Raid when it killed 3+. Burns
//   that end in a called-wipe death are skipped.
// ffxiv-rhdb-wall (Major): a no-killing-blow death outside a called wipe:
//   "knocked" when a knockback (Deep Impact, Sick Swell, Take-Off, Floater)
//   hit them in the 4.5s before, else "walked". Walking Dead running out is
//   a player-less Minor instead.
// ffxiv-rhdb-floater (Major): a non-carrier hit by a dash; a carrier killed
//   by their own dash (not after being clipped earlier).
// ffxiv-rhdb-overlap (Major): one player hit by another player's bait
//   (Inferno circles, Double-Dip/Reverse cones, Snaps, Splash, Hot Aerial)
//   names both, or by 2+ unowned instances names the victim; Freaky
//   Pyrotation: standing in two pair stacks. The all-party Double-Dip /
//   Reverse volleys (+126, +545) use boss-relative clock spots (CLOCK_SPOT;
//   user, 2026-10-09): there only players 30+ degrees off their spot near
//   the overlap are named (A10 +2:07 H2, not the OT). Stray Snap cones carry
//   no cast target, so Snap overlaps name only the players hit twice.
// ffxiv-rhdb-buster (Major): a non-tank in Hot Impact or in someone else's
//   Vertical buster; a non-tank who drew Vertical as the nearest (tanks
//   alive and not dead in the last 30s); snaking Hot Impact on a non-tank
//   names the tank with Firesnaking (player-less Minor when none had it).
// ffxiv-rhdb-deep-impact (Major): the target is the farthest player it hit
//   (user, 2026-10-09). A non-tank target baited it (A8 +2:18 the H2); a
//   tank target that also hit non-tanks blames the tank under 6y from Deep
//   Blue, else the victims (off the hitbox); Raid at 3+ deaths.
// ffxiv-rhdb-stack: Pyrotation that killed someone names living non-tanks
//   outside it (Major); Re-Entry under four with a death (player-less Minor).
// ffxiv-rhdb-xtreme-wave (Major): both colors in one wave; a single dash
//   killing its holder. ffxiv-rhdb-prison (Raid): Impact Zone at the
//   deadline; player-less Minor for an unsoaked tower.
// ffxiv-rhdb-xtreme-cleanse (Major on every same-color cleanser of a
//   volley with 2+; Raid when 3+ died in the next 4s).
// ffxiv-rhdb-enrage, -called-wipe (3+ no-killing-blow deaths at the end),
//   -collapse (Raid): only before any other Raid.
// The Damage Down causes are excluded from ffxiv-damage-down (error-rules.ts).
//
// Not built (no clean signal, or needs data the module doesn't get):
// Vulnerability Down on the Watery Grave (Blue dash through the bubble: an
// enemy buff, not passed to this module); Awesome Slab membership (stack
// count varies by color and phase); lethal Xtreme aura expiry (never seen).
//
// -- GUIDE-DERIVED MODEL: RED HOT / DEEP BLUE (M10S) --
// The Xtremes, AAC Heavyweight M2 (Savage), Arcadion, patch 7.4; Savage only.
// Research stage, checked 2026-10-08. Written before any report was
// analyzed; VERIFIED AGAINST LOGS above wins every disagreement. The user
// selected Hector on WTFDIG.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import { yd, kFmt, sec, joinNames, playerError, playerlessMinor, raidMarker, rezzedAt, clusterByGap, debuffIntervals } from "@/lib/mechanics/wow/common";
import { ARENA_CENTER, angularDistance, compassBearingOf, facingToCompassBearing } from "@/lib/mechanics/geometry";
import { detectFFRoles, type FFRoleSlot } from "@/lib/mechanics/ffxiv/roles";

export const RHDB_AVOIDABLE_RULE_ID     = "ffxiv-rhdb-avoidable";
export const RHDB_FIRE_RULE_ID          = "ffxiv-rhdb-fire";
export const RHDB_WALL_RULE_ID          = "ffxiv-rhdb-wall";
export const RHDB_FLOATER_RULE_ID       = "ffxiv-rhdb-floater";
export const RHDB_OVERLAP_RULE_ID       = "ffxiv-rhdb-overlap";
export const RHDB_BUSTER_RULE_ID        = "ffxiv-rhdb-buster";
export const RHDB_DEEP_IMPACT_RULE_ID   = "ffxiv-rhdb-deep-impact";
export const RHDB_STACK_RULE_ID         = "ffxiv-rhdb-stack";
export const RHDB_XTREME_WAVE_RULE_ID   = "ffxiv-rhdb-xtreme-wave";
export const RHDB_PRISON_RULE_ID        = "ffxiv-rhdb-prison";
export const RHDB_CLEANSE_RULE_ID       = "ffxiv-rhdb-xtreme-cleanse";
export const RHDB_ENRAGE_RULE_ID        = "ffxiv-rhdb-enrage";
export const RHDB_COLLAPSE_RULE_ID      = "ffxiv-rhdb-collapse";
export const RHDB_CALLED_WIPE_RULE_ID   = "ffxiv-rhdb-called-wipe";

// ── IDs (see VERIFIED AGAINST LOGS) ─────────────────────────────────────────

const SIGNATURE           = [46518, 46522, 46520, 46521]; // Hot Impact, Flame Floater, Divers' Dare x2
const DAMAGE_DOWN         = 1002911;
const BURNS               = [1003065, 1003066];
const FIRE_SNAKING        = 1004974;
const WATER_SNAKING       = 1004975;
const XTREME_FIRE         = 1004827;
const XTREME_WATER        = 1004828;
const WATERY_GRAVE        = 1004829;
const FLOATER_DASH        = [46523, 46524, 46525, 46526];        // dashes 1-4
const IN_LINE             = [1003004, 1003005, 1003006, 1003451]; // First..Fourth in Line
const HOT_IMPACT_SHARED   = 46518; // opening shared buster on Red Hot's top two
const HOT_IMPACT_SNAKING  = 46464; // snaking: Red Hot's top-enmity Firesnaking player
const DEEP_IMPACT         = 44486;
const DEEP_IMPACT_CAST    = 46519; // Deep Blue's own cast: its position
// A Deep Impact tank this close to Deep Blue brought it onto the party.
// Clean opening casts: tank 8.0-16y out, party 0-7y (A/B/C +138).
const TANK_MIN_YD         = 6;
const VERTICAL            = [46585, 46586]; // Vertical Blast / Plunge (nearest-player buster)
const PYROTATION          = 46531;
const CUTBACK_BLAZE       = 46538;
const CUTBACK_CAST        = 46537; // Red Hot's own cast: its position
const INFERNO             = 46529;
const DIVERS_DARE         = [46520, 46521];
// Cutback leaves ~60 degrees safe (user: a ~300 degree attack). Puddles
// under the boss's hitbox don't count against the slice.
const CUTBACK_SAFE_HALF_ANGLE = 30;
const CUTBACK_HITBOX          = 300;
const RE_ENTRY            = [46581, 46582]; // four-person cone stacks
const XTREME_WAVE_RED     = 46545;
const XTREME_WAVE_BLUE    = 46546;
const IMPACT_ZONE_EXPIRY  = 46572; // the Watery Grave's deadline detonation
const UNMITIGATED_EXPL    = 46565; // Deep Aerial tower left unsoaked
const OVER_THE_FALLS      = [46588, 46589];
const SICK_SWELL          = 46540;
const WALKING_DEAD        = 1000811; // Dark Knight's Living Dead follow-up
const WALKING_DEAD_FULL_MS = 9500;
const SICKEST_TAKE_OFF    = 46542;

// Knockbacks: a player dying with no killing blow shortly after one of
// these hit them was thrown into the deathwall.
const KNOCKBACKS: Record<number, string> = {
  [DEEP_IMPACT]: "Deep Impact", [SICK_SWELL]: "Sick Swell", [SICKEST_TAKE_OFF]: "Sickest Take-Off",
  46523: "Flame Floater", 46524: "Flame Floater", 46525: "Flame Floater", 46526: "Flame Floater",
};

type Avoidable = { name: string; hit: string; why?: string; noDamageDown?: boolean };
const AVOIDABLE: Record<number, Avoidable> = {
  46559: { name: "Double-Dip Aftershock", hit: "Hit by an Alley-Oop Double-Dip aftershock",
    why: "Double-Dip repeats every water cone a moment later; step out of where the cones fired into a gap." },
  46562: { name: "Reverse Alley-Oop Aftershock", hit: "Hit by a Reverse Alley-Oop aftershock",
    why: "Reverse Alley-Oop's second hit fires into the gaps between the first cones; stay where the first cone hit." },
  46547: { name: "Deep Varial", hit: "Caught in Deep Varial, Deep Blue's wide cone",
    why: "Deep Varial cleaves a wide cone across the arena from the side Deep Blue jumps to; move out of it." },
  46587: { name: "Steam Burst", hit: "Hit by a Steam Burst",
    why: "Water passing through fire leaves steam that bursts a moment later; keep clear of steaming fire." },
  [SICKEST_TAKE_OFF]: { name: "Sickest Take-Off", hit: "Hit by Sickest Take-Off, Deep Blue's surfboard line", noDamageDown: true,
    why: "Deep Blue surfs down one lane during the wave; stand outside its lane." },
};

// Baits with one target per instance: a player hit by another player's
// instance (or by two at once) is an overlap. `stack` families share
// damage by design, so only standing in two of them at once counts.
// `clock`: an all-party cone volley baited from boss-relative clock spots
// (see CLOCK_SPOT); only players off their spot are blamed when it overlaps.
type Family = { name: string; ids: number[]; what: string; why: string; stack?: boolean; clock?: boolean };
const FAMILIES: Family[] = [
  { name: "Alley-Oop Inferno", ids: [46529], what: "fire circle",
    why: "Each marked player drops their own circle; spread so no one stands in someone else's." },
  { name: "Alley-Oop Double-Dip", ids: [46558], what: "water cone", clock: true,
    why: "Each marked player baits their own cone from Deep Blue; keep the angles apart so no cone crosses someone else." },
  { name: "Reverse Alley-Oop", ids: [46561], what: "water cone", clock: true,
    why: "Each marked player baits their own cone from Deep Blue; keep the angles apart so no cone crosses someone else." },
  { name: "Insane Air Snaps", ids: [46577, 46578], what: "Snap cone",
    why: "The surfboard's Snap fires a separate cone at each of the four nearest players per boss; aim them outward, apart from each other." },
  { name: "Awesome Splash", ids: [46543, 46551], what: "water spread",
    why: "Awesome Splash is a spread on each marked player; stand apart." },
  { name: "Hot Aerial", ids: [47390, 47391, 47392, 47393], what: "Hot Aerial jump",
    why: "Red Hot jumps at the farthest fire player each time; only that player may be under it." },
  { name: "Freaky Pyrotation", ids: [46487], what: "pair stack", stack: true,
    why: "Freaky Pyrotation is four two-person stacks; each player stands in exactly one." },
];

// Boss-relative clock spots for the all-party Double-Dip / Reverse volleys
// (+126 and +545), degrees clockwise from Deep Blue's front (user,
// 2026-10-09: the OT is behind the boss, H2 to its right). Deep Blue's
// logged facing points at the OT's spot, so "front" is facing + 180.
const CLOCK_SPOT: Record<FFRoleSlot, number> = { MT: 0, OT: 180, H1: 270, H2: 90, M1: 225, M2: 135, R1: 315, R2: 45 };
const CLOCK_SPOT_NAME: Record<FFRoleSlot, string> = {
  MT: "in front", OT: "behind", H1: "on the left", H2: "on the right",
  M1: "back-left", M2: "back-right", R1: "front-left", R2: "front-right",
};
const CLOCK_CASTS: Record<number, number> = { 46557: 46558, 46560: 46561 }; // boss cast -> initial cones
// Clean volleys put every player 0-24 degrees from their spot (630 player-
// volleys); misplaced players were 35-135 off (A9, A10 H2 104, B11 R2 60).
const CLOCK_TOLERANCE  = 30;
// The layout is in use when this many stood on their spots (the snaking
// and split-arena volleys use other layouts and fail this).
const CLOCK_LAYOUT_MIN = 5;
// An off-spot player is the cause of an overlap within this angle of it.
const CLOCK_CONE_REACH = 45;

// FFLogs logs the death event ~2.0s after the fatal hit (README).
const DEATH_EVENT_LAG_MS = 2000;
const DIED_FROM_HIT_MS   = 3000;
// A no-killing-blow death within this of a knockback hit was thrown into
// the wall (clean examples land 2.1-3.2s after the hit; see header).
const WALL_KNOCKBACK_MS  = 4500;
// No-killing-blow deaths this close to the pull's end are the wipe being
// called (players walking into the deathwall to reset).
const CALLED_WIPE_END_MS = 6000;
const CALLED_WIPE_COUNT  = 3;
const CALLED_WIPE_WINDOW = 10_000;
// 5 dead was survived 63-125s three times (A2/A35/A42); every other pull that
// reached 5 dead ended within 45s.
const COLLAPSE_DEAD_COUNT = 5;
const COLLAPSE_END_MS     = 45_000;
// A tank dead in this window before a buster has lost enmity.
const TANK_ENMITY_LOST_MS = 30_000;
// Cutback Blaze's fire lights 3.0-3.3s after its hit; 4+ players starting
// Burns in this window is the party in the wrong place (clean: 0 in 102 of
// 139 Cutbacks; group failures caught 4-8 at once).
const CUTBACK_FIRE_FROM_MS = 2500;
const CUTBACK_FIRE_TO_MS   = 4000;
const CUTBACK_GROUP_BURNS  = 4;
// Deep Impact or Xtreme cleanse deaths that end the pull.
const MASS_DEATHS         = 3;

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

function hitsOf(players: PlayerInfo[], ids: number | number[], from = -Infinity, to = Infinity): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) if (set.has(e.abilityId) && e.timestamp >= from && e.timestamp <= to) out.push({ p, e });
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

/** The aura was on the player at `t` (applied before, not yet removed). */
function hasAura(p: PlayerInfo, id: number, t: number): boolean {
  return debuffIntervals(p, id).some((w) => w.start <= t && w.end > t) ||
    p.debuffs.some((e) => e.abilityId === id && e.debuffStatus === "applied" && e.timestamp <= t &&
      !p.debuffs.some((r) => r.abilityId === id && r.debuffStatus === "removed" && r.timestamp > e.timestamp));
}

const uniq = <T,>(xs: T[]) => [...new Set(xs)];
const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
const diedText = (d: DeathEvent | undefined) => (d ? ", and died" : "");
const dist = (a: PlayerEvent, b: PlayerEvent) =>
  a.x !== undefined && a.y !== undefined && b.x !== undefined && b.y !== undefined ? Math.hypot(a.x - b.x, a.y - b.y) : undefined;
const isTank = (p: PlayerInfo) => p.role === "Tank";

/** Hits clustered into resolutions (one volley of a mechanic). */
function resolutions(players: PlayerInfo[], ids: number[], gapMs = 1500): Hit[][] {
  return clusterByGap(hitsOf(players, ids), (h) => h.e.timestamp, gapMs);
}

/**
 * Owner (cast target) of each instance in a resolution, from the casts just
 * before its hits. Keyed by caster + instance: Red Hot and Deep Blue number
 * their instances separately, and one volley can use both.
 */
type Owners = { get: (e: PlayerEvent) => PlayerInfo | undefined };
function instanceOwners(casts: EnemyEvent[], ids: number[], res: Hit[], players: PlayerInfo[]): Owners {
  const t0 = res[0].e.timestamp, t1 = res[res.length - 1].e.timestamp;
  const out = new Map<string, PlayerInfo>();
  for (const c of casts) {
    if (!ids.includes(c.abilityId) || c.timestamp < t0 - 2000 || c.timestamp > t1 || c.sourceInstance === undefined || !c.target) continue;
    const p = players.find((x) => x.name === c.target);
    if (p) out.set(`${c.actorName}#${c.sourceInstance}`, p);
  }
  return { get: (e) => (e.sourceInstance === undefined ? undefined : out.get(`${e.source}#${e.sourceInstance}`)) };
}
const instanceKey = (e: PlayerEvent) => `${e.source}#${e.sourceInstance}`;

/** A tank whose recent death (or raise) cost them enmity before `t`. */
function tankOutRecently(life: Life, p: PlayerInfo, t: number): boolean {
  return !life.hitAlive(p, t) || life.outIntervals.some((w) => w.p === p && w.start <= t && w.end >= t - TANK_ENMITY_LOST_MS);
}

// ── plain avoidable hits ────────────────────────────────────────────────────

function detectAvoidable(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    // An inmate of the Watery Grave can't move: steam on them isn't theirs.
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && life.hitAlive(p, e.timestamp) &&
      ((e.amount ?? 0) > 0 || gotDamageDown(p, e.timestamp)) && !hasAura(p, WATERY_GRAVE, e.timestamp));
    for (const g of clusterByGap(hits, (e) => e.timestamp, 3000)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + (e.amount ?? 0), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const dd = g.some((e) => gotDamageDown(p, e.timestamp));
      // No Damage Down and survived: healable, so Minor (README FFXIV exception).
      const minor = !dd && !death && kinds.every((k) => k.noDamageDown);
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      const outcome = [dd ? "got Damage Down" : "", death ? "died" : ""].filter(Boolean).join(" and ");
      const why = kinds.map((k) => k.why).filter(Boolean).join(" ");
      errors.push(playerError(p, {
        ruleId: RHDB_AVOIDABLE_RULE_ID, severity: minor ? "Minor" : "Major", name: `Hit by ${kinds.map((k) => k.name).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${outcome ? ` They ${outcome}.` : ""}${why ? ` ${why}` : ""}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── fire on the floor (Burns) ───────────────────────────────────────────────

/**
 * Standing in Red Hot's fire puddles: the Burns status. No Damage Down and
 * healable, so Minor unless the player died while it was on them.
 */
/**
 * Where a Cutback Blaze pointed (user, 2026-10-09): it targets the farthest
 * player from Red Hot and leaves its safe slice on the opposite side of the
 * boss. Counts the phase's earlier fire puddles (Inferno circles and
 * Pyrotation stacks since the last Divers' Dare) inside that slice.
 */
function cutbackAim(players: PlayerInfo[], casts: EnemyEvent[], hitT: number) {
  const boss = castsOf(casts, CUTBACK_CAST).filter((c) => c.timestamp <= hitT && c.timestamp >= hitT - 3000 && c.x !== undefined && c.y !== undefined).pop();
  if (!boss) return undefined;
  const at = { x: boss.x!, y: boss.y! };
  const spots = hitsOf(players, CUTBACK_BLAZE, hitT - 200, hitT + 1000).filter((h) => h.e.x !== undefined && h.e.y !== undefined)
    .map((h) => ({ p: h.p, d: Math.hypot(h.e.x! - at.x, h.e.y! - at.y), pos: h.e as { x: number; y: number } }));
  const far = spots.sort((a, b) => b.d - a.d)[0];
  if (!far) return undefined;
  const safe = (bearingFrom(at, far.pos) + 180) % 360;
  const lastDare = Math.max(-Infinity, ...castsOf(casts, DIVERS_DARE).filter((c) => c.timestamp < hitT).map((c) => c.timestamp));
  const puddles = [
    ...hitsOf(players, INFERNO, lastDare, hitT).map((h) => h.e),
    // One fire per Pyrotation hit, under the stack: the hits' middle.
    ...clusterByGap(hitsOf(players, PYROTATION, lastDare, hitT), (h) => h.e.timestamp, 500).map((g) => {
      const xs = g.filter((h) => h.e.x !== undefined && h.e.y !== undefined);
      return xs.length ? { x: xs.reduce((s, h) => s + h.e.x!, 0) / xs.length, y: xs.reduce((s, h) => s + h.e.y!, 0) / xs.length } : {};
    }),
  ].filter((e): e is { x: number; y: number } => e.x !== undefined && e.y !== undefined);
  const fireInSlice = puddles.filter((e) => Math.hypot(e.x - at.x, e.y - at.y) > CUTBACK_HITBOX && angularDistance(bearingFrom(at, e), safe) <= CUTBACK_SAFE_HALF_ANGLE).length;
  const compass = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"][Math.round(safe / 45) % 8];
  return { target: far.p, targetDist: far.d, safeWhere: `to the ${compass} of the boss`, fireInSlice };
}

function detectFire(players: PlayerInfo[], life: Life, deaths: DeathEvent[], called: Set<DeathEvent>, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const episodesOf = (p: PlayerInfo) => {
    const spans = BURNS.flatMap((id) => debuffIntervals(p, id)).filter((w) => life.hitAlive(p, w.start)).sort((a, b) => a.start - b.start);
    const eps: { start: number; end: number }[] = [];
    for (const w of spans) {
      const last = eps[eps.length - 1];
      if (last && w.start <= last.end + 1500) last.end = Math.max(last.end, w.end);
      else eps.push({ ...w });
    }
    return eps;
  };
  const all = players.map((p) => ({ p, eps: episodesOf(p) }));
  // Cutback Blaze's fire activates ~3s after its hit (every burn that
  // followed one started 0.7-7.8s later, most at 3.0-3.3s). When most of the
  // party burns at once, the safe slice wasn't where they stood: a group
  // failure (bad aim or no movement), not each player's (model: Cutback).
  const groupBurns = new Set<{ start: number; end: number }>();
  for (const t of clusterByGap(hitsOf(players, CUTBACK_BLAZE), (h) => h.e.timestamp, 3000).map((g) => g[0].e.timestamp)) {
    const caught = all.flatMap(({ p, eps }) => eps.filter((ep) => ep.start >= t + CUTBACK_FIRE_FROM_MS && ep.start <= t + CUTBACK_FIRE_TO_MS).map((ep) => ({ p, ep })));
    if (uniq(caught.map((c) => c.p)).length < CUTBACK_GROUP_BURNS) continue;
    caught.forEach((c) => groupBurns.add(c.ep));
    const killed = uniq(caught.filter(({ p, ep }) => deaths.some((d) => d.player === p.name && !called.has(d) && d.timestamp - DEATH_EVENT_LAG_MS >= ep.start - 500 && d.timestamp - DEATH_EVENT_LAG_MS <= ep.end + 1000)).map((c) => c.p));
    const aim = cutbackAim(players, casts, t);
    const aimText = aim
      ? ` It was aimed at ${aim.target.name}, the farthest player from Red Hot (${yd(aim.targetDist)}y), which put the safe slice ${aim.safeWhere}${aim.fireInSlice ? `, where ${aim.fireInSlice} earlier fire puddle${aim.fireInSlice > 1 ? "s" : ""} (Inferno/Pyrotation) already burned` : " on floor with no earlier fire"}.`
      : "";
    errors.push(playerlessMinor(RHDB_FIRE_RULE_ID, "Party Caught in Cutback Fire",
      `${uniq(caught.map((c) => c.p)).length} players (${namesOf(caught.map((c) => c.p))}) were standing in Cutback Blaze's fire when it lit, ${sec(Math.min(...caught.map((c) => c.ep.start)) - t)}s after the hit${killed.length ? `; ${namesOf(killed)} died burning` : ""}.${aimText} Cutback targets the farthest player from Red Hot and sets ~300 degrees around the boss alight, leaving a safe slice on the opposite side; whoever is farthest has to point it so that slice lands on clear floor. Whether a clear slice was still possible depends on everything placed earlier, so nobody is named.`,
      t + 3000, CUTBACK_BLAZE, "Cutback Blaze"));
    if (killed.length >= MASS_DEATHS) {
      errors.push(raidMarker(RHDB_FIRE_RULE_ID, "Party Caught in Cutback Fire",
        `Cutback Blaze's fire killed ${killed.length} (${namesOf(killed)}). Unresolvable from here.`, t + 3000, CUTBACK_BLAZE, "Cutback Blaze"));
    }
  }
  for (const { p, eps } of all) {
    for (const ep of eps) {
      if (groupBurns.has(ep)) continue;
      const ticks = p.damageTaken.filter((e) => BURNS.includes(e.abilityId) && e.timestamp >= ep.start - 100 && e.timestamp <= ep.end + 100);
      const death = deaths.find((d) => d.player === p.name && d.timestamp - DEATH_EVENT_LAG_MS >= ep.start - 500 && d.timestamp - DEATH_EVENT_LAG_MS <= ep.end + 1000);
      // Walking through fire to reset after a called wipe isn't a mistake.
      if (death && called.has(death)) continue;
      const others = all.filter((o) => o.p !== p && o.eps.some((x) => Math.abs(x.start - ep.start) <= 3000)).map((o) => o.p);
      const total = ticks.reduce((s, e) => s + (e.amount ?? 0), 0);
      const dmg = ticks.length ? `${kFmt(total)} over ${ticks.length} tick${ticks.length === 1 ? "" : "s"}, ` : "";
      errors.push(playerError(p, {
        ruleId: RHDB_FIRE_RULE_ID, severity: death ? "Major" : "Minor", name: "Stood in Fire",
        description: `Walked into Red Hot's fire on the floor and took Burns (${dmg}${sec(ep.end - ep.start)}s).${others.length ? ` ${namesOf(others)} also entered fire within 3s.` : ""} Fire stays on the floor until Divers' Dare clears it; route around it. ${death ? "They died while burning." : "No Damage Down and the healers can heal through it, so it's minor."}`,
        timestamp: ep.start, abilityId: BURNS[0], abilityName: "Burns",
      }));
    }
  }
  return errors;
}

// ── deaths with no killing blow: the deathwall ──────────────────────────────

/** No-killing-blow deaths that are the wipe being called, not mistakes. */
function calledWipeDeaths(deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId);
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return out;
}

function detectWall(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.killingAbilityGameId || called.has(d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    const hitT = d.timestamp - DEATH_EVENT_LAG_MS;
    // Living Dead's Walking Dead ran its full 10s without the tank being
    // healed back up (A23 +4:42): the healing, not a wall.
    const wd = debuffIntervals(p, WALKING_DEAD).find((w) => Math.abs(w.end - hitT) <= 500 && w.end - w.start >= WALKING_DEAD_FULL_MS);
    if (wd) {
      errors.push(playerlessMinor(RHDB_WALL_RULE_ID, "Walking Dead Ran Out",
        `${p.name}'s Walking Dead (from Living Dead) expired before they were healed back to full, and they died. The healers have to heal the Walking Dead tank to full within its 10s.`,
        wd.end, WALKING_DEAD, "Walking Dead"));
      continue;
    }
    const kb = p.damageTaken.filter((e) => KNOCKBACKS[e.abilityId] && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - WALL_KNOCKBACK_MS).pop();
    const how = kb
      ? `Knocked into the deathwall by ${KNOCKBACKS[kb.abilityId]} (${sec(d.timestamp - kb.timestamp)}s before the death). ${kb.abilityId === DEEP_IMPACT ? "Deep Impact knocks its target back hard; the tank taking it uses knockback immunity or stands with room behind them." : kb.abilityId === SICK_SWELL || kb.abilityId === SICKEST_TAKE_OFF ? "The wave knocks everyone across the arena; start from the side it comes from or use knockback immunity." : "Each Floater dash knocks its carrier back; leave room behind you."}`
      : "Died with no killing blow: walked into the deathwall.";
    errors.push(playerError(p, {
      ruleId: RHDB_WALL_RULE_ID, severity: "Major", name: kb ? "Knocked Into the Wall" : "Walked Into the Wall",
      description: how,
      timestamp: kb ? kb.timestamp : hitT, abilityId: kb?.abilityId ?? 0, abilityName: kb ? KNOCKBACKS[kb.abilityId] : "Deathwall",
    }));
  }
  return errors;
}

// ── Flame Floater ───────────────────────────────────────────────────────────

/**
 * Four dashes at the First..Fourth in Line carriers. Anyone else hit was in
 * the dash's path; a carrier killed by their own dash with nothing else
 * wrong had too short a tether.
 */
function detectFloater(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  const clipped = new Map<PlayerInfo, number>(); // player -> time they took someone else's dash
  FLOATER_DASH.forEach((id, k) => {
    for (const res of resolutions(players, [id], 1000)) {
      const t = res[0].e.timestamp;
      // The carrier's In Line status ends at their dash.
      const carrier = players.find((p) => p.debuffs.some((e) => e.abilityId === IN_LINE[k] && e.debuffStatus === "removed" && Math.abs(e.timestamp - t) <= 1500));
      for (const { p, e } of res) {
        if (!life.hitAlive(p, e.timestamp)) continue;
        const death = life.diedFrom(p, e.timestamp);
        if (carrier && p !== carrier) {
          clipped.set(p, e.timestamp);
          errors.push(playerError(p, {
            ruleId: RHDB_FLOATER_RULE_ID, severity: "Major", name: "Hit by Someone Else's Floater Dash",
            description: `Stood in the path of Flame Floater dash #${k + 1} to ${carrier.name} (${kFmt(e.amount ?? 0)})${diedText(death)}. Red Hot dashes to each numbered carrier in turn; everyone else stays out of the line between the boss and the carrier. The hit leaves Fire Resistance Down, so a later dash of their own becomes deadly.`,
            timestamp: e.timestamp, abilityId: id, abilityName: "Flame Floater",
          }));
        } else if (p === carrier && death?.killingAbilityGameId === id && !(clipped.has(p) && clipped.get(p)! < e.timestamp)) {
          errors.push(playerError(p, {
            ruleId: RHDB_FLOATER_RULE_ID, severity: "Major", name: "Floater Tether Too Short",
            description: `Died to their own Flame Floater dash #${k + 1} (${kFmt(e.amount ?? 0)}). The dash hurts less the farther it travels: stretch the tether away from where Red Hot stands before it dashes.`,
            timestamp: e.timestamp, abilityId: id, abilityName: "Flame Floater",
          }));
        }
      }
    }
  });
  return errors;
}

// ── boss-relative clock spots ───────────────────────────────────────────────

type Slots = Map<PlayerInfo, FFRoleSlot>;
/** One Double-Dip / Reverse volley: each hit player's angle clockwise from Deep Blue's front. */
type ClockVolley = { t: number; hitId: number; angles: Map<PlayerInfo, number> };

/** Compass bearing of `p` as seen from `from`. */
const bearingFrom = (from: { x: number; y: number }, p: { x: number; y: number }) =>
  compassBearingOf(p.x - from.x + ARENA_CENTER, p.y - from.y + ARENA_CENTER);

function clockVolleys(players: PlayerInfo[], casts: EnemyEvent[]): ClockVolley[] {
  const out: ClockVolley[] = [];
  for (const c of castsOf(casts, Object.keys(CLOCK_CASTS).map(Number))) {
    if (c.facing === undefined || c.x === undefined || c.y === undefined) continue;
    const front = facingToCompassBearing(c.facing) + 180;
    const hitId = CLOCK_CASTS[c.abilityId];
    const angles = new Map<PlayerInfo, number>();
    for (const p of players) {
      const h = p.damageTaken.find((e) => e.abilityId === hitId && e.timestamp >= c.timestamp && e.timestamp <= c.timestamp + 2000 && e.x !== undefined && e.y !== undefined);
      if (h) angles.set(p, ((bearingFrom(c as { x: number; y: number }, h as { x: number; y: number }) - front) % 360 + 360) % 360);
    }
    out.push({ t: c.timestamp, hitId, angles });
  }
  return out;
}

/**
 * Party slots for this pull. Healers and ranged come from their jobs
 * (roles.ts); tanks and melee are paired by where they stood in the clock
 * volleys (roles.ts's job default swaps this roster's melee, and its
 * first-auto-attack MT was the OT in A1).
 */
function resolveSlots(players: PlayerInfo[], volleys: ClockVolley[]): Slots {
  const roles = detectFFRoles(players);
  const slots: Slots = new Map();
  for (const r of roles) if (r.player) slots.set(r.player, r.slot);
  const deviation = (p: PlayerInfo, slot: FFRoleSlot) =>
    volleys.reduce((s, v) => s + (v.angles.has(p) ? angularDistance(v.angles.get(p)!, CLOCK_SPOT[slot]) : 0), 0);
  for (const [a, b] of [["MT", "OT"], ["M1", "M2"]] as [FFRoleSlot, FFRoleSlot][]) {
    const pa = roles.find((r) => r.slot === a)?.player, pb = roles.find((r) => r.slot === b)?.player;
    if (!pa || !pb) continue;
    if (deviation(pa, b) + deviation(pb, a) < deviation(pa, a) + deviation(pb, b)) { slots.set(pa, b); slots.set(pb, a); }
  }
  return slots;
}

/** Each player's angle and distance from their clock spot, when the volley used the layout. */
function clockLayout(v: ClockVolley | undefined, slots: Slots): Map<PlayerInfo, { angle: number; dev: number; slot: FFRoleSlot }> | undefined {
  if (!v) return undefined;
  const out = new Map<PlayerInfo, { angle: number; dev: number; slot: FFRoleSlot }>();
  for (const [p, angle] of v.angles) {
    const slot = slots.get(p);
    if (slot) out.set(p, { angle, dev: angularDistance(angle, CLOCK_SPOT[slot]), slot });
  }
  return [...out.values()].filter((x) => x.dev <= CLOCK_TOLERANCE).length >= CLOCK_LAYOUT_MIN ? out : undefined;
}

/** Which clock spot an angle is closest to, in words. */
function clockWhere(angle: number): string {
  const best = (Object.keys(CLOCK_SPOT) as FFRoleSlot[]).sort((a, b) => angularDistance(angle, CLOCK_SPOT[a]) - angularDistance(angle, CLOCK_SPOT[b]))[0];
  return CLOCK_SPOT_NAME[best];
}

// ── bait overlaps (spreads, cones, jumps, pair stacks) ──────────────────────

/**
 * A player hit by an instance whose target was someone else (or by two
 * instances at once, for a pair stack). Both the player who was hit and the
 * player the bait belonged to are named: the log can't tell which of them
 * was out of place, and spacing is on both (README principle 3).
 */
function detectOverlaps(players: PlayerInfo[], life: Life, casts: EnemyEvent[], volleys: ClockVolley[], slots: Slots): PullError[] {
  const errors: PullError[] = [];
  for (const fam of FAMILIES) {
    for (const res of resolutions(players, fam.ids)) {
      const owners = instanceOwners(casts, fam.ids, res, players);
      // involved player -> description pieces and their hit
      const flagged = new Map<PlayerInfo, { parts: string[]; t: number; died: boolean; id: number; paired: boolean }>();
      const flag = (p: PlayerInfo, part: string, t: number, died: boolean, id: number, paired = true) => {
        const f = flagged.get(p) ?? { parts: [], t, died: false, id, paired: false };
        if (!f.parts.includes(part)) f.parts.push(part);
        f.t = Math.min(f.t, t); f.died ||= died; f.paired ||= paired;
        flagged.set(p, f);
      };
      const byPlayer = new Map<PlayerInfo, Hit[]>();
      // A hit that did nothing, not even to a shield, was an invulnerability
      // (A16 +213.0, the OT): it doesn't count.
      for (const h of res) {
        if (life.hitAlive(h.p, h.e.timestamp) && (h.e.amount ?? 0) + (h.e.absorbed ?? 0) > 0) byPlayer.set(h.p, [...(byPlayer.get(h.p) ?? []), h]);
      }
      for (const [v, hs] of byPlayer) {
        const instances = uniq(hs.map((h) => instanceKey(h.e)));
        const died = !!life.diedFrom(v, hs[hs.length - 1].e.timestamp);
        if (fam.stack) {
          if (instances.length < 2) continue;
          flag(v, `Stood in ${instances.length} of them at once (${hs.map((h) => kFmt(h.e.amount ?? 0)).join(" + ")})`, hs[0].e.timestamp, died, hs[0].e.abilityId, false);
          continue;
        }
        for (const h of hs.filter((x) => owners.get(x.e) !== v)) {
          const owner = owners.get(h.e);
          // Unknown owner: only a second hit on the same player says anything.
          if (!owner) {
            if (instances.length >= 2) flag(v, `Took ${instances.length} ${fam.what}s at once`, h.e.timestamp, died, h.e.abilityId, false);
            continue;
          }
          const own = owner.damageTaken.find((e) => fam.ids.includes(e.abilityId) && instanceKey(e) === instanceKey(h.e) && Math.abs(e.timestamp - h.e.timestamp) <= 1500);
          const d = own ? dist(own, h.e) : undefined;
          const gap = d !== undefined ? `, ${yd(d)}y apart` : "";
          flag(v, `Was hit by ${owner.name}'s ${fam.what} (${kFmt(h.e.amount ?? 0)}${gap})`, h.e.timestamp, died, h.e.abilityId);
          if (life.hitAlive(owner, h.e.timestamp)) flag(owner, `Their ${fam.what} hit ${v.name} (${kFmt(h.e.amount ?? 0)}${gap}${died ? `; ${v.name} died` : ""})`, h.e.timestamp, false, h.e.abilityId);
        }
      }
      // Boss-relative clock volleys: blame only players off their spot near
      // the overlap (user, 2026-10-09, A10 +2:07: the H2 stood behind the
      // boss with the OT; only the H2 was wrong).
      const layout = fam.clock && flagged.size
        ? clockLayout(volleys.find((v) => fam.ids.includes(v.hitId) && Math.abs(v.t - res[0].e.timestamp) <= 2500), slots)
        : undefined;
      if (layout) {
        const victims = [...flagged.keys()].filter((p) => layout.has(p));
        const culprits = [...layout].filter(([, x]) => x.dev > CLOCK_TOLERANCE &&
          victims.some((v) => angularDistance(layout.get(v)!.angle, x.angle) <= CLOCK_CONE_REACH)).map(([p]) => p);
        if (culprits.length) {
          const hitText = joinNames(victims.map((v) => `${v.name} (${byPlayer.get(v)?.length ?? 0} cones${flagged.get(v)!.died ? ", died" : ""})`));
          for (const p of culprits) {
            const x = layout.get(p)!;
            errors.push(playerError(p, {
              ruleId: RHDB_OVERLAP_RULE_ID, severity: "Major", name: `${fam.name}: Out of Position`,
              description: `${fam.name}: as ${x.slot} they belong ${CLOCK_SPOT_NAME[x.slot]} relative to Deep Blue's facing, but stood ${clockWhere(x.angle)} (${Math.round(x.dev)}° off), so the cones overlapped: ${hitText}. Every player takes a fixed spot around the boss, measured from the way it faces, so the eight cones fan out apart.`,
              timestamp: Math.min(...victims.map((v) => flagged.get(v)!.t)), abilityId: fam.ids[0], abilityName: fam.name,
            }));
          }
          continue;
        }
      }
      for (const [p, f] of flagged) {
        errors.push(playerError(p, {
          ruleId: RHDB_OVERLAP_RULE_ID, severity: "Major", name: `${fam.name} Overlap`,
          description: `${fam.name}: ${f.parts.join(". ")}${f.died ? ", and died" : ""}. ${fam.why}${f.paired ? " The log can't tell which of the two was out of place, so both are flagged." : ""}`,
          timestamp: f.t, abilityId: f.id, abilityName: fam.name,
        }));
      }
    }
  }
  return errors;
}

// ── tank busters ────────────────────────────────────────────────────────────

function detectBusters(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  const tanksReady = (t: number) => tanks.length === 2 && tanks.every((p) => !tankOutRecently(life, p, t));

  // Opening Hot Impact: shared by the two tanks; anyone else stood in it.
  for (const res of resolutions(players, [HOT_IMPACT_SHARED])) {
    const t = res[0].e.timestamp;
    if (!tanksReady(t)) continue;
    for (const { p, e } of res.filter((h) => !isTank(h.p) && life.hitAlive(h.p, h.e.timestamp))) {
      errors.push(playerError(p, {
        ruleId: RHDB_BUSTER_RULE_ID, severity: "Major", name: "Hit by Hot Impact",
        description: `Took Hot Impact, the tanks' shared buster (${kFmt(e.amount ?? 0)})${diedText(life.diedFrom(p, e.timestamp))}. Only the two tanks share it; everyone else stays away from them.`,
        timestamp: e.timestamp, abilityId: HOT_IMPACT_SHARED, abilityName: "Hot Impact",
      }));
    }
  }

  // Snaking Hot Impact: Red Hot's top-enmity Firesnaking player. A non-tank
  // target means the tank with Firesnaking didn't hold Red Hot.
  for (const res of resolutions(players, [HOT_IMPACT_SNAKING])) {
    const t = res[0].e.timestamp;
    const target = castsOf(casts, HOT_IMPACT_SNAKING).filter((c) => c.timestamp <= t && c.timestamp >= t - 2000 && c.target).pop()?.target;
    for (const { p, e } of res.filter((h) => !isTank(h.p) && life.hitAlive(h.p, h.e.timestamp))) {
      const died = life.diedFrom(p, e.timestamp);
      if (target && p.name !== target) {
        errors.push(playerError(p, {
          ruleId: RHDB_BUSTER_RULE_ID, severity: "Major", name: "Hit by Hot Impact",
          description: `Stood in Hot Impact aimed at ${target} (${kFmt(e.amount ?? 0)})${diedText(died)}. It's a tankbuster; stay away from its target.`,
          timestamp: e.timestamp, abilityId: HOT_IMPACT_SNAKING, abilityName: "Hot Impact",
        }));
        continue;
      }
      const fireTank = tanks.find((x) => life.hitAlive(x, t) && hasAura(x, FIRE_SNAKING, t - 500));
      const text = `Hot Impact went to ${p.name} (${kFmt(e.amount ?? 0)}${died ? ", died" : ""}): Red Hot's top enmity among the Firesnaking players wasn't a tank.`;
      if (fireTank && !tankOutRecently(life, fireTank, t)) {
        errors.push(playerError(fireTank, {
          ruleId: RHDB_BUSTER_RULE_ID, severity: "Major", name: "Hot Impact Hit a Non-Tank",
          description: `${text} ${fireTank.name} had Firesnaking, so it was theirs: the fire tank holds (or provokes) Red Hot during snaking.`,
          timestamp: e.timestamp, abilityId: HOT_IMPACT_SNAKING, abilityName: "Hot Impact",
        }));
      } else {
        errors.push(playerlessMinor(RHDB_BUSTER_RULE_ID, "Hot Impact Hit a Non-Tank",
          `${text} No living tank had Firesnaking to take it.`, e.timestamp, HOT_IMPACT_SNAKING, "Hot Impact"));
      }
    }
  }

  // Vertical Blast/Plunge: a buster on the nearest player. A non-tank target
  // stood closer to the boss than the tanks.
  for (const res of resolutions(players, VERTICAL, 500)) {
    const t = res[0].e.timestamp;
    const owners = instanceOwners(casts, VERTICAL, res, players);
    for (const { p, e } of res.filter((h) => !isTank(h.p) && life.hitAlive(h.p, h.e.timestamp))) {
      const owner = owners.get(e);
      if ((owner && owner !== p) || !tanksReady(t)) continue; // someone else's buster: below
      errors.push(playerError(p, {
        ruleId: RHDB_BUSTER_RULE_ID, severity: "Major", name: `Took ${e.abilityName}`,
        description: `Took ${e.abilityName}, the surfboard's tankbuster on the nearest player (${kFmt(e.amount ?? 0)})${diedText(life.diedFrom(p, e.timestamp))}. They were closer to the boss than either tank; the tank closest to that boss takes it, everyone else stays farther out.`,
        timestamp: e.timestamp, abilityId: e.abilityId, abilityName: e.abilityName,
      }));
    }
    for (const { p, e } of res.filter((h) => life.hitAlive(h.p, h.e.timestamp))) {
      const owner = owners.get(e);
      if (!owner || owner === p) continue;
      errors.push(playerError(p, {
        ruleId: RHDB_BUSTER_RULE_ID, severity: "Major", name: `Hit by ${e.abilityName}`,
        description: `Stood in ${e.abilityName} aimed at ${owner.name} (${kFmt(e.amount ?? 0)})${diedText(life.diedFrom(p, e.timestamp))}. It's a tankbuster; stay away from its target.`,
        timestamp: e.timestamp, abilityId: e.abilityId, abilityName: e.abilityName,
      }));
    }
  }
  return errors;
}

/**
 * Deep Impact: an AoE buster with knockback on the farthest player from
 * Deep Blue (user, 2026-10-09). The party stands on the hitbox and the tank
 * a little farther out (max melee) so it takes it. The AoE centers on its
 * target, the farthest player it hit:
 * - a non-tank target was too far from the boss and baited it (A8 +2:18:
 *   the H2 at 5.5y while the MT, unhit, was correctly placed);
 * - a tank target that also hit non-tanks: the tank was too close if under
 *   TANK_MIN_YD, otherwise the victims weren't on the hitbox.
 * 3+ deaths end the pull. Absolute distances only hold for the opening cast;
 * the snaking/final ones were taken away from the boss, so blame compares
 * players with each other.
 */
function detectDeepImpact(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of resolutions(players, [DEEP_IMPACT])) {
    const t = res[0].e.timestamp;
    const hit = res.filter((h) => life.hitAlive(h.p, h.e.timestamp));
    const nonTanks = uniq(hit.filter((h) => !isTank(h.p)).map((h) => h.p));
    if (nonTanks.length === 0) continue;
    const killed = uniq(hit.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const boss = castsOf(casts, DEEP_IMPACT_CAST).filter((c) => c.timestamp <= t && c.timestamp >= t - 3000 && c.x !== undefined && c.y !== undefined).pop();
    const fromBoss = (e: PlayerEvent) => (boss && e.x !== undefined && e.y !== undefined ? Math.hypot(e.x - boss.x!, e.y - boss.y!) : undefined);
    const ranked = [...hit].sort((a, b) => (fromBoss(b.e) ?? -1) - (fromBoss(a.e) ?? -1));
    const named = castsOf(casts, DEEP_IMPACT).filter((c) => c.timestamp <= t && c.timestamp >= t - 2000 && c.target).pop()?.target;
    const target = (named ? hit.find((h) => h.p.name === named) : undefined) ?? (fromBoss(ranked[0].e) !== undefined ? ranked[0] : undefined);
    const at = (h: Hit) => (fromBoss(h.e) !== undefined ? `${yd(fromBoss(h.e)!)}y` : "?y");
    const hitText = joinNames(ranked.map((h) => `${h.p.name} (${at(h)} out, ${kFmt(h.e.amount ?? 0)}${life.diedFrom(h.p, h.e.timestamp) ? ", died" : ""})`));
    const rule = "Deep Impact is an AoE tankbuster on the farthest player from Deep Blue: the party stands on the boss's hitbox and the tank a little farther out, at max melee, so it targets the tank.";
    if (!target) {
      errors.push(playerlessMinor(RHDB_DEEP_IMPACT_RULE_ID, "Deep Impact Hit the Party", `Deep Impact hit ${hitText}; positions are missing, so its target can't be told. ${rule}`, t, DEEP_IMPACT, "Deep Impact"));
    } else if (!isTank(target.p)) {
      const others = ranked.filter((h) => h !== target);
      errors.push(playerError(target.p, {
        ruleId: RHDB_DEEP_IMPACT_RULE_ID, severity: "Major", name: "Baited Deep Impact",
        description: `Was the farthest player from Deep Blue (${at(target)}) and baited Deep Impact (${kFmt(target.e.amount ?? 0)})${diedText(life.diedFrom(target.p, target.e.timestamp))}${others.length ? `; it also hit ${joinNames(others.map((h) => `${h.p.name} (${at(h)}${life.diedFrom(h.p, h.e.timestamp) ? ", died" : ""})`))}` : ""}. ${rule}`,
        timestamp: target.e.timestamp, abilityId: DEEP_IMPACT, abilityName: "Deep Impact",
      }));
    } else {
      const tankYd = fromBoss(target.e)!;
      const victims = ranked.filter((h) => !isTank(h.p));
      const blame = tankYd < TANK_MIN_YD * 100 ? [target] : victims;
      for (const h of blame) {
        errors.push(playerError(h.p, {
          ruleId: RHDB_DEEP_IMPACT_RULE_ID, severity: "Major", name: "Deep Impact Hit the Party",
          description: h === target
            ? `Took Deep Impact only ${at(target)} from Deep Blue, close enough that it also hit ${joinNames(victims.map((v) => `${v.p.name} (${at(v)}${life.diedFrom(v.p, v.e.timestamp) ? ", died" : ""})`))}. ${rule}`
            : `Stood ${at(h)} from Deep Blue, close enough to ${target.p.name} (the target, ${at(target)} out) to be caught by Deep Impact (${kFmt(h.e.amount ?? 0)})${diedText(life.diedFrom(h.p, h.e.timestamp))}. ${rule}`,
          timestamp: h.e.timestamp, abilityId: DEEP_IMPACT, abilityName: "Deep Impact",
        }));
      }
    }
    if (killed.length >= MASS_DEATHS) {
      errors.push(raidMarker(RHDB_DEEP_IMPACT_RULE_ID, "Deep Impact Hit the Party",
        `Deep Impact killed ${killed.length} (${namesOf(killed)}). Unresolvable from here.`, Math.max(...hit.map((h) => h.e.timestamp)), DEEP_IMPACT, "Deep Impact"));
    }
  }
  return errors;
}

// ── stacks ──────────────────────────────────────────────────────────────────

/**
 * Pyrotation is three party stacks in a row; the main tank routinely sits
 * hits two and three out (every clean pull), so a missing player is only an
 * error when the stack killed someone. Re-Entry is a four-person cone
 * stack: fewer than four with a death is player-less (any four may go).
 */
function detectStacks(players: PlayerInfo[], life: Life): PullError[] {
  const errors: PullError[] = [];
  for (const res of resolutions(players, [PYROTATION], 900)) {
    const t = res[0].e.timestamp;
    const inIt = uniq(res.map((h) => h.p));
    const killed = inIt.filter((p) => life.diedFrom(p, t));
    if (killed.length === 0) continue;
    const absent = players.filter((p) => !inIt.includes(p) && !isTank(p) && life.hitAlive(p, t) && life.alive(p, t + 1000));
    for (const p of absent) {
      errors.push(playerError(p, {
        ruleId: RHDB_STACK_RULE_ID, severity: "Major", name: "Missed the Pyrotation Stack",
        description: `Alive but not in a Pyrotation stack that killed ${namesOf(killed)} (${inIt.length} shared it). Pyrotation is three party stacks in a row; everyone moves with the stack between hits.`,
        timestamp: t, abilityId: PYROTATION, abilityName: "Pyrotation",
      }));
    }
  }
  for (const id of RE_ENTRY) {
    for (const g of resolutions(players, [id], 900)) {
      const t = g[0].e.timestamp;
      const inIt = uniq(g.map((h) => h.p));
      const killed = inIt.filter((p) => life.diedFrom(p, t));
      if (inIt.length >= 4 || killed.length === 0) continue;
      errors.push(playerlessMinor(RHDB_STACK_RULE_ID, `${g[0].e.abilityName} Under-Soaked`,
        `Only ${inIt.length} (${namesOf(inIt)}) shared ${g[0].e.abilityName}, a four-person cone stack, and ${namesOf(killed)} died. Which player should have joined can't be told from the log.`,
        t, g[0].e.abilityId, g[0].e.abilityName));
    }
  }
  return errors;
}

// ── Watery Grave prison and Xtreme Wave tethers ─────────────────────────────

/**
 * Six tether waves: each holder takes their boss's dash. A free player hit
 * by both bosses' dashes in one wave stood in the other lane; a holder
 * killed by a single dash had too short a tether. Inmates are skipped.
 */
function detectXtremeWave(players: PlayerInfo[], life: Life, casts: EnemyEvent[]): PullError[] {
  const errors: PullError[] = [];
  for (const res of resolutions(players, [XTREME_WAVE_RED, XTREME_WAVE_BLUE], 1200)) {
    const free = res.filter((h) => !hasAura(h.p, WATERY_GRAVE, h.e.timestamp) && life.hitAlive(h.p, h.e.timestamp));
    const byPlayer = new Map<PlayerInfo, Hit[]>();
    for (const h of free) byPlayer.set(h.p, [...(byPlayer.get(h.p) ?? []), h]);
    for (const [p, hs] of byPlayer) {
      const colors = uniq(hs.map((h) => h.e.abilityId));
      const last = hs[hs.length - 1].e;
      const death = life.diedFrom(p, last.timestamp);
      if (colors.length >= 2) {
        errors.push(playerError(p, {
          ruleId: RHDB_XTREME_WAVE_RULE_ID, severity: "Major", name: "Hit by Both Xtreme Waves",
          description: `Took both bosses' Xtreme Wave dashes in one wave (${hs.map((h) => kFmt(h.e.amount ?? 0)).join(" + ")})${diedText(death)}. Each tether holder takes only their own boss's dash; the two lanes must not cross, and everyone else stays out of both.`,
          timestamp: hs[0].e.timestamp, abilityId: last.abilityId, abilityName: "Xtreme Wave",
        }));
      } else if (death && hs.length === 1) {
        errors.push(playerError(p, {
          ruleId: RHDB_XTREME_WAVE_RULE_ID, severity: "Major", name: "Xtreme Wave Tether Too Short",
          description: `Died to a single Xtreme Wave dash (${kFmt(last.amount ?? 0)}). The dash hurts less the farther it travels: stretch the tether from the boss's current spot before it dashes.`,
          timestamp: last.timestamp, abilityId: last.abilityId, abilityName: "Xtreme Wave",
        }));
      }
    }
  }
  // The prison wasn't destroyed before its deadline: Impact Zone on everyone.
  const expiry = castsOf(casts, IMPACT_ZONE_EXPIRY)[0];
  if (expiry) {
    errors.push(raidMarker(RHDB_PRISON_RULE_ID, "Watery Grave Not Broken",
      "The Watery Grave wasn't destroyed in time and detonated (Impact Zone), killing everyone. Six Red Hot dashes through the bubble take most of its HP and the raid has to burst the rest; every missed or wrong-color dash makes the deadline harder. Unresolvable from here.",
      expiry.timestamp, IMPACT_ZONE_EXPIRY, "Impact Zone"));
  }
  for (const c of castsOf(casts, UNMITIGATED_EXPL)) {
    errors.push(playerlessMinor(RHDB_PRISON_RULE_ID, "Deep Aerial Tower Unsoaked",
      "The Deep Aerial tower went off without enough soakers (Unmitigated Explosion). Two players soak it and become the Watery Grave's inmates.",
      c.timestamp, UNMITIGATED_EXPL, "Unmitigated Explosion"));
  }
  return errors;
}

// ── Xtreme snaking cleanses ─────────────────────────────────────────────────

/**
 * Each Insane Air volley, one Xtreme Firesnaking and one Xtreme Watersnaking
 * player cleanses (by taking the opposite boss's attack), each dropping a
 * Bailout that leaves Magic Vulnerability Up around them. Several of one
 * color on the same volley stack their Bailouts and the next attacks kill.
 */
function detectCleanses(players: PlayerInfo[], life: Life, deaths: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];
  const removals: { p: PlayerInfo; t: number; color: "Fire" | "Water" }[] = [];
  for (const p of players) {
    for (const e of p.debuffs) {
      if (e.debuffStatus !== "removed" || (e.abilityId !== XTREME_FIRE && e.abilityId !== XTREME_WATER)) continue;
      // The cleansing hit itself can be the fatal one (B11 +488.6: four Fire
      // cleanses, all four dead), so a removal at a death still counts.
      if (!life.hitAlive(p, e.timestamp)) continue;
      const applied = p.debuffs.find((a) => a.abilityId === e.abilityId && a.debuffStatus === "applied" && a.timestamp <= e.timestamp);
      // The application itself can strip it at once (both colors); skip.
      if (!applied || e.timestamp - applied.timestamp < 1000) continue;
      removals.push({ p, t: e.timestamp, color: e.abilityId === XTREME_FIRE ? "Fire" : "Water" });
    }
  }
  for (const volley of clusterByGap(removals, (r) => r.t, 1000)) {
    const t = volley[0].t;
    const killed = uniq(deaths.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS >= t && d.timestamp - DEATH_EVENT_LAG_MS <= t + 4000).map((d) => d.player));
    let extra = false;
    for (const color of ["Fire", "Water"] as const) {
      const same = volley.filter((r) => r.color === color);
      if (same.length < 2) continue;
      extra = true;
      for (const r of same) {
        errors.push(playerError(r.p, {
          ruleId: RHDB_CLEANSE_RULE_ID, severity: "Major", name: "Cleansed Xtreme Snaking Out of Turn",
          description: `${same.length} players (${namesOf(same.map((x) => x.p))}) cleansed Xtreme ${color}snaking on the same volley${killed.length ? `; ${joinNames(killed)} died in the next 4s` : ""}. Only one player per color cleanses each volley (healers, then melee, then ranged; tanks on the tankbuster); the others stay on their own boss's attacks. Each cleanse drops a Bailout, and overlapping Bailouts make the next attacks lethal. The log can't tell whose turn it was, so all of them are flagged.`,
          timestamp: r.t, abilityId: color === "Fire" ? XTREME_FIRE : XTREME_WATER, abilityName: `Xtreme ${color}snaking`,
        }));
      }
    }
    if (extra && killed.length >= MASS_DEATHS) {
      errors.push(raidMarker(RHDB_CLEANSE_RULE_ID, "Xtreme Cleanses Overlapped",
        `Too many players cleansed Xtreme snaking on one volley and ${killed.length} died right after (${joinNames(killed)}). Unresolvable from here.`,
        Math.max(...volley.map((r) => r.t)), XTREME_FIRE, "Xtreme Firesnaking"));
    }
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * Red Hot and Deep Blue (M10S) errors. Self-gates on Hot Impact / Flame
 * Floater / Divers' Dare, which no other fight in the sample set casts.
 */
export function detectRedHotDeepBlueErrors(players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[]): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const life = buildLife(players, deathEvents);
  const pullEnd = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const called = calledWipeDeaths(deathEvents, pullEnd);
  const volleys = clockVolleys(players, enemyCasts);
  const slots = resolveSlots(players, volleys);

  const errors = [
    ...detectAvoidable(players, life),
    ...detectFire(players, life, deathEvents, called, enemyCasts),
    ...detectWall(players, deathEvents, called),
    ...detectFloater(players, life),
    ...detectOverlaps(players, life, enemyCasts, volleys, slots),
    ...detectBusters(players, life, enemyCasts),
    ...detectDeepImpact(players, life, enemyCasts),
    ...detectStacks(players, life),
    ...detectXtremeWave(players, life, enemyCasts),
    ...detectCleanses(players, life, deathEvents),
  ];

  const firstRaid = () => Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const enrage = castsOf(enemyCasts, OVER_THE_FALLS)[0];
  if (enrage && enrage.timestamp < firstRaid()) {
    const left = enrage.hitPoints !== undefined && enrage.maxHitPoints
      ? ` ${enrage.actorName} still had ${(100 * enrage.hitPoints / enrage.maxHitPoints).toFixed(1)}% HP left.` : "";
    errors.push(raidMarker(RHDB_ENRAGE_RULE_ID, "Over the Falls (Enrage)",
      `Over the Falls killed everyone — the hard enrage. The DPS check wasn't met.${left}`,
      enrage.timestamp, enrage.abilityId, "Over the Falls"));
  }
  // A called wipe: several no-killing-blow deaths together, before any
  // mechanic cutoff.
  const calledList = deathEvents.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT && calledList[0].timestamp - DEATH_EVENT_LAG_MS < firstRaid()) {
    errors.push(raidMarker(RHDB_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow at the end of the pull (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  // Pull-over marker: 5 dead at once with the pull ending soon after.
  const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
  const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
    .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && pullEnd - t <= COLLAPSE_END_MS);
  if (collapseT !== undefined && collapseT + DEATH_EVENT_LAG_MS < firstRaid()) {
    const who = outAt(collapseT).map((p) => p.name);
    errors.push(raidMarker(RHDB_COLLAPSE_RULE_ID, "Party Collapse",
      `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
      collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
