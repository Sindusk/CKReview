// lib/mechanics/ffxiv/trials/valigarmanda.ts
//
// -- GUIDE-DERIVED MODEL: VALIGARMANDA --
// Worqor Lar Dor (Extreme), level 100, Dawntrail patch 7.0; Extreme only.
// Research checked 2026-10-14. Comments only; no report analyzed, no
// failures observed, no detector registered. LOG SIGNALS are predictions.
//
// -- SOURCES AND PATCH SENSITIVITY --
// [BM] awgil/BossMod's firsthand Ex1Valigarmanda Enums, States, Triscourge,
// MountainFire, Beacons, Stance, ThunderPlatform, ThunderousBreath,
// Spikesicle, VolcanicDrop, HailOfFeathers, FreezingDust, NorthernCross,
// Ruinfall components. Path revision below, dated 2026-09-30:
// https://github.com/awgil/ffxiv_bossmod/tree/799524b33be594900dbad984ebb4d2ef8325d47a/BossMod.Modules/Dawntrail/Extreme/Ex1Valigarmanda
// Geometry/timers are public tool observations, not FFLogs verification;
// BM explicitly leaves some radii, angles and height behavior as TODOs.
// [DATA] XIVAPI Action names/cast times and Status descriptions/CanDispel:
// https://v2.xivapi.com/api/sheet/Action/37452?fields=Name,Cast100ms
// https://v2.xivapi.com/api/sheet/Status/3818?fields=Name,Description,CanDispel
// [IV] Lyra's original guide, July 1, 2024:
// https://www.icy-veins.com/ffxiv/worqor-lar-dor-extreme-trial-guide
// [TL] A'rhaeda Vhil's firsthand timeline, modified July 21, 2024:
// https://thaliak.com/extremes/worqor-lar-dor/
// [NA] Current NA RMMR / South to North / First Feather conventions:
// https://naurffxiv.com/extreme/worqor-lar-dor
// [JP] Hamkatsu macro; first-versus-second-feather strategy explanation:
// https://xivjpraids.com/7.0_dawntrail/extreme_trials/valigarmanda/
// [G8] Original Hamkatsu explanation and beacon role priorities:
// https://game8.jp/ff14/622480
// [SE] Patch 7.1, 2024-11-12: wipe-earned Echo +5%, maximum 25%, after
// >=3m attempts. Gear/Echo changes survivability and how much is seen:
// https://na.finalfantasyxiv.com/lodestone/topics/detail/9b42b2425f3a680caea3281ccd65c99677cb00e2
// No researched source establishes later target-count/geometry changes.
//
// -- LOG VOCABULARY, SEVERITY AND ATTRIBUTION --
// Numeric actions/statuses below are game-data candidates. Cast, damage,
// periodic tick and FFLogs ability mappings remain unverified. Helpers
// may own the hit instead of Valigarmanda's visual/controller cast.
// Candidate Status -> FFLogs aura uses 1000000 + row ID. Nondispellable:
// Calamity's Flames 3817, Inferno 3818, Embers 3819, Frost 3820, Bite 3821,
// Chill 3822, Bolt 3823, Fulgur 3824; Freezing Up 3523, Deep Freeze 4150,
// Levitate 3974, Perpetual Conflagration 4122, Trauma 3796 and Sustained
// Damage 3795. Prey 2939 is a candidate mark. Generic status 2552 with
// extra 0x2AE/0x21 is unnamed; not evidence of a player error. IDs recur
// in other fights. Mountain Fire Burns and Damage Down IDs are unsettled.
// Survived avoidables without Damage Down: Minor. Verified Damage Down or
// attributable death/wipe: Major, naming the root-cause player. Raid:
// irreversible wipe cutoff, possibly player-less. A collateral victim
// need not be the wrong stacker/dropper. Correct damage deaths belong to
// mitigation; missed mechanics after a death can be fallout, not new fault.
// Animations, map effects, height and raid calls may be absent from logs.
// No researched interrupt/Esuna duty. Death/early removal of delayed marks
// has no established trigger behavior; normal expiry triggers their effect.
//
// -- ARENA, PHASES AND CLOCK --
// BM arena: 40x30y rectangle, center (100,100), x80..120, z85..115;
// north decreases z. Valigarmanda NPC 0x4118 occupies the north edge,
// radius 20; no positionals [IV]. Auto-attack candidate damage 36892.
// Scripted opening FIRE -> THREE killable beacons -> Tulidisaster ->
// ICE/THUNDER in either order -> Wrath Unfurled -> Mountain Fire -> enrage.
// Both post-add elements occur once. No researched HP push besides killing
// all three beacons; element order is not a fixed Fire/Thunder/Ice rule.
// Skyruin controller casts (6s): Fire 38340, Ice 36817, Thunder 38339;
// helper damage 36820/36818/36819 respectively, ~5.5s after cast end.
// BM enum comments reverse Ice/Thunder; States/runtime and names govern.
// Disaster Zone casts Fire 36825 / Ice 36821 / Thunder 36823 (3s); damage
// 36826/36822/36824 at ~cast-start+3.8s restores ordinary terrain.
// Skyruin, Disaster and Triscourge damage are expected raidwides.
//
// Approximate BM timestamps, seconds from pull; starts unless named hit:
// Spikesicle +9.3, first curve +20.6; Fire Skyruin +36.0, hit +47.5;
// Triscourge +53.2; volcano hits +64.9..67.2; stance +70.3;
// Chill movement +86..88; Mountain Fire +89.4, towers +99..124 every 5s;
// healer fire stacks +133/136.1/139.2; Chill +148..150;
// volcano hits +157.6..159.9; stance +161; Bolt spread +179.1;
// Disaster +184.3; Ruin Foretold +191.4; beacons appear ~+198.3.
// K = boss retargetable after LAST beacon dies, a variable anchor.
// Tulidisaster starts K+7.7; hits K+17.9/+26.4/+34.4.
// S = first post-add Skyruin start = K+37.9. Element-relative offsets:
// ICE: Triscourge +17.2; fire/defamations +32.2; stance +42.6;
// Bolt +64.2; Spikesicle +69.8; stance +108.7; Freezing Dust +125.8;
// Bolt +141.1; Disaster +144.8; Ice Talon +152.9, hit +157.9.
// THUNDER: Triscourge +17.2; fire +32.2; Hail +39.5; Blighted +64.8;
// height spreads +80.3; stance +88; Breath +102.2; height spreads +120.3;
// stance +128.4; Disaster +141.5; Ruinfall +151.6, final hit +161.1.
// Second element starts S+161.0 if Ice first, S+161.7 if Thunder first.
// Wrath starts S+322.8; last Mountain starts S+338; towers S+347.6..372.6.
// Enrage starts S+379.3; lethal third hit S+406.1 = K+444.0.
// TL's example ends ~11:18; add kill speed shifts the absolute clock.
//
// -- PUBLISHED PLANS; NOT THE USER'S ASSIGNMENTS --
// JP pairs: NW MT/D1, NE OT/D2, SW H1/D3, SE H2/D4. Donut pairs spread
// within the inner safe area; cone puts tank/melee pairs in north corners,
// healer/ranged pairs farther west/east. Out: west->east H1/D3, MT/D1,
// OT/D2, H2/D4 (RMMR). NA likewise specifies RMMR facing north [NA, JP].
// Light parties: west MT/H1/D1/D3, east OT/H2/D2/D4 [JP]. Ice fire
// stacks exclude tanks: west H1/D1/D3, east H2/D2/D4; tanks NW/NE.
// Mountain: MT odd, OT even [JP]. NA fire-stack travel is south->north
// [NA]; other clear travel plans are valid if six puddles do not trap them.
// NA kills first feather. JP permits second: first offers more kill time,
// second avoids standing near the sixth fall while retaining melee uptime.
// Invulnerability use and knockback immunity are legitimate strategies.
//
// -- SPIKESICLE / SPHERE SHATTER --
// Cast 36850 (10s), controllers 36849/36851/36852; damage 36853..36856
// are expanding annuli (BM inner/outer 20/25,25/30,30/35,35/40y; inner
// radii TODO), 36857 is a 40x5y line. TEN curve/line hits ~1.2s apart.
// Preview alternates origin east/west; follow the displayed order, moving
// into the prior lane. First damage ~11.3s after controller start.
// Each endpoint creates Ice Boulder NPC 0x4492; Sphere Shatter 39261
// casts 1.5s, radius 13, ~6.5s after creation. TEN bursts overlap later
// curves, beginning after about the sixth curve. Dodge both sequences.
// Ice repetition overlaps Northern Cross; an inner-hitbox route is used
// [G8], but its exact safe tolerance is not established.
// Curve/boulder hit -> LOG SIGNAL: 36853..57/39261 damage plus Damage Down
// [TL]; FAULT: hit player; CONSEQUENCE: Major with verified DD, otherwise
// Minor survived / Major attributable death. No intended player hits.
// Boulders resolve their explosion and disappear; no kill duty established.
//
// -- STANCE ATTACKS AND ELEMENTAL CATACLYSMS --
// Susurrant Breath controller Thunder/Ice/Fire 36805/06/07 (6.5s), damage
// 36808 (7.3s helper): BM 50y frontal cone, full angle ~80deg (TODO).
// Correct: front side corners, outside cone. Slithering Strike 36809/10/11
// -> 36812: 24y frontal semicircle, out beyond maximum melee.
// Strangling Coil 36813/14/15 -> 36816: donut 8..30y, enter inner 8y.
// Visual stance/text cues replace a visible boss cast bar [IV]; candidate
// casts in game data do not imply players see those bars.
// Wrong region -> LOG SIGNAL: 36808/12/16 damage, Sustained Damage/Trauma
// candidates; FAULT: hit player; CONSEQUENCE: Minor survived, Major causal
// death. TL describes stacking Trauma progressing to Concussion; DATA
// agrees, threshold unknown. No DD established for stance damage itself.
//
// Charring Cataclysm damage 36804: FOUR radius-4 TWO-person fire pairs,
// ~0.7s after stance. DPS or supports receive the marks [IV]. Correct:
// opposite-role pairs take one hit each, separated from other pairs.
// Under-soak/overlap -> LOG SIGNAL: wrong 36804 target groups, extra hits
// with Fire Resistance Down II; FAULT: missing partner or misplaced pair
// only with assignment/position evidence; CONSEQUENCE: Minor survived,
// Major causal death. Correct pair damage/resistance debuff is expected.
// Chilling Cataclysm visual 36802 -> damage 36803: five star spheres
// (NPC 0x411B) [IV]; each makes two 40x5y crosses rotated 45deg, eight
// rays total [BM]. Hit ~6s after stance, mirrored north safe regions.
// Ray hit -> LOG SIGNAL: 36803 damage, freeze + Damage Down [TL]; FAULT:
// hit player; CONSEQUENCE: Major with DD. No intended ray damage.
// Crackling Cataclysm 36801: radius-6 player-baited puddles, 3s casts
// begin ~0.2s after stance. Correct: bait, then leave before impact.
// Puddle hit -> LOG SIGNAL: 36801 damage after bait; FAULT: hit player,
// or misplaced baiter if proven; CONSEQUENCE: Minor survived / Major
// causal death. Exact additional debuff and puddle persistence unsettled.
//
// -- FIRE TRISCOURGE / VOLCANIC DROP --
// Triscourge 36839 (3s) damages raid and assigns delayed elemental auras.
// FIRE: healers get Calamity's Inferno 3818; Scourge of Fire 36847 makes
// TWO four-person radius-5 stacks, THREE hits each, ~3.1s apart (six total).
// Each leaves a radius-6 fire ground object 0x1E8D9B ~0.9s later [BM].
// Correct: light parties travel together away from earlier puddles.
// Miss/overlap/puddle contact -> LOG SIGNAL: wrong 36847 hit groups or
// subsequent ground-effect damage; FAULT: absent assigned member / wrong
// moving stack, only if positions establish it; CONSEQUENCE: Minor lived,
// Major causal death. Own stacks and clean movement are expected damage.
// All receive Calamity's Chill 3822 and Bolt 3823. Chill converts to
// Freezing Up 3523 ~7s after its icon, requiring movement for ~2s; repeats
// during this section. Bolt resolves unmarked Scourge of Thunder 36842,
// radius 5, late in Fire. Correct: spread beyond overlapping radii.
// Overlap -> LOG SIGNAL: multiple 36842 hits or intersecting centers;
// FAULT: wrong spread player if identifiable; CONSEQUENCE: Minor survived,
// Major causal death. Each player's own thunder hit is expected.
//
// Volcanic Drop 36836: radius-2 random puddles, 2.5s casts; visual 36837
// -> damage 36838: radius-20 eruptions from (87,100) or (113,100).
// Bubbling bank chooses dangerous side; opposite side is safe. Each
// active eruption has FIVE 36838 events over ~2.3s [BM], with small
// puddle waves ~1s apart. Two windows, total small-puddle count unsettled.
// Wrong bank/puddle -> LOG SIGNAL: 36838/36836 damage; FAULT: hit player;
// CONSEQUENCE: Minor survived / Major causal death. No intended hits.
// Ground-object tick ID, lifetime and overlap side effects unsettled.
//
// -- MOUNTAIN FIRE: SIX TANK TOWERS, TWICE --
// Controller 36876 (4s); 36877..82 repositions; 36883..85 cone visuals;
// 36886..88 end actions. Tower damage 36889 (3.5s), radius 3, ONE tank;
// cone damage 36890 follows ~0.4s later. First tower ~5.6s after controller
// end; SIX towers 5s apart. Boss starts north, repositions N/NW/NE.
// Correct: alternate tanks; previous tank's Fire Resistance Down II
// prevents ordinary consecutive soaks. Burns is an expected tank DoT.
// Everyone else, including resting tank, aligns boss -> tower -> party
// inside the tower's shadow. BM models ~30deg safe wedge (TODO angle).
// Empty tower -> LOG SIGNAL: missing tank soak, raid damage with Vuln and
// Burns [TL]; distinct penalty ID/name unresolved. FAULT: assigned tank
// if known; CONSEQUENCE: Minor survived / Major causal death, Raid only
// if collapse is irreversible. TL explicitly describes survivable misses.
// Wrong shadow -> LOG SIGNAL: 36890 lethal damage despite tower soaked;
// FAULT: out-of-shadow player, not automatically the tower tank;
// CONSEQUENCE: Major. Unprotected repeat soak -> LOG SIGNAL: 36889 while
// Fire Resistance Down II remains; FAULT: repeat soaker; CONSEQUENCE:
// Minor survived / Major causal death. Correct tower/Burns is expected.
// IV suggests three hits per invulnerability; TL says at most two plus
// Burns. Longer invuln rotations are disputed, not an established failure.
// Final set follows Wrath's damage buff. Lockout/DoT duration and removal
// remain unresolved; no Esuna plan or forced swap of boss aggro described.
//
// -- RUIN FORETOLD / THREE BEACONS --
// Ruin Foretold 38546 (5s) expected raidwide; boss untargetable ~0.9s
// after hit, THREE beacons appear ~1s later: thunder 0x438D center,
// fire 0x438E / ice 0x438F sides. Kill all three to restore boss target.
// G8 prioritizes ranged center, tanks/melee side adds. No respawn described.
// Unnamed completion candidates 38245/46/47 and 38323 belong to transition;
// no separate harmful on-death explosion is established.
// Calamitous Cry 36866 (first 5.1s) / 36867 (repeat) uses target selectors
// 34722/26708 and candidate Prey 2939. Damage 36869 is TWO wild charges,
// 80y long, 6y wide. Healer targets first, tanks next, alternating [TL].
// Correct: each four-person light party lines up add/boss -> tank -> group;
// tank takes front hit, remaining members share behind, dodge next cone.
// Wrong front/missing member -> LOG SIGNAL: 36869 victim count/order and
// excess damage; FAULT: wrong front player / absent assignee if proven;
// CONSEQUENCE: Minor survived / Major causal death. Correct charge damage
// is expected; split formula and front-hit multiplier are not verified.
// Calamitous Echo 36870: 5s cones, BM 40y / full 20deg, roughly 6s cadence;
// first ~7.2s after adds appear. Correct: alternate open gaps with party.
// Cone hit -> LOG SIGNAL: 36870 damage; FAULT: hit player; CONSEQUENCE:
// Minor survived / Major causal death. No intended cone hits.
// Cry grants boss Damage Up, +6% per volley [TL], a progressive damage
// check until all adds die. IV describes Ruinous Power reaching 100 as
// a wipe deadline. Starting value, gain/reset and failure spell unsettled;
// BM's ~50s adds-enrage label is an estimate, not a proven gauge rate.
// Objective timeout -> LOG SIGNAL: living beacons at lethal transition/
// wipe spell; FAULT: raid, no individual DPS blame from elapsed time;
// CONSEQUENCE: Raid at established failure, not at an assumed 50s timer.
//
// -- NORMAL TULIDISASTER / PERPETUAL CONFLAGRATION --
// Controller 36872 (7s), THREE expected raid hits: 36874 ~3.2s after
// cast end, 36875 ~8.5s later, 36873 ~8s later. Third applies Perpetual
// Conflagration 4122: nondispellable persistent DoT and increased damage
// taken until Valigarmanda is defeated [DATA]. Mitigate/heal spaced hits
// [G8]. TL calls the subsequent DoT unmitigatable; tick behavior unsettled.
// Correct raid hits/DoT are not mechanic errors. No cleanse assignment,
// no erroneous early enrage flag on this NORMAL third hit.
//
// -- ICE TRISCOURGE / NORTHERN CROSS / FREEZING DUST --
// ICE: two healer Calamity's Flames 3817 -> Scourge of Fire 36846,
// radius 5, EXACTLY THREE-person stacks; tanks' Calamity's Bite 3821 ->
// Scourge of Ice 36844 radius-16 defamations simultaneously [BM, IV].
// Correct: tanks separate at NW/NE, two healer/DPS trios stay west/east.
// TL calls Ice healer aura Embers; provisional Flames follows IV.
// Defamation clips/stack error -> LOG SIGNAL: 36844 on another player,
// wrong 36846 group; FAULT: wrong tank/dropper or missing stack member
// if proven; CONSEQUENCE: Minor survived / Major causal death. Own tank
// defamation and correctly shared fire are expected. All Bolt 3823
// expires in role-staggered waves, 36842 radius-5 spreads, twice.
// Overlap -> LOG SIGNAL: extra 36842 hits; FAULT: displaced player if
// identifiable; CONSEQUENCE: Minor survived / Major causal death.
//
// Northern Cross 36827/36828 (3s) is a diagonal avalanche, ~25y-wide lane
// spanning arena [BM], direction previewed by rear arrow. Avoid marked
// diagonal. THREE instances overlap first stance, Spikesicle and later
// stance/Freezing Dust. BM activation ~9.2s after map preview.
// Hit -> LOG SIGNAL: 36827/28 damage, knockback/Vuln [TL]; FAULT: hit
// player; CONSEQUENCE: Minor survived / Major causal death or fall.
// Freezing Dust 36848 (5s): Freezing Up 3523 ~1s after cast end, move for
// its ~2s window UNTIL aura ends. Same movement rule for Fire's Chill.
// Standing still -> LOG SIGNAL: Deep Freeze candidate 4150 / Ice Boulder
// Jail NPC 0x411A trapping player; FAULT: stationary player; CONSEQUENCE:
// Minor recovered without DD, Major verified DD or causal death. IV
// describes allies killing the jail to release frozen players. Jail
// lifetime, HP, expiry and death side effects are not established.
// Freeze caused by earlier star hit belongs to that root mistake.
//
// -- THUNDER GRID / TRISCOURGE HEIGHT RULES --
// Four columns x85/95/105/115, three rows z90/100/110; twelve 10x10y
// cells. SIX rising tiles: north/south rows OUTER columns rise, middle
// row INNER columns rise [BM]. Entry grants Levitate 3974, leaving removes
// it. Elevation is a tile effect, not a player jump or interaction button.
// THUNDER: healers' Calamity's Embers 3819 -> Scourge of Fire 36845,
// radius 5, FOUR-person stacks on GROUND. Calamity's Frost 3820 requires
// LEVITATE (grounded expiry creates ice); Fulgur 3824 -> Scourge of
// Thunder 36841 radius-8 spreads requires GROUND. Two role waves exchange
// Frost/Fulgur; published pairs split onto appropriate adjacent cells.
// Frost spread radius 8 in BM is provisional. Wrong-height penalty damage
// 36840 is distinct from normal thunder spread; Vuln/paralysis described.
// Wrong height -> LOG SIGNAL: 36840 penalty / unexpected ice with no
// Levitate at expiry; FAULT: wrong-height holder; CONSEQUENCE: Minor
// survived / Major causal death. Overlap -> LOG SIGNAL: extra 36841/
// 36845 hits; FAULT: misplaced spread/stack member if proven; CONSEQUENCE:
// Minor survived / Major causal death. Own thunder/fire hits are expected;
// successful airborne Frost should not be counted as a missing soak.
//
// -- HAIL OF FEATHERS / BLIGHTED BOLT --
// Hail controller 36829 (4s), appearance 36830; SIX feathers NPC 0x4119.
// Six proximity damage actions 36893..36898 have 6/9/12/15/18/21s helper
// casts; first impact ~2s after controller end, then 3s cadence. Fall
// origins set distance; every player's position controls their exposure.
// BM uses a provisional 20y danger radius, not a verified falloff curve.
// Correct: move away from each fall, then kill chosen first/second feather.
// Too close -> LOG SIGNAL: unusually high 36893..98 damage with distance
// evidence; FAULT: close player; CONSEQUENCE: Minor excess survived /
// Major causal death. Ordinary proximity damage is expected on everyone.
// Blighted Bolt 36831 (5s) -> 36833 (5.8s helper), radius-8 bursts around
// remaining feathers. TL also describes targeting airborne players.
// Correct: GROUND in killed feather's gap; other FIVE alive is normal.
// Burst/airborne hit -> LOG SIGNAL: 36833 or failed-height candidate
// 36832, Levitate/position at hit; FAULT: unsafe player; CONSEQUENCE:
// Major lethal, Minor survived without DD. Six surviving feathers at
// resolution cover safe floor -> Raid if no viable escape established;
// collective missed kill, not automatic blame on lowest add damage.
// Feathers are destructible stationary objects; no revival described.
//
// -- THUNDEROUS BREATH / ARCANE LIGHTNING --
// Breath 36834 (7s) -> 36835 (7.9s helper): GROUND is lethal, LEVITATE
// required. FIVE Arcane Spheres NPC 0x4182 occupy six possible side-row
// slots; Arcane Lightning 39002 (1s), 50x5y lines hit ~0.1s after breath.
// Correct: levitating tile in missing sphere's row; airborne players
// still take lines. Missing row, not just rising tile, determines safety.
// Grounded/line hit -> LOG SIGNAL: 36835 without Levitate or 39002 damage;
// FAULT: hit player; CONSEQUENCE: Major causal death, Minor if survived
// without DD. No intended damage from either avoidable helper.
//
// -- ICE TALON / RUINFALL / WRATH --
// Ice Talon 36858 (4s) -> 36859 ~1s later: TWO radius-6 tank busters,
// expected DoT. Correct: each tank isolates north corner and mitigates.
// Clip -> LOG SIGNAL: 36859 on non-tank or overlapping tank hits; FAULT:
// misplaced buster holder / bystander only if positions settle it;
// CONSEQUENCE: Minor survived / Major causal death. Own buster/DoT normal.
// Ruinfall 36860 (4s) -> 36861 (5.6s): radius-6 TWO-tank tower. Then
// 36863 (8s helper) pushes 25y south from front; 39130 (9.5s helper)
// makes radius-6 south puddles 1.5s after push. Correct: both tanks soak,
// party uses knockback immunity or lands in gaps inside arena.
// Missing tower -> LOG SIGNAL: fewer than two tank hits and penalty/
// raid damage; FAULT: absent assignee if known; CONSEQUENCE: Minor lived,
// Major causal death, Raid only irreversible collapse. Penalty ID unknown.
// Bad landing -> LOG SIGNAL: 39130 damage or edge death without killing
// blow after 36863; FAULT: misplaced player; CONSEQUENCE: Minor survived /
// Major causal death. Correct tank tower, push and immunity are normal.
// Wrath Unfurled 36871 (4s) -> 39237 (7.3s helper): expected raidwide,
// boss damage buff before final Mountain Fire; buff ID/magnitude unsettled.
//
// -- HARD ENRAGE AND WIPE CUTOFFS --
// Final Tulidisaster controller 37452 (7s), damage 37454 at start+10.2s,
// 37455 +18.7s, lethal 37453 +26.8s. First two hits are expected before
// hard deadline; third is Raid. This is distinct from normal 36872 series.
// Other candidate cutoffs: beacon objective failure and no cleared feather
// gap at Blighted Bolt. Mountain misses can be recovered; one freeze,
// Damage Down, jail or death does not by itself establish inevitable wipe.
// Called reset, self-kill and boundary deaths have no researched unique
// reset spell. Later collateral/fallout must not invent new culpability.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Map every action/status to FFLogs cast/damage/tick/penalty IDs and
//    actor instances; confirm 3523/4150/3795/3796 and DD durations/IDs.
// 2. Which Ice healer aura is actually applied: Flames 3817 or Embers
//    3819? Confirm all debuff expiry times and role-wave ordering.
// 3. Do marked deaths resolve early, cancel, retarget or create extra
//    objects? What happens on resurrection and phase transitions?
// 4. Measure pair/stack/charge damage division, exact target counts and
//    vulnerabilities. What are Mountain Burns/lockout durations and IDs?
// 5. Identify empty Mountain/Ruinfall penalties and scope. Can longer
//    invuln tower rotations or solo Ruinfall be deliberately supported?
// 6. Verify Ruinous Power starting value, gains per phase/event, reset,
//    deadline and lethal action; Cry's Damage Up increment/removal.
// 7. Verify stance origins/angles, Spikesicle radii, shadow tolerance,
//    star count/placement and safe regions against logged positions.
// 8. Verify height snapshots and Levitate application delay; separate
//    36840/36832 penalties, correct Frost outcomes and Blighted targeting.
// 9. Establish feather falloff, kill/appearance/death events, explosions
//    and any on-death cost. Is six-alive Blighted always unrecoverable?
// 10. Confirm freeze/jail lifecycle, ally rescue and death effects;
//     Concussion threshold; Perpetual Conflagration ticks/mitigability.
// 11. Establish ground-object duration/tick IDs, small-puddle counts and
//     overlap consequences; exact knockback/edge/reset signatures.
// 12. Check both element orders, K-relative clock, final enrage and any
//     patch changes in current logs; obtain actual party assignments.
