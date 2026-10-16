// The Epic of Alexander (Ultimate) -- Phase 2: Brute Justice / Cruise Chaser.
//
// -- GUIDE-DERIVED MODEL (2026-10-15) --
// Research only, no detector and no claims verified against local logs.
// Scope: eight-player level-80 Ultimate (patch 5.11), item-level sync 475.
// Starts at J Kick after Limit Cut; ends when BOTH enemies are defeated.
// Temporal Stasis belongs to alexander-prime.ts. A future VERIFIED AGAINST
// LOGS section takes precedence over these guide/source-derived claims.
// Patch/job changes alter damage and push times; launch damage values and
// mitigation cooldown schedules are not stable mechanic thresholds.
//
// -- SOURCES CHECKED 2026-10-15 --
// [NA] NAUR resource directory / Elina BJCC toolbox:
// https://naurffxiv.com/ultimate/tea
// https://ff14.toolboxgaming.space/?id=492297437831961&preview=1
// [WD] Browser inspection of all eight roles in NAUR/Elinabin BJCC:
// https://wtfdig.info/ultimates/tea#naur
// [IV] Lyra, generalized mechanics plus stacked and split alternatives:
// https://www.icy-veins.com/ffxiv/the-epic-of-alexander-ultimate-guides-brute-justice-and-cruise-chaser
// [US] Split-stack regional execution:
// https://ultistrats.com/guides/tea/
// [OCE] Full written split-boss explanation; regional difference context:
// https://materiaraiding.com/ultimate/tea
// https://materiaraiding.com/resources/visitorsguide
// [BM] Primary event and geometry definitions, master branch:
// https://github.com/awgil/ffxiv_bossmod/tree/master/BossMod.Ultimate/Shadowbringers/Ultimate/TEA
// Read TEAEnums.cs, TEAStates.cs, TEAConfig.cs, P2Nisi.cs,
// P2CompressedWaterLightning.cs, P2MissileCommand.cs, P2PlasmaShield.cs,
// P2Flarethrower.cs, P2SuperJump.cs and ApocalypticRay.cs.
// [CB] Primary reference timeline / triggers, main branch:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/05-shb/ultimate/the_epic_of_alexander.txt
// Same directory: the_epic_of_alexander.ts. No implementation reproduced.
//
// -- SHAPE, CLOCK, AND ACTORS --
// Both enemies have independent HP and enmity, and must be defeated close
// together. One reaching its defeat threshold accelerates the other's
// enrage; a missing death event alone need not mean an enemy survived:
// [BM] describes the defeated actors becoming untargetable at 1 HP.
// No mechanic resource meter to manage: this is a scripted timeline, with
// independent Nisi timers and three ~30s elemental hand-off rounds.
// Candidate actors: BJ 0x2C4C, CC 0x2C4E, Steam Chakram 0x2C4D,
// Plasma Shield 0x2C4F, Liquid Rage 0x2C49, Gelid Gaol 0x2C81 [BM].
// [CB] below is rebased to J Kick = +0, NOT the synthetic timeline 226.1:
//   +0 J Kick; +3 targetable; +12.2 Whirlwind; +15.2 Judgment Nisi;
//   +21.3 Link-Up; +29.3 Optical Sight; +30.1 Chakrams;
//   +34.5 Hawk Blaster; +36.4 Photon -> first Nisi pass;
//   +46.6 Spin Crusher; +51.2 Water/Lightning 1;
//   +62.5 Earth Missile; +64.5 Hidden Minefield; +66.6 Enumeration/Ice;
//   mine soaks / pass 2; +80.6 Water/Lightning 2;
//   Verdict around this overlap; +87.4 Limit Cut/shield;
//   +89.4 Flarethrower -> pass 3; +101.5 Whirlwind;
//   +110.1 Water/Lightning 3; line up / pass 4;
//   +128.4 Propeller Wind; +130.4 Gavel; Nisi clears shortly later;
//   +140.7 tank Photon; +148.7 Double Rocket Punch; +156.0 Super Jump;
//   +158.3 five Apocalyptic Ray hits; +168.9/+177.0 Whirlwind;
//   +187.6 Final Sentence; +197.6 Eternal Darkness if not pushed.
// Entries are action resolution, not cast starts; Final Sentence and
// Eternal Darkness have 8s casts [BM]. Timer-derived late deadlines need
// a report: BM's late P2 state timing is explicitly incomplete.
//
// -- CANDIDATE IDs, STATUS MAPPING, SEVERITY --
// IDs below are decimal game IDs, not verified FFLogs IDs. Raw statuses
// usually become 1000000 + raw ID in FFLogs; a control cast, aura, helper
// hit and penalty must not be treated as interchangeable events.
// Every failure below is guide/source-inferred, not observed in a report.
// Minor = nonfatal avoidable damage without Damage Down; named Major =
// root cause of death/wipe or confirmed avoidable Damage Down; Raid =
// established unrecoverable state. Correct soak/buster damage deaths are
// mitigation concerns. A casualty is not automatically the responsible
// player; no independent flags for downstream effects of an earlier death.
//
// -- NAUR SLOTS, CLOCK SPOTS, AND PASS TRAFFIC --
// True north unless stated otherwise. NAUR/Elinabin uses split positions
// for much of P2: MT owns BJ north, OT owns CC south, then recenters for
// the final shared buster. This plan is not the stacked/Tollgate variant.
// Opening clock, green floor ring: MT N; M1 NE; shield healer E;
// caster SE; OT S; phys SW; regen healer W; M2 NW.
// DPS rotate CCW after first Photon to the support slot immediately CCW:
// M1<->MT, M2<->regen, caster<->shield, phys<->OT. Repeat those partners
// after mines/Enumerations. Supports plant; DPS move for both early passes.
// Pass 3 uses Verdict color instead of the original partner. Supports
// line N->S: MT / current lightning healer / other healer / OT. Melees
// approach on W half, ranged on E half; crossing the entire line invites
// contact with an unrelated Nisi. Pass 4 occurs at the ice block.
// BPOG color line means Alpha blue / Gamma purple / Beta orange / Delta
// green, NOT alphabetical alpha-beta-gamma-delta order. Line east of the
// west ice block, pair matching colors and hide from CC behind the block.
//
// -- JUDGMENT NISI / VERDICT / GAVEL --
// Candidate casts: Judgment Nisi 18494; Verdict 18491; Gavel 18492;
// penalty/enrage Final Sentence 18518 (specific trigger needs verification).
// Raw transferable Final Decree statuses: alpha 2222, beta 2223,
// gamma 2137, delta 2138. Required Final Judgment statuses from Verdict:
// alpha 2224, beta 2225, gamma 2139, delta 2140. They are distinct auras.
// What happens: four transferable colors begin on either all DPS or all
// supports. Contact COPIES a color to an unmarked player; it does not
// instantly delete the donor's copy. The donor's older timer expires, so
// pass windows temporarily have eight live copies. Different-color
// contact kills the colliding players and normally dooms the phase.
// Keep each color alive via four planned passes, then ensure all eight
// players hold the color their own Verdict requires at Gavel resolution.
// Verdict pairs one DPS and one support per required color. The third and
// fourth contacts therefore follow color matching, not fixed early pairs.
// Correct play: use separate positions within stack radii, plant assigned
// receivers, keep all four colors alive. Wait until all Nisi actually
// disappear after Gavel before freely crossing the party.
// Failure: color collision -> LOG SIGNAL: incompatible transferable
// statuses at contact / immediate deaths / possible Final Sentence;
// FAULT: player who crossed the agreed stationary/traffic assignment if
// known, otherwise both contact candidates unresolved; CONSEQUENCE: Major
// when attributable, Raid for the unrecoverable color/death state.
// Failure: last copy expires -> LOG SIGNAL: last live carrier loses a
// required color before next receiver gains it; FAULT: missed passer or
// receiver only with assignment/timing evidence; CONSEQUENCE: Raid.
// Failure: wrong/missing final color -> LOG SIGNAL: Gavel resolution with
// mismatched Final Decree vs required Final Judgment and wipe penalty;
// FAULT: missed pair duty if established; CONSEQUENCE: Raid + named Major.
// Removal: transfers create new aura applications while old copies expire;
// no Esuna. Gavel eventually clears them. Death removes the copy; if it was
// the last copy, the color cannot be restored. Death-caused loss is fallout.
// Not errors: eight temporary copies, ordinary DoT ticks, donors losing
// Nisi after a good pass, carefully spaced elemental/Enumeration stacks.
//
// -- LINK-UP / COMPRESSED WATER AND LIGHTNING --
// Link-Up control cast 18495. Raw statuses: Compressed Water 2142,
// Compressed Lightning 2143. Resolve hits: Crashing Wave 18496,
// Crashing Thunder 18497. Death penalties: Punishing Wave 18498,
// Punishing Thunder 18499. These penalties are NOT successful soak hits.
// What happens: initial Water on a healer, Lightning on a DPS, ~30s timers.
// Each expires as an 8y-radius split-damage stack. Water is normally 3+
// players, Lightning exactly carrier + one helper. Debuff moves to an
// eligible participant; previous carrier has resistance down and must
// avoid its next same-element explosion. Three rounds precede Gavel.
// Guides call these Water/Lightning Vulnerability Up; BM's event notes
// call them resistance down. Exact names/IDs/durations remain unverified.
// Water's 3+ is the normal safe plan, not a proven hard count gate: [IV]
// mentions a heavily mitigated two-person Water. Lightning's two-person
// normal resolution controls who inherits it. Water/Lightning reaching
// one person together, or a compressed carrier dying, causes raid penalty.
// Each Water also leaves a tornado, which cannot be left indefinitely.
// NAUR hand-offs:
//   Round 1 Water at D (W): first healer + eligible other healer/ranged;
//   Lightning DPS shares with BJ tank N; CC tank stays clear.
//   Round 2 Water at B (NE): eligible healer/ranged; healer who had first
//   Water takes Lightning from MT N. MT must finish recentering BJ first.
//   Round 3 Water remains B: carrier plus eligible ranged/M1, MT can help
//   if fewer than three; Lightning healer shares SW with OT, or SE with
//   the second Water holder according to who must be excluded from Water.
//   Previous Water holders remain out; keep Nisi contact spacing.
// WD supplies the conditional third-Lightning helper alternatives; a
// universal OT-only assignment would be too strict.
// Failure: carrier death -> LOG SIGNAL: 18498/18499 after carrier death;
// FAULT: the cause of that death, not a second flag on carrier's explosion;
// CONSEQUENCE: Raid cutoff; named Major only for the original proven error.
// Failure: wrong/overlapping stack -> LOG SIGNAL: wrong-element repeat,
// simultaneous stack hits or penalty; FAULT: misplaced carrier/helper
// with assignments established; CONSEQUENCE: Major/Raid if lethal.
// Failure: under-share -> LOG SIGNAL: few Crashing hit recipients and
// lethal split; FAULT: missing assigned helper only if established;
// CONSEQUENCE: Major/Raid. Ordinary low HP alone is mitigation, not fault.
// Removal: expiry is the successful explosion/transfer; death is failure;
// no cleanse. Terminal/Gavel clearing is not proof of a missed explosion.
// Not errors: expected Crashing hits, hand-off status changes, deliberate
// spread inside stack radius, planned two-person Water proven survivable.
//
// -- CHAKRAMS / OPTICAL SIGHT / PHOTON / SPIN CRUSHER --
// Eye of the Chakram 18517: two opposite external actors, 6s cast,
// ~6y-wide long lines aimed through baited positions. Opening stack baits
// them through center; clock spreads leave those paths. Optical Sight
// control 18479 produces Hawk Blaster 18481, 10y circles at player baits.
// Photon control 18486 / per-player effect 18487 sets HP to 1. First
// affects whole party; second only tanks. Nisi DoT continues after Photon.
// Spin Crusher 19058: 3s cast, untelegraphed 90-degree frontal, ~5y plus
// CC hitbox. OT points S, then crosses behind CC to dodge without Nisi
// contact. CC autos 18810 are much more threatening than BJ autos 18811.
// Failure: chakram / ground / Crusher hit -> LOG SIGNAL: 18517/18481/
// 19058 damage and positions; FAULT: wrong baiter if misplaced lane,
// otherwise entrant; CONSEQUENCE: Minor/Major by outcome and Damage Down.
// Photon itself and unavoidable Whirlwind 18882 are never dodge errors.
// Removal: ground attacks expire; Photon is an HP set, not a dispellable
// Doom. Death to its following normal Nisi tick does not prove a bad pass.
//
// -- MISSILE COMMAND / MINES / ENUMERATION / ICE --
// Control 18509. Two farthest from BJ bait Earth Missile 18510 (~5y
// ground circles/sludge), then Hidden Minefield 18513 (~5y placement).
// Hidden Mine 18514 is intended tank soak damage, ~8y splash; missed mine
// penalty Hidden Mine Shrapnel 18515 is raidwide. Ice Earth Missile 18511
// marks one tank, ~6y personal AoE, then expanding lethal ice ground.
// Enumeration 18512 is EXACTLY three players including marked DPS, two
// marks on random DPS. BM notes success may have no damage, failure kills
// everyone inside; its 5y modeled radius is explicitly not verified.
// Correct NAUR: OT + phys bait missiles/mines S, step forward out of
// sludge and placement circles. OT mitigates both mines, one after the
// other with healing. Phys waits until both pop before pass to OT.
// Regen + M2 + M1 are W Enumeration; shield + caster + phys E. M1/phys
// swap if both melee or both ranged receive marks, ensuring one mark
// and three players per side. Neither tank joins these Enumerations.
// Ice tank drops outside near W tornado at D so the expanding puddle
// freezes it into Gelid Gaol; do not stand on the tornado to place ice.
// Finish own duties, restore boss position, then conduct Nisi pass 2.
// Failure: unsoaked mine -> LOG SIGNAL: distinct 18515; FAULT: assigned
// mine tank if a living/available duty was missed; CONSEQUENCE: Raid.
// Failure: mine clips party -> LOG SIGNAL: 18514 on nonassigned players;
// FAULT: premature passer/entrant or misplaced mine baiter as established;
// CONSEQUENCE: Minor/Major. Tank's intended two hits are not failures.
// Failure: Enumeration wrong count -> LOG SIGNAL: 18512 deaths in ring,
// wrong occupancy if positions available; FAULT: missing/extra assigned
// person or wrong marked flex, not all victims; CONSEQUENCE: Major, Raid
// when the resulting Nisi/element state is unrecoverable.
// Failure: ice misses tornado -> LOG SIGNAL: no Gelid Gaol / later
// tornado penalty or failed LOS; FAULT: marked ice tank if placement
// evidence settles it; CONSEQUENCE: Raid when objective is lost.
// Removal: mines disappear on soak or timed detonation. Sludge/ice ground
// dissipate after the sequence; frozen pillar persists for Propeller Wind.
// Empty success damage for Enumeration does not establish a missing cast.
//
// -- PLASMA SHIELD / FLARETHROWER / TORNADO LIFECYCLE --
// Limit Cut control 18483, CC boss aura Invincibility raw 775; shield
// Directional Invincibility raw 1125. This is NOT numbered Limit Cut.
// Shield takes damage only from its FRONT; burst it in its short window
// (~5-6s in strategy descriptions). Failure gives CC Damage Up, then a
// lethal Whirlwind. Exact penalty buff mapping/deadline need a report.
// Correct NAUR: OT brings CC SW facing ranged/center; phys, caster and
// OT attack the shield from front. Melees may remain on BJ. Do not assume
// everyone's absence from shield damage is a mechanic error.
// Simultaneous Flarethrower control 18501 / cone damage 18502 targets
// BJ's nearest player, not inherently its tank. MT baits it through the
// second tornado at B and away from shield/ranged. Cone angle in BM is
// provisional; 90 degrees must not be treated as a verified hit boundary.
// Water tornado 1 (W) is frozen by Ice; tornado 2 (NE) is deleted by fire;
// tornado 3 remains until Gavel/phase cleanup. Close contact with a live
// tornado causes Drainage P2 18500, ~6y splash/10y knockback, not P1 soak.
// Unresolved tornado enrage candidate Severe Contamination 18891 is
// commented/unconfirmed in BM; name/ID require log verification.
// Failure: shield left alive -> LOG SIGNAL: shield persists, CC Damage Up
// / lethal 18882; FAULT: collective unless a concrete assigned contribution
// was missed; CONSEQUENCE: Raid. Insufficient damage is not blame-by-rank.
// Failure: wrong-direction shield attack -> LOG SIGNAL: immune attacks
// from outside frontal side; FAULT: attacker if geometry established;
// CONSEQUENCE: Major only when it causes objective failure.
// Failure: wrong fire aim -> LOG SIGNAL: 18502 targets / surviving second
// tornado; FAULT: wrong closest bait or MT aim, as proven; CONSEQUENCE:
// Minor/Major for clipping, Raid for failed tornado objective.
// Removal: shield defeat ends invincibility; correct Ice/fire removes
// tornadoes. Gavel cleanup is normal. No player dispel for any of these.
//
// -- PROPELLER WIND / GAVEL / ENDING BUSTERS --
// Propeller Wind 18482, 6s cast: line-of-sight behind frozen tornado
// relative to CC. Failure confuses the exposed player, risking Nisi
// collision. Correct play: CC opposite pillar from party, BPOG line,
// fourth matching pass, wait for post-Gavel Nisi removal before moving.
// Failure: exposed -> LOG SIGNAL: 18482 effect / confusion status (ID
// unverified); FAULT: player outside proper shadow, or CC tank if it moved
// the source and broke valid LOS; CONSEQUENCE: Major if it causes deaths,
// Raid when Nisi/Gavel can no longer resolve. Forced movement fallout is
// not a second collision accusation. Gavel correctness is described above.
// Double Rocket Punch 18503 is a shared tank buster, 4s cast/~3y splash.
// [IV]'s bullet incorrectly repeats the Super Jump description here;
// BM's definition/state machine and WD agree it is the shared buster.
// Heal tank Photon first, stack tanks near wall, share with mitigation
// or use the agreed invulnerability. Party stays away from tanks.
// Super Jump control 18505 / ground damage 18506: farthest target, ~10y
// circle. NAUR phys baits E wall; everyone else W. Baiter sidesteps after
// jump. Apocalyptic Ray control 18507 / cone pulses 18508, five hits;
// BM approximates ~25.5y/90 degrees with angle unverified, aimed toward
// CC/BJ target logic needing confirmation. Party must stay outside cone.
// Failure: jump/ray clips -> LOG SIGNAL: 18506/18508 extra victims;
// FAULT: bad farthest bait or entrant if established; CONSEQUENCE: Major
// if lethal, otherwise Minor unless Damage Down confirmed.
// Not errors: shared/invulnerable tank buster, assigned jump hit, correctly
// mitigated raidwides. A buster death alone is not a mechanic failure.
//
// -- VARIANTS AND PULL-END STATES --
// Stacked / Strat 5 / Tollgate keeps bosses together for cleave and uses
// different stack/mine routes. Split plans trade that cleave for space;
// NAUR's OT taking BOTH mines is intentional, while another plan may
// split one mine per tank. Nisi passers can be DPS-move, support-move,
// unmarked-move or marked-move. BPOG is a chosen color order, not a rule
// of the encounter; different consistent color lines can satisfy Gavel.
// Nisi collision/lost color, compressed carrier death, unsoaked mine,
// unresolved shield/tornado or failed Gavel normally ends the pull.
// Surviving avoidable ground damage alone does not establish a cutoff.
// Killing one boss too early causes the partner's accelerated enrage;
// ordinary final enrages are 18518 / 18490. Defeat both before completion.
// Early phase kills and omitted late Whirlwinds/jump are not errors.
//
// -- OPEN QUESTIONS FOR LOG VERIFICATION --
// 1. Nisi original/refreshed lifetimes, contact radius, exact collision
//    killing action, and Gavel-vs-timed Final Sentence event signatures.
// 2. Elemental resistance names/durations, hard vs practical soak counts,
//    inheritance eligibility, third-round helper, death/explosion order,
//    and removal/transfer behavior when Gavel clears remaining debuffs.
// 3. Missing-mine and tornado penalty IDs, deadlines, ice growth/LOS width,
//    and whether all relevant ground/pillar actors are exported to FFLogs.
// 4. Enumeration success visibility, failure radius, marked-target data,
//    shield front-angle/deadline, Damage Up aura, actual shield assignees.
// 5. Propeller confusion name/removal and attribution when CC moves;
//    Apocalyptic Ray's exact targeting and geometry after Super Jump.
// 6. Last-boss defeat windows, HP/targetability evidence and exact late
//    enrage clock; distinguish voluntary edge resets and death fallout.
