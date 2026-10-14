// lib/mechanics/ffxiv/arcadion/lindwurm-2-damage-context.ts
//
// Damage context for Lindwurm II (M12S P2). FFLogs logs P2 as its own fight;
// P1's context is lindwurm-damage-context.ts.
//
// Sources:
// - lindwurm-2.ts header (VERIFIED AGAINST LOGS): the clock (every pull
//   within ~1s), the log ids, Arcadian Hell's final volley as the hard
//   enrage (~9:05 from engage, unfinished in its kill), Rep2's Firefall
//   Splash jump and defams, Netherwrath Near/Far and Timeless Spite, Blood
//   Mana's contacts, Idyllic's live sets, towers and Faraway Portent.
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   CABrk9zXLfJG8h6R (pulls 1-15, kill pull 15) and vVPtwaTQ62Jg391q
//   (pulls 1-4, kill pull 4); wipes in vFY7kHVWK19ZQ24A and
//   H9fnVZgPA3krpCzY.
// - Movement measured 2026-10-14 over every pull of those four reports past
//   1:00 (the analyzer's GCD timeline, no context): each group's idle share
//   in a window against the same players' pull-wide idle, plus ranged
//   fillers (Unmend, Shield Lob, Piercing Talon, Writhing Snap ...). Usual
//   idle: tanks 2.1-2.5%, melee 1.4-1.9%, ranged/casters 1.4-2.3%.
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: 131.94M, fixed. Both kills took it to 1 HP: CABr pull 15 at
//   8:54.1 (ended 8:54.7; 130.48M dealt in the log), vVPt pull 4 at 8:32.5
//   (ended 8:32.8; 131.94M). The furthest wipe (CABr pull 10) left 18.0% at
//   7:41. Arcadian Hell's last volley (~9:05) ends the pull either way, so
//   the whole pool must go before it: the pool decides the enrage.
// - No hold and no untargetable stretch: the analysis infers no raid
//   downtime in either kill (Idyllic's platforms keep the boss targetable).
//
// Forced windows:
// - Boss at 1 HP: from that hit to the end (CABr kill 0.6s).
//
// Movement windows (user, 2026-10-13: out-of-melee mechanics are movement,
// not forced; docs/dps-analysis.md "Movement stays lenient"). Each was kept
// only where idle or ranged fillers rose well past normal across pulls.
// "Melee" is rangeType Melee (tanks and melee DPS).
// 1. Replication 2, everyone: Firefall Splash's cast (46307, 2:08.2) -12s to
//    +6s. Tethers are taken from 1:56, then the jump, the four proteans and
//    the three knock-back defams (Mana Burst 46311, 2:10.5) resolve and the
//    boss lands on its bait ~14y away. 44 pulls: melee idle 5-16% per 3s
//    from -12s to +6s (usual 1.9%), tanks 4-12% (2.5%), ranged/casters
//    6-9% (2.3%); 150 ranged fillers by melee in -3s..+3s. CABr kill: the
//    Dragoon's Piercing Talon and Dark Knight's Unmend 2:08.0, Paladin's
//    Shield Lob 2:09.1.
// 2. Rep2 defam holders (any role): from their Mana Burst 46311 hit to +5s,
//    the knock-back and walk back. Holders idle 26.4% in the 4s after the
//    hit against 2.9% for the others.
// 3. Netherwrath Far, melee Timeless Spite baits (the tanks): from 4s before
//    their Timeless Spite hit (46384) to 1.5s after, when Netherwrath Far
//    (46383) was cast up to 3s before it. Far sends the baits away from the
//    boss: 16 of 18 Far pulls had a tank ranged filler at -2s..+2s of the
//    cast (vFY7 pull 1: Gunbreaker and Dark Knight at 2:39-2:41; CABr pull
//    12: the Paladin's Shield Lob 2:42.4). Near: 0 in 14 pulls (the CABr
//    kill was Near), so it gets no window.
// 4. Blood Mana contacts, melee hit by Bloody Burst (46334, ~3:21.5): 4s
//    before the hit to 3s after. Hit melee idle 10.1% against 1.8% usual,
//    20 ranged fillers in 47 windows; melee not hit 1.2%; ranged contacts
//    5.9% against 6.0% for ranged not hit, so melee only. The solo tank
//    contact idles 18.3% in the 4s before it. CABr pull 10 3:20.5, pull 12
//    3:20.7: the Dragoon's Piercing Talon.
// 5. Esoteric Finisher, melee hit (the tanks; 46374 at 1:17.5, 4:13.9,
//    8:08.6): 1s before the hit to 3s after. The two tanks stand apart at
//    8-17y from the arena center and walk back: idle 10.3% in the 3s after
//    (2.5% usual), gap closers within 1s (Intervene, Shadowstride,
//    Trajectory, Primal Rend). CABr kill: the Dark Knight 8:08.6-8:10.8
//    with Shadowstride, 12.8y out.
// 6. Replication 3's replay on the return to blue, melee: the first replayed
//    Snaking Kick (48789, ~5:40.2) -3s to +3s. Melee idle 11.6% in the 3s
//    after (1.6% usual), tanks 16.2% (2.3%); 37 ranged fillers in 17 pulls.
//    CABr pull 12: all four melee's fillers 5:39.2-5:39.9; the kill's
//    Dragoon 5:40.4. Ranged/casters 3.0-6.7%: not excused.
// 7. Idyllic live sets, melee: 6s before the first set's cast (clone Mana
//    Burst 46359 or Heavy Slam 46361, ~6:11; either type goes first: 8 of
//    16 pulls defam-first) to 5s after the last of 46359/46360/46361 within
//    25s (~6:26-6:27). Two defams and two stacks shuffle the platforms:
//    tanks idle 8-24% per 2s from 6:06 to 6:30 (2.1% usual), melee DPS
//    5-19% (1.4%), defam holders 17-23%. Ranged/casters ~5% (1.4%): not
//    excused.
//    CABr pull 12: Dragoon Piercing Talon 6:13.2, Dark Knight 6:22.0-6:24.8,
//    Viper 6:22.7-6:24.0; the kill's Dragoon Piercing Talon 6:20.4.
// 8. Wind tower, any role: Faraway Portent (1004766) from its application
//    (~6:40.2) to +4s: its knockback crosses to the other island. Holders
//    idle 23% in -3s..+8s (melee 67%, ranged 39% in the first 3s) against
//    4.3% for the other soakers. CABr kill: Viper 6:41.6-6:43.2, Pictomancer
//    6:42.0-6:43.6; vVPt kill: Dragoon 6:41.3-6:43.2.
// 9. Idyllic's final replays, melee: each replayed Heavy Slam (48733) after
//    Temporal Curtain (46364), ~7:21.0 and ~7:41.9, -3s to +3s. Melee idle
//    10.9% / 19.1% in the 3s after (1.1% usual), 12 ranged fillers (3
//    pulls reached it). CABr kill: Dragoon 7:19.0 and Dark Knight 7:20.9;
//    Paladin 7:38.8 / 7:41.3, Dark Knight 7:40.7, Dragoon 7:40.9.
//
// Measured as no excess, so no window: Replication 1 (0:40-1:02), the
// Rep2 replays other than Timeless Spite (2:41-2:53), Blood Wakening
// (3:39 / 3:44), Netherworld Near/Far and Wailing Wave (3:49, 5 fillers in
// 10 pulls), the other towers (Nearby Portent 0-15%, Hot-Blooded 7%),
// Lindwurm's Stone III (melee 6.8%, 1.8% usual), Temporal Curtain (6:58,
// 4.5% against 2.2%), the replayed Snaking Kick at 7:31 (melee 4.7%, 9
// windows). The tanks' 7-8% in the 9s before window 6 (5:31-5:37) isn't
// explained by a mechanic (mitigation weaving before Meteor?): left out.

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const BOSS = "Lindwurm";
const ONE_HP = 0.001;

const FIREFALL_SPLASH = 46307;     // Rep2: the cast that jumps the boss onto its bait
const REP2_BEFORE_MS = 12_000;
const REP2_AFTER_MS = 6_000;
const REP2_DEFAM = 46311;          // Mana Burst, live Rep2 defam (knocks back)
const DEFAM_AFTER_MS = 5_000;

const NETHERWRATH_FAR = 46383;
const TIMELESS_SPITE = 46384;
const FAR_TO_SPITE_MS = 3_000;
const SPITE_BEFORE_MS = 4_000;
const SPITE_AFTER_MS = 1_500;

const BLOODY_BURST = 46334;
const CONTACT_BEFORE_MS = 4_000;
const CONTACT_AFTER_MS = 3_000;

const ESOTERIC_FINISHER = 46374;
const FINISHER_BEFORE_MS = 1_000;
const FINISHER_AFTER_MS = 3_000;

const REPLAYED_KICK = 48789;       // Snaking Kick replayed from Rep3
const REP3_BEFORE_MS = 3_000;
const REP3_AFTER_MS = 3_000;

// Idyllic live sets: the clone's Mana Burst cast, the defam hits, the stacks.
const LIVE_SET_IDS = [46359, 46360, 46361];
const LIVE_SETS_SPAN_MS = 25_000;
const LIVE_BEFORE_MS = 6_000;
const LIVE_AFTER_MS = 5_000;

const FARAWAY_PORTENT = 1004766;   // the wind tower's soaker
const WIND_AFTER_MS = 4_000;

const TEMPORAL_CURTAIN = 46364;
const REPLAYED_HEAVY_SLAM = 48733;
const REPLAY_BEFORE_MS = 3_000;
const REPLAY_AFTER_MS = 3_000;

const CLUSTER_MS = 3_000;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-lw2-avoidable":   "avoidable damage",
  "ffxiv-lw2-element":     "Replication 1 elements",
  "ffxiv-lw2-cone":        "Replication 2 cones",
  "ffxiv-lw2-overlap":     "bait overlaps",
  "ffxiv-lw2-defam":       "Mana Burst defamations",
  "ffxiv-lw2-stack":       "Heavy Slam stacks",
  "ffxiv-lw2-mutation":    "Blood Mana mutations",
  "ffxiv-lw2-tower":       "Idyllic towers",
  "ffxiv-lw2-doom":        "Doom",
  "ffxiv-lw2-fall":        "a fall",
  "ffxiv-lw2-mass-death":  "mass deaths",
  "ffxiv-lw2-enrage":      "Arcadian Hell (enrage)",
  "ffxiv-lw2-collapse":    "the wipe",
  "ffxiv-lw2-called-wipe": "a called wipe",
};

/** The first timestamp of each burst of an enemy cast (casts within CLUSTER_MS are one). */
function castClusters(pull: Pull, abilityId: number): number[] {
  const ts = (pull.enemyCasts ?? []).filter((e) => e.abilityId === abilityId).map((e) => e.timestamp).sort((a, b) => a - b);
  const out: number[] = [];
  let last = -Infinity;
  for (const t of ts) {
    if (t - last > CLUSTER_MS) out.push(t);
    last = t;
  }
  return out;
}

export const LINDWURM_II_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Lindwurm II",
  phases: {
    0: { pool: 131_940_000, fixedPool: true, carriesOver: false, decidesEnrage: true,
      note: "Lindwurm to 1 HP before Arcadian Hell's last volley (~9:05)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;
    const dead = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === BOSS && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
    if (dead !== undefined && dead < end) out.push({ startMs: dead, endMs: end, cause: "Lindwurm at 1 HP: the pool is down" });
    return out;
  },
  movementWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const melee = pull.players.filter((p) => p.rangeType === "Melee");
    const meleeNames = melee.map((p) => p.name);
    const hitsOn = (players: typeof pull.players, abilityId: number) =>
      players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === abilityId).map((e) => ({ name: p.name, t: e.timestamp })));

    // 1. Replication 2's tethers and live resolution: everyone.
    for (const t of castClusters(pull, FIREFALL_SPLASH)) {
      out.push({ startMs: t - REP2_BEFORE_MS, endMs: t + REP2_AFTER_MS, cause: "Replication 2 (tethers, jump, proteans, defams)" });
    }
    // 2. Rep2 defam holders: knocked back, then the walk back.
    for (const h of hitsOn(pull.players, REP2_DEFAM)) {
      out.push({ startMs: h.t, endMs: h.t + DEFAM_AFTER_MS, cause: "Mana Burst defamation (knock-back)", players: [h.name] });
    }
    // 3. Netherwrath Far: the melee Timeless Spite baits go far.
    const far = castClusters(pull, NETHERWRATH_FAR);
    for (const h of hitsOn(melee, TIMELESS_SPITE)) {
      if (!far.some((t) => h.t >= t && h.t - t <= FAR_TO_SPITE_MS)) continue;
      out.push({ startMs: h.t - SPITE_BEFORE_MS, endMs: h.t + SPITE_AFTER_MS, cause: "Netherwrath Far (Timeless Spite bait)", players: [h.name] });
    }
    // 4. Blood Mana contacts, melee.
    for (const h of hitsOn(melee, BLOODY_BURST)) {
      out.push({ startMs: h.t - CONTACT_BEFORE_MS, endMs: h.t + CONTACT_AFTER_MS, cause: "Blood Mana contact", players: [h.name] });
    }
    // 5. Esoteric Finisher: the two targets stand apart, then walk back.
    for (const h of hitsOn(melee, ESOTERIC_FINISHER)) {
      out.push({ startMs: h.t - FINISHER_BEFORE_MS, endMs: h.t + FINISHER_AFTER_MS, cause: "Esoteric Finisher (spread)", players: [h.name] });
    }
    // 6. Replication 3's replay on the return to blue, melee.
    const kick = castClusters(pull, REPLAYED_KICK)[0];
    if (kick !== undefined) {
      out.push({ startMs: kick - REP3_BEFORE_MS, endMs: kick + REP3_AFTER_MS, cause: "Replication 3 replay (back to blue)", players: meleeNames });
    }
    // 7. Idyllic's live defam/stack sets (either type first), melee.
    const sets = LIVE_SET_IDS.flatMap((id) => castClusters(pull, id)).sort((a, b) => a - b);
    if (sets.length) {
      const first = sets[0];
      const last = sets.filter((t) => t - first <= LIVE_SETS_SPAN_MS).pop() ?? first;
      out.push({ startMs: first - LIVE_BEFORE_MS, endMs: last + LIVE_AFTER_MS, cause: "Idyllic live defams and stacks", players: meleeNames });
    }
    // 8. Wind tower: Faraway Portent's knockback crosses islands, any role.
    for (const p of pull.players) {
      for (const d of p.debuffs.filter((e) => e.abilityId === FARAWAY_PORTENT && e.debuffStatus === "applied")) {
        out.push({ startMs: d.timestamp, endMs: d.timestamp + WIND_AFTER_MS, cause: "wind tower knock-back (Faraway Portent)", players: [p.name] });
      }
    }
    // 9. Idyllic's final replays (after Temporal Curtain), melee.
    const curtain = castClusters(pull, TEMPORAL_CURTAIN)[0];
    if (curtain !== undefined) {
      for (const t of castClusters(pull, REPLAYED_HEAVY_SLAM).filter((x) => x > curtain)) {
        out.push({ startMs: t - REPLAY_BEFORE_MS, endMs: t + REPLAY_AFTER_MS, cause: "Idyllic replays", players: meleeNames });
      }
    }
    return out;
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
