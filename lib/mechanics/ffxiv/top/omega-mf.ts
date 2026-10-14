// The Omega Protocol (Ultimate) -- Phase 2: Omega-M and Omega-F.
//
// -- GUIDE-DERIVED MODEL (2026-10-14; NOT VERIFIED AGAINST LOGS) --
// Comment-only research. Every failure is guide-inferred, not observed.
// Scope: Ultimate, original 6.31 script; sync 635. No verified mechanic
// hotfix found. Launch DPS/damage numbers are not present-day thresholds.
// P2 includes Party Synergy and Limitless Synergy; the merge/dodge belongs
// to omega-reconfiguredd.ts.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV] Lavender/Meru: flexible symbols, full/semi Remote reversal,
// all-meteors-in mitigation plan:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-2-guide
// [EL] Tuufless/Elemental: 1234 symbols, partial reversal, tank tethers:
// https://ffxiv.tuufless.com/elemental/top/02_omega_mf/
// Author's source also read at github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/02_omega_mf.en.md.
// [TH] LPDU: BPOG, distance constraints, target selection and timeline:
// https://thaliak.com/ultimates/top/
// [OCE] Different symbol swap and tether assignment:
// https://materiaraiding.com/resources/visitorsguide
// [CB] Relative event clock, with artificial phase anchors:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] Game IDs/geometry, not FFLogs-verified spell mappings:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory P2PartySynergy.cs and P2LimitlessSynergy.cs also read.
//
// -- SHAPE, ACTORS AND CLOCK --
// Two targetable bosses initially; four-player damage access per boss.
// During Party Synergy, actors transform M <-> F. Their actor identity
// and enmity need not reset when the visible name/model changes.
// Then M protects F; kill M to remove F's invulnerability, then kill F
// before Laser Shower. No shared-health assumption; no health push skips
// the required Party Synergy sequence in the referenced normal plans.
// CB times relative to its P2 map-effect anchor (200 is NOT pull time):
// +2.3 targetable, +6.4 Firewall, +14.5 Solar Ray, +30.9 Party Synergy;
// +41.3 clone AOEs, +47.7/+48 Fire/Laser, +54.9 knockback, +59.1 stacks;
// +62.1 targetable, +82.4 Limitless, +87.4 Passage/enrage starts;
// +95.6/.7 tether cones/arrow, +106.7 Beyond Defense, +109.7 Meteor,
// +110 Pile Pitch, +118.8 Cosmo Memory, +147.4 Laser Shower impact.
// Anchor ~2s before targetability explains IV's ~2:25 phase enrage.
// Roles MT/ST = assigned tanks, D1/D2 melee, D3 physical ranged,
// D4 caster, H1/H2 healers; job alone does not establish actual slots.
// Status IDs below are raw game IDs, usually +1000000 in FFLogs.
// Headmarkers/tethers are separate event types, not ability IDs.
//
// -- FIREWALL / PACKET FILTER --
// Candidates: Firewall visual casts 31552/31553; Packet Filter M/F
// player statuses 3499/3500; transformation boss statuses 3454/1675.
// What happens: intended 4:4 partition; Packet Filter F blocks damage
// and status applications to F, and Packet Filter M blocks M. The
// filter names the FORBIDDEN boss, not the assigned damage target.
// Correct play: stand near assigned boss at filter snapshot; balance
// damage access with the group's composition. Cleaving both before the
// filter resolves and just after its expiry is ordinary play.
// Failure modes:
//   Wrong filter -> LOG SIGNAL: unexpected filter at snapshot, attempted
//     attacks/statuses on forbidden target blocked/zero damage; FAULT:
//     assignment mismatch if known, not necessarily the filter holder
//     (someone else could have crossed closer); CONSEQUENCE: throughput
//     loss, Major only with evidenced contribution to death/wipe.
// Removal: expires at the end of Limitless Synergy; transforms do not
// simply clear it. Pre-applied DoTs can tick for zero on forbidden boss.
// Not errors: zero damage on an invulnerable/filtered target by itself,
// unequal job composition in the groups, brief pre-filter cleaves.
// Selection disagreement is listed below; proximity to each boss is
// not yet proven to be two independent nearest-four selections.
//
// -- SOLAR RAY AND TWO-BOSS AUTOATTACKS --
// Candidates: Solar Ray casts/damage 32362/32363, radius 5y [BM];
// M/F autoattacks 31742/31743. Both target their respective tanks.
// Correct play: one tank holds each, busters separated from party.
// After gender/model swap, maintain chosen tank targets by Provoke if
// the raid plan requires it; IV permits leaving the tanks exchanged.
// Failure modes:
//   Buster clips party -> LOG SIGNAL: Solar Ray damages a non-primary
//     victim within 5y; FAULT: misplaced tank or encroaching player by
//     raid spot; CONSEQUENCE: Major for death/Damage Down, else Minor.
//   Loose enmity -> LOG SIGNAL: boss autoattacks a non-tank after return;
//     FAULT: tank only if their duty/ability to reestablish hate is known;
//     CONSEQUENCE: Major if it kills, not a generic victim error.
// Removal: no buster-cleanse or compulsory debuff swap described.
// Not errors: F's denser auto sequence, tanks intentionally swapping
// visible bosses, correct tank deaths from insufficient mitigation.
//
// -- PARTY SYNERGY: CLONES AND GLITCH --
// Candidates: controller casts 31550/31551; Mid/Remote Glitch statuses
// 3427/3428; partner tether 222; symbols circle/triangle/square/cross
// headmarkers 416/417/418/419 (availability in FFLogs unverified).
// What happens: four random same-symbol pairs, all with one glitch mode.
// Two real and two decoy M/F forms appear; real outer M faces real F.
// M sword: Efficient Bladework 31526, 10y circle; M shield: Beyond
// Strength 31525, 10-40y donut. F staff: Optimized Blizzard III 31533,
// 10y-wide cross. F legs: Superliminal Steel visual 31530, left/right
// damage 31531/31532, 36y-wide side rectangles [BM geometry candidates].
// Correct play: resolve combined safe area first; glitch distance need
// only be satisfied at the subsequent damage checks, not during travel.
// F legs/M sword -> near F; F legs/M shield -> near M;
// F staff/M shield -> M's sides inside donut hole;
// F staff/M sword -> outside M's circle, off F's cross.
// Failure modes:
//   Clone AOE -> LOG SIGNAL: one of resolving damage IDs, Damage Down
//     or death; FAULT: bad dodger if correct cue/area can be established;
//     CONSEQUENCE: Major for death/Damage Down; likely Raid with a
//     missing body for the later 4:4 stacks.
// Removal: glitch persists through knockback/stacks, then expires.
// Not errors: transient bad tether distance while dodging/returning;
// vulnerability seen outside a damage snapshot is not itself a failure.
//
// -- PARTY SYNERGY: OPTICAL LASER / FIRE / SPOTLIGHT --
// Candidates: Optical Laser cast/damage 31521 (16y-wide line from eye);
// Optimized Fire III 31535 (7y circle per player); Discharger 31534
// (13y radial knockback); Spotlight 31536 (6y shared circle).
// What happens: eight Fire spreads concurrent with eye's center line;
// then knockback and five M circular cleaves, two four-person stacks.
// Each pair must be separated by Mid 20-26y or Remote >=35y [EL]; BM
// uses a 34y Remote lower bound, an unresolved numerical disagreement.
// Correct play: eye is relative north for symbol rows on either side
// of Laser. Each row has one of every symbol; opposite partners respect
// glitch distance. Next, use the middle of the three adjacent M clones
// as new north. Knock west/south for Mid, west/east for Remote [IV/EL].
// If both stack marks land on the same side, exchange a marked player
// and their partner. Which pair exchanges is strategy-dependent.
// Failure modes:
//   Fire overlap -> LOG SIGNAL: extra 31535 hits, vulnerability/death;
//     FAULT: wrong row/spacing player by plan; CONSEQUENCE: Major.
//   Bad pair distance -> LOG SIGNAL: vulnerability active at Fire or
//     Spotlight with geometry outside allowed band; FAULT: displaced
//     partner or both if indistinguishable; CONSEQUENCE: Major for
//     lethal/penalized hit, Raid when later required stacks fail.
//   Laser/clone hit or wall -> LOG SIGNAL: Laser/Bladework damage or
//     ability-less death after Discharger; FAULT: bad knockback/dodge
//     spot, unless collision/fallout caused it; CONSEQUENCE: Major.
//   Bad stacks -> LOG SIGNAL: both Spotlights overlap, <4 recipients,
//     increased split damage or missing mark holder; FAULT: failed swap
//     or absent assigned member if known; CONSEQUENCE: Major and Raid.
// Removal: marks resolve on scripted hits; no dispel solution. Dead
// partner behavior/mark replacement is not settled by these guides.
// Not errors: Fire and Spotlight damage, deliberate knockback, swapping
// rows, different safe pockets, vulnerability while safely repositioning.
//
// -- LIMITLESS SYNERGY: ARROW AND BLADEDANCE --
// Candidates: Limitless 31544/31545; Synthetic Shield 32369; Passage
// 31556/boss Invincibility 671; Sagittarius Arrow 31539, 10y-wide line;
// Bladedance casts 31540/31541, visuals 31542/31543, damage 32629;
// game tankbuster tether 84. Cones modeled at 90 degrees in BM.
// What happens: two transferable tankbuster tethers from opposite
// outer clones and one baited arrow line; actual sources are helpers.
// Correct play: party baits Arrow together then dodges inward; each tank
// takes one tether and angles its cone outward. EL assigns north tether
// MT/south ST, both pulled CW ~25 degrees along wall from their clones.
// OCE uses MT CCW from north / ST CW from north to choose tether.
// Failure modes:
//   Cone cleaves party -> LOG SIGNAL: 32629 non-tank/extra victims;
//     FAULT: tank aim or failed tether pickup if evidenced; CONSEQUENCE:
//     Major and Raid for party-wide cleave; victims are not auto-blamed.
//   Arrow hit -> LOG SIGNAL: 31539 damage/death after telegraph ends;
//     FAULT: late dodge/bad bait if known; CONSEQUENCE: Major if lethal
//     or Damage Down. Animation delay does not change the snapshot.
// Removal: tethers resolve on buster; F's immunity ends when M dies.
// Not errors: intended tank hits, waiting for Arrow bait before moving.
//
// -- LIMITLESS: BEYOND DEFENSE / PILE PITCH / METEORS --
// Candidates: Beyond Defense visual 31527, jump damage 31528 (5y);
// Pile Pitch 31529 (6y shared circle); Meteor visual 31537, flare damage
// 31538; Cosmo Memory visual casts 31522/31523, eye damage 31524.
// What happens: shield clone jumps on one of two closest players,
// applying Twice-come Ruin. Nearby extra victims get knockback/Ruin.
// ~3s later Pile Pitch hits a close player, also giving Ruin. Three
// random meteors resolve around then; Cosmo Memory follows ~9s later.
// Correct play: tanks bait the initial two nearest spots, isolated;
// hit tank circles away, unhit tank joins six players for a seven-stack.
// IV/EL/TH accept ALL three flares at center with heavy shielding and
// party mitigation. Spreading flares is another plan, reducing party
// damage but changing Pile Pitch attendance and positioning needs.
// Failure modes:
//   Jump clips another / prior target shares -> LOG SIGNAL: extra
//     31528 victim or Ruin holder hit by 31529 then Doom; FAULT: bait
//     overlap/target failed to leave by plan; CONSEQUENCE: Major, Raid
//     if required roles die. Doom removal semantics remain unverified.
//   Bad share -> LOG SIGNAL: low Pile Pitch count/high split damage;
//     FAULT: missing assigned sharer if known; CONSEQUENCE: Major if
//     lethal, otherwise not an automatic seven-person requirement.
// Removal: Ruin expires naturally. Flare/jump holder death effects are
// unknown; no assumed explosion-on-death. Cosmo Memory is unavoidable.
// Not errors: overlapping center flares, all-party meteor damage,
// leaving the stack after Beyond Defense, planned reduced shares.
// Raw damage deaths in correct shares are mitigation/healing review.
//
// -- STRATEGY AGREEMENT / WHAT ENDS A PULL --
// EL/IV symbol order circle-cross-triangle-square; EL swaps only Remote
// row endpoints. TH/OCE BPOG = cross-square-circle-triangle; TH reverses
// entire Remote row. IV documents both full and partial Remote reversal.
// EL/IV swap farther-from-eye stack pair; OCE swaps closer. Neither
// convention is an error: each must leave one mark per four-person group.
// All meet at pair distances, clean spreads and safe 4:4 stacks.
// Laser Shower cast 31557 lasts 60s, completes ~+147.4 anchor: Raid.
// Party Synergy deaths normally invalidate pairs/stacks with no raise
// window. Mis-aimed tank cones/Doom commonly end the pull earlier.
// Wall deaths can lack a killing ability; called resets are not errors.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. Firewall: IV/EL describe nearest four to EACH boss; TH says nearest
//    four to M and ALL OTHERS to F. Which selection actually occurs?
// 2. Pile Pitch: EL says random of two closest, IV/TH/BM say closest.
//    Is there a tie/snapshot explanation, or true two-candidate selection?
// 3. IV compares Spotlight to P1 while enforcing four; verify P1 has
//    three and P2 four, and whether this is damage scaling or hard fail.
// 4. Remote: EL says >=35y, BM uses >=34y. Confirm glitch thresholds,
//    vulnerability application/removal lag,
//    damage snapshots and whether knockback immunity is usable here.
// 5. Verify helper damage IDs, blocked pre-filter DoTs, transform/enmity
//    identity, death retargeting, and which avoidables give Damage Down.
// 6. Can Ruin/Doom be cleansed or prevented by invulnerability? Which
//    failure events are distinct from ordinary jump/stack/meteor hits?
