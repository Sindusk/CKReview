// The Epic of Alexander (Ultimate) -- Phase 1: Living Liquid.
//
// -- VERIFIED AGAINST LOGS (2026-10-16) --
// Report A = 1NG4Zah79yKYHCDv: 73 pulls, no kill, 27 cleared Phase 1
// (phase 2 from ~+2:01). Fetched with --to-minutes 3, so later phases have
// deaths only. NAUR plan (user); no VODs; roles.ts slots per the user, but
// see open question 1 on MT/OT. Pulls are cited A<n> = the app's Pull n.
// Clock (every pull within ~1s): Fluid Swing +0:11; Cascade +0:19; Hand of
// Parting +0:36; tornado waves visible +0:36 / invisible +0:38; cleaves
// +0:37; Exhaust +0:39 and +0:50; Pressurize +0:41; Hand of Pain +0:42,
// +1:10, +1:29, +1:49, +2:09; feeds +0:44-0:57; cleaves +0:56; boss
// sequence 1: visible +1:09, invisible volleys +1:12 / +1:15, Sluice +1:15;
// Splash x6 +1:21; Drainage +1:27; Cascade +1:31; Liquid Gaol/Throttle
// +1:36; sequence 2: visible +1:47, volleys +1:49 / +1:52, Sluice +1:52,
// tornado waves +1:53 / +1:55; Living Liquid dies ~+2:01 (Hawk Blaster,
// the first P2 cast, sometimes credited to a "liquid rage" actor). The
// enrage Cascade (18867) never happened.
// Log IDs: Fluid Swing 18864 (LL), Fluid Strike 18871 (Hand); Cascade
// 18470; Protean Wave: boss visible 18466/18468, frontal 18467 (cast by
// "living liquid" with no instance), boss invisible 18469 (helpers #1-8),
// tornado visible 18869 / invisible 18870; Sluice 18865; Splash 18866;
// Drainage 18471 (cast target = tether holder); Liquid Gaol 18472 ->
// Throttle 1000700 (10.0s); Pressurize 18473; Outburst 18474; Exhaust
// 18462 -> Luminous Aetheroplasm 1000706 (~5s); Exhaust 18463 = the
// two-stack overload, hitting its holder and anyone beside them;
// Reducible Complexity 18464 (fed) / 18465 (doll killed); Hand of Prayer
// 18475, Parting 18476, Pain 18477; doll autos 19278; tornado puddle
// Dropsy 1000289; Water Resistance Down II 1001025 (~4s, lands ~0.8s before
// its hit's damage event). TEA gives no Damage Down: avoidables are Minor
// unless they kill.
// Findings:
// - Dolls: owner = the doll's auto-attack target, consistent every pull
//   (the fourth DPS by elimination when a doll was fed before it swung:
//   A6, A14, A22). Feed HP is the caster HP on 18464: clean 0.3-24.9%
//   (A55 +0:56.1, A64 +0:53.9), failures 26.4% (A32) to 86.9% (A1), each
//   hitting the raid 12k-87k and killing 6-8. Report A's melee doll was fed
//   early 7 times (A5-A46). Killed dolls (18465, 9 pulls): damageDone's
//   target HP 0 names the killer, 0.1-0.2s before: own DoT/oGCD (DRG A2,
//   A9, A10; BLM Fire IV A13, A31, A34, A71) or a healer's AoE (WHM
//   Assize A17, SGE Dosis A38).
// - Exhaust: report A's healers and the Hand tank stand in one melee
//   doll's circle on purpose (one stack each, every clean pull). Two
//   instances / a stack event happened 7 times (A1, A2, A4, A6, A19, A46,
//   A71), always lethal; the 18463 overload also killed whoever stood with
//   the doubled player (A19: three others).
// - Wave volleys follow NAUR's role groups: opening tornado = LL tank +
//   both ranged (63/72 volleys); boss volley 1 = tanks + melee (81/91);
//   volley 2 = healers + ranged (66/91); second tornado volley = Hand tank
//   + melee (14 clean). The LL tank takes the opening visible tornado wave
//   and both cleaves under Holmgang (0 damage at 0 HP, every pull).
//   Sequence 2's volley 2 is the wall: in 9 pulls the sage baited nothing
//   and a tank or melee, still under Water Resistance Down II from volley
//   1, took it and died (A35, A37, A40, A44, A59, A62, A66, A68; A26 the
//   black mage). The white mage died to the frontal 18467 in sequence 2 in
//   6 pulls (A36, A40, A57, A64, A68; A41 after the cutoff).
//   A wave that went to an outsider because a group member stood too far
//   out is the non-baiter's alone (user, B11 +0:38.6 the Living Liquid tank
//   too far from the tornado, B41 +1:14.7 the sage too far out): this
//   answers open question 2 (sage too far).
// - Embolus: the Outburst cast sits where the orb burst; its toucher stood
//   0.8y from it, the next player 3.5y (B21, user: the dragoon). A19's
//   nearest was 3.9y with the rest 20y+ (unreviewed, maybe the boss).
// - A doll killed by a DoT tick logs no 0-HP event: the tick's HP is from
//   before it and equals its own amount (B34 +0:45.15, Chaos Thrust 104).
// - Hand of Parting/Prayer: clean hits 1-2k on everyone; Prayer at A3 and
//   A12 hit 29k+ and killed seven.
// - Hand of Pain: clean resolution medians up to 5k (A72 +1:10.9), failures
//   14k+ (A16 +1:30, A72 +1:30, A33 +1:50). The HP percentages on the
//   casts don't reproduce the guides' 5-point gap (A30 +1:49 passed at a
//   6-point reading), so the rule gates on damage.
// - Throttle: no expiry has its own event; the holder dies with no killing
//   blow 2.0s after a 10.0s removal. The healers split cleanses every pull
//   (white mage: tanks + self; sage: ranged + self; melee either). Expiries
//   A25, A27, A29, A41, A42 left the sage short (1-2 cleanses vs 3-4);
//   A18 neither healer cleansed anyone. The split follows party-list order,
//   which the log doesn't carry, and the healer with fewer cleanses is
//   usually not the one at fault (user, B17): answers open question 3.
// - Drainage: both tanks every clean pull; the three non-tank holders (A20,
//   A21, A28) all followed a tank death. A cast that hits two players loses
//   its target (A23: tank + sage).
// - Deaths with no killing blow: Throttle expiries (above); the LL tank in
//   the opening invulnerability window (A5, A7 +0:39.4: not flagged, raw
//   damage); called wipes (A28).
// - Every wipe ended within 25s of 4 dead at once.
// Cutoffs (46 P1 wipes, every one has one): dead going into a protean
// sequence 10, collapse 9, doll killed 8, doll fed above 25% 7, both
// healers dead (ffxiv/common.ts) 6, Hand of Pain 3, Hand of Prayer 2,
// called wipe 1. Unexplained: none; deaths to Splash/autos at low HP are
// mitigation territory.
//
// -- RULES IMPLEMENTED --
// ffxiv-ll-avoidable (Minor; Major if it killed): visible boss and tornado
//   waves (the LL tank's opening one excepted), the frontal wave, Sluice,
//   cleaves on non-tanks, Drainage splash on non-holders (not with a tank
//   dead), Dropsy.
// ffxiv-ll-threat (Minor; Major if it killed): a cleave on 3+ non-tanks,
//   on the tank it targeted (or the tank it hit); its victims aren't
//   flagged (user, D22: the off tank took aggro in the party). Single
//   victims (A7-A65) stay the victims'.
// ffxiv-ll-drainage-tank-dead (Raid): a tank dead at Drainage (user, D3,
//   D6: unresolvable).
// ffxiv-ll-wave-bait (Minor; Major when the extra player died to water
//   within 6s): per invisible volley, living group members who took no
//   wave; only when none did, players outside its role group who took one
//   (a non-baiter's wave lands on the next nearest: their fallout). With
//   the group right, a wave on two groupmates names the doubled player and
//   the wave's baiter. Skipped with a group member dead.
// ffxiv-ll-exhaust (Major if lethal): two Exhausts / a second stack; at the
//   second Exhaust with a melee doll among the sources, its owner instead
//   ("Doll Fed Too Late": the melee feed after Exhaust 1; user, C28).
// ffxiv-ll-doll-feed (Major, owner) + ffxiv-ll-doll-wipe (Raid): fed at
//   25%+. ffxiv-ll-doll-kill (Major, killing blow) + doll-wipe (Raid).
// ffxiv-ll-hand (Raid), ffxiv-ll-pain (Raid): player-less.
// ffxiv-ll-doll-kill names the hit that took the doll to 0 HP, or the DoT
//   tick whose amount equals the HP it logged.
// ffxiv-ll-throttle (player-less Minor, with each healer's cleanse count).
// ffxiv-ll-drainage (Minor/Major on the idle tank, both tanks alive).
// ffxiv-ll-outburst (Raid), with ffxiv-ll-orb (Major) on the player within
//   2y of the burst and 2y+ nearer than anyone else.
// Generic cutoffs, P1 wipes only, the earliest and only before a mechanic
// Raid: ffxiv-ll-dead-going-in (anyone dead at a boss protean sequence's
// visible waves), ffxiv-ll-called-wipe (3+ no-killing-blow deaths in 10s,
// Throttle expiries excluded, or any within 12s of the end),
// ffxiv-ll-collapse (4 dead, pull over within 30s), ffxiv-ll-enrage.
// Only the first Raid error is kept.
// Exposure: doll-feed (owner), throttle (healers), drainage (tanks) are
// targeted; the rest everyone.
// Not built: Hand of Parting/Prayer and Pain blame (which tank moved, who
// over-damaged); Pressurize orb paths (one Outburst on disk, A19); tank
// deaths in the opening invulnerability window (mitigation).
// VOD review 2026-10-16 (user): report B = HwjvVh3TNAZmMQyq pulls 11, 17,
//   21, 41, rulings in expectations/rulings.json. Its 15 P1 wipes are now
//   on disk too (B3, B7, B9, B10, B16, B21, B23, B26, B27, B32-B34, B39,
//   B41, B45). Report C = LxAVFd29kwPm8HnB pulls 23, 26 (deaths to Hand
//   of Pain and a Drainage tether: mitigation, user) and 28. Report D =
//   6pzyKv8fnYBZ2XGa pulls 3, 6, 14 (a Throttle expiring after Living
//   Liquid died: now read with every death), 22.
// OPEN QUESTIONS:
// 1. roles.ts names the paladin MT (opening auto) but the warrior holds
//    Living Liquid and does the opening invulnerability every pull, NAUR's
//    MT duty. The module keys on "LL tank" (first Fluid Swing target).
// 2. A volley where one group member baited nothing but four outsiders
//    took waves (A26) names only the non-baiter; unreviewed.
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Research only: no detector, report sampling, or VOD rulings. All failure
// signals below are guide/source-derived, NOT observed in this project's
// logs. A future VERIFIED AGAINST LOGS section takes precedence.
// Scope: eight-player, level-80 Ultimate, introduced in patch 5.11; item
// level sync 475. Job changes and synced gear change damage/kill times,
// not the positional puzzle. Launch-era damage numbers are not thresholds.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] Current NAUR resource directory and Elina Living Liquid toolbox:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=725383877116761&preview=1
// [WD] Browser inspection of every role, Living Liquid tab, NAUR/Elinabin:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra's mechanics and stacked/split, open/closed alternatives:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-living-liquid
// [OCE] Materia's written explanation and regional execution:
// https://materiaraiding.com/ultimate/tea
// [CB] cactbot event timeline and trigger definitions, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same path: the_epic_of_alexander.ts. Timeline numbers are reference
// timings, not measurements from a report supplied for this model.
// [BM] BossMod primary encounter definitions, master branch:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read TEAEnums.cs, TEAStates.cs, P1*.cs and TEAConfig.cs. Numeric IDs and
// geometry below are candidate game-data definitions, not FFLogs mapping.
// No third-party implementation code is reproduced here.
//
// -- SHAPE, CLOCK, AND PHASE BOUNDARY --
// Kill Living Liquid (LL); Liquid Hand does not also need to die. Cascade
// creates the Hand by splitting LL's current HP. Both remain attackable,
// have independent health, and must be kept close for Hand of Pain checks.
// Boss HP controls the exit, not a fixed two-minute phase duration. There
// is no checkpoint between phases. Limit Cut follows LL's defeat.
// [CB] approximate seconds from pull; entries are resolving actions:
//   +11.4 Fluid Swing; +19.5 Cascade / three Liquid Rage tornadoes.
//   +35.8 Prayer/Parting; +36.7 visible tornado waves; +37.7 cleaves;
//   +38.7 invisible tornado waves; dolls Exhaust +39.7 and +50.3;
//   +41.6 Pressurize; +42.8 first Hand of Pain; +56.7 tank cleaves.
//   +69.8 visible boss waves; +70.0 Pain; +71.9/+75.0 invisible waves;
//   +74.9 Sluice; +81.1 six Splashes; +86.6 Drainage.
//   +89.1 Pain; +91.7 second Cascade; +95.9 six Throttles.
//   +107.0 visible boss waves; +109.0 Pain; +109.1/+112.1 invisible
//   boss waves; +112.0 Sluice; +113.0/+115.1 tornado waves;
//   +119.1 Pressurize; +124.2 Prayer/Parting; late Splash/Pain/cleaves;
//   +129.3 fifth Pain; +142.1 Cascade enrage resolves (4s cast).
// A fast kill skips the last mechanics; their absence is success. [CB]
// labels the final Splash set x6, whereas [BM] counts four before the last
// cleave. The first six-hit set is agreed; late count remains unverified.
//
// -- ID / STATUS CONVENTION AND CONSEQUENCES --
// Action IDs are decimal. Status IDs are raw game IDs; FFLogs often
// exposes statuses as 1000000 + raw ID (Throttle 700 -> 1000700).
// A cast/control action, helper hit, player aura and penalty are separate
// evidence. Same-name waves from LL and tornadoes are different attacks.
// Minor = avoidable, nonfatal damage without Damage Down. Major = named
// root cause of a death/wipe, or a confirmed avoidable Damage Down.
// Raid = established unrecoverable mechanic state, possibly player-less.
// Raw damage deaths on correctly executed soaks/busters belong to
// mitigation analysis. Do not turn a casualty or death fallout into blame.
//
// -- NAUR PLAN AND COORDINATE FRAME --
// Each Cascade's empty tornado quadrant is relative N; middle tornado S,
// other tornadoes E/W. Reorient after the second Cascade. Doll spawns are
// slightly counterclockwise of cardinals, not exact cardinal coordinates.
// Slots: MT/OT, regen/shield healer, M1/M2, caster/physical ranged. A job
// does not intrinsically determine the two tanks' or melees' assignments.
// Opening: MT takes LL SW near the S tornado; OT initially takes Hand
// opposite LL, near N. MT provokes Hand for the paired cleaves and uses
// invulnerability; OT stays out, then takes Hand back. Caster/phys bait
// W/E tornado waves toward N, MT baits S. Healers stay clear of doll AoEs.
// Dolls: M1 SW, M2 SE, caster NW, phys NE. Melees feed after Exhaust 1;
// ranged feed after Exhaust 2. Tanks bring both enemies back to center;
// LL's next cleave points SE, Hand's SW, party remains north of cleaves.
// First boss-wave sequence: tanks start S, everyone else N. For the first
// invisible volley MT SE / OT SW / M1 W / M2 E are close to LL. Both
// healers and ranged move out N to bait Sluice, then move in for volley 2:
// regen NW / shield NE / caster W / phys E; tanks/melees go max melee.
// Second sequence: LL faces relative N. Close first-volley slots are
// MT NE / OT W / M1 S / M2 E. Ranged/healers bait Sluice and tornadoes
// outside; shield SW aims the S tornado W, phys SE aims the E tornado S,
// NW ranged bait the W tornado N. The NW diagram contains both regen and
// caster: multiple victims of one intended lane are not automatically an
// overlap error. Second boss volley uses regen NW / shield S / caster W /
// phys E. Then OT goes SW to aim W tornado S, M1 SE aims S tornado E,
// M2 NE aims E tornado N; MT pulls LL NE, OT pulls Hand SW for the hand.
// [WD]'s second initial N/S text lists regen in BOTH groups. Role views
// show shield S and regen N; that duplicated label is not an assignment.
// Exact distances and NW tornado ownership need a clean log / full plan.
//
// -- FLUID SWING / FLUID STRIKE --
// Candidate damage: LL Fluid Swing 18864; Hand Fluid Strike 18871.
// [BM] defines 90-degree cones, LL reach 8 + hitbox, Hand 10 + hitbox.
// What happens: physical tank cleaves give a short Water Resistance Down,
// making overlapping water damage dangerous. Autos are LL 18808 / Hand
// 18809; dolls also auto (19278). These are distinct from cleaves.
// Correct play: face each enemy away; mitigate, or let one invulnerable
// tank deliberately take both cleaves and the opening tornado wave.
// Failure: cone aimed through party -> LOG SIGNAL: 18864/18871 on
// nonassigned victims; FAULT: tank who aimed it if orientation proves
// that, otherwise unresolved; CONSEQUENCE: Minor, Major if lethal.
// Removal: short resistance debuff expires; death also removes it. No
// sourced raid explosion on its removal. Invulnerability is normal play.
//
// -- CASCADE, TORNADO PUDDLES, SPLASH --
// Candidate cast/damage: Cascade 18470; Splash damage 18866;
// enrage cast/penalty 18867. Actors: LL 0x2C47, Hand 0x2C48,
// Liquid Rage 0x2C49, associated ground object 0x1E9998 [BM].
// What happens: Cascade is heavy raid damage and places three tornado
// ground zones, either cardinal or intercardinal, leaving one side open.
// Splash is a rapid raid pulse train; first set six hits ~1.1s apart.
// Correct play: heal/mitigate unavoidable damage, keep out of tornado
// puddles, and leave room for assigned closest-player baits.
// Failure: standing in tornado ground -> LOG SIGNAL: environmental DoT /
// damage or death at that ground, exact ability unknown; FAULT: entrant
// unless displaced by another error; CONSEQUENCE: Minor/Major.
// Failure: enrage completes -> LOG SIGNAL: 18867; FAULT: no individual
// established by damage taken; CONSEQUENCE: Raid.
// Removal: ground hazards follow their scripted lifecycle, with Drainage
// ending the first set before Cascade replaces it. No dispel mechanic.
// Not errors: Cascade and Splash on the whole living party, including
// healing deaths; a new tornado layout is not a tank-position mistake.
//
// -- HAND OF PRAYER / PARTING / PAIN --
// Candidate damage/checks: Prayer 18475; Parting 18476; Pain 18477
// (3s cast). Prayer = closed fist -> separate. Parting = open palm ->
// bring together. Initial separation baits open palm, initial proximity
// baits fist; selection instant and distance thresholds are not settled.
// Pain checks HP difference, not proximity. Guides give <5 percentage
// points / at most 4.9%; both boss pools must be managed until LL dies.
// Correct play: tanks reverse the proximity at hand cue; raid controls
// cleave damage and feeds. NAUR deliberately chooses an opening merge
// and later separation. A successful low-damage check may still log a hit.
// Failure: wrong distance -> LOG SIGNAL: catastrophic 18475/18476 rather
// than an otherwise routine result; FAULT: tank movement only if assigned
// movement and cue are known; CONSEQUENCE: Raid, named Major if proven.
// Failure: HP gap -> LOG SIGNAL: catastrophic 18477 with surviving enemy
// HP evidence; FAULT: collective without a proven damage-control error;
// CONSEQUENCE: Raid. A player's last hit is not sufficient attribution.
// Removal: instantaneous checks; no player aura to cleanse. Hand becomes
// irrelevant after LL dies; killing it is not an additional objective.
//
// -- JAGD DOLLS / EXHAUST / REDUCIBLE COMPLEXITY --
// Four dolls (actor 0x2C4A), each fixates the first player to damage it.
// Candidate hits: Exhaust 18462 (~8.8y radius including doll hitbox);
// successful feed damage 18464; fatal failure 18465. Status name:
// Luminous Aetheroplasm (raw ID not settled by sources read).
// What happens: bring each doll BELOW 25% HP, then contact LL or Hand to
// feed it. Do not kill it. Exhaust applies stacking Aetheroplasm; two
// stacks / overlapping Exhausts kill the victim. Doll feeds hurt the raid.
// Correct play: designated DPS pulls one doll, controls damage including
// DoTs/pets/cleave, stays separated, and feeds in the agreed healing order.
// NAUR uses 2+2 feeds. Other viable orders are 1-2-1 and 2-1-1 [IV].
// Failure: dead or high-HP doll -> LOG SIGNAL: 18465, doll death/HP if
// available; FAULT: owner for a proven early feed, killer for a proven
// lethal attack, other contributors if established; CONSEQUENCE: Raid
// plus named Major when clear. Successful 18464 itself is not a failure.
// Failure: Exhaust overlap -> LOG SIGNAL: two doll sources hitting one
// player / Aetheroplasm stack increase followed by death; FAULT: owner
// who crossed the other doll's assigned space, or the player entering
// overlapping doll circles, not necessarily the victim; CONSEQUENCE: Major.
// Failure: wrong first tag -> LOG SIGNAL: first damaging attack and
// subsequent fixate/auto targets; FAULT: tagger when assignments known;
// CONSEQUENCE: only the harm it causes, not ownership difference alone.
// Removal: consumed dolls disappear after their successful feed; killing
// is the failure path. Aetheroplasm decay/death and a dead owner's doll
// retarget behavior remain open; downstream retargets are death fallout.
// Not errors: four successful feed raidwides; one intended Exhaust; late
// ranged feeds; intentionally reduced boss damage during HP balancing.
//
// -- PROTEAN WAVE / SLUICE --
// Candidate boss visible controller 18466 / helper 18468; invisible fixed
// frontal "shadow" wave 18467 / closest-four helper cones 18469.
// Tornado visible 18869 / invisible 18870. [BM] cones 40y long, 30 degrees
// full angle. Sluice helper cast/damage 18865: four farthest, 5y circles.
// What happens: visible baits are dodged. Each invisible boss volley aims
// four nearest-player cones PLUS an unbaited frontal cone. Tornadoes each
// aim at their nearest player. Water resistance effects make repeats
// lethal; players alternate close/far roles for successive boss volleys.
// Correct play: use the slot geometry above; bait Sluice outside, leave
// its telegraphed circles, exchange distances, never occupy LL's front.
// Failure: visible cone/Sluice hit -> LOG SIGNAL: 18466/18468/18869/18865
// damage; FAULT: victim if bait was correct, baiter if proven mis-aim;
// CONSEQUENCE: Minor/Major, Major if a confirmed Damage Down is applied.
// Failure: extra invisible wave -> LOG SIGNAL: multiple wave sources or
// a second hit during resistance down; FAULT: wrong closest-player bait
// or crossed assigned lane, not whichever player died; CONSEQUENCE: Major
// if lethal, Raid only if the resulting state cannot recover.
// Failure: frontal shadow -> LOG SIGNAL: 18467; FAULT: person in front
// unless tank turned LL into assigned safe space; CONSEQUENCE: Minor/Major.
// Removal: wave resistance debuffs expire; baited puddles resolve and
// disappear. No sourced dispel or on-death raid explosion.
// Not errors: one assigned invisible cone, planned tornado wave, a tank
// taking a visible cone under invulnerability + knockback prevention.
//
// -- PRESSURIZE / EMBOLUS / OUTBURST --
// Candidate spawn action Pressurize 18473; collision penalty Outburst
// 18474; Embolus actor 0x2C4B. Two orbs from two tornadoes per set move
// toward the enemies' positions when spawned; player OR boss contact is
// dangerous. Correct play: bait their paths outside, then move bosses
// back in; do not guide dolls or party through an incoming orb.
// Failure: collision -> LOG SIGNAL: Outburst raid damage; FAULT: contacted
// player or moving tank only if contact geometry establishes it;
// CONSEQUENCE: Raid. Outburst hitting eight people reveals no collider.
// Removal: collision detonates; phase transition clears remaining orbs.
// [IV] reports the old persistence into Limit Cut bug was fixed; exact
// patch not independently established. Do not model persistence as normal.
//
// -- DRAINAGE / THROTTLE --
// Drainage P1 hit 18471, ~6y splash, two interceptable tornado tethers
// (game tether 3). Tanks collect one each and separate from each other
// and party while six Splashes resolve. This is expected tank damage.
// Failure: wrong holder / splash -> LOG SIGNAL: 18471 targets, tether
// endpoints if exposed; FAULT: assigned collector or misplaced tank if
// proven, not automatically a nearby casualty; CONSEQUENCE: Minor/Major.
// Throttle: Liquid Gaol action 18472; raw player status 700. Six random
// players must be cleansed before expiry. Healers normally split party
// list top-down / bottom-up, self first; BRD's Warden's Paean can help.
// Failure: expiry -> LOG SIGNAL: 700 persists to deadline, removal/death
// without successful Esuna/Paean; FAULT: healer only with known cleanse
// assignment; CONSEQUENCE: named Major if settled; Raid only when the
// actual lost-player state is unrecoverable, not every uncleansed victim.
// Removal: Esuna/Paean is successful; expiry kills; death is not proof of
// expiry. No sourced death explosion. Removal alone does not identify the
// cleanser. Different party-list order changes healer responsibility.
//
// -- VARIANTS, NON-ERRORS, AND PULL-END STATES --
// Open/closed-side and stacked/split boss plans change tank paths, initial
// hand cue, orb paths and tornado baiters. NAUR's opening separation is a
// setup for merging, not a requirement to keep bosses apart throughout.
// Melee-first versus ranged-first wave baits and different free-uptime
// slots in second Proteans are legitimate. Doll feed orders and tank
// invulnerability choice vary. Cooldown readiness depends on later phase
// pushes; old guide cooldown schedules are not universal assignments.
// A failed doll, Outburst, hand check, or enrage is normally a cutoff.
// A death during dolls/second Proteans often cascades, but the first death
// remains the root cause. No later reassigned bait is a fresh accusation.
// Walking into the lethal edge/ground to reset is possible; a death with
// no killing blow is not sufficient evidence of a movement error.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Map every action to begincast/cast/damage and all resistance/status
//    names, durations, stack deaths, Damage Down and environmental IDs.
// 2. Does Pain enforce absolute HP difference or a one-sided condition;
//    what are safe/failing extremes and which HP denominator is used?
// 3. What selects Prayer/Parting, when does it sample, and what distances
//    pass? Do successful checks produce nonzero expected raid damage?
// 4. Doll HP/feed radius, exact 25% boundary, death/removal penalty timing,
//    ownership on owner death, and attribution when unrelated cleave kills.
// 5. Which NW player owns second-sequence W tornado; can both intentionally
//    take its wave? Confirm diagram slots despite duplicated WD role text.
// 6. Throttle duration, cleanse assignments, Paean timing, six-target
//    selection, and whether expiry death has its own named damage event.
// 7. Late Splash count (CB six vs BM four), Drainage targeting/clearing,
//    Embolus contact radius/cleanup, and actual phase exit event ordering.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { kFmt, joinNames, playerError, playerlessMinor, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import {
  DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Hit, type Life,
  bodyHit, buildLife, hitsOf, castsOf, uniq, namesOf, isTank, realAmount, resetCluster,
} from "@/lib/mechanics/ffxiv/fru/common";

export const LL_AVOIDABLE_RULE_ID   = "ffxiv-ll-avoidable";
export const LL_WAVE_BAIT_RULE_ID   = "ffxiv-ll-wave-bait";
export const LL_EXHAUST_RULE_ID     = "ffxiv-ll-exhaust";
export const LL_DOLL_FEED_RULE_ID   = "ffxiv-ll-doll-feed";
export const LL_DOLL_KILL_RULE_ID   = "ffxiv-ll-doll-kill";
export const LL_DOLL_WIPE_RULE_ID   = "ffxiv-ll-doll-wipe";
export const LL_HAND_RULE_ID        = "ffxiv-ll-hand";
export const LL_PAIN_RULE_ID        = "ffxiv-ll-pain";
export const LL_THROTTLE_RULE_ID    = "ffxiv-ll-throttle";
export const LL_DRAINAGE_RULE_ID    = "ffxiv-ll-drainage";
export const LL_OUTBURST_RULE_ID    = "ffxiv-ll-outburst";
export const LL_ORB_RULE_ID         = "ffxiv-ll-orb";
export const LL_THREAT_RULE_ID      = "ffxiv-ll-threat";
export const LL_DRAINAGE_TANK_DEAD_RULE_ID = "ffxiv-ll-drainage-tank-dead";
export const LL_DEAD_GOING_IN_RULE_ID = "ffxiv-ll-dead-going-in";
export const LL_CALLED_WIPE_RULE_ID = "ffxiv-ll-called-wipe";
export const LL_COLLAPSE_RULE_ID    = "ffxiv-ll-collapse";
export const LL_ENRAGE_RULE_ID      = "ffxiv-ll-enrage";

// ── log IDs (VERIFIED section above) ────────────────────────────────────────

const CASCADE        = 18470;
const FLUID_SWING    = 18864;   // Living Liquid's cleave
const FLUID_STRIKE   = 18871;   // Liquid Hand's cleave
const VISIBLE_BOSS   = [18466, 18468];
const FRONTAL        = 18467;   // the unbaited "shadow" wave out of LL's front
const INVISIBLE_BOSS = 18469;   // nearest-four boss cones
const VISIBLE_TORNADO   = 18869;
const INVISIBLE_TORNADO = 18870; // each tornado's nearest player
const SLUICE         = 18865;
const SPLASH         = 18866;
const DRAINAGE       = 18471;
const EXHAUST        = 18462;
const EXHAUST_BURST  = 18463;   // the two-stack Aetheroplasm overload, on its holder and anyone near
const FEED_OK        = 18464;   // Reducible Complexity: a doll fed to a boss
const FEED_DEAD      = 18465;   // Reducible Complexity: a doll killed
const PRAYER         = 18475;
const PARTING        = 18476;
const PAIN           = 18477;
const OUTBURST       = 18474;
const ENRAGE         = 18867;   // the final Cascade (never reached in report A)
const AETHEROPLASM   = 1000706;
const THROTTLE       = 1000700;
const DROPSY         = 1000289;
const DOLL_AUTO      = 19278;
const DOLL           = "jagd doll";
const SIGNATURE      = [CASCADE, FLUID_SWING];
const WATER = [...VISIBLE_BOSS, FRONTAL, INVISIBLE_BOSS, VISIBLE_TORNADO, INVISIBLE_TORNADO, SLUICE, SPLASH, FLUID_SWING, FLUID_STRIKE, DRAINAGE];
// Every Phase 1 cast: the first cast of anything else (Hawk Blaster) is
// Phase 2, whose casts are sometimes credited to a liquid rage actor.
const P1_IDS = new Set([CASCADE, FLUID_SWING, FLUID_STRIKE, ...VISIBLE_BOSS, FRONTAL, INVISIBLE_BOSS, VISIBLE_TORNADO, INVISIBLE_TORNADO,
  SLUICE, SPLASH, DRAINAGE, 18472, 18473, EXHAUST, FEED_OK, FEED_DEAD, PRAYER, PARTING, PAIN, OUTBURST, ENRAGE]);

// ── thresholds (both extremes in the header's VERIFIED section) ─────────────

// A doll must be under 25% HP when it touches a boss. Clean feeds 0.3-24.9%
// (A55 +0:56.1, A64 +0:53.9), failures 26.4%+ (A32 +0:45.5): the game's line.
const FEED_MAX_PCT       = 25;
// Hand of Parting / Prayer resolution median: clean 2k at most (every pull),
// failures 29k+ (A3, A12).
const HAND_FAIL_DAMAGE   = 10_000;
// Hand of Pain resolution median: clean 5k at most (A72 +1:10.9), failures
// 14k+ (A16 +1:30.0, A72 +1:30.0, A33 +1:49.9).
const PAIN_FAIL_DAMAGE   = 10_000;
// Throttle lasts 10.0s; a removal this late with a death after is expiry.
const THROTTLE_EXPIRY_MS = 9_500;
// The doll's killing blow lands within this long before its Reducible
// Complexity (A2-A71: 0.1-0.2s).
const DOLL_KILL_MS       = 2_000;
// Exhaust goes off at +0:39 and +0:50 (every pull within ~1s).
const SECOND_EXHAUST_MS  = 45_000;
// The Embolus toucher stands on the Outburst's cast point (B21: 0.8y, the
// next player 3.5y); orbToucher() has both pulls on disk.
const ORB_TOUCH_Y        = 2;
// A tank cleave on this many non-tanks is the tank's threat or facing:
// single victims (A7-A65, one each) walked into it; D22's hit six.
const CLEAVE_PARTY_MIN   = 3;
// The cleave's hits land up to ~1.1s after its cast (D22).
const CLEAVE_HIT_MS      = 1_500;
const ORB_TOUCH_MARGIN_Y = 2;
// Water Resistance Down II from a wave lasts ~4s, so a wave error's player
// who dies this soon after to more water died of it.
const WAVE_DEATH_MS      = 6_000;
// Every wipe on disk ended within 25s of 4 dead at once (A47 +2:31, the
// latest after P1; P1 wipes within 12s).
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 30_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const CALLED_WIPE_END_MS  = 12_000;

type Avoidable = { name: string; hit: string; why: string };
const AVOIDABLE: Record<number, Avoidable> = {
  18466: { name: "Protean Wave", hit: "Hit by a visible Protean Wave",
    why: "Living Liquid's visible waves are telegraphed; step out of the lines before the invisible volleys." },
  18468: { name: "Protean Wave", hit: "Hit by a visible Protean Wave",
    why: "Living Liquid's visible waves are telegraphed; step out of the lines before the invisible volleys." },
  [FRONTAL]: { name: "Protean Wave (front)", hit: "Stood in front of Living Liquid for its unbaited frontal wave",
    why: "Every invisible volley also fires a wave straight out of Living Liquid's front; never stand in front of the boss." },
  [SLUICE]: { name: "Sluice", hit: "Hit by Sluice",
    why: "Sluice drops a circle under the four farthest players; bait it out, then step out of your own circle." },
  [VISIBLE_TORNADO]: { name: "Protean Wave (tornado)", hit: "Hit by a tornado's visible Protean Wave",
    why: "The tornadoes' visible waves are telegraphed; only the tank under invulnerability takes the opening one." },
  [FLUID_SWING]: { name: "Fluid Swing", hit: "Hit by Living Liquid's Fluid Swing cleave",
    why: "Fluid Swing cleaves in front of Living Liquid; only the tanks belong there." },
  [FLUID_STRIKE]: { name: "Fluid Strike", hit: "Hit by Liquid Hand's Fluid Strike cleave",
    why: "Fluid Strike cleaves in front of Liquid Hand; only the tanks belong there." },
  [DRAINAGE]: { name: "Drainage", hit: "Hit by a tank's Drainage splash",
    why: "Each tank takes one Drainage tether and stands clear of the party for the splash; stay away from the tanks." },
};

// ── helpers ─────────────────────────────────────────────────────────────────

/** When Phase 1 ends: the first Phase 2 cast (Infinity on a P1 wipe). */
function phase1End(casts: EnemyEvent[]): number {
  return casts.filter((c) => !P1_IDS.has(c.abilityId) && c.abilityName.toLowerCase() !== "attack").reduce((m, c) => Math.min(m, c.timestamp), Infinity);
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pct = (c: EnemyEvent) => (c.hitPoints !== undefined && c.maxHitPoints ? 100 * c.hitPoints / c.maxHitPoints : undefined);
const isMelee = (p: PlayerInfo) => p.role === "DPS" && p.rangeType === "Melee";
const isRangedDps = (p: PlayerInfo) => p.role === "DPS" && p.rangeType !== "Melee";

/** The death this player suffered to water within `ms` after `t`, if any. */
function waterDeath(p: PlayerInfo, deaths: DeathEvent[], t: number, ms: number): DeathEvent | undefined {
  return deaths.find((d) => d.player === p.name && d.timestamp > t && d.timestamp <= t + ms + DEATH_EVENT_LAG_MS &&
    (d.killingAbilityGameId === undefined || d.killingAbilityGameId === 0 || WATER.includes(d.killingAbilityGameId)));
}

// ── plain avoidable hits ────────────────────────────────────────────────────

/**
 * Hits nobody should take. TEA hands out no Damage Down, so each is Minor
 * unless it killed. The opening visible tornado wave belongs to the tank
 * who takes Living Liquid (under invulnerability, every pull), cleaves and
 * Drainage to the tanks / tether holders. Dropsy is the tornado puddle.
 */
function detectAvoidable(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], llTank: PlayerInfo | undefined, end: number): PullError[] {
  const errors: PullError[] = [];
  const drainTargets = castsOf(casts, DRAINAGE, end);
  const tanks = players.filter(isTank);
  // Drainage with a tank dead: its tether lands on someone else, and the
  // splash on whoever stands near is fallout (user, 2026-10-16, D3, D6:
  // "a tank was dead, someone else was going to die regardless").
  const tankDeadAt = (t: number) => tanks.some((p) => !life.alive(p, t - 1500));
  // A cleave through the party: the tank it targeted had the boss's threat
  // in the wrong place (user, D22 +0:11.6: the off tank took aggro and the
  // swing landed on him in the party; six hit). Its victims are fallout.
  const cleaves = castsOf(casts, [FLUID_SWING, FLUID_STRIKE], end).map((c) => ({
    c, victims: uniq(players.filter((p) => !isTank(p) && p.damageTaken.some((e) => e.abilityId === c.abilityId && Math.abs(e.timestamp - c.timestamp) <= CLEAVE_HIT_MS &&!bodyHit(e) && life.hitAlive(p, e.timestamp)))),
  })).filter((x) => x.victims.length >= CLEAVE_PARTY_MIN);
  for (const { c, victims } of cleaves) {
    // A cast that hits several players loses its target: the tank it hit.
    const target = players.find((p) => p.name === c.target)
      ?? tanks.find((p) => p.damageTaken.some((e) => e.abilityId === c.abilityId && Math.abs(e.timestamp - c.timestamp) <= CLEAVE_HIT_MS));
    const dead = victims.filter((p) => life.diedFrom(p, c.timestamp));
    if (target) errors.push(playerError(target, {
      ruleId: LL_THREAT_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Cleave Into the Party",
      description: `${c.abilityName} targeted them and cleaved ${namesOf(victims)}${dead.length ? `; ${namesOf(dead)} died` : ""}. Only the tank holding ${c.actorName === "liquid hand" ? "Liquid Hand" : "Living Liquid"} should have its threat, faced away from the party: the other tank keeps their threat below it.`,
      timestamp: c.timestamp, abilityId: c.abilityId, abilityName: c.abilityName,
    }));
  }
  const cleaveFallout = (e: PlayerEvent) => cleaves.some((x) => x.c.abilityId === e.abilityId && Math.abs(x.c.timestamp - e.timestamp) <= CLEAVE_HIT_MS);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => {
      if (!AVOIDABLE[e.abilityId] || e.timestamp > end || bodyHit(e) || !life.hitAlive(p, e.timestamp)) return false;
      if ((e.abilityId === FLUID_SWING || e.abilityId === FLUID_STRIKE) && (isTank(p) || cleaveFallout(e))) return false;
      if (e.abilityId === DRAINAGE && tankDeadAt(e.timestamp)) return false;
      if (e.abilityId === VISIBLE_TORNADO && (p === llTank || (isTank(p) && e.timestamp < 60_000))) return false;
      // A Drainage hit on its own tether holder is the mechanic. A cast that
      // hit two players loses its target (A23 +1:27: the tank and the sage
      // beside him), so a tank is always taken as a holder.
      if (e.abilityId === DRAINAGE && (isTank(p) || drainTargets.some((c) => c.target === p.name && Math.abs(c.timestamp - e.timestamp) < 1500))) return false;
      return true;
    });
    for (const g of clusterByGap(hits, (e) => e.timestamp, 2000)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      errors.push(playerError(p, {
        ruleId: LL_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${kinds.map((k, i) => (i ? k.hit.charAt(0).toLowerCase() + k.hit.slice(1) : k.hit)).join(", and ")} (${g.length > 1 ? `${g.length} hits, ` : ""}${kFmt(total)}).${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
    // Dropsy: stood in a tornado's puddle.
    for (const e of p.debuffs.filter((x) => x.abilityId === DROPSY && x.debuffStatus === "applied" && x.timestamp <= end && life.alive(p, x.timestamp))) {
      const death = deaths.find((d) => d.player === p.name && d.killingAbilityGameId === DROPSY && d.timestamp > e.timestamp && d.timestamp - e.timestamp < 20_000);
      errors.push(playerError(p, {
        ruleId: LL_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: "Stood in a Tornado Puddle",
        description: `Got Dropsy from standing in a Liquid Rage tornado's puddle${death ? " and died to it" : ""}. The tornadoes leave water on the ground until Drainage; stay out of it.`,
        timestamp: e.timestamp, abilityId: DROPSY, abilityName: "Dropsy",
      }));
    }
  }
  return errors;
}

// ── nearest-player wave volleys ─────────────────────────────────────────────

/**
 * Each invisible volley aims one wave at each of the nearest players, and
 * a wave's Water Resistance Down II (~4s) makes a second one lethal. NAUR
 * gives every volley to a role group, and report A followed it in every
 * clean volley:
 * - the opening tornado volley (+0:38): the tank holding Living Liquid
 *   (the first Fluid Swing's target) and both ranged DPS (63 of 72);
 * - each boss sequence's first volley: both tanks and both melee (81 of
 *   91), its second, 3s later: both healers and both ranged (66 of 91);
 * - the second tornado volley (+1:55): the Liquid Hand tank and both melee.
 * A player outside the group who took one stood too close; a living group
 * member who took none stood too far, and their wave went to someone else.
 * Both are named (README philosophy 3). Major when the extra player died
 * to water within WAVE_DEATH_MS (usually the next volley, still holding
 * the resistance down). Skipped when a group member was dead or died in
 * the 3s before: the waves retarget onto whoever is left.
 */
function detectWaveBaits(players: PlayerInfo[], life: Life, casts: EnemyEvent[], deaths: DeathEvent[], llTank: PlayerInfo | undefined, end: number): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  const handTank = llTank ? tanks.find((p) => p !== llTank) : undefined;
  const volleys = clusterByGap(castsOf(casts, [INVISIBLE_BOSS, INVISIBLE_TORNADO], end), (c) => c.timestamp, 600);
  let tornadoN = 0;
  volleys.forEach((v, i) => {
    const t0 = v[0].timestamp;
    const kind = v[0].abilityId;
    let group: PlayerInfo[]; let label: string; let why: string;
    if (kind === INVISIBLE_TORNADO) {
      tornadoN++;
      if (!llTank || !handTank) return;
      if (tornadoN === 1) {
        group = [llTank, ...players.filter(isRangedDps)]; label = "opening tornado waves";
        why = "The opening tornado waves go to the Living Liquid tank (south, under invulnerability) and the two ranged DPS (west and east, aiming them north); everyone else stays out.";
      } else {
        group = [handTank, ...players.filter(isMelee)]; label = "second tornado waves";
        why = "After the second boss volley, the Liquid Hand tank and the two melee bait the three tornadoes' waves; everyone else stays clear of them.";
      }
    } else {
      const prev = volleys[i - 1];
      const second = !!prev && prev[0].abilityId === INVISIBLE_BOSS && t0 - prev[0].timestamp < 4500;
      if (second) {
        group = players.filter((p) => p.role === "Healer" || isRangedDps(p)); label = "second boss volley";
        why = "Each boss sequence's second invisible volley belongs to the healers and ranged: they move in while the tanks and melee, still under Water Resistance Down II, move out.";
      } else {
        group = players.filter((p) => isTank(p) || isMelee(p)); label = "first boss volley";
        why = "Each boss sequence's first invisible volley belongs to the tanks and melee close to Living Liquid; healers and ranged stay out (baiting Sluice) and come in for the second.";
      }
    }
    if (group.length < 3) return;
    // A dead group member's wave retargets onto whoever is next nearest.
    if (group.some((p) => !life.alive(p, t0 - 500))) return;
    // Not hitsOf: the Living Liquid tank's invulnerability (Holmgang) logs
    // its opening tornado wave as 0 damage at 0 HP, which reads as a body;
    // the life intervals alone say who was alive.
    const hits: Hit[] = players.flatMap((p) => p.damageTaken
      .filter((e) => e.abilityId === kind && e.timestamp >= t0 - 200 && e.timestamp <= Math.min(end, t0 + 1500) && life.hitAlive(p, e.timestamp))
      .map((e) => ({ p, e })));
    const hit = uniq(hits.map((h) => h.p));
    const extras = hit.filter((p) => !group.includes(p));
    const missing = group.filter((p) => !hit.includes(p));
    if (!extras.length && !missing.length) {
      errors.push(...sharedWaves(players, hits, deaths, t0, label, why));
      return;
    }
    const killed = extras.filter((p) => waterDeath(p, deaths, t0, WAVE_DEATH_MS));
    const sev = killed.length ? "Major" : "Minor";
    const deathText = killed.length ? ` ${namesOf(killed)} died to water within seconds.` : "";
    // A group member who baited nothing pulled their wave onto the next
    // nearest: the extras are that miss's fallout (user, 2026-10-16: B11
    // +0:38.6 the Living Liquid tank too far from the tornado, B41 +1:14.7
    // the sage too far out; the players who took the waves were fine).
    if (!missing.length) for (const p of extras) {
      const n = hits.filter((h) => h.p === p).length;
      errors.push(playerError(p, {
        ruleId: LL_WAVE_BAIT_RULE_ID, severity: killed.includes(p) ? "Major" : "Minor", name: "Took Someone Else's Wave",
        description: `Took ${n > 1 ? `${n} waves` : "a wave"} of the ${label}, which belongs to ${namesOf(group)}: they stood too close.${killed.includes(p) ? " They died to water within seconds (Water Resistance Down II makes a second wave lethal)." : deathText} ${why}`,
        timestamp: t0, abilityId: kind, abilityName: "Protean Wave",
      }));
    }
    for (const p of missing) {
      errors.push(playerError(p, {
        ruleId: LL_WAVE_BAIT_RULE_ID, severity: sev, name: "Didn't Bait Their Wave",
        description: `Baited no wave of the ${label}: they stood too far out, so ${extras.length ? `${namesOf(extras)}, nearer, took it instead` : "another player took it instead"}.${deathText} ${why}`,
        timestamp: t0, abilityId: kind, abilityName: "Protean Wave",
      }));
    }
  });
  return errors;
}

/**
 * The right players baited, but one wave hit two of them: a player took
 * their own wave and a groupmate's (A36 +1:55, A69 +1:55: a melee died to
 * the Liquid Hand tank's tornado wave on top of their own). The wave's
 * baiter is the one it hit alone (PITFALLS: a shared cone is its
 * baiter's); they aimed it through the other, or the other stood in its
 * lane, so both are named. Major when the doubled player died.
 */
function sharedWaves(players: PlayerInfo[], hits: Hit[], deaths: DeathEvent[], t0: number, label: string, why: string): PullError[] {
  const errors: PullError[] = [];
  const instOf = (h: Hit) => h.e.sourceInstance ?? 0;
  for (const inst of uniq(hits.map(instOf))) {
    const on = uniq(hits.filter((h) => instOf(h) === inst).map((h) => h.p));
    if (on.length < 2) continue;
    const doubled = on.filter((p) => uniq(hits.filter((h) => h.p === p).map(instOf)).length > 1);
    const baiter = on.filter((p) => !doubled.includes(p));
    if (!doubled.length || baiter.length !== 1) continue;
    const killed = doubled.filter((p) => waterDeath(p, deaths, t0, 3000));
    const sev = killed.length ? "Major" : "Minor";
    for (const p of doubled) errors.push(playerError(p, {
      ruleId: LL_WAVE_BAIT_RULE_ID, severity: killed.includes(p) ? "Major" : "Minor", name: "Shared a Wave",
      description: `Took two waves of the ${label}: their own and ${baiter[0].name}'s${killed.includes(p) ? ", and died" : ""}. They stood in ${baiter[0].name}'s wave, or it was aimed through them. ${why}`,
      timestamp: t0, abilityId: hits[0].e.abilityId, abilityName: "Protean Wave",
    }));
    errors.push(playerError(baiter[0], {
      ruleId: LL_WAVE_BAIT_RULE_ID, severity: sev, name: "Wave Aimed Into a Groupmate",
      description: `Their wave of the ${label} also hit ${namesOf(doubled)}, who had their own${killed.length ? `; ${namesOf(killed)} died` : ""}. Aim your wave away from the others' positions, or they stood in its lane. ${why}`,
      timestamp: t0, abilityId: hits[0].e.abilityId, abilityName: "Protean Wave",
    }));
  }
  return errors;
}

// ── Jagd Dolls ──────────────────────────────────────────────────────────────

/** Each doll's owner: the player its auto-attacks hit, else the one DPS left. */
function dollOwners(players: PlayerInfo[]): Map<number, PlayerInfo> {
  const owners = new Map<number, PlayerInfo>();
  for (const inst of [1, 2, 3, 4]) {
    const counts = new Map<PlayerInfo, number>();
    for (const p of players) {
      const n = p.damageTaken.filter((e) => e.abilityId === DOLL_AUTO && e.sourceInstance === inst).length;
      if (n) counts.set(p, n);
    }
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    if (best) owners.set(inst, best[0]);
  }
  // A doll fed before it ever swung (A6, A14, A22): the DPS who owns no other doll.
  const free = players.filter((p) => p.role === "DPS" && ![...owners.values()].includes(p));
  const unowned = [1, 2, 3, 4].filter((i) => !owners.has(i));
  if (free.length === 1 && unowned.length === 1) owners.set(unowned[0], free[0]);
  return owners;
}

/**
 * Exhaust gives Luminous Aetheroplasm; a second stack kills. A player hit
 * by two dolls' Exhausts at once (or gaining a second stack) stood in two
 * circles. Report A's healers and the Liquid Hand tank stand in one melee
 * doll's circle on purpose, so one Exhaust is normal.
 */
function detectExhaust(players: PlayerInfo[], life: Life, end: number, owners: Map<number, PlayerInfo>): PullError[] {
  const errors: PullError[] = [];
  for (const set of clusterByGap(hitsOf(players, life, EXHAUST, end), (h) => h.e.timestamp, 1000)) {
    const t0 = set[0].e.timestamp;
    for (const p of uniq(set.map((h) => h.p))) {
      const insts = uniq(set.filter((h) => h.p === p).map((h) => h.e.sourceInstance ?? 0));
      const stacked = p.debuffs.some((e) => e.abilityId === AETHEROPLASM && e.debuffStatus === "stack" && Math.abs(e.timestamp - t0) < 1500);
      if (insts.length < 2 && !stacked) continue;
      const death = life.diedFrom(p, t0);
      const dollOf = insts.map((i) => owners.get(i)).filter((o): o is PlayerInfo => !!o && o !== p);
      // The melee feed after the first Exhaust: a melee doll still
      // exhausting at the second (+0:50) is its owner's slow feed, and the
      // double is theirs, not the healer's who stands in a melee circle by
      // plan (user, 2026-10-16, C28 +0:50.1: the dragoon too slow feeding).
      const slow = t0 >= SECOND_EXHAUST_MS ? dollOf.filter(isMelee) : [];
      // The overload explodes (EXHAUST_BURST) on players standing with
      // them: A19's sage took two Exhausts and three others in that circle
      // died to the burst. Those deaths are this player's.
      const splashed = players.filter((o) => o !== p && o.damageTaken.some((e) => e.abilityId === EXHAUST_BURST && Math.abs(e.timestamp - t0) < 1500) &&
        !uniq(set.filter((h) => h.p === o).map((h) => h.e.sourceInstance ?? 0)).slice(1).length && life.diedFrom(o, t0));
      if (slow.length) {
        const dead = [...(death ? [p] : []), ...splashed];
        for (const o of slow) errors.push(playerError(o, {
          ruleId: LL_EXHAUST_RULE_ID, severity: dead.length ? "Major" : "Minor", name: "Doll Fed Too Late",
          description: `Their Jagd Doll was still up for the second Exhaust, which doubled up on ${p.name} with another doll's${dead.length ? `; ${namesOf(dead)} died` : ""}. The melee feed their dolls between the first and second Exhaust.`,
          timestamp: t0, abilityId: EXHAUST, abilityName: "Exhaust",
        }));
        continue;
      }
      errors.push(playerError(p, {
        ruleId: LL_EXHAUST_RULE_ID, severity: death || splashed.length ? "Major" : "Minor", name: "Doubled Exhaust",
        description: `Hit by ${insts.length > 1 ? `${insts.length} dolls' Exhausts` : "a second Exhaust"} at once${dollOf.length ? ` (the dolls of ${namesOf(dollOf)})` : ""}, taking two stacks of Luminous Aetheroplasm${death ? ", and died" : ""}.${splashed.length ? ` The overload burst also killed ${namesOf(splashed)}, who stood with them.` : ""} Each doll's Exhaust may hit you only once: stand in one doll's circle at most, and doll owners keep their dolls apart.`,
        timestamp: t0, abilityId: EXHAUST, abilityName: "Exhaust",
      }));
    }
  }
  return errors;
}

/**
 * Reducible Complexity. A doll fed at 25% HP or more hits the raid for
 * lethal damage (clean feeds ~10k, failures 26k-87k with mass deaths): its
 * owner brought it to a boss too early (Major) and the pull is lost (Raid).
 * A doll killed instead of fed (FEED_DEAD) is the same wipe; the player
 * whose hit took it to 0 HP is named, with the owner mentioned.
 */
function detectDolls(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number, owners: Map<number, PlayerInfo>, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const c of castsOf(casts, [FEED_OK, FEED_DEAD], end)) {
    const owner = owners.get(c.sourceInstance ?? 0);
    if (owner) occurrences?.push({ mechanicKey: LL_DOLL_FEED_RULE_ID, timestamp: c.timestamp, players: [owner.name] });
    const hits = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === c.abilityId && e.timestamp >= c.timestamp && e.timestamp - c.timestamp < 1500 && !bodyHit(e)).map((e) => ({ p, e })));
    const dead = uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const deadText = dead.length ? ` ${dead.length} player${dead.length > 1 ? "s" : ""} died to it (${namesOf(dead)}).` : "";
    if (c.abilityId === FEED_OK) {
      const hp = pct(c);
      if (hp === undefined || hp < FEED_MAX_PCT) continue;
      const med = median(hits.map((h) => realAmount(h.e)).filter((a) => a > 0));
      if (owner) errors.push(playerError(owner, {
        ruleId: LL_DOLL_FEED_RULE_ID, severity: "Major", name: "Doll Fed Too Early",
        description: `Their Jagd Doll touched a boss at ${hp.toFixed(1)}% HP; it must be under 25%. Reducible Complexity hit the raid for ${kFmt(med)} each.${deadText} Keep the doll away from both bosses until it's below 25%, then feed it.`,
        timestamp: c.timestamp, abilityId: FEED_OK, abilityName: "Reducible Complexity",
      }));
      errors.push(raidMarker(LL_DOLL_WIPE_RULE_ID, "Doll Fed Above 25%",
        `A Jagd Doll${owner ? ` (${owner.name}'s)` : ""} was fed at ${hp.toFixed(1)}% HP and Reducible Complexity hit everyone for ${kFmt(med)}.${deadText} Unrecoverable from here; treated as the cutoff point.`,
        c.timestamp, FEED_OK, "Reducible Complexity"));
    } else {
      // The hit that took this doll to 0 HP (damageDone carries the target's
      // HP). A DoT tick that kills logs the HP from before it, equal to its
      // own amount (B34 +0:45.15: Chaos Thrust 104 at 104 HP, no 0-HP event).
      const near = (e: PlayerEvent) => e.target === DOLL && e.timestamp <= c.timestamp && c.timestamp - e.timestamp <= DOLL_KILL_MS;
      const byHp = (pred: (e: PlayerEvent) => boolean) => players.flatMap((p) => p.damageDone.filter((e) => near(e) && pred(e)).map((e) => ({ p, e })))
        .sort((a, b) => b.e.timestamp - a.e.timestamp);
      const zeroed = byHp((e) => e.healthAfter === 0);
      const blows = zeroed.length ? zeroed : byHp((e) => !!e.healthAfter && e.amount === e.healthAfter);
      const killer = blows[0]?.p;
      if (killer) errors.push(playerError(killer, {
        ruleId: LL_DOLL_KILL_RULE_ID, severity: "Major", name: "Killed a Jagd Doll",
        description: `Their ${blows[0].e.abilityName} killed ${owner === killer ? "their own" : owner ? `${owner.name}'s` : "a"} Jagd Doll instead of leaving it to be fed: a dead doll's Reducible Complexity hits the raid hard.${deadText} Stop attacking a doll once it's under 25%; watch AoEs and DoTs near the dolls.`,
        timestamp: blows[0].e.timestamp, abilityId: blows[0].e.abilityId, abilityName: blows[0].e.abilityName,
      }));
      errors.push(raidMarker(LL_DOLL_WIPE_RULE_ID, "Jagd Doll Killed",
        `A Jagd Doll${owner ? ` (${owner.name}'s)` : ""} was killed instead of fed${killer ? ` (killing blow: ${killer.name})` : ""}.${deadText} Unrecoverable from here; treated as the cutoff point.`,
        c.timestamp, FEED_DEAD, "Reducible Complexity"));
    }
  }
  return errors;
}

// ── Hand of Parting / Prayer / Pain ─────────────────────────────────────────

/**
 * Hand of Parting / Prayer punishes the bosses' distance: clean resolutions
 * hit ~2k, a wrong one 29k+ on everyone. The tanks move the bosses, but
 * which one moved wrong isn't in the log, so this is a player-less Raid.
 * Hand of Pain punishes an HP gap between the two: a resolution whose
 * median hit is PAIN_FAIL_DAMAGE+ is the gap check failing (Raid).
 */
function detectHands(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const res of clusterByGap(hitsOf(players, life, [PRAYER, PARTING], end), (h) => h.e.timestamp, 1000)) {
    const t0 = res[0].e.timestamp;
    const med = median(res.map((h) => realAmount(h.e)));
    if (med < HAND_FAIL_DAMAGE && !res.some((h) => (h.e.amount ?? 0) >= PREVIEW_AMOUNT)) continue;
    const prayer = res[0].e.abilityId === PRAYER;
    const dead = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    errors.push(raidMarker(LL_HAND_RULE_ID, `${prayer ? "Hand of Prayer" : "Hand of Parting"} Failed`,
      `${prayer ? "Hand of Prayer (closed fist: bosses apart)" : "Hand of Parting (open palm: bosses together)"} hit everyone for ${kFmt(med)}${dead.length ? `; ${namesOf(dead)} died` : ""}: the bosses were at the wrong distance when it resolved. The tanks (${namesOf(tanks)}) reverse the bosses' distance at the hand cue. Unrecoverable from here; treated as the cutoff point.`,
      t0, res[0].e.abilityId, res[0].e.abilityName));
  }
  // Living Liquid's own HP: its own casts (not the helper copies, which
  // carry an instance number and full HP).
  const llHp = (t: number) => castsOf(casts, [FLUID_SWING, CASCADE, SPLASH, ...VISIBLE_BOSS, FRONTAL], end)
    .filter((c) => c.actorName === "living liquid" && !c.sourceInstance && Math.abs(c.timestamp - t) <= 3000 && pct(c) !== undefined)
    .sort((a, b) => Math.abs(a.timestamp - t) - Math.abs(b.timestamp - t))[0];
  for (const c of castsOf(casts, PAIN, end)) {
    const res = hitsOf(players, life, PAIN, Math.min(end, c.timestamp + 1500)).filter((h) => h.e.timestamp >= c.timestamp);
    if (!res.length) continue;
    const med = median(res.map((h) => realAmount(h.e)));
    if (med < PAIN_FAIL_DAMAGE) continue;
    const dead = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const hand = pct(c), ll = llHp(c.timestamp);
    const hpText = hand !== undefined && ll ? ` Liquid Hand was at ${hand.toFixed(1)}% and Living Liquid at ${pct(ll)!.toFixed(1)}%.` : "";
    errors.push(raidMarker(LL_PAIN_RULE_ID, "Hand of Pain Failed",
      `Hand of Pain hit everyone for ${kFmt(med)}${dead.length ? `; ${namesOf(dead)} died` : ""}: the two bosses' HP were too far apart.${hpText} Keep Living Liquid and Liquid Hand within a few percent of each other (cleave both, shift damage to the higher one). Unrecoverable from here; treated as the cutoff point.`,
      c.timestamp, PAIN, "Hand of Pain"));
  }
  return errors;
}

// ── Throttle ────────────────────────────────────────────────────────────────

/**
 * Liquid Gaol puts Throttle (10s) on six players; it kills on expiry unless
 * cleansed. Report A's healers split the cleanses every pull (the white
 * mage took the tanks, the sage the ranged, melee varied), so on an expiry
 * with both healers alive the healer with fewer successful cleanses is
 * named (both on a tie). With a healer dead the expiry is that death's
 * fallout: player-less.
 */
function detectThrottle(players: PlayerInfo[], life: Life, deaths: DeathEvent[], end: number, occurrences?: ReportedOccurrence[]): { errors: PullError[]; expiryDeaths: Set<DeathEvent> } {
  const errors: PullError[] = [];
  const expiryDeaths = new Set<DeathEvent>();
  const applies = players.flatMap((p) => p.debuffs.filter((e) => e.abilityId === THROTTLE && e.debuffStatus === "applied" && e.timestamp <= end).map((e) => ({ p, e })));
  const healers = players.filter((p) => p.role === "Healer");
  for (const set of clusterByGap(applies, (a) => a.e.timestamp, 1000)) {
    const t0 = set[0].e.timestamp;
    occurrences?.push({ mechanicKey: LL_THROTTLE_RULE_ID, timestamp: t0, players: healers.map((p) => p.name) });
    const cleansedBy = new Map<PlayerInfo, PlayerInfo[]>();
    const expired: { p: PlayerInfo; d: DeathEvent }[] = [];
    for (const { p, e } of set) {
      const rm = p.debuffs.find((x) => x.abilityId === THROTTLE && x.debuffStatus === "removed" && x.timestamp > e.timestamp);
      if (!rm) continue;
      if (rm.timestamp - e.timestamp >= THROTTLE_EXPIRY_MS) {
        const d = deaths.find((x) => x.player === p.name && x.timestamp >= rm.timestamp - 500 && x.timestamp - rm.timestamp <= 3000);
        if (d) { expired.push({ p, d }); expiryDeaths.add(d); }
        continue;
      }
      for (const h of healers) {
        if (h.casts.some((c) => /Esuna|Warden's Paean/.test(c.abilityName) && c.target === p.name && Math.abs(c.timestamp - rm.timestamp) <= 1500)) {
          cleansedBy.set(h, [...(cleansedBy.get(h) ?? []), p]);
        }
      }
    }
    if (!expired.length) continue;
    const who = expired.map((x) => x.p);
    const living = healers.filter((h) => life.alive(h, t0) && life.alive(h, t0 + THROTTLE_EXPIRY_MS));
    const tally = living.map((h) => `${h.name} ${uniq(cleansedBy.get(h) ?? []).length}`).join(", ");
    // Player-less: the healers split by party-list order, which the log
    // doesn't carry, and the healer with fewer cleanses is usually not the
    // one who missed it (user, 2026-10-16, B17 +1:45.8).
    errors.push(playerlessMinor(LL_THROTTLE_RULE_ID, "Throttle Not Cleansed",
      `Throttle ran out on ${namesOf(who)} and killed ${who.length > 1 ? "them" : "them"}.${living.length < 2 ? " A healer was dead, so the cleanses were short." : ` Successful cleanses: ${tally}. The healers split the six Throttles by party-list order (Esuna, 10s each), which the log doesn't show.`}`,
      t0 + THROTTLE_EXPIRY_MS, THROTTLE, "Throttle"));
  }
  return { errors, expiryDeaths };
}

// ── Drainage tethers and Outburst ───────────────────────────────────────────

/**
 * Drainage tethers go to the two tanks. One on a non-tank with both tanks
 * alive names the tank who didn't hold a tether. (Report A's three
 * non-tank Drainages all followed a tank's death: fallout.) A splash on
 * anyone else is in the avoidable table.
 */
function detectDrainage(players: PlayerInfo[], life: Life, casts: EnemyEvent[], end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  for (const set of clusterByGap(castsOf(casts, DRAINAGE, end), (c) => c.timestamp, 1500)) {
    const t0 = set[0].timestamp;
    occurrences?.push({ mechanicKey: LL_DRAINAGE_RULE_ID, timestamp: t0, players: tanks.map((p) => p.name) });
    if (tanks.length !== 2 || tanks.some((p) => !life.alive(p, t0 - 500))) continue;
    const holders = set.map((c) => players.find((p) => p.name === c.target)).filter((p): p is PlayerInfo => !!p);
    const wrong = holders.filter((p) => !isTank(p));
    if (!wrong.length) continue;
    const idle = tanks.filter((p) => !holders.includes(p));
    const died = wrong.filter((p) => life.diedFrom(p, t0));
    for (const t of idle) errors.push(playerError(t, {
      ruleId: LL_DRAINAGE_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Drainage Tether Not Taken",
      description: `A Drainage tether went to ${namesOf(wrong)} instead of a tank${died.length ? `, who died to it` : ""}. Each tank takes one tornado's tether and stands clear of the party.`,
      timestamp: t0, abilityId: DRAINAGE, abilityName: "Drainage",
    }));
  }
  return errors;
}

/** Yalms from where the orb exploded to a player's position at its hit. */
function orbDistance(c: EnemyEvent, h: Hit): number | undefined {
  if (c.x === undefined || c.y === undefined || h.e.x === undefined || h.e.y === undefined) return undefined;
  return Math.hypot(h.e.x - c.x, h.e.y - c.y) / 100;
}

/**
 * Who touched the Embolus: the Outburst cast sits where the orb burst, and
 * the toucher stands on it. B21 (user: the dragoon touched it): 0.8y, next
 * 3.5y (the tank holding a boss). A19, unreviewed, nearest 3.9y with the
 * rest 20y+ out: maybe the boss, so a player is named only within
 * ORB_TOUCH_Y and ORB_TOUCH_MARGIN_Y clear of everyone else.
 */
function orbToucher(c: EnemyEvent, res: Hit[]): PlayerInfo | undefined {
  const d = uniq(res.map((h) => h.p)).map((p) => ({ p, y: orbDistance(c, res.find((h) => h.p === p)!) }))
    .filter((x): x is { p: PlayerInfo; y: number } => x.y !== undefined).sort((a, b) => a.y - b.y);
  if (!d.length || d[0].y > ORB_TOUCH_Y) return undefined;
  if (d[1] && d[1].y - d[0].y < ORB_TOUCH_MARGIN_Y) return undefined;
  return d[0].p;
}

// ── deaths, called wipes ────────────────────────────────────────────────────

/** No-killing-blow deaths that are the wipe being called (not Throttle expiries). */
function calledWipeDeaths(deaths: DeathEvent[], skip: Set<DeathEvent>, pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !skip.has(d));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * The Epic of Alexander Phase 1 (Living Liquid). Self-gates on Cascade /
 * Fluid Swing, which no other fight casts, and stops at the first Phase 2
 * cast (Hawk Blaster): later phases belong to their own modules (and the
 * fallback model until those exist).
 */
export function detectLivingLiquidErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  if (!enemyCasts.some((c) => SIGNATURE.includes(c.abilityId))) return [];
  const p2 = phase1End(enemyCasts);
  const deaths = deathEvents.filter((d) => d.timestamp - DEATH_EVENT_LAG_MS <= p2);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p2, lastEvent);
  const llTankName = castsOf(enemyCasts, FLUID_SWING, end)[0]?.target;
  const llTank = players.find((p) => p.name === llTankName && isTank(p));
  const owners = dollOwners(players);
  // All deaths: a Throttle applied in Phase 1 can expire after it (D14:
  // Living Liquid died first, the expiry landed as Limit Cut began).
  const throttle = detectThrottle(players, buildLife(players, deathEvents), deathEvents, end, occurrences);

  const errors = [
    ...detectAvoidable(players, life, enemyCasts, deaths, llTank, end),
    ...detectWaveBaits(players, life, enemyCasts, deaths, llTank, end),
    ...detectExhaust(players, life, end, owners),
    ...detectDolls(players, life, enemyCasts, end, owners, occurrences),
    ...detectHands(players, life, enemyCasts, end),
    ...throttle.errors,
    ...detectDrainage(players, life, enemyCasts, end, occurrences),
  ];
  // Drainage with a tank dead: unresolvable (user, D3, D6).
  const tanks = players.filter(isTank);
  const drain = castsOf(enemyCasts, DRAINAGE, end)[0];
  if (drain && tanks.length === 2) {
    const dead = tanks.filter((p) => !life.alive(p, drain.timestamp - 1500));
    if (dead.length) errors.push(raidMarker(LL_DRAINAGE_TANK_DEAD_RULE_ID, "Tank Dead at Drainage",
      `${namesOf(dead)} was dead when Drainage went out: its tether lands on someone who can't take it. Unresolvable from here; treated as the cutoff point.`,
      drain.timestamp, DRAINAGE, "Drainage"));
  }
  // An Embolus touched someone: Outburst on the raid.
  const outburst = castsOf(enemyCasts, OUTBURST, end)[0];
  if (outburst) {
    const res = hitsOf(players, life, OUTBURST, Math.min(end, outburst.timestamp + 1500)).filter((h) => h.e.timestamp >= outburst.timestamp);
    const dead = uniq(res.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
    const toucher = orbToucher(outburst, res);
    if (toucher) errors.push(playerError(toucher, {
      ruleId: LL_ORB_RULE_ID, severity: "Major", name: "Touched an Embolus",
      description: `Stood where an Embolus orb exploded (${(orbDistance(outburst, res.find((h) => h.p === toucher)!) ?? 0).toFixed(1)}y from it, everyone else ${ORB_TOUCH_MARGIN_Y}y+ further): Outburst hit the raid${dead.length ? ` and ${namesOf(dead)} died` : ""}. The orbs drift toward the bosses; step out of their path, never through it.`,
      timestamp: outburst.timestamp, abilityId: OUTBURST, abilityName: "Outburst",
    }));
    errors.push(raidMarker(LL_OUTBURST_RULE_ID, "Embolus Collision",
      `An Embolus orb touched ${toucher ? toucher.name : "a player or a boss"} and exploded (Outburst)${dead.length ? `; ${namesOf(dead)} died` : ""}. Bait the orbs' paths outside, then bring the bosses back in behind them. Treated as the cutoff point.`,
      outburst.timestamp, OUTBURST, "Outburst"));
  }

  // Generic cutoffs, P1 wipes only: the earliest, and only before any
  // mechanic Raid.
  const generic: PullError[] = [];
  if (p2 === Infinity) {
    // A boss protean sequence needs all eight: four close, four far.
    for (const v of clusterByGap(castsOf(enemyCasts, VISIBLE_BOSS, end), (c) => c.timestamp, 1000)) {
      const t = v[0].timestamp;
      const dead = players.filter((p) => !life.alive(p, t - 500));
      if (!dead.length) continue;
      generic.push(raidMarker(LL_DEAD_GOING_IN_RULE_ID, "Player Dead Going Into Protean Wave",
        `${namesOf(dead)} ${dead.length === 1 ? "was" : "were"} still dead when Living Liquid's Protean Wave sequence began. Its volleys need all eight (four close, four far), so the waves fall on players still under Water Resistance Down II; unresolvable from here, treated as the cutoff point.`,
        t, v[0].abilityId, "Protean Wave"));
      break;
    }
    const called = calledWipeDeaths(deaths, throttle.expiryDeaths, lastEvent);
    const calledList = deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
    if (calledList.length >= CALLED_WIPE_COUNT) {
      generic.push(raidMarker(LL_CALLED_WIPE_RULE_ID, "Wipe Called",
        `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called.`,
        calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(LL_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
    const enrage = castsOf(enemyCasts, ENRAGE, end)[0];
    if (enrage) generic.push(raidMarker(LL_ENRAGE_RULE_ID, "Cascade (Enrage)",
      "The final Cascade, Phase 1's enrage, went off: Living Liquid wasn't killed in time.", enrage.timestamp, ENRAGE, "Cascade"));
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  // One mechanic Raid per pull is enough: later ones are the wipe's fallout.
  const raids = errors.filter((e) => e.severity === "Raid").sort((a, b) => a.timestamp - b.timestamp);
  return errors.filter((e) => e.severity !== "Raid" || e === raids[0]).sort((a, b) => a.timestamp - b.timestamp);
}
