// The Epic of Alexander (Ultimate) -- Phase 1: Living Liquid.
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
