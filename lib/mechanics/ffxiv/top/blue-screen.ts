// The Omega Protocol (Ultimate) -- Phase 4: Blue Screen / Final Omega.
// Entry point: detectBlueScreenErrors. Self-gates on Phase 4's opening cast
// (31559) and runs to Blue Screen's result (31612 pass / 31613 fail).
//
// -- VERIFIED AGAINST LOGS (2026-10-15) --
// Ten reports of one static (the one omega-reconfiguredd.ts used; not the
// user's; no VOD; NAUR strats; stand-ins on VPR, NIN and RPR in some). Only
// the pulls that reached P4: C/D/E refetched with their P3 flags and
// --to-minutes 9.5, F-L fetched --min-phase 4 --from-minutes 6.8
// --to-minutes 9.5. Letters C/D/E follow omega-reconfiguredd.ts. Cited as
// D13 R3 +47.4 (report letter, the report's own pull number, round,
// seconds from the 31559 cast):
//   C = ZPpBNMGyrnzJ2LRC: C19 C23 C28, no pass.
//   D = VbczXNA7m3RJHjdx: D5 D13 D24 D26 D30 D42, no pass.
//   E = 8tLjB2zVD1mvwdWX: E19 E20 E27; E20 passed.
//   F = m7nq1PMNVkJTyhXC: F6 F14 F18 F19; three passed.
//   G = AtNzJbpGVC2kMnFw: 8 pulls; G9 G13 G17 G21 G22 passed.
//   H = FqWyfQALBRhgcTkt: 8 pulls; all but H6 passed.
//   I = bhXTzwtAv3kmLHp9: I17 I22 I23 I25; I17 I25 passed.
//   J = K9nqQw6ZRjWbgGMc: 8 pulls; all but J4 J15 passed.
//   K = C8bQAFtakJBYxM6n: 12 pulls; all but K19 K27 passed.
//   L = bNcrLh7Y4dkHxM9q: 8 pulls, all passed; L16 is the full kill.
//   64 P4 pulls: 42 passed Blue Screen (the baseline), 22 wiped in P4.
// Clock, from 31559 (7:18-7:36 into the pull), every pull within ~0.5s:
// 31610 +7.2, 31558 +15.3; stack markers (22393, one cast per marked
// player) +19.4 / +29.5 / +39.7; proteans (31614) +22.1 / +32.3 / +42.5;
// afterimages (31616) and stacks (31615) together +27.1 / +37.3 / +47.5;
// Wave Repeater (31567-31570, reused from P3) +29.7 / +31.8 / +33.9 / +35.9
// and +47.2 / +49.3 / +51.4 / +53.4, four rings a set (open question 5);
// Blue Screen 31611 +62.0-62.5, its result 1.1s later, P5's first cast
// (31621 / 31622) +69.1-69.6. The control casts 31617-31620 / 32534 are
// visuals. Proteans and stacks give Magic Vulnerability Up 1002941 (2s);
// the only Damage Down in P4 comes from a ring (D13 +49.8, open question 4).
// Findings:
// - Proteans: one cast per living player, but the cast's target is NOT the
//   player its lane points at (D13 R3: the cast "on" the DRG at 136 points
//   at 89, where the DNC stood). The lane runs along the helper's facing
//   from the helper, and some helpers sit at (100, 90), not the
//   centre. The player on that bearing at the cast owns it. Afterimages
//   repeat the round's lanes within ~1 degree (median 0.6).
// - The static's layout: protean slots four east (about 65 / 90 / 112 /
//   135) and four west (225 / 248 / 270 / 295); each half is a stack group,
//   stacking south-east (~160) or south-west (~197) at 12-15y. With both
//   markers on one half, the southernmost marked player crosses and the
//   other half's southernmost (135 / 225) crosses back, EL's rule: 170 of
//   187 rounds matched exactly, every other one is a failure below or
//   follows a death. A 3/5 split with everyone alive killed nobody (F18,
//   G5, G6, H30: open question 3, pure damage scaling).
// - Protean doubles happened only after a death: the dead player's line
//   goes onto a survivor, who dies to the vulnerability (C19 C23 D42 E19
//   F14 G5 G6 K19 K27). Never with everyone alive.
// - Rings killed 18, mostly the first set's third ring (+34.2, right after
//   the second bait while the protean's vulnerability is still up) and the
//   second set's second and third (+49.7-52.0). Non-lethal: D13's DRK
//   (Damage Down) and two hits after the wipe was called.
// - A marked player killed by a ring before the second stacks leaves both
//   lines on the other group, which dies (E19, F14, G5, H6: four each).
// - Afterimages with everyone alive: four hits, each lane on its baiter's
//   slot (0-3 degrees off), each victim out of place: crossing players
//   short of the east stack (D13 R3 at 140, D26 R3 at 151, K27 R2 at 154,
//   died) and C19 R2's WAR on the lane side of the west stack (died).
// - Stacks with everyone alive: the crossing PCT stood off the group it
//   crossed to, so its line missed them (D26 R3: 10 degrees short, two
//   missed; G1 R3); a player in no stack (D13 R3, the DRK: the other three
//   died; E20 R3); the player owed the swap back stayed (G5 R1, G6 R1 the
//   DRG; F18 R2, H30 R2 the PCT).
// - Blue Screen (open question 1): Omega's HP on the 31611 cast decides it:
//   passes at 12.5-19.66% (F6), fails at 20.45% (I23) to 36.1%.
// No wipe left unexplained. Cutoffs (first Raid error) over the 22 P4
// wipes: Blue Screen failed 10 (C28 D5 D24 D26 D30 E27 I22 I23 J4 J15),
// one moment killing 3+ 9 (C19 D13 D42 E19 F14 G5 G6 H6 K27), 3 dead at
// once 3 (C23 G1 K19). The 42 passes have none; the kill has no P4 error.
// P4's remaining unexplained deaths are fallout (doubles and short stacks
// after a death) or a full stack's raw damage (D42 R1).
// Replay (2026-10-18, L16 = bNcrLh7Y4dkHxM9q fight 17, 31559 at 7:27.5):
// the 22393 casts name the marked players 8s before their stacks; each
// stack's hits share one helper, which places its line. Built in replay.ts.
//
// -- RULES IMPLEMENTED --
// ffxiv-top4-ring (Major on death or Damage Down, else Minor).
// ffxiv-top4-protean: a player hit by two lanes in one round, everyone
//   alive (the player and the lanes' owners; never seen).
// ffxiv-top4-afterimage: an afterimage on a living player, everyone alive
//   at the round's proteans (the victim; the lane's baiter too when the
//   lane was 15+ degrees off their slot). Major if it killed, else Minor.
// ffxiv-top4-stack: everyone alive at the stacks, against the expected
//   groups: in no stack, in the other half's stack, in both; Major if
//   anyone in that resolution died, else Minor.
// ffxiv-top4-swap (targeted: the crossing pair of a round whose markers
//   share a half): the same failures by the crosser or the player owed the
//   swap back, and a marked crosser whose line missed their new group
//   ("took the stack away": that group is fallout).
// ffxiv-top4-wave-cannon (Raid): one moment of P4 hits that killed 3+.
// ffxiv-top4-blue-screen (Raid): Blue Screen failed, with Omega's HP.
// ffxiv-top4-called-wipe, -collapse (3 dead at once; no pull with 3 dead in
//   P4 passed, passes had 1 at most): the earliest, only before the
//   mechanic Raid, never in a pull that passed.
// Not built: who was early or late on a ring (positions at the pulse aren't
//   modeled; the hit is the error); a stack's raw-damage deaths (D42 R1);
//   the LB plan and DPS per player (the Damage dialog's job).
//
// -- GUIDE-DERIVED MODEL (2026-10-14) --
// Written before any report was analyzed; VERIFIED AGAINST LOGS above wins.
// Comment-only research; every proposed failure signal is guide-inferred. Original 6.31 Ultimate script,
// sync 635; no confirmed mechanic-changing hotfix found. Job/gear updates
// make launch LB and DPS advice patch-sensitive rather than requirements.
//
// -- SOURCES CHECKED 2026-10-14 --
// [IV] Lavender/Meru, original threshold and spread/stack guide:
// https://www.icy-veins.com/ffxiv/the-omega-protocol-ultimate-phase-4-guide
// [EL] Tuufless, south stacks, flex priority, mitigated solo-tank option:
// https://ffxiv.tuufless.com/elemental/top/04_blue_screen/
// Author source read: github.com/tuufless/FFXIV-Elemental-Raid-Macros,
// main/_elemental/top/04_blue_screen.en.md.
// [TH] LPDU South Safe, afterimage lines, ring timing:
// https://thaliak.com/ultimates/top/
// [CB] Timed phase and distinct wave visuals:
// https://github.com/quisquous/cactbot/blob/main/ui/raidboss/data/06-ew/ultimate/the_omega_protocol.txt
// [BM] Candidate action mappings and line geometry:
// https://github.com/awgil/ffxiv_bossmod/blob/master/BossMod.Ultimate/Endwalker/Ultimate/TOP/TOPEnums.cs
// Same directory P4WaveCannon.cs read. Action IDs are decimal game IDs,
// not verified FFLogs ability mappings. "Wave Cannon" spans several
// different actions in this phase and in P1/P5/P6.
//
// -- SHAPE, HEALTH AND CLOCK --
// After P3 reaches 0 HP, the same boss reboots to 100% [IV/EL].
// Three rounds of eight protean spreads, their delayed afterimages and
// two line stacks per round. Wave Repeater overlaps rounds 2 and 3.
// Blue Screen checks boss HP at its resolution. Passing advances to P5;
// boss does not need to be killed. No ongoing energy/resource mechanic.
// CB offsets from P3-end/P4 anchor (600 is artificial, not pull time):
// +7.1 targetable; +21.4 spread 1, +26.7 afterimage, +27.0 stack 1;
// +29.4/+31.5/+33.5/+35.5 first Repeater set;
// +31.5 spread 2, +36.6 afterimage, +36.8 stack 2;
// +41.6 spread 3, +46.7 afterimage, +46.9 stack 3;
// +46.6/+48.6/+50.6/+52.6 second Repeater set;
// +61.6 Blue Screen completes, then untargetable.
// Actual uptime is ~54.5s, explaining EL's "55-second" description;
// TH's ~63s whole phase is not the same clock origin.
// Distinguish begincast, visual execution, damage and HP test; targetable
// time and previous phase duration vary with kill speed.
//
// -- WAVE CANNON: PROTEAN SPREADS AND AFTERIMAGES --
// Candidates: first protean damage 31614; delayed protean ground
// cast/damage 31616 (~5.3s cast); visual controller 31617, follow-up
// visuals 31618/32534/31619/31620. None is automatically the stack hit.
// What happens: all eight players receive a line from the boss;
// Magic Vulnerability Up prevents safely taking overlapping lines.
// The eight aimed lanes are repeated ~5s later, concurrently with stacks.
// Geometry [BM]: 100y long, 6y wide rectangles originating at center.
// A protean is aimed through a player; its victims are not necessarily
// its intended baiter. Delayed casts may carry aim/rotation, not owner.
// Correct play: eight distinct angles, leaving stack lanes unbaited.
// Wait for initial spread even if stack markers are already visible;
// then move to separate stack lanes. Return to original spread angles
// before round 2/3; flex for a stack does not change one's next bait.
// Failure modes:
//   Early stack -> LOG SIGNAL: simultaneous 31614 hits on a cluster,
//     vulnerability/Damage Down/deaths; FAULT: early-moving player(s)
//     if known; CONSEQUENCE: Major plus Raid for missing next bodies.
//   Spread overlap -> LOG SIGNAL: multiple 31614 events on a player;
//     FAULT: wrong assigned bait angle rather than automatically victim;
//     CONSEQUENCE: Major for Damage Down/death, Minor if neither.
//   Afterimage crosses stack -> LOG SIGNAL: 31616 hits during 31615,
//     earlier lane aimed through stack sector; FAULT: baiter failed to
//     return to original angle or stack moved into old bait lane, by
//     raid plan; CONSEQUENCE: Major, Raid if whole stack is killed.
// Removal: vulnerability expires between required hits; delayed lanes
// disappear on their scheduled resolution. A telegraph still on the
// ground is not proof of an additional targeting snapshot.
// Death retargeting and whether one dead baiter leaves fewer or randomly
// repeated proteans are not established by the read guides.
// Not errors: one spread per player per round, repeated empty lanes,
// standing temporarily in a future lane before leaving for its hit.
//
// -- WAVE CANNON: TWO SHARED LINE STACKS --
// Candidates: stack-target visual 22393 (not itself damage);
// shared line damage 31615 (100y long/6y wide [BM]).
// What happens: two random marked targets, usually two four-player
// line shares. Six stacks across phase; 24 initial protean bait events
// and 24 afterimage lanes, not a single eight-person stack mechanic.
// Correct play: one marker per group, each person shares exactly one
// line while dodging the repeated spread lanes. Stack targets determine
// directions, not tank enmity. If both marks are one side, exchange a
// marked player and a balancing member of the opposite side.
// EL spots before stacks, N->S on each half:
//   tank, ranged, healer, melee; west LP1 / east LP2, south kept empty.
// On double-marked side lower/southmost marked player crosses; opposite
// side melee crosses back. Four per side remains true. Stack lanes are
// distinct south-west/south-east angles, not two groups on true south.
// TH likewise sends southern marked player and opposite southern player.
// Exact yalm/marker placement is plan-dependent; 6y line width requires
// each group to align behind its own marked player.
// Failure modes:
//   Missing share -> LOG SIGNAL: fewer intended 31615 recipients with
//     increased split damage/deaths; FAULT: absent sharer if known;
//     CONSEQUENCE: Major when lethal, Raid when next sequence fails.
//   Both stacks on same lane -> LOG SIGNAL: doubled 31615 hits and
//     vulnerability/Damage Down/deaths; FAULT: failed marked-player
//     exchange or mis-aimed stack by plan; CONSEQUENCE: Major plus Raid.
//   Wrong balancing swap -> LOG SIGNAL: one three-player and one
//     five-player line, isolated intended member; FAULT: missed exchange
//     if the plan is known; CONSEQUENCE: Major if lethal, not a generic
//     blame on the three surviving members.
// Removal: marks disappear at resolution; no cleanse/dispel task.
// Guides do not settle whether a marked death immediately fires a line,
// moves its marker or simply removes the required target.
// Not errors: expected shared damage, 4:4 exchange, a planned tank solo.
// EL explicitly allows a marked tank to take a north line solo under
// mitigation (~210k launch damage) while the other group shares. This
// is evidence against treating every <4-recipient line as a hard fail.
// IV additionally describes both tanks sharing one north line, leaving
// six players in the other south line. Two/six is also a valid plan.
// Correctly positioned stack deaths from raw damage are mitigation or
// healing failures, not evidence that those victims missed mechanics.
//
// -- WAVE REPEATER OVERLAPS --
// Candidates reused from P3: 31567/31568/31569/31570. First pulse
// circle 0-6y; subsequent rings 6-12y, 12-18y, 18-24y [BM].
// What happens: two four-pulse sequences, in rounds 2 and 3; eight
// pulses total. P3's lethal center transition zone is not part of the
// described P4 arena, so moving through center later is legitimate.
// Correct play: resolve spread/stack at radius safe for current pulse;
// step into just-cleared ring, then out as required. Round 2 first pulse
// precedes spreads and final pulse precedes stacks. Round 3 first pulse
// occurs around stacks: remain at safe stack radius, move in afterwards.
// Failure modes:
//   Ring hit -> LOG SIGNAL: 31567..31570 damage, Damage Down/death;
//     FAULT: late/early radial movement if position available;
//     CONSEQUENCE: Major for Damage Down/death, Minor if neither.
//   Dodge displaces bait -> LOG SIGNAL: next protean aimed at a stack
//     lane after wrong return path; FAULT: wrong baiter if established;
//     CONSEQUENCE: Major/ Raid at affected volley, not two duplicate
//     accusations for the same originating mistake.
// Removal: each pulse ends immediately; no lingering ring debuff.
// Not errors: stepping into the cleared center, crossing boss hitbox
// after stacks, movement that does not match floor-ring outlines.
//
// -- BLUE SCREEN: PASS DAMAGE VERSUS WIPE PENALTY --
// Candidates: visual 8s cast 31611; successful raidwide 31612;
// failed HP-check raidwide 31613 (different helper damage actions [BM]).
// What happens: at scripted completion boss must be below 20% [EL/TH].
// Success still deals raidwide damage; failure kills the party. A
// completed Blue Screen cast happens in successful pulls too.
// Correct play: meet threshold before test, heal/mitigate success damage.
// Failure -> LOG SIGNAL: failed version 31613 / no subsequent P5
// transition and boss HP above threshold; FAULT: raid DPS check, no
// specific player inferable from this event; CONSEQUENCE: Raid.
// Removal: phase change retires/reconfigures boss after resolution;
// exact clearing of surviving HW debugger buffs is not proven here.
// Not errors: successful 31612 damage, waiting for timed transition,
// keeping late P3 DoTs on the revived actor, using or holding an LB.
//
// -- STRATEGY AGREEMENT / WHAT ENDS A PULL --
// IV/EL/TH agree on three spread->afterimage+two-stack rounds, separated
// stacks, two Repeater sequences and an HP check rather than a kill.
// South Safe is a common arrangement, not a mandatory world direction.
// Solo-tank lines alter normal recipient counts; east/west alternatives
// would alter safe bait angles. The static's actual plan is unknown.
// IV plans P3 LB3 then P4 LB1, or P4 LB3 with different buff carryover;
// EL commonly opens P4 LB3; TH calls LB3 strongly required. These are
// patch/composition-dependent damage plans, not mechanical obligations.
// Hard cutoff is failed Blue Screen. Earlier double-hit/stack deaths
// normally destroy subsequent shares; mark inevitability only when
// requirements actually cannot be recovered. Called walls are resets.
//
// -- OPEN QUESTIONS / SOURCE DISAGREEMENTS FOR LOG VERIFICATION --
// 1. Exact HP comparator: below 20%, <=20%, or a rounded display? Is HP
//    tested on 31611 completion or the following helper hit? Verify pass
//    31612 versus fail 31613 and phase transition delay.
// 2. Do initial/afterimage/stack damage really map 31614/31616/31615?
//    CB labels visual 31617/32534 etc as Wave Cannon A/B; distinguish
//    those control actions from actual player damage.
// 3. Are <4 stacks pure damage scaling, or any separate penalty?
//    Verify EL's solo-tank exception and chosen mitigation plan.
// 4. Confirm vulnerability duration, Damage Down per avoidable, death
//    retargeting of marks/proteans and ability-less wall/reset deaths.
// 5. TH timeline shows five Repeater entries in places; CB and EL show
//    four-stage pulses. Are extra entries visuals/duplicate hits or a
//    genuine fifth pulse? Also resolve 55s uptime versus ~62s whole phase.
// 6. Does revived actor retain enmity/DoTs/debuggers across P3/P4?
//    Which event reliably delimits P4 before the P5 transition?

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, EnemyEvent } from "@/types/PullError";
import type { ReportedOccurrence } from "@/lib/mechanics/occurrences";
import { compassBearingOf, angularDistance, facingToCompassBearing, distanceBetween } from "@/lib/mechanics/geometry";
import { interpolatePlayerPosition } from "@/lib/mechanics/player-position";
import { kFmt, joinNames, playerError, raidMarker, clusterByGap } from "@/lib/mechanics/wow/common";
import { DAMAGE_DOWN, DEATH_EVENT_LAG_MS, PREVIEW_AMOUNT, type Life, bodyHit, buildLife, uniq, realAmount, allAlive, resetCluster } from "../fru/common";

export const TOP4_RING_RULE_ID        = "ffxiv-top4-ring";
export const TOP4_PROTEAN_RULE_ID     = "ffxiv-top4-protean";
export const TOP4_AFTERIMAGE_RULE_ID  = "ffxiv-top4-afterimage";
export const TOP4_STACK_RULE_ID       = "ffxiv-top4-stack";
export const TOP4_SWAP_RULE_ID        = "ffxiv-top4-swap";
export const TOP4_WAVE_CANNON_RULE_ID = "ffxiv-top4-wave-cannon";
export const TOP4_BLUE_SCREEN_RULE_ID = "ffxiv-top4-blue-screen";
export const TOP4_CALLED_WIPE_RULE_ID = "ffxiv-top4-called-wipe";
export const TOP4_COLLAPSE_RULE_ID    = "ffxiv-top4-collapse";

const P4_START    = 31559; // Phase 4's opening cast, as Omega Reconfigured revives
const PROTEAN     = 31614; // Wave Cannon, one cast per player, aimed at them
const AFTERIMAGE  = 31616; // the same eight lanes again ~5s later
const STACK       = 31615; // the two line stacks, same moment as the afterimages
const STACK_MARK  = 22393; // the stack marker, one cast per marked player
const RINGS       = [31567, 31568, 31569, 31570]; // Wave Repeater's four rings
const BS_CAST     = 31611; // Blue Screen: its cast carries Omega's HP at the check
const BS_PASS     = 31612;
const BS_FAIL     = 31613;
const P4_HITS     = [PROTEAN, AFTERIMAGE, STACK, ...RINGS];

const ROUND_GAP_MS        = 2000;
const STACK_FROM_MS       = 3000; // the stacks and afterimages land 4.8-5.2s after the protean cast
const STACK_TO_MS         = 6500;
const MARK_LEAD_MS        = 6000; // markers go out 2.8-3.2s before the protean cast
const HIT_MS              = 1500;
const LANE_RADIUS         = 1300; // centi-yalms: the bait ring the lanes are compared at
const LANE_MATCH_DEG      = 6;
// A baiter whose lane was this far off their own slot owns the afterimage it
// left: clean baits from the 135/225 slots (the two next to the stacks) were
// at most 8 degrees off; after a death the 135 lane went 20-26 degrees south
// into the stack (D42 R2, G6 R3, K27 R3). Never seen with everyone alive.
const OFF_SLOT_DEG        = 15;
const RAID_DEATHS         = 3;
const COLLAPSE_DEAD_COUNT = 3; // no pull with 3 dead at once in P4 passed Blue Screen (passes: 1 at most)
const CALLED_WIPE_END_MS  = 12_000;
const CALLED_WIPE_COUNT   = 3;
const CALLED_WIPE_WINDOW  = 10_000;
const BS_THRESHOLD        = 20; // % HP at the 31611 cast: pass at 19.66 (F6), fail at 20.45 (I23)
const ORDINAL = ["first", "second", "third"];

type Side = "east" | "west";
type Round = {
  n: number;
  t: number;              // the protean casts
  proteans: EnemyEvent[];
  marks: string[];        // the two stack-marked players
  stackT?: number;        // the stack casts
  afterimages: EnemyEvent[];
};

const sec = (ms: number) => (ms / 1000).toFixed(1);
const names = (ns: string[]) => joinNames(uniq(ns));
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const sideOf = (bearing: number): Side => (bearing < 180 ? "east" : "west");
const other = (s: Side): Side => (s === "east" ? "west" : "east");

/** Phase 4: its opening cast to Blue Screen's result (or the pull's end). */
function phase4Window(casts: EnemyEvent[], lastEvent: number): { start: number; end: number; bs?: EnemyEvent; passed: boolean; failed: boolean } {
  const start = casts.find((c) => c.abilityId === P4_START)?.timestamp ?? Infinity;
  const result = casts.find((c) => (c.abilityId === BS_PASS || c.abilityId === BS_FAIL) && c.timestamp > start);
  const bs = casts.find((c) => c.abilityId === BS_CAST && c.timestamp > start);
  return { start, end: result ? result.timestamp + 3000 : lastEvent, bs, passed: result?.abilityId === BS_PASS, failed: result?.abilityId === BS_FAIL };
}

/** The bearing (0 = north) a lane cast points along, LANE_RADIUS out from its caster (some helpers sit 10y north of centre). */
function laneBearing(c: EnemyEvent): number | undefined {
  if (c.facing === undefined || c.x === undefined || c.y === undefined) return undefined;
  const dir = facingToCompassBearing(c.facing) * Math.PI / 180; // the helpers face along their lane
  return compassBearingOf(c.x + LANE_RADIUS * Math.sin(dir), c.y - LANE_RADIUS * Math.cos(dir));
}

function readRounds(casts: EnemyEvent[], start: number, end: number): Round[] {
  const proteans = casts.filter((c) => c.abilityId === PROTEAN && c.timestamp > start && c.timestamp <= end);
  return clusterByGap(proteans, (c) => c.timestamp, ROUND_GAP_MS).map((g, i) => {
    const t = g[0].timestamp;
    const marks = casts.filter((c) => c.abilityId === STACK_MARK && c.timestamp < t && c.timestamp > t - MARK_LEAD_MS && c.target).map((c) => c.target!);
    const stackT = casts.find((c) => c.abilityId === STACK && c.timestamp > t + STACK_FROM_MS && c.timestamp < t + STACK_TO_MS)?.timestamp;
    const afterimages = casts.filter((c) => c.abilityId === AFTERIMAGE && c.timestamp > t + STACK_FROM_MS && c.timestamp < t + STACK_TO_MS);
    return { n: i + 1, t, proteans: g, marks: uniq(marks), stackT, afterimages };
  });
}

/**
 * Who a lane was aimed through: the living player standing on its bearing
 * when the proteans were cast. Not the cast's target, which names another
 * player as often as not (D13 R3: the cast "on" the DRG at 136 points at 89,
 * where the DNC stood).
 */
function laneOwner(players: PlayerInfo[], life: Life, bearing: number, t: number): { p: PlayerInfo; d: number } | undefined {
  const best = players.filter((p) => life.alive(p, t)).map((p) => {
    const pos = interpolatePlayerPosition(p, t, { windowMs: 2500, maxSpanMs: 4000 });
    return pos ? { p, d: angularDistance(compassBearingOf(pos.x, pos.y), bearing) } : undefined;
  }).filter((x): x is { p: PlayerInfo; d: number } => !!x).sort((a, b) => a.d - b.d)[0];
  return best && best.d <= LANE_MATCH_DEG ? best : undefined;
}

/** A living player's own protean hit in a round. */
function proteanHit(p: PlayerInfo, life: Life, t: number): PlayerEvent | undefined {
  return p.damageTaken.find((e) => e.abilityId === PROTEAN && Math.abs(e.timestamp - t) <= HIT_MS && !bodyHit(e) && life.hitAlive(p, e.timestamp) && e.x !== undefined && e.y !== undefined);
}

/**
 * Each player's protean slot: the median bearing of their own protean hits
 * this pull. The static baits fixed angles, four east (about 65 / 90 / 112 /
 * 135) and four west (225 / 248 / 270 / 295); each half is one stack group.
 * The hit's own position can trail the snapshot (the DNC's first bait often
 * logs at ~135 while it ran in), so the median, not any one round.
 */
function readSlots(players: PlayerInfo[], life: Life, rounds: Round[]): Map<PlayerInfo, number> {
  const slots = new Map<PlayerInfo, number>();
  for (const p of players) {
    const bs = rounds.map((r) => proteanHit(p, life, r.t)).filter((e): e is PlayerEvent => !!e).map((e) => compassBearingOf(e.x!, e.y!));
    if (bs.length) slots.set(p, median(bs));
  }
  return slots;
}


// ── Wave Repeater rings ─────────────────────────────────────────────────────

const RING_WHY = "Rings pulse out in two sets of four (rounds 2-3): bait at your protean spot, then step in just after each ring.";

/** Ring hits: Major on death or Damage Down (D13 +49.8), else Minor. */
function detectRings(players: PlayerInfo[], life: Life, from: number, to: number): PullError[] {
  const errors: PullError[] = [];
  for (const p of players) {
    const hits = p.damageTaken.filter((e) => RINGS.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) &&
      life.hitAlive(p, e.timestamp) && (realAmount(e) > 0 || (e.amount ?? 0) >= PREVIEW_AMOUNT));
    for (const g of clusterByGap(hits, (e) => e.timestamp, 3000)) {
      const last = g[g.length - 1].timestamp;
      const death = life.diedFrom(p, last);
      const dd = p.debuffs.some((d) => d.abilityId === DAMAGE_DOWN && d.debuffStatus === "applied" && d.timestamp >= g[0].timestamp - 200 && d.timestamp <= last + 1500);
      const total = g.reduce((s, e) => s + realAmount(e), 0);
      errors.push(playerError(p, {
        ruleId: TOP4_RING_RULE_ID, severity: death || dd ? "Major" : "Minor", name: "Hit by Wave Repeater",
        description: `Hit by a Wave Repeater ring (${g.length > 1 ? `${g.length} hits, ` : ""}${total > 0 ? kFmt(total) : "lethal"}).${death ? " They died." : dd ? " Got Damage Down." : ""} ${RING_WHY}`,
        timestamp: g[0].timestamp, abilityId: g[0].abilityId, abilityName: g[0].abilityName,
      }));
    }
  }
  return errors;
}


// ── Proteans and their afterimages ──────────────────────────────────────────

const PROTEAN_WHY = "Each line gives Magic Vulnerability Up, so a second is usually lethal: bait your own angle (four east, four west).";

/**
 * A player hit by two proteans in one round, with everyone alive (after a
 * death the dead player's line goes onto a survivor: every double on disk,
 * C19 C23 D42 E19 F14 G5 G6 K19 K27, came after one). Names the doubled
 * player and the players whose lines also hit them; never seen.
 */
function detectProteanDoubles(players: PlayerInfo[], life: Life, rounds: Round[]): PullError[] {
  const errors: PullError[] = [];
  for (const r of rounds) {
    if (!allAlive(players, life, r.t)) continue;
    for (const p of players) {
      const hits = p.damageTaken.filter((e) => e.abilityId === PROTEAN && Math.abs(e.timestamp - r.t) <= HIT_MS && !bodyHit(e) && life.hitAlive(p, e.timestamp));
      const inst = uniq(hits.map((e) => e.sourceInstance));
      if (inst.length < 2) continue;
      const owners = uniq(inst.map((i) => r.proteans.find((c) => c.sourceInstance === i)).map((c) => (c ? laneBearing(c) : undefined))
        .map((b) => (b === undefined ? undefined : laneOwner(players, life, b, r.t)?.p.name)).filter((n): n is string => !!n && n !== p.name));
      const died = life.diedFrom(p, hits[hits.length - 1].timestamp);
      for (const q of [p, ...players.filter((x) => owners.includes(x.name))]) {
        errors.push(playerError(q, {
          ruleId: TOP4_PROTEAN_RULE_ID, severity: died ? "Major" : "Minor", name: "Wave Cannon Overlap",
          description: `${p.name} took ${inst.length} Wave Cannon lines in the ${ORDINAL[r.n - 1] ?? `#${r.n}`} round${owners.length ? ` (their own and ${names(owners)}'s)` : ""}: two players baited along the same angle.${died ? ` ${p.name} died.` : ""} ${PROTEAN_WHY}`,
          timestamp: hits[0].timestamp, abilityId: PROTEAN, abilityName: "Wave Cannon",
        }));
      }
    }
  }
  return errors;
}

const AFTERIMAGE_WHY = "Lanes fire again ~5s later, with the stacks: stand on your stack spot (SE/SW, between lanes), not in a lane.";

/**
 * Afterimage hits, with everyone alive at that round's proteans. Each lane is
 * tied to its baiter by direction (the protean cast whose lane it repeats).
 * In every hit on disk the baiter was on their slot (0-3 degrees off) and the
 * victim stood in the lane: three crossing players stopped short of the east
 * stack (D13 R3 at 135, D26 R3 at 150, K27 R2 at 154, the stack at ~160) and
 * the WAR stood on the lane's side of the west stack (C19 R2, died). The
 * baiter is named too when their lane was OFF_SLOT_DEG off their slot.
 */
function detectAfterimages(players: PlayerInfo[], life: Life, rounds: Round[], slots: Map<PlayerInfo, number>): PullError[] {
  const errors: PullError[] = [];
  for (const r of rounds) {
    if (!allAlive(players, life, r.t)) continue;
    for (const p of players) {
      for (const e of p.damageTaken) {
        if (e.abilityId !== AFTERIMAGE || e.timestamp < r.t + STACK_FROM_MS || e.timestamp > r.t + STACK_TO_MS || bodyHit(e) || !life.hitAlive(p, e.timestamp)) continue;
        const cast = r.afterimages.find((c) => c.sourceInstance === e.sourceInstance);
        const lb = cast ? laneBearing(cast) : undefined;
        const owner = lb === undefined ? undefined : laneOwner(players, life, lb, r.t)?.p;
        const ownerSlot = owner ? slots.get(owner) : undefined;
        const ownerOff = lb !== undefined && ownerSlot !== undefined ? angularDistance(lb, ownerSlot) : undefined;
        const died = life.diedFrom(p, e.timestamp);
        const where = e.x !== undefined && e.y !== undefined ? ` at bearing ${compassBearingOf(e.x, e.y).toFixed(0)}` : "";
        const whose = owner ? (owner === p ? "their own lane" : `${owner.name}'s lane`) : "a lane";
        const lane = lb !== undefined ? ` (bearing ${lb.toFixed(0)})` : "";
        const blameOwner = owner && owner !== p && ownerOff !== undefined && ownerOff > OFF_SLOT_DEG;
        const sev = died ? "Major" : "Minor";
        errors.push(playerError(p, {
          ruleId: TOP4_AFTERIMAGE_RULE_ID, severity: sev, name: "Hit by Wave Cannon Afterimage",
          description: `Stood${where} in the ${ORDINAL[r.n - 1] ?? `#${r.n}`} round's afterimage of ${whose}${lane}, ${realAmount(e) > 0 ? kFmt(realAmount(e)) : "lethal"}.${died ? " They died." : ""}${blameOwner ? ` ${owner!.name} baited it ~${ownerOff!.toFixed(0)} degrees off their spot.` : ""} ${AFTERIMAGE_WHY}`,
          timestamp: e.timestamp, abilityId: AFTERIMAGE, abilityName: "Wave Cannon",
        }));
        if (blameOwner) {
          errors.push(playerError(owner!, {
            ruleId: TOP4_AFTERIMAGE_RULE_ID, severity: sev, name: "Baited Wave Cannon Into a Stack",
            description: `Baited their ${ORDINAL[r.n - 1] ?? `#${r.n}`}-round Wave Cannon at bearing ${lb!.toFixed(0)}, ~${ownerOff!.toFixed(0)} degrees off their usual ${ownerSlot!.toFixed(0)}; its afterimage hit ${p.name}${died ? ", who died" : ""}. ${AFTERIMAGE_WHY}`,
            timestamp: e.timestamp, abilityId: AFTERIMAGE, abilityName: "Wave Cannon",
          }));
        }
      }
    }
  }
  return errors;
}


// ── Stacks ──────────────────────────────────────────────────────────────────

const STACK_WHY = "Halves stack on their marker (east SE, west SW); both on one half: its south marker swaps with the other half's south player.";

type Expected = { side: Map<PlayerInfo, Side>; crosser?: PlayerInfo; partner?: PlayerInfo };

/**
 * The groups a round should stack in: each player's half from their slot,
 * plus the swap when both markers share a half. 170 of 187 rounds on disk
 * matched exactly; every other one is a failure below or follows a death.
 */
function expectedGroups(players: PlayerInfo[], slots: Map<PlayerInfo, number>, marks: PlayerInfo[]): Expected | undefined {
  if (marks.length !== 2 || players.some((p) => !slots.has(p))) return undefined;
  const side = new Map(players.map((p) => [p, sideOf(slots.get(p)!)] as const));
  const [a, b] = marks;
  if (side.get(a) !== side.get(b)) return { side };
  const s = side.get(a)!;
  const south = (ps: PlayerInfo[], sd: Side) => [...ps].sort((x, y) => sd === "east" ? slots.get(y)! - slots.get(x)! : slots.get(x)! - slots.get(y)!)[0];
  const crosser = south(marks, s);
  const partner = south(players.filter((p) => side.get(p) === other(s)), other(s));
  side.set(crosser, other(s));
  side.set(partner, s);
  return { side, crosser, partner };
}

/**
 * The stacks of rounds with everyone alive, against the expected groups:
 * - a marked player whose stack held fewer than two of their half while the
 *   rest of their half was in no stack took it away (D26 R3 and G1 R3: the
 *   crossing PCT stopped short or went to the other group); that half and
 *   anyone doubled are fallout;
 * - a player in no stack missed it (D13 R3, the DRK: the other three died;
 *   E20 R3);
 * - a player in the other half's stack went to the wrong side (H30 R2 and
 *   F18 R2, the PCT that should have crossed back; G5 R1 and G6 R1, the DRG);
 * - a player in both stacks stood between them.
 * The crossing pair's failures are the swap rule (targeted); everyone else's
 * the stack rule. Minor unless someone in that stack died.
 */
function detectStacks(players: PlayerInfo[], life: Life, rounds: Round[], slots: Map<PlayerInfo, number>, occurrences?: ReportedOccurrence[]): PullError[] {
  const errors: PullError[] = [];
  for (const r of rounds) {
    if (r.stackT === undefined) continue;
    const marks = r.marks.map((n) => players.find((p) => p.name === n)).filter((p): p is PlayerInfo => !!p);
    const exp = expectedGroups(players, slots, marks);
    if (exp?.crosser && exp.partner) occurrences?.push({ mechanicKey: TOP4_SWAP_RULE_ID, timestamp: r.t, players: [exp.crosser.name, exp.partner.name] });
    if (!exp || !allAlive(players, life, r.stackT - 500)) continue;
    const st = r.stackT;
    const stacks = uniq(players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === STACK && Math.abs(e.timestamp - st) <= 1000).map((e) => e.sourceInstance)))
      .map((i) => players.filter((p) => p.damageTaken.some((e) => e.abilityId === STACK && e.sourceInstance === i && Math.abs(e.timestamp - st) <= 1000 && !bodyHit(e) && life.hitAlive(p, e.timestamp))));
    if (stacks.length !== 2) continue;
    const inStacks = (p: PlayerInfo) => stacks.filter((g) => g.includes(p));
    const died = players.filter((p) => p.damageTaken.some((e) => e.abilityId === STACK && Math.abs(e.timestamp - st) <= 1000 && !bodyHit(e) && life.diedFrom(p, e.timestamp)));
    const sev = died.length ? "Major" : "Minor";
    const outcome = `Stacks hit ${stacks.map((g) => g.length).join(" and ")}${died.length ? `; died: ${names(died.map((p) => p.name))}` : ""}.`;
    const swapper = (p: PlayerInfo) => p === exp.crosser || p === exp.partner;
    const push = (p: PlayerInfo, name: string, what: string, tail = ` ${STACK_WHY}`) => errors.push(playerError(p, {
      ruleId: swapper(p) ? TOP4_SWAP_RULE_ID : TOP4_STACK_RULE_ID, severity: sev, name,
      description: `${what} in the ${ORDINAL[r.n - 1] ?? `#${r.n}`} round. ${outcome}${tail}`,
      timestamp: st, abilityId: STACK, abilityName: "Wave Cannon",
    }));
    const halfMates = (p: PlayerInfo) => players.filter((q) => q !== p && exp.side.get(q) === exp.side.get(p));

    // A marked player who took their stack away from their waiting half.
    const takers = marks.filter((m) => {
      const own = inStacks(m);
      if (own.length !== 1) return false;
      const mates = halfMates(m);
      return own[0].filter((q) => mates.includes(q)).length < 2 && mates.some((q) => inStacks(q).length === 0);
    });
    for (const m of takers) {
      const mates = halfMates(m), left = mates.filter((q) => inStacks(q).length === 0);
      const at = interpolatePlayerPosition(m, st, { windowMs: 2500, maxSpanMs: 4000 });
      const pos = left.map((q) => interpolatePlayerPosition(q, st, { windowMs: 2500, maxSpanMs: 4000 })).filter((x): x is { x: number; y: number } => !!x);
      const gap = at && pos.length ? ` ~${(Math.min(...pos.map((q) => distanceBetween(at, q))) / 100).toFixed(1)}y` : "";
      push(m, "Took the Stack Away", `Had the stack marker but stood${gap} off ${names(left.map((q) => q.name))} (the ${exp.side.get(m)} group${m === exp.crosser ? " they crossed to" : ""}), so their line missed them`, "");
    }
    if (takers.length) continue;

    for (const p of players) {
      const own = inStacks(p);
      if (own.length === 0) push(p, "Missed the Stack", `In neither stack (${exp.side.get(p)} group's)`);
      else if (own.length === 2) push(p, "Took Both Stacks", "Was hit by both Wave Cannon stacks");
      else {
        const g = own[0];
        const sides = g.filter((q) => q !== p).map((q) => exp.side.get(q));
        const otherSide = other(exp.side.get(p)!);
        if (sides.filter((s) => s === otherSide).length > sides.filter((s) => s === exp.side.get(p)).length) {
          const why = p === exp.crosser ? "Had to cross (southernmost marker, both on their side) but stayed"
            : p === exp.partner ? "Had to cross back (other side's southernmost) but stayed"
            : "Stacked";
          push(p, swapper(p) ? "Missed the Stack Swap" : "Wrong Stack Group", `${why} with ${otherSide}, not ${exp.side.get(p)},`);
        }
      }
    }
  }
  return errors;
}


// ── Cutoffs ─────────────────────────────────────────────────────────────────

function calledWipeDeaths(deaths: DeathEvent[], pullEnd: number): Set<DeathEvent> {
  const silent = deaths.filter((d) => !d.killingAbilityGameId);
  const out = new Set<DeathEvent>();
  for (const d of silent) {
    if (pullEnd - d.timestamp <= CALLED_WIPE_END_MS) out.add(d);
    const near = resetCluster(silent.filter((x) => Math.abs(x.timestamp - d.timestamp) <= CALLED_WIPE_WINDOW), deaths);
    if (near.length >= CALLED_WIPE_COUNT) near.forEach((x) => out.add(x));
  }
  return new Set(resetCluster([...out], deaths));
}

/** One moment of Phase 4 hits that killed 3+: the stacks after a marked player's death (E19, F14, G5, H6: four each), a short stack (D13 R3: three; C19 R3: five). */
function detectMassDeath(players: PlayerInfo[], life: Life, from: number, to: number): PullError | undefined {
  const fatal = players.flatMap((p) => p.damageTaken.filter((e) => P4_HITS.includes(e.abilityId) && e.timestamp >= from && e.timestamp <= to && !bodyHit(e) && life.hitAlive(p, e.timestamp) && life.diedFrom(p, e.timestamp)).map((e) => ({ p, e })));
  for (const g of clusterByGap(fatal, (h) => h.e.timestamp, 2000)) {
    const who = uniq(g.map((h) => h.p));
    if (who.length < RAID_DEATHS) continue;
    const kinds = uniq(g.map((h) => (RINGS.includes(h.e.abilityId) ? "Wave Repeater" : h.e.abilityId === STACK ? "the stacks" : h.e.abilityId === AFTERIMAGE ? "the afterimages" : "the proteans")));
    return raidMarker(TOP4_WAVE_CANNON_RULE_ID, "Wave Cannon Killed Several",
      `${joinNames(kinds)} killed ${who.length} at once (${names(who.map((p) => p.name))}). Blue Screen can't be met; treated as the cutoff.`,
      g[0].e.timestamp, g[0].e.abilityId, g[0].e.abilityName);
  }
  return undefined;
}


/**
 * The Omega Protocol Phase 4 (Blue Screen) errors. Self-gates on Phase 4's
 * opening cast (31559, which no other fight casts) and runs to Blue Screen's
 * result. Only the earliest mechanic Raid is kept; a generic cutoff only
 * before it.
 */
export function detectBlueScreenErrors(
  players: PlayerInfo[], deathEvents: DeathEvent[], enemyCasts: EnemyEvent[], occurrences?: ReportedOccurrence[],
): PullError[] {
  const lastEvent = Math.max(0, ...players.flatMap((p) => [...p.damageTaken, ...p.casts].map((e) => e.timestamp)), ...enemyCasts.map((c) => c.timestamp));
  const { start, end, bs, passed, failed } = phase4Window(enemyCasts, lastEvent);
  if (start === Infinity) return [];
  const deaths = deathEvents.filter((d) => d.timestamp <= end);
  const life = buildLife(players, deaths);
  const p4Deaths = deaths.filter((d) => d.timestamp >= start);
  const rounds = readRounds(enemyCasts, start, end);
  const slots = readSlots(players, life, rounds);

  const errors: PullError[] = [
    ...detectRings(players, life, start, end),
    ...detectProteanDoubles(players, life, rounds),
    ...detectAfterimages(players, life, rounds, slots),
    ...detectStacks(players, life, rounds, slots, occurrences),
  ];

  const raids: PullError[] = [];
  const mass = detectMassDeath(players, life, start, end);
  if (mass) raids.push(mass);
  if (failed && bs) {
    const hp = bs.hitPoints !== undefined && bs.maxHitPoints ? 100 * bs.hitPoints / bs.maxHitPoints : undefined;
    const down = uniq(p4Deaths.filter((d) => d.timestamp < bs.timestamp).map((d) => d.player));
    raids.push(raidMarker(TOP4_BLUE_SCREEN_RULE_ID, "Blue Screen Failed",
      `Blue Screen's HP check failed: Omega was ${hp !== undefined ? `at ${hp.toFixed(1)}%` : "still above"} when it resolved, needs under ${BS_THRESHOLD}%.${down.length ? ` Died in the phase: ${names(down)}.` : ""} A raid DPS check; nobody named.`,
      bs.timestamp, BS_CAST, "Blue Screen"));
  }
  const firstMech = raids.sort((a, b) => a.timestamp - b.timestamp)[0];
  if (firstMech) errors.push(firstMech);

  // Generic cutoffs, only the earliest and only before the mechanic Raid.
  if (!passed) {
    const generic: PullError[] = [];
    const called = calledWipeDeaths(p4Deaths, lastEvent);
    const calledList = p4Deaths.filter((d) => called.has(d)).sort((a, b) => a.timestamp - b.timestamp);
    if (calledList.length >= CALLED_WIPE_COUNT) {
      generic.push(raidMarker(TOP4_CALLED_WIPE_RULE_ID, "Wipe Called",
        `${calledList.length} players died with no killing blow (${names(calledList.map((d) => d.player))}): the wipe was called and the raid reset.`,
        calledList[0].timestamp - DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
    const outAt = (t: number) => players.filter((p) => !life.alive(p, t));
    const collapseT = life.outIntervals.map((w) => w.start).filter((t) => t >= start && t <= end).sort((a, b) => a - b)
      .find((t) => outAt(t).length >= COLLAPSE_DEAD_COUNT);
    if (collapseT !== undefined) {
      const who = outAt(collapseT).map((p) => p.name);
      generic.push(raidMarker(TOP4_COLLAPSE_RULE_ID, "Party Collapse",
        `${who.length} players were dead at once (${joinNames(who)}): too few left to push Omega under ${BS_THRESHOLD}% for Blue Screen. Treated as the cutoff point.`,
        collapseT + DEATH_EVENT_LAG_MS, 0, "Deaths"));
    }
    const marker = generic.sort((a, b) => a.timestamp - b.timestamp)[0];
    if (marker && marker.timestamp < (firstMech?.timestamp ?? Infinity)) errors.push(marker);
  }
  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
