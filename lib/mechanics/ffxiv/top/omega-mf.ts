// The Omega Protocol (Ultimate) -- Phase 2: Omega-M and Omega-F.
// Entry point: detectOmegaMFErrors. Self-gates on Firewall, runs from it to
// the first Phase 3 cast. synergy-order.ts (cross-pull) narrows the glitch
// pair errors to one partner.
//
// -- VERIFIED AGAINST LOGS (2026-10-14) --
// Three reports of one static (not the user's; no VOD; NAUR strats; the
// same eight jobs as omega.ts's group A: WAR MT, DRK OT, WHM H1, SCH H2, PCT
// R1, DNC R2, RDM M1, DRG M2), fetched with --min-minutes 2.3
// --from-minutes 2.0 --to-minutes 5.5 (P2 pulls only). Cited as B14 +41.4
// (report letter, the report's own pull number, seconds from Firewall):
//   A = BKQ92ndywPaLtbMm: 22 P2 pulls, P2 clears A37 A41 A46 A50.
//   B = 8hnVr24MtBqNvRAb: 28 P2 pulls, P2 clears B18 B23 B29 B35 B36 B45
//       B56 B63 B66.
//   C = ZPpBNMGyrnzJ2LRC: 14 P2 pulls, P2 clears C9 C11 C17 C19 C21 C23 C24
//       C25 C28 (a second DRK player in some pulls).
//   No full kill; the 22 P2 clears are the baseline.
// Clock, from the Firewall cast (it lands 2:06-2:16 into the pull; P1's
// length varies), every pull within ~0.3s: Packet Filter +0.8; Solar Ray
// cast +8.2, hits +8.9; Party Synergy +24.5; symbol markers +27.6; clone
// casts +34.2, clone hits +35.0; Optimized Fire III +41.4 with Optical
// Laser +41.7; Spotlight marks +42.3; Discharger +48.6; Spotlight and the
// five Efficient Bladeworks +52.9; Limitless Synergy +76.6; Bladedance and
// Sagittarius Arrow +90.0; meteor marks (Prey, three players) +95.8; Beyond
// Defense +101.0 (hit +101.9); three Optimized Meteors (each hits all eight
// in the plan) +104.0; Pile Pitch +104.3; Cosmo Memory ~+115. A clear casts
// 31561/31562 (Phase 3's transition) at +139-151; otherwise Laser Shower
// completes at +141.7 (A57, A74, B9).
// Log IDs: the model's candidates were right. Party Synergy 31550/31551,
// Firewall 31552/31553, Solar Ray 32362 (Omega-M's, the MT) / 32363,
// symbols are head markers 416 O / 417 T / 418 S / 419 X (same symbol =
// glitch partners), Spotlight marks head marker 100, Mid/Remote Glitch
// 1003427/1003428, Packet Filter M/F 1003499/1003500, Twice-come Ruin
// 1002534, Doom 1002519, Prey 1000562 (meteor marks). The glitch penalty is
// Vulnerability Up 1003366 from Environment, on both partners whenever
// they're out of their band (all eight get it at +38, clean pairs lose it
// before the Fire). There is NO Damage Down anywhere in Phase 2: every
// avoidable is Minor unless it killed. Optical Laser's cast is logged in
// only about half the pulls (it carries the eye's position when it is).
// Instance numbers collide across the casting actors (B23: two Fire #1s;
// A38: Omega-M#2 and Omega-F#2 Bladedances): key a cast by actor + instance.
// A Fire or Bladedance that hit several players loses its cast target.
// Findings:
// - Firewall: always 4:4, fixed by player: MT H1 M1 R1 on Omega-M (Packet
//   Filter F), OT H2 M2 R2 on Omega-F, in 60 of 64 pulls (open question 1:
//   nearest four is consistent with it; the other four pulls swapped two
//   players). Throughput only, not built.
// - Solar Ray: both on the OT in A15, A69, B14, B34, C3 (the OT died every
//   time); the MT got none. MT Provoke timing doesn't separate them (MT
//   Provoked at +2.0-2.4 in clean A50 and C21).
// - Party Synergy rows (the open strategy question): each same-symbol pair
//   splits across the eye's laser, the player earlier in H1 RDM PCT MT OT
//   DRG DNC H2 left of the eye (looking at the center): 131 of 131 clean
//   pairs, no other order fits. Along each row from the eye: X S O T; under
//   Remote Glitch the right row runs T S O X (endpoints swapped, EL's
//   partial reversal). Clean slots sit ~10y apart along the row, 11-19y
//   off the axis.
// - Spotlight: each row stacks for its own mark; when both marks land in
//   one row, the mark nearer the eye swaps rows with their partner (10 of
//   10 clean swaps; OCE's "closer" convention). Four per stack in every
//   clear (open question 3).
// - Party Synergy failures (30 of the 42 wipes end here): a pair under the
//   Vulnerability Up at the Fire (both die; B5, B14, B34, B48, B49, A27,
//   A33, C27); the laser (B1, B2, B44, A5, A12, A23, A73, C3: the victim
//   stood in the middle and their partner died out of range); a clone hit
//   (A15, A17, A60, A69, A73, B4, B17); Fire overlaps (A27, A62, B14, B22:
//   everyone in them died, a second Fire under Magic Vulnerability Up); a
//   pair in one Spotlight stack (A19, B16, B19, B57, B64, C6: one of them
//   was outside their expected stack every time); both marks together
//   (C7: five in both stacks).
// - Bladedance: clean = one cone per tank. A25: the MT held both tethers, a
//   cone went through the party (all six died); A38: the OT aimed theirs
//   into the party; A66, B18: one non-tank in a cone.
// - Beyond Defense: clean = one tank (jumped through an invuln or
//   mitigation), Twice-come Ruin on them. A66, B6: it jumped the party (no
//   tank nearest); the knockback put four/five into the wall 2.5-2.8s
//   later, no killing blow. Pile Pitch lands on the unhit tank in every
//   clean pull (open question 2: the closest); on the jumped tank in A41,
//   B35, C11, C25 (the MT every time): Doom, death ~2.8s later credited to
//   Pile Pitch. All four still cleared P2.
// - Sagittarius Arrow: A50 and B23, the H1 both times (died).
// - Deaths with no killing blow: Beyond Defense knockbacks (above), called
//   wipes after the Synergy deaths, B54 +40.2 (one before the Fire, nothing
//   explains it: a wall).
// Cutoffs (first Raid error): Party Synergy 30, Laser Shower enrage 3,
// called wipe 3, Bladedance 2, Beyond Defense 2, collapse 2. The 22 P2
// clears have none; their Majors are the four Pile Pitch Dooms (A41 B35
// C11 C25), the two Arrows (A50 B23) and B18's H1 in a Bladedance cone.
// Pulls where the log names one glitch partner: A27 A33 B14 B34 B48 B49
// (Fire), A19 B16 B19 B57 B64 C6 (Spotlight); B5 and C27 stay pairs.
//
// -- RULES IMPLEMENTED --
// ffxiv-top2-avoidable (Major on death, else Minor: no Damage Down in P2):
//   Optical Laser, the clones (Efficient Bladework, Beyond Strength,
//   Optimized Blizzard III, Superliminal Steel), Sagittarius Arrow, a lone
//   non-tank in a Bladedance cone.
// ffxiv-top2-solar-ray (targeted: both tanks): both Solar Rays on one tank,
//   both alive: the tank with none didn't hold their Omega.
// ffxiv-top2-glitch: at the Fire, all eight alive, a pair under the glitch
//   Vulnerability Up (both named, unless one took the laser or a clone:
//   that's theirs). synergy-order.ts keeps the partner off their Fire slot
//   (>= 9y, partner <= 7y; the slot model from the learned order).
// ffxiv-top2-fire: one Fire that hit 2+ players names them all (not the
//   glitch-vulnerable ones).
// ffxiv-top2-stack: at Spotlight, all eight alive: a pair in one stack
//   (both; synergy-order.ts keeps the one outside their expected stack),
//   both marks together (3+ in both stacks: the two marked players), else
//   a player in both stacks or none.
// ffxiv-top2-synergy (Raid): the Fire or Spotlight killed 3+.
// ffxiv-top2-bladedance (targeted: both tanks): a tank in both cones held
//   both tethers, so the other tank took none; a cone no tank took names
//   the tank no cone reached; a tank's cone that hit 2+ non-tanks names
//   that tank. Raid when it killed 3+ non-tanks.
// ffxiv-top2-beyond-defense (targeted: both tanks): it jumped only
//   non-tanks (both tanks named). Raid when 3+ died.
// ffxiv-top2-pile-pitch (targeted: the jumped player): Pile Pitch on the
//   player Beyond Defense jumped, with Doom (Major).
// ffxiv-top2-wall (Major): a silent death no knockback, reset or hit explains.
// ffxiv-top2-enrage (Laser Shower hits that killed) / -called-wipe (3+
//   silent deaths within 10s, or within 12s of the end, Beyond Defense
//   knockbacks excluded) / -collapse (4 dead, pull over within 20s): Raid,
//   only the earliest, only before any mechanic Raid.
// Exposure: avoidable, glitch, Fire, stacks are everyone's (default).
// Not built: Firewall group swaps (throughput only), Discharger knockback
// direction (no wall deaths in a pull with everyone alive), meteor and
// Cosmo Memory survival (healing), which partner moved when both stood near
// their slots (B5, C27), the second Remote Glitch threshold (34 vs 35y).
//
// -- GUIDE-DERIVED MODEL (2026-10-14) --
// Written before any report was analyzed; VERIFIED AGAINST LOGS above wins.
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

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import type { HeadMarker } from "../fru/usurper-of-frost";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { kFmt, joinNames, playerError, raidMarker, clusterByGap, RAID_MARKER_SORT_OFFSET_MS } from "@/lib/mechanics/wow/common";
import {
  DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Life,
  bodyHit, buildLife, castsOf, gotAura, uniq, namesOf, isTank, realAmount, allAlive, resetCluster,
} from "../fru/common";

export const TOP2_AVOIDABLE_RULE_ID      = "ffxiv-top2-avoidable";
export const TOP2_SOLAR_RAY_RULE_ID      = "ffxiv-top2-solar-ray";
export const TOP2_GLITCH_RULE_ID         = "ffxiv-top2-glitch";
export const TOP2_FIRE_RULE_ID           = "ffxiv-top2-fire";
export const TOP2_STACK_RULE_ID          = "ffxiv-top2-stack";
export const TOP2_SYNERGY_RULE_ID        = "ffxiv-top2-synergy";
export const TOP2_BLADEDANCE_RULE_ID     = "ffxiv-top2-bladedance";
export const TOP2_BEYOND_DEFENSE_RULE_ID = "ffxiv-top2-beyond-defense";
export const TOP2_PILE_PITCH_RULE_ID     = "ffxiv-top2-pile-pitch";
export const TOP2_WALL_RULE_ID           = "ffxiv-top2-wall";
export const TOP2_ENRAGE_RULE_ID         = "ffxiv-top2-enrage";
export const TOP2_CALLED_WIPE_RULE_ID    = "ffxiv-top2-called-wipe";
export const TOP2_COLLAPSE_RULE_ID       = "ffxiv-top2-collapse";

// ── log IDs (VERIFIED above) ────────────────────────────────────────────────

const FIREWALL      = [31552, 31553];
const PARTY_SYNERGY = 31550;
const SOLAR_RAY     = [32362, 32363]; // 32362 Omega-M's (the MT's), 32363 Omega-F's
const OPTICAL_LASER = 31521;
const FIRE          = 31535; // Optimized Fire III, one per player (cast target = its owner)
const SPOTLIGHT     = 31536;
const BLADEWORK     = 31526;
const BLADEDANCE    = 32629; // one cast per tether, from the clone the tether came from
const ARROW         = 31539;
const BEYOND_DEF    = 31528;
const PILE_PITCH    = 31529;
const LASER_SHOWER  = 31557;
const MID_GLITCH    = 1003427;
const REMOTE_GLITCH = 1003428;
// The glitch penalty: on both partners whenever they're out of their band.
const GLITCH_VULN   = 1003366;
const RUIN          = 1002534;
const DOOM          = 1002519;
// Symbol head markers (same symbol = glitch partners) and the two Spotlight marks.
const SYMBOL: Record<number, Sym> = { 416: "O", 417: "T", 418: "S", 419: "X" };
const STACK_MARK    = 100;
// Phase 3 opens with these (the transition) once Omega-F dies; Laser
// Shower completes instead when she doesn't.
const P3_CASTS      = [31561, 31562, 31563, 31564, 31567, 31573];

type Sym = "X" | "S" | "O" | "T";

type Avoidable = { name: string; hit: string; why: string };
const CLONE_WHY = "Party Synergy's real Omega-M and Omega-F clones resolve together: read both weapons and stand in the one area both leave safe.";
const AVOIDABLE: Record<number, Avoidable> = {
  [OPTICAL_LASER]: { name: "Optical Laser", hit: "Stood in Optical Laser",
    why: "The eye's Optical Laser fires a wide line through the middle; the two rows stand either side of it." },
  [BLADEWORK]: { name: "Efficient Bladework", hit: "Hit by Efficient Bladework", why: CLONE_WHY },
  31525: { name: "Beyond Strength", hit: "Hit by Beyond Strength", why: CLONE_WHY },
  31533: { name: "Optimized Blizzard III", hit: "Hit by Optimized Blizzard III", why: CLONE_WHY },
  31531: { name: "Superliminal Steel", hit: "Hit by Superliminal Steel", why: CLONE_WHY },
  31532: { name: "Superliminal Steel", hit: "Hit by Superliminal Steel", why: CLONE_WHY },
  [ARROW]: { name: "Optimized Sagittarius Arrow", hit: "Hit by Optimized Sagittarius Arrow",
    why: "Limitless Synergy's Sagittarius Arrow fires a line through the party's bait spot; bait it together, then step out of the line." },
  [BLADEDANCE]: { name: "Optimized Bladedance", hit: "Stood in a tank's Optimized Bladedance cone",
    why: "Each tank takes one Bladedance tether and points its cone away from the party; stay out of both cones." },
};

const EPISODE_MS          = 3000;
// The Fire spreads and the Spotlight stacks resolve within ~0.5s.
const RESOLUTION_MS       = 1500;
// A Beyond Defense knockback into the deathwall: death event 2.5-2.8s after
// the hit, no killing blow (B6 +1:42.0 -> +1:44.5).
const KNOCK_DEATH_MS      = 4000;
const CALLED_WIPE_END_MS  = 12_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
// 4 dead ended every P2 wipe within 11s (report B's collapse table).
const COLLAPSE_DEAD_COUNT = 4;
const COLLAPSE_END_MS     = 20_000;
// Party Synergy has no raise window: a resolution that killed this many
// ended every pull it happened in.
const SYNERGY_RAID_DEATHS = 3;
const RESET_AFTER_DEATH_MS = 10_000;
const SILENT_HIT_MS       = 3500;
// Positions at the Fire hits: the hit's own x/y, else interpolated (lethal
// previews carry none).
const POS_WINDOW_MS       = 2000;
const POS_SPAN_MS         = 3000;
const ARENA_CENTER        = { x: 10000, y: 10000 };

// ── shared helpers ──────────────────────────────────────────────────────────

/** Holding the aura at `t` (applied before, not removed since). */
function holdsAt(p: PlayerInfo, id: number, t: number): boolean {
  let on = false;
  for (const e of p.debuffs) if (e.abilityId === id && e.timestamp <= t) on = e.debuffStatus !== "removed";
  return on;
}

/** Living players' hits by this cast's ability around `t`. */
function hitsNear(players: PlayerInfo[], life: Life, ids: number[], t: number, ms = RESOLUTION_MS): { p: PlayerInfo; e: PlayerEvent }[] {
  const out: { p: PlayerInfo; e: PlayerEvent }[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (ids.includes(e.abilityId) && Math.abs(e.timestamp - t) <= ms && !bodyHit(e) && life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out;
}

/** One error per key: the first wins. */
function firstPer(errors: PullError[], key: (e: PullError) => string): PullError[] {
  const seen = new Set<string>();
  return errors.filter((e) => { const k = key(e); if (seen.has(k)) return false; seen.add(k); return true; });
}

/** Phase 2's window: the first Firewall to the first Phase 3 cast (Infinity on a P2 wipe). */
function phase2Window(casts: EnemyEvent[]): { start: number; end: number } {
  const start = casts.filter((c) => FIREWALL.includes(c.abilityId)).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
  const end = casts.filter((c) => P3_CASTS.includes(c.abilityId) && c.timestamp > start).reduce((m, c) => Math.min(m, c.timestamp), Infinity);
  return { start, end };
}

function positionAt(p: PlayerInfo, t: number, hit?: PlayerEvent): { x: number; y: number } | undefined {
  if (hit?.x !== undefined && hit.y !== undefined) return { x: hit.x, y: hit.y };
  return interpolatePlayerPosition(p, t, { windowMs: POS_WINDOW_MS, maxSpanMs: POS_SPAN_MS });
}

// ── Party Synergy as read from the pull ─────────────────────────────────────

/**
 * Party Synergy as names, for the per-pull rules and the cross-pull order
 * (synergy-order.ts):
 * - pairs: the four same-symbol pairs (glitch partners);
 * - rows: which of the two Fire rows each player stood in (0/1), from the
 *   axis through the arena center that splits the eight 4/4 with one of
 *   each symbol per side; `left` names the row left of the eye (looking at
 *   the center) when the eye is known: the Optical Laser cast's position,
 *   or under Mid Glitch the end both rows' crosses stand at;
 * - clean: players hit only by their own Fire and not under the glitch's
 *   Vulnerability Up there;
 * - stacks: the Spotlight instances each player took.
 */
export type SynergyRead = {
  remote: boolean;
  fireT: number;
  spotT?: number;
  pairs: [string, string][];
  symbol: Map<string, Sym>;
  marks: string[];
  rows?: Map<string, 0 | 1>;
  left?: 0 | 1;
  /** The rows' axis (unit vector through the center; row 0 has positive lateral) and everyone's Fire position. */
  axis?: { x: number; y: number };
  firePos: Map<string, { x: number; y: number }>;
  clean: Set<string>;
  /** Each Fire's owner (its cast target), keyed by fireKey(actor, instance). */
  fireOwner: Map<string, string>;
  stacks: Map<string, number[]>;
  /** Players under the glitch's Vulnerability Up at the Fire / Spotlight hits. */
  vulnAtFire: Set<string>;
  vulnAtSpot: Set<string>;
};

export function readSynergy(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], headMarkers: HeadMarker[],
): SynergyRead | undefined {
  const { start, end } = phase2Window(enemyCasts);
  if (start === Infinity) return undefined;
  const ps = castsOf(enemyCasts, PARTY_SYNERGY, end).find((c) => c.timestamp > start);
  const fire = ps && castsOf(enemyCasts, FIRE, end).find((c) => c.timestamp > ps.timestamp);
  if (!ps || !fire) return undefined;
  const life = buildLife(players, deathEvents.filter((d) => d.timestamp <= end));
  const spot = castsOf(enemyCasts, SPOTLIGHT, end).find((c) => c.timestamp > fire.timestamp);

  const symbol = new Map<string, Sym>();
  for (const m of headMarkers) {
    if (SYMBOL[m.markerId] && m.timestamp > ps.timestamp && m.timestamp - ps.timestamp < 20_000) symbol.set(m.player, SYMBOL[m.markerId]);
  }
  const pairs: [string, string][] = [];
  for (const s of uniq([...symbol.values()])) {
    const two = [...symbol].filter(([, v]) => v === s).map(([k]) => k);
    if (two.length === 2) pairs.push([two[0], two[1]]);
  }
  const marks = headMarkers.filter((m) => m.markerId === STACK_MARK && m.timestamp > ps.timestamp && (!spot || m.timestamp < spot.timestamp)).map((m) => m.player);
  const remote = players.some((p) => p.debuffs.some((e) => e.abilityId === REMOTE_GLITCH && e.timestamp > ps.timestamp && e.timestamp < fire.timestamp));

  const fireHits = hitsNear(players, life, [FIRE], fire.timestamp);
  // Instance numbers repeat across the casting actors (B23: two #1s), so a
  // Fire is keyed by actor name and instance; a key with two targets is
  // left unowned.
  const owner = new Map<string, string>();
  const seen = new Set<string>();
  for (const c of castsOf(enemyCasts, FIRE, end)) {
    if (Math.abs(c.timestamp - fire.timestamp) > RESOLUTION_MS || c.sourceInstance === undefined || !c.target) continue;
    const k = fireKey(c.actorName, c.sourceInstance);
    if (seen.has(k) && owner.get(k) !== c.target) owner.delete(k); else if (!seen.has(k)) owner.set(k, c.target);
    seen.add(k);
  }
  const ownerOfHit = (e: PlayerEvent) => (e.sourceInstance === undefined ? undefined : owner.get(fireKey(e.source, e.sourceInstance)));
  const vulnAtFire = new Set(players.filter((p) => fireHits.some((h) => h.p === p) && holdsAt(p, GLITCH_VULN, fire.timestamp + 500)).map((p) => p.name));
  const clean = new Set<string>();
  const pos = new Map<string, { x: number; y: number }>();
  for (const p of players) {
    const mine = fireHits.filter((h) => h.p === p);
    if (!mine.length) continue;
    if (mine.length === 1 && ownerOfHit(mine[0].e) === p.name && !vulnAtFire.has(p.name)) clean.add(p.name);
    const at = positionAt(p, mine[0].e.timestamp, mine.find((h) => h.e.x !== undefined)?.e);
    if (at) pos.set(p.name, at);
  }

  // Rows: try the eye's own axis, else the four axes through the center.
  const laser = castsOf(enemyCasts, OPTICAL_LASER, end).find((c) => Math.abs(c.timestamp - fire.timestamp) < 3000 && c.x !== undefined && c.y !== undefined);
  const lateral = (u: { x: number; y: number }, q: { x: number; y: number }) => u.x * (q.y - ARENA_CENTER.y) - u.y * (q.x - ARENA_CENTER.x);
  const along = (u: { x: number; y: number }, q: { x: number; y: number }) => u.x * (q.x - ARENA_CENTER.x) + u.y * (q.y - ARENA_CENTER.y);
  const splitBy = (u: { x: number; y: number }) => {
    if (pos.size !== 8 || symbol.size !== 8) return undefined;
    const side = new Map<string, 0 | 1>([...pos].map(([n, q]) => [n, lateral(u, q) > 0 ? 0 : 1]));
    const ok = [0, 1].every((s) => {
      const names = [...side].filter(([, v]) => v === s).map(([n]) => n);
      return names.length === 4 && uniq(names.map((n) => symbol.get(n))).length === 4;
    });
    const margin = Math.min(...[...pos.values()].map((q) => Math.abs(lateral(u, q))));
    return ok ? { side, margin } : undefined;
  };
  let rows: Map<string, 0 | 1> | undefined;
  let left: 0 | 1 | undefined;
  let axis: { x: number; y: number } | undefined;
  if (laser) {
    const n = Math.hypot(ARENA_CENTER.x - laser.x!, ARENA_CENTER.y - laser.y!);
    const u = { x: (ARENA_CENTER.x - laser.x!) / n, y: (ARENA_CENTER.y - laser.y!) / n };
    const s = splitBy(u);
    // Row 0 is left of the eye looking along u (lateral > 0).
    if (s) { rows = s.side; left = 0; axis = u; }
  }
  if (!rows) {
    const best = [0, 45, 90, 135].map((deg) => {
      const u = { x: Math.cos((deg * Math.PI) / 180), y: Math.sin((deg * Math.PI) / 180) };
      return { u, s: splitBy(u) };
    }).filter((c) => c.s).sort((a, b) => b.s!.margin - a.s!.margin)[0];
    if (best) {
      rows = best.s!.side;
      axis = best.u;
      // Mid Glitch: both rows' crosses stand nearest the eye. Looking from
      // the eye, u points at the center when the crosses sit at the -u end.
      if (!remote) {
        const mean = (s: Sym) => {
          const qs = [...symbol].filter(([, v]) => v === s).map(([n]) => pos.get(n)!).filter(Boolean);
          return qs.reduce((a, q) => a + along(best.u, q), 0) / qs.length;
        };
        left = mean("X") < mean("T") ? 0 : 1;
      }
    }
  }

  const stacks = new Map<string, number[]>();
  const vulnAtSpot = new Set<string>();
  if (spot) {
    const hits = hitsNear(players, life, [SPOTLIGHT], spot.timestamp);
    for (const p of players) {
      const inst = uniq(hits.filter((h) => h.p === p).map((h) => h.e.sourceInstance ?? -1));
      if (life.alive(p, spot.timestamp - 500)) stacks.set(p.name, inst);
      if (inst.length && holdsAt(p, GLITCH_VULN, spot.timestamp + 500)) vulnAtSpot.add(p.name);
    }
  }
  return { remote, fireT: fire.timestamp, spotT: spot?.timestamp, pairs, symbol, marks, rows, left, axis, firePos: pos, clean, fireOwner: owner, stacks, vulnAtFire, vulnAtSpot };
}

const fireKey = (actor: string | undefined, instance: number) => `${actor ?? "?"}#${instance}`;

/** The glitch partner of `name`, if the symbols were logged. */
export function partnerOf(read: SynergyRead, name: string): string | undefined {
  const pair = read.pairs.find((x) => x.includes(name));
  return pair && (pair[0] === name ? pair[1] : pair[0]);
}

// ── plain avoidable hits ────────────────────────────────────────────────────

/**
 * Avoidable hits (no Damage Down anywhere in Phase 2: Major only when it
 * killed). `skip` holds hits another rule owns: Bladedance victims of a
 * tank's misaimed or untaken cone.
 */
function detectAvoidable(players: PlayerInfo[], life: Life, from: number, end: number, skip: Set<PlayerEvent>): PullError[] {
  const errors: PullError[] = [];
  const ids = Object.keys(AVOIDABLE).map(Number);
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => ids.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= end && !bodyHit(e) && !skip.has(e) &&
      life.hitAlive(p, e.timestamp) && (e.abilityId !== BLADEDANCE || !isTank(p)) && (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT));
    for (const g of clusterByGap(hits, (e) => e.timestamp, EPISODE_MS)) {
      const kinds = uniq(g.map((e) => AVOIDABLE[e.abilityId]));
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      const death = life.diedFrom(p, g[g.length - 1].timestamp);
      const vuln = holdsAt(p, GLITCH_VULN, g[0].timestamp);
      const hit = kinds.map((k, i) => (i === 0 ? k.hit : k.hit.charAt(0).toLowerCase() + k.hit.slice(1))).join(", and ");
      errors.push(playerError(p, {
        ruleId: TOP2_AVOIDABLE_RULE_ID, severity: death ? "Major" : "Minor", name: `Hit by ${uniq(kinds.map((k) => k.name)).join(" / ")}`,
        description: `${hit} (${g.length > 1 ? `${g.length} hits, ` : ""}${total > 0 ? kFmt(total) : "lethal"})${vuln ? " while out of their glitch partner's range" : ""}.${death ? " They died." : ""} ${uniq(kinds.map((k) => k.why)).join(" ")}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}

// ── Solar Ray: one buster per tank ──────────────────────────────────────────

const SOLAR_WHY = "Each tank holds their own Omega (M for the Omega-M group, F for the other) into Solar Ray; with both on one tank, that tank takes both busters.";

/**
 * Both Solar Rays on one tank, both tanks alive: the other tank didn't hold
 * their Omega (process of elimination; A15, A69, B14, B34, C3: the tank
 * with both died every time). Every Solar Ray reports both tanks.
 */
function detectSolarRay(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const tanks = players.filter(isTank);
  const rays = castsOf(casts, SOLAR_RAY, end).filter((c) => c.timestamp >= from);
  if (tanks.length !== 2 || !rays.length) return [];
  const t = rays[0].timestamp;
  occurrences?.push({ mechanicKey: TOP2_SOLAR_RAY_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
  if (!tanks.every((p) => life.alive(p, t - 500))) return [];
  const hits = hitsNear(players, life, SOLAR_RAY, t + 700, 2000);
  const struck = uniq(hits.map((h) => h.p));
  const idle = tanks.filter((p) => !struck.includes(p));
  const doubled = struck.filter((p) => hits.filter((h) => h.p === p).map((h) => h.e.abilityId).filter((v, i, a) => a.indexOf(v) === i).length >= 2);
  if (idle.length !== 1 || doubled.length !== 1) return [];
  const victim = doubled[0];
  const died = !!life.diedFrom(victim, hits.find((h) => h.p === victim)!.e.timestamp);
  return [playerError(idle[0], {
    ruleId: TOP2_SOLAR_RAY_RULE_ID, severity: died ? "Major" : "Minor", name: "Didn't Hold Their Omega",
    description: `Both Solar Rays went to ${victim.name}${died ? `, who died` : ""}: ${idle[0].name} didn't have their Omega's attention when the busters were cast. ${SOLAR_WHY}`,
    timestamp: t, abilityId: rays[0].abilityId, abilityName: "Solar Ray",
  })];
}

// ── Party Synergy: glitch distance, Fire spreads, Spotlight stacks ─────────

const GLITCH_WHY = "Same-symbol partners stand in opposite rows either side of the eye's laser (Mid Glitch: facing each other, 20-26 yalms; Remote Glitch: the far end of the other row, 35+ yalms). Out of that band both get Vulnerability Up and the next hit kills.";
const FIRE_WHY = "Optimized Fire III goes off on every player at once: keep your own spot in the row so your circle touches nobody else.";
const STACK_WHY = "Each row stacks for its own Spotlight; when both marks land in one row, the mark nearer the eye swaps rows with their partner. Glitch partners never share a stack.";

/**
 * Party Synergy, with all eight alive at the resolution (a death changes
 * who can stand where):
 * - Fire: a pair under the glitch's Vulnerability Up at the hits (both
 *   named; synergy-order.ts keeps the one in the wrong row), unless one of
 *   them took the laser or a clone (that's theirs, and the partner's
 *   penalty is fallout: A12, B2); two players inside each other's Fire.
 * - Spotlight: a pair in one stack (both named; synergy-order.ts keeps the
 *   one in the wrong stack), a player in both stacks or none.
 * - A resolution that killed SYNERGY_RAID_DEATHS or more is the cutoff.
 */
function detectSynergy(players: PlayerInfo[], life: Life, read: SynergyRead | undefined, avoidable: PullError[]): PullError[] {
  if (!read) return [];
  const errors: PullError[] = [];
  const byName = new Map(players.map((p) => [p.name, p]));
  const tookAvoidable = (name: string, t: number) => avoidable.some((e) => e.player === name && Math.abs(e.timestamp - t) <= 4000 && e.abilityId !== BLADEDANCE && e.abilityId !== ARROW);
  const kind = read.remote ? "Remote Glitch" : "Mid Glitch";

  // Fire.
  if (allAlive(players, life, read.fireT - 500)) {
    for (const [a, b] of read.pairs) {
      if (!read.vulnAtFire.has(a) && !read.vulnAtFire.has(b)) continue;
      if (tookAvoidable(a, read.fireT) || tookAvoidable(b, read.fireT)) continue;
      const pair = [byName.get(a)!, byName.get(b)!];
      const died = pair.filter((p) => life.diedFrom(p, read.fireT));
      const sameRow = read.rows?.get(a) !== undefined && read.rows.get(a) === read.rows.get(b);
      for (const p of pair) {
        const other = pair.find((x) => x !== p)!;
        errors.push(playerError(p, {
          ruleId: TOP2_GLITCH_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Out of Glitch Range",
          description: `${kind} (${read.symbol.get(a) ?? "?"} pair with ${other.name}) at the Fire spreads: the pair was out of range${sameRow ? " (both in the same row)" : ""}, so both had Vulnerability Up${died.length ? ` and ${namesOf(died)} died` : ""}. One of the two was out of place; the log alone can't say which. ${GLITCH_WHY}`,
          timestamp: read.fireT, abilityId: FIRE, abilityName: "Optimized Fire III",
        }));
      }
    }
    // Fire overlaps: one Fire (actor and instance) that hit two or more
    // players names them all; a Fire that hit several loses its cast target
    // (B22 +41.4), so who owned it isn't known. The glitch already explains
    // a vulnerable player's death.
    const overlaps = new Map<PlayerInfo, Set<PlayerInfo>>();
    const byFire = new Map<string, PlayerInfo[]>();
    for (const p of players) {
      for (const e of p.damageTaken) {
        if (e.abilityId !== FIRE || Math.abs(e.timestamp - read.fireT) > RESOLUTION_MS || bodyHit(e) || e.sourceInstance === undefined) continue;
        const k = fireKey(e.source, e.sourceInstance);
        byFire.set(k, uniq([...(byFire.get(k) ?? []), p]));
      }
    }
    for (const hit of byFire.values()) {
      for (const p of hit) for (const q of hit) if (p !== q) overlaps.set(p, (overlaps.get(p) ?? new Set()).add(q));
    }
    for (const [p, with_] of overlaps) {
      if (read.vulnAtFire.has(p.name) || tookAvoidable(p.name, read.fireT)) continue;
      const others = [...with_].filter((q) => !read.vulnAtFire.has(q.name));
      if (!others.length) continue;
      const died = [p, ...others].filter((q) => life.diedFrom(q, read.fireT));
      errors.push(playerError(p, {
        ruleId: TOP2_FIRE_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Fire Overlap",
        description: `Stood within Optimized Fire III range of ${namesOf(others)}, so one Fire hit them both${died.length ? `; ${namesOf(died)} died (each Fire leaves Magic Vulnerability Up)` : ""}. Either could have been off their spot; the log can't say which. ${FIRE_WHY}`,
        timestamp: read.fireT, abilityId: FIRE, abilityName: "Optimized Fire III",
      }));
    }
  }

  // Spotlight.
  if (read.spotT !== undefined && allAlive(players, life, read.spotT - 500)) {
    const spotT = read.spotT;
    const inst = (n: string) => read.stacks.get(n) ?? [];
    const stackErrors: PullError[] = [];
    const diedAt = (ps: PlayerInfo[]) => ps.filter((p) => life.diedFrom(p, spotT));
    const sizes = new Map<number, string[]>();
    for (const [n, is] of read.stacks) for (const i of is) sizes.set(i, [...(sizes.get(i) ?? []), n]);
    for (const [a, b] of read.pairs) {
      const shared = inst(a).filter((i) => inst(b).includes(i));
      if (!shared.length || inst(a).length !== 1 || inst(b).length !== 1) continue;
      if (tookAvoidable(a, spotT) || tookAvoidable(b, spotT)) continue;
      const stack = (sizes.get(shared[0]) ?? []).map((n) => byName.get(n)!).filter(Boolean);
      const died = diedAt(players.filter((p) => inst(p.name).length));
      for (const n of [a, b]) {
        const p = byName.get(n)!, other = n === a ? b : a;
        stackErrors.push(playerError(p, {
          ruleId: TOP2_STACK_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Same Stack as Partner",
          description: `Took the same Spotlight as their glitch partner ${other} (${namesOf(stack)}: ${stack.length} in that stack)${died.length ? `; ${namesOf(died)} died` : ""}. One of the two belonged in the other stack; the log alone can't say which. ${STACK_WHY}`,
          timestamp: spotT, abilityId: SPOTLIGHT, abilityName: "Spotlight",
        }));
      }
    }
    // Three or more in both stacks: the two marked players stood together,
    // so the stacks landed on top of each other (C7: five in both).
    const inBoth = players.filter((p) => inst(p.name).length >= 2);
    const marked = read.marks.map((n) => byName.get(n)).filter((p): p is PlayerInfo => !!p);
    if (inBoth.length >= 3 && marked.length === 2) {
      const died = diedAt(players.filter((q) => inst(q.name).length));
      for (const p of marked) {
        stackErrors.push(playerError(p, {
          ruleId: TOP2_STACK_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Stack Marks Together",
          description: `Both Spotlight marks (${namesOf(marked)}) stood together, so the two stacks landed on ${namesOf(inBoth)} at once${died.length ? `; ${namesOf(died)} died` : ""}. Either marked player could have been off their row. ${STACK_WHY}`,
          timestamp: spotT, abilityId: SPOTLIGHT, abilityName: "Spotlight",
        }));
      }
    }
    for (const p of players) {
      const n = inst(p.name).length;
      if (n === 1 || tookAvoidable(p.name, spotT) || (inBoth.length >= 3 && marked.length === 2)) continue;
      const died = diedAt(players.filter((q) => inst(q.name).length));
      stackErrors.push(playerError(p, {
        ruleId: TOP2_STACK_RULE_ID, severity: died.length ? "Major" : "Minor", name: n ? "In Both Stacks" : "Missed the Stack",
        description: `${n ? "Stood in both Spotlight stacks" : "Wasn't in either Spotlight stack"}${died.length ? `; ${namesOf(died)} died` : ""}. ${STACK_WHY}`,
        timestamp: spotT, abilityId: SPOTLIGHT, abilityName: "Spotlight",
      }));
    }
    errors.push(...firstPer(stackErrors, (e) => `${e.player}`));
  }

  // The cutoff: a resolution that killed several.
  for (const [t, name, ids] of [[read.fireT, "Fire", [FIRE, OPTICAL_LASER]], [read.spotT, "Spotlight", [SPOTLIGHT, BLADEWORK]]] as const) {
    if (t === undefined) continue;
    const killed = uniq(players.flatMap((p) => p.damageTaken.filter((e) => (ids as readonly number[]).includes(e.abilityId) && Math.abs(e.timestamp - t) <= RESOLUTION_MS && !bodyHit(e) && life.diedFrom(p, e.timestamp)).map(() => p)));
    if (killed.length < SYNERGY_RAID_DEATHS) continue;
    errors.push(raidMarker(TOP2_SYNERGY_RULE_ID, "Party Synergy Failed",
      `The ${name === "Fire" ? "Fire spreads" : "Spotlight stacks"} killed ${killed.length} (${namesOf(killed)}). Party Synergy has no time to raise before the next hits; unresolvable from here, treated as the cutoff point.`,
      t + RAID_MARKER_SORT_OFFSET_MS, ids[0], name === "Fire" ? "Optimized Fire III" : "Spotlight"));
    break;
  }
  return errors;
}

// ── Limitless Synergy ───────────────────────────────────────────────────────

const BLADEDANCE_WHY = "Each tank takes one Optimized Bladedance tether from an outer clone and turns its cone away from the party.";

/**
 * Optimized Bladedance, both tanks alive. Per cone (its caster instance):
 * a cone no tank took names the tank no cone reached (tether not taken,
 * A25: all eight hit); a tank's cone that also hit two or more non-tanks
 * names that tank (aimed into the party, A38). A single non-tank in a cone
 * is theirs (the avoidable table). Every Bladedance reports both tanks.
 * Returns the victims' hits the tank errors own.
 */
function detectBladedance(players: PlayerInfo[], life: Life, casts: EnemyEvent[], from: number, end: number, occurrences?: ReportedOccurrence[]): { errors: PullError[]; owned: Set<PlayerEvent> } {
  const owned = new Set<PlayerEvent>();
  const tanks = players.filter(isTank);
  const cones = castsOf(casts, BLADEDANCE, end).filter((c) => c.timestamp >= from);
  if (!cones.length || tanks.length !== 2) return { errors: [], owned };
  const t = cones[0].timestamp;
  occurrences?.push({ mechanicKey: TOP2_BLADEDANCE_RULE_ID, timestamp: t, players: tanks.map((p) => p.name) });
  if (!tanks.every((p) => life.alive(p, t - 500))) return { errors: [], owned };
  const hits = hitsNear(players, life, [BLADEDANCE], t + 600, 2000);
  const errors: PullError[] = [];
  // Both bosses cast them, with colliding instance numbers (A38: Omega-M#2
  // and Omega-F#2): a cone is its actor and instance.
  const byCone = new Map<string, typeof hits>();
  for (const h of hits) {
    const k = fireKey(h.e.source, h.e.sourceInstance ?? -1);
    byCone.set(k, [...(byCone.get(k) ?? []), h]);
  }
  const conesOn = (p: PlayerInfo) => [...byCone.values()].filter((c) => c.some((h) => h.p === p)).length;
  // A tank in both cones held both tethers (A25: the MT first in one, then
  // the other through the party): the other tank took none.
  const holdsBoth = tanks.find((p) => conesOn(p) >= 2);
  const reached = new Set(hits.filter((h) => isTank(h.p)).map((h) => h.p));
  const died = uniq(hits.filter((h) => life.diedFrom(h.p, h.e.timestamp)).map((h) => h.p));
  const severity = died.length ? "Major" : "Minor";
  const outcome = died.length ? ` ${namesOf(died)} died.` : "";
  for (const [, cone] of byCone) {
    const tankHit = uniq(cone.filter((h) => isTank(h.p)).map((h) => h.p));
    const party = uniq(cone.filter((h) => !isTank(h.p)).map((h) => h.p));
    if (!party.length) continue;
    if (!tankHit.length || (holdsBoth && party.length >= 2)) {
      const idle = holdsBoth ? tanks.filter((x) => x !== holdsBoth) : tanks.filter((x) => !reached.has(x));
      for (const p of idle) {
        errors.push(playerError(p, {
          ruleId: TOP2_BLADEDANCE_RULE_ID, severity, name: "Tether Not Taken",
          description: `${holdsBoth ? `${holdsBoth.name} held both Bladedance tethers, so one cone went through the party` : "A Bladedance cone reached no tank"} and hit ${namesOf(party)}: ${p.name} had no tether.${outcome} ${BLADEDANCE_WHY}`,
          timestamp: t, abilityId: BLADEDANCE, abilityName: "Optimized Bladedance",
        }));
      }
      cone.forEach((h) => owned.add(h.e));
    } else if (party.length >= 2) {
      for (const p of tankHit) {
        errors.push(playerError(p, {
          ruleId: TOP2_BLADEDANCE_RULE_ID, severity, name: "Cone Into the Party",
          description: `${p.name}'s Bladedance cone also hit ${namesOf(party)}.${outcome} ${BLADEDANCE_WHY}`,
          timestamp: t, abilityId: BLADEDANCE, abilityName: "Optimized Bladedance",
        }));
      }
      cone.forEach((h) => owned.add(h.e));
    }
  }
  const killed = died.filter((p) => !isTank(p));
  if (errors.length && killed.length >= SYNERGY_RAID_DEATHS) {
    errors.push(raidMarker(TOP2_BLADEDANCE_RULE_ID, "Bladedance Through the Party",
      `Optimized Bladedance killed ${killed.length} (${namesOf(killed)}); unresolvable from here, treated as the cutoff point.`,
      t + RAID_MARKER_SORT_OFFSET_MS, BLADEDANCE, "Optimized Bladedance"));
  }
  return { errors: firstPer(errors, (e) => `${e.player ?? "raid"}`), owned };
}

const JUMP_WHY = "Beyond Defense jumps one of the two players nearest the shield clone: the tanks stand closest, the party behind them. The jumped tank then leaves the stack, because Pile Pitch goes to the nearest player and a second Ruin is Doom.";

/**
 * Beyond Defense on non-tanks only, both tanks alive: neither tank was
 * nearest (both named; A66, B6: six hit, knocked into the wall). Pile
 * Pitch on the player Beyond Defense jumped: they stayed in the stack and
 * got Doom (A41, B35, C11, C25: the MT every time). Both report every jump.
 */
function detectBeyondDefense(players: PlayerInfo[], life: Life, deaths: DeathEvent[], casts: EnemyEvent[], from: number, end: number, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  const tanks = players.filter(isTank);
  const jump = castsOf(casts, BEYOND_DEF, end).find((c) => c.timestamp >= from);
  if (!jump || tanks.length !== 2) return errors;
  occurrences?.push({ mechanicKey: TOP2_BEYOND_DEFENSE_RULE_ID, timestamp: jump.timestamp, players: tanks.map((p) => p.name) });
  const hits = hitsNear(players, life, [BEYOND_DEF], jump.timestamp + 700, 2000);
  const hit = uniq(hits.map((h) => h.p));
  if (tanks.every((p) => life.alive(p, jump.timestamp - 500)) && hit.length && hit.every((p) => !isTank(p))) {
    const died = hit.filter((p) => deaths.some((d) => d.player === p.name && d.timestamp > jump.timestamp && d.timestamp - jump.timestamp <= KNOCK_DEATH_MS + 1000));
    for (const p of tanks) {
      errors.push(playerError(p, {
        ruleId: TOP2_BEYOND_DEFENSE_RULE_ID, severity: died.length ? "Major" : "Minor", name: "Didn't Bait Beyond Defense",
        description: `Beyond Defense jumped the party instead of a tank, hitting ${namesOf(hit)}${died.length ? `; ${namesOf(died)} died (knocked into the wall)` : ""}. Neither tank was nearest the shield clone. ${JUMP_WHY}`,
        timestamp: jump.timestamp, abilityId: BEYOND_DEF, abilityName: "Beyond Defense",
      }));
    }
    if (died.length >= SYNERGY_RAID_DEATHS) {
      errors.push(raidMarker(TOP2_BEYOND_DEFENSE_RULE_ID, "Beyond Defense on the Party",
        `Beyond Defense knocked ${died.length} into the wall (${namesOf(died)}); unresolvable from here, treated as the cutoff point.`,
        jump.timestamp + RAID_MARKER_SORT_OFFSET_MS, BEYOND_DEF, "Beyond Defense"));
    }
  }
  // Only a jump that landed on a tank: after one on the party, a jumped
  // non-tank's Doom is fallout (B6 +104.3, the H1).
  const jumped = hit.some(isTank) ? hit.filter((p) => gotAura(p, RUIN, hits.find((h) => h.p === p)!.e.timestamp, 1500)) : [];
  const pile = castsOf(casts, PILE_PITCH, end).find((c) => c.timestamp > jump.timestamp);
  if (pile) occurrences?.push({ mechanicKey: TOP2_PILE_PITCH_RULE_ID, timestamp: pile.timestamp, players: jumped.map((p) => p.name) });
  if (pile) {
    for (const { p, e } of hitsNear(players, life, [PILE_PITCH], pile.timestamp + 800, 2000)) {
      if (!jumped.includes(p) || !gotAura(p, DOOM, e.timestamp, 2000)) continue;
      const died = !!deaths.some((d) => d.player === p.name && d.timestamp > e.timestamp && d.timestamp - e.timestamp <= 6000);
      errors.push(playerError(p, {
        ruleId: TOP2_PILE_PITCH_RULE_ID, severity: "Major", name: "Stayed for Pile Pitch",
        description: `Jumped by Beyond Defense (Twice-come Ruin), then still nearest for Pile Pitch: a second Ruin gave them Doom${died ? " and they died" : ""}. ${JUMP_WHY}`,
        timestamp: e.timestamp, abilityId: PILE_PITCH, abilityName: "Pile Pitch",
      }));
    }
  }
  return errors;
}

// ── deaths with no killing blow ─────────────────────────────────────────────

/** A silent death that's a mechanic's: a Beyond Defense knockback into the wall. */
function mechanicSilentDeath(players: PlayerInfo[], d: DeathEvent): boolean {
  const p = players.find((x) => x.name === d.player);
  if (!p) return false;
  return p.damageTaken.some((e) => e.abilityId === BEYOND_DEF && e.timestamp < d.timestamp && d.timestamp - e.timestamp <= KNOCK_DEATH_MS);
}

function calledWipeDeaths(players: PlayerInfo[], deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId && !mechanicSilentDeath(players, d));
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/**
 * A silent death mid-pull that no mechanic explains walked into the
 * deathwall (Major): not right after another death (the raid resetting),
 * nor with a real hit just before (FFLogs dropped the killing blow).
 */
function detectWallDeaths(players: PlayerInfo[], deaths: DeathEvent[], called: Set<DeathEvent>, from: number): PullError[] {
  const errors: PullError[] = [];
  for (const d of deaths) {
    if (d.timestamp < from || d.killingAbilityGameId || called.has(d) || mechanicSilentDeath(players, d)) continue;
    const p = players.find((x) => x.name === d.player);
    if (!p) continue;
    if (deaths.some((k) => k !== d && k.timestamp <= d.timestamp && d.timestamp - k.timestamp <= RESET_AFTER_DEATH_MS)) continue;
    if (p.damageTaken.some((e) => (e.amount ?? 0) > 0 && e.timestamp <= d.timestamp && d.timestamp - e.timestamp <= SILENT_HIT_MS)) continue;
    errors.push(playerError(p, {
      ruleId: TOP2_WALL_RULE_ID, severity: "Major", name: "Walked Into the Wall",
      description: "Died with no killing blow mid-pull, with no knockback behind it: walked (or was knocked by Discharger) into the deathwall at the arena's edge.",
      timestamp: d.timestamp - DEATH_EVENT_LAG_MS, abilityId: 0, abilityName: "Deathwall",
    }));
  }
  return errors;
}

// ── entry point ─────────────────────────────────────────────────────────────

/**
 * The Omega Protocol Phase 2 (Omega-M and Omega-F) errors. Self-gates on
 * Firewall, which no other fight casts, runs from it and stops at the first
 * Phase 3 cast. `headMarkers` names the glitch pairs and Spotlight marks;
 * without them the pair rules are skipped.
 */
export function detectOmegaMFErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], headMarkers: HeadMarker[] = [], occurrences?: ReportedOccurrence[],
): PullError[] {
  const { start, end: p3 } = phase2Window(enemyCasts);
  if (start === Infinity) return [];
  const deaths = deathEvents.filter((d) => d.timestamp <= p3);
  const life = buildLife(players, deaths);
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...deathEvents.map((d) => d.timestamp));
  const end = Math.min(p3, lastEvent);
  const p2Deaths = deaths.filter((d) => d.timestamp >= start);
  const called = calledWipeDeaths(players, p2Deaths, p3 === Infinity ? lastEvent : Infinity);

  const blade = detectBladedance(players, life, enemyCasts, start, end, occurrences);
  const avoidable = detectAvoidable(players, life, start, end, blade.owned);
  const read = readSynergy(players, deathEvents, enemyCasts, headMarkers);
  const errors = [
    ...avoidable,
    ...detectSolarRay(players, life, enemyCasts, start, end, occurrences),
    ...detectSynergy(players, life, read, avoidable),
    ...blade.errors,
    ...detectBeyondDefense(players, life, deaths, enemyCasts, start, end, occurrences),
    ...detectWallDeaths(players, p2Deaths, called, start),
  ];

  // Generic cutoffs, only the earliest and only before any mechanic Raid.
  const generic: PullError[] = [];
  // The enrage: only Laser Shower hits that killed (gate on the outcome).
  const shower = players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === LASER_SHOWER && e.timestamp >= start && e.timestamp <= end && !bodyHit(e) && life.diedFrom(p, e.timestamp)))
    .sort((a, b) => a.timestamp - b.timestamp);
  if (shower.length) {
    const cast = castsOf(enemyCasts, LASER_SHOWER, end).pop();
    const left = cast?.hitPoints !== undefined && cast.maxHitPoints ? ` Omega still had ${(100 * cast.hitPoints / cast.maxHitPoints).toFixed(1)}% HP left.` : "";
    generic.push(raidMarker(TOP2_ENRAGE_RULE_ID, "Laser Shower (Enrage)",
      `Laser Shower, Phase 2's enrage, went off: Omega-M and Omega-F weren't both down in time.${left}`, shower[0].timestamp, LASER_SHOWER, "Laser Shower"));
  }
  const calledList = p2Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
  if (calledList.length >= CALLED_WIPE_COUNT) {
    generic.push(raidMarker(TOP2_CALLED_WIPE_RULE_ID, "Wipe Called",
      `${calledList.length} players died with no killing blow (${joinNames(uniq(calledList.map((d) => d.player)))}): the wipe was called and the raid reset into the deathwall.`,
      calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
  }
  if (p3 === Infinity) {
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT && lastEvent - t <= COLLAPSE_END_MS);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(TOP2_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}). Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
  }
  const firstRaid = Math.min(...errors.filter((e) => e.severity === "Raid").map((e) => e.timestamp));
  const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (marker && marker.timestamp < firstRaid) errors.push(marker);
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
