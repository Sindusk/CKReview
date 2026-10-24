// lib/mechanics/ffxiv/dancingmad/damage-context.ts
//
// Dancing Mad's fight context for the damage analysis
// (docs/archive/damage-analysis-plan.md, Layer 2; lib/damage/types.ts DamageContext).
//
// Phase pools are from the first DPS study (docs/dps-analysis.md, method
// step 1): every log showed the same damage total for P2, P3 and P5, so
// those pools are fixed. Only P5's DPS decides the enrage, so a cooldown
// held from an earlier phase into P5 is not drift.
//
// P2's pool is a kill to 0% (HP_CHECKS below). P1 and P4 are threshold
// checks: Kefka must be under 15% HP when he goes
// untargetable at the end of P1 (phase1.ts "ENRAGE CHECK"), and under 25%
// by his final Ultima Upsurge in P4 (kefka-says.ts header, "PHASE END").
// Neither phase's damage carries over (the next pool is fixed), so once
// he's under the line the rest of the phase is forced: losses there change
// nothing (user, 2026-10-08). The study first read P4's varying total as
// "P4 damage doesn't count" and missed the check. Measured on
// 2T1HzdPKgbhM43am fight 10: P1 under 15% at about +184 (a Paladin rightly
// held the Confiteor chain for P2); P4 under 25% at +859.5, 17.35% at the
// final Upsurge (+868.4).
//
// The end of P3 is a hold: groups slow down with both bosses low, so the
// transition comes later and cooldowns are back for P4 (user, 2026-10-08:
// "This is common"). P4 starts 5-6s after the second boss dies (12:05-12:18
// across 10 pulls), and the deadline is Exdeath's Meteor, the Phase 3
// enrage (exdeath.ts): cast P3 +302.2s (gTkMH91DWRmLbNCn pull 11; P3 itself
// starts at 7:08.1-7:09.2). The P3 pool is fixed, so holding costs nothing
// while the kill stays safe.
//
// When it's safe (user, 2026-10-24, measured on gTkMH91DWRmLbNCn,
// 2T1HzdPKgbhM43am, qjCMx4bRfgNKwX9T, yBKPqGwHparm7Tk4): a moment is a hold
// when the bosses' combined HP left ÷ seconds to Meteor is at most 35% of
// the raid's own P3 DPS (their first 200s of P3), never before Kefka's last
// slam, Look upon Me and Despair (47854, 11:31.4-11:32.4 in every pull),
// "right before Stompies begins". Re-checked every 0.5s: a raid that holds
// so long it falls behind is back to counted time. A pull that ends in
// Meteor has no hold. Thresholds tried: 60% read gTkMH91DWRmLbNCn pull 11
// (Meteor) as safe from 11:23; 50% and 40% started too early (from 10:42);
// at 35% the starts fall 11:17-12:03 before the floor. The fixed Stompies
// marker this replaced counted this group's holds from ~11:32 as losses.
//
// Forced downtime: the transitions and untargetable stretches come from
// the engine's log-inferred raid downtime. Per-player busy windows (tower
// soakers, debuff carriers, baits) are the next step; until then a gap
// during a mechanic is labelled with it ("during Towers (P5)") but still
// counted. Candidate (from docs/open-items.md 2026-10-15): the Dark
// Knight's 4.6–4.9s idle after LB3 during Limit Cut, in every pull.

import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { phaseSpans } from "../../../damage/wow/context-helpers";
import { mechanicLabelForKey } from "../../rule-meta";

// Occurrence keys that are single rules, not grouped mechanics.
const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-phase1-hyperdrive-out-of-position": "Hyperdrive",
  "ffxiv-exdeath-thunder3-wrong-tank":       "Thunder III (tankbuster)",
  "ffxiv-exdeath-shockwave-silent-kill":     "Shockwave",
  "ffxiv-uk-apocalypse":                     "Stray Apocalypse",
};

// The HP share Kefka must reach, by phase. P2's pool is a kill: he sits
// at 0% until Ultimate Embrace (forsaken.ts), so the rest is wasted too
// (2T1HzdPKgbhM43am fight 10: 0% at +378.4, a Dark Knight then built Blood
// with the AoE combo before the downtime).
const HP_CHECKS: Record<number, number> = { 1: 0.15, 2: 0, 4: 0.25 };

// Forsaken (P2) movement: a soak at an outer tower spot (Spread "outer",
// Cone "flare": r ~10-11y, forsaken.ts "Phase 2: positioning") is out of
// melee reach of Kefka at the arena center; inner and on-tower spots
// (r ~5-7y) are not. yBKPqGwHparm7Tk4 fight 5: the Dragoon's Piercing
// Talons at 4:19.4 and 4:32.0 were its two outer soaks (10.9y, 10.4y; its
// 5.5y Stack soak at 4:10.5 kept melee), the Paladin's ranged GCDs at
// 10.3-10.8y were its three. The user (2026-10-13) files this under
// Movement, not forced. Melee only; from a GCD before the resolution (the
// walk out) to 1.5s after it (the plant fires, then the walk back).
const PATH_OF_LIGHT = 47806;          // the tower soak tick on the soaker
const ARENA = { x: 10000, y: 10000 };
const FAR_SPOT_MIN = 900;             // past the r=800 tower ring
const FORSAKEN_BEFORE_MS = 2_500;
const FORSAKEN_AFTER_MS = 1_500;

// P1's statue gaze (user, 2026-10-13): Graven Image's Ave Maria (look at
// the statue; Indolent Will is the look-away form, not yet seen in a log)
// resolves on all eight with a 0-damage hit. Attacking Kefka turns the
// player to face him, which can fail the gaze, so GCD gaps around it are
// movement. yBKPqGwHparm7Tk4 fight 5: resolves 3:07.66; the Sage (3:05.7,
// 5.0s), Black Mage and Viper (3:06.6, ~2.5s) held GCDs. The cast's start
// isn't logged: 6s before the resolution to 1.5s after (turning back).
const GAZE_NAMES = new Set(["Ave Maria", "Indolent Will"]);
const GAZE_BEFORE_MS = 6_000;
const GAZE_AFTER_MS = 1_500;

// P2 Trines (user, 2026-10-13): the whole group, tanks included, goes out
// of melee range. yBKPqGwHparm7Tk4 fight 5: Trine (47840) at 6:07.4,
// 6:09.4, 6:11.4, Wings of Destruction on both tanks 6:12.5; the Dragoon
// Elusive Jump 6:08.4 / Piercing Talon 6:09.5, the Viper Uncoiled Fury
// 6:08.9, the tanks Blade of Faith / Disesteem. One window per chain of
// casts, from a GCD before the first to 1s after the last.
const TRINE = 47840;
const TRINE_CHAIN_MS = 3_000;
const TRINE_BEFORE_MS = 1_500;
const TRINE_AFTER_MS = 1_000;

const LAST_SLAM = 47854;           // Look upon Me and Despair, the hold's floor
const STOMPIES_BAIT = 47887;       // Exdeath's Blizzard III bait, Stompies wave 1
const SLAM_LOOKBACK_MS = 20_000;   // the slam is ~9s before the bait
const METEOR = 50718;
const METEOR_AFTER_P3_MS = 302_200;
const P3_DPS_SPAN_MS = 200_000;
const HOLD_SAFE_SHARE = 0.35;
const HOLD_STEP_MS = 500;

/** Late-P3 hold windows: see the header ("When it's safe"). */
function p3HoldWindows(pull: Parameters<DamageContext["forcedWindows"]>[0]): ForcedWindow[] {
  if (pull.players.some((p) => p.damageTaken.some((e) => e.abilityId === METEOR))) return [];
  const casts = pull.enemyCasts ?? [];
  const out: ForcedWindow[] = [];
  for (const span of phaseSpans(pull, 3)) {
    const bait = casts.find((e) => e.abilityId === STOMPIES_BAIT && e.timestamp >= span.startMs && e.timestamp <= span.endMs);
    if (!bait) continue;
    const slam = casts.filter((e) => e.abilityId === LAST_SLAM && e.timestamp <= bait.timestamp
      && e.timestamp >= bait.timestamp - SLAM_LOOKBACK_MS).pop();
    const floor = slam?.timestamp ?? bait.timestamp;
    const hits = pull.players
      .flatMap((p) => p.damageDone)
      .filter((e) => (e.target === "Exdeath" || e.target === "Chaos") && e.timestamp >= span.startMs && e.timestamp <= span.endMs)
      .sort((a, b) => a.timestamp - b.timestamp);
    const p3Dps = hits.filter((e) => e.timestamp < span.startMs + P3_DPS_SPAN_MS)
      .reduce((s, e) => s + (e.amount ?? 0), 0) / (P3_DPS_SPAN_MS / 1000);
    if (p3Dps <= 0) continue;
    const deadline = span.startMs + METEOR_AFTER_P3_MS;
    const hp = new Map<string, number>();
    for (const e of hits) if (e.maxHealth && !hp.has(e.target)) hp.set(e.target, e.maxHealth);
    let i = 0;
    let open: number | undefined;
    for (let t = span.startMs; t <= span.endMs; t += HOLD_STEP_MS) {
      for (; i < hits.length && hits[i].timestamp <= t; i++) {
        if (hits[i].healthAfter !== undefined) hp.set(hits[i].target, hits[i].healthAfter!);
      }
      const left = [...hp.values()].reduce((s, v) => s + v, 0);
      const safe = t >= floor && (left === 0 || (deadline > t && left / ((deadline - t) / 1000) <= HOLD_SAFE_SHARE * p3Dps));
      if (safe && open === undefined) open = t;
      if (!safe && open !== undefined) { out.push({ startMs: open, endMs: t, cause: HOLD_CAUSE }); open = undefined; }
    }
    if (open !== undefined) out.push({ startMs: open, endMs: span.endMs, cause: HOLD_CAUSE });
  }
  // A dip under a few seconds is one hit's HP step, not the raid falling
  // behind (2T1HzdPKgbhM43am pull 1 12:07.1-12:07.6).
  return out.reduce<ForcedWindow[]>((merged, w) => {
    const last = merged[merged.length - 1];
    if (last && w.startMs - last.endMs < HOLD_GAP_MERGE_MS) last.endMs = w.endMs;
    else merged.push({ ...w });
    return merged;
  }, []);
}
const HOLD_GAP_MERGE_MS = 3_000;
const HOLD_CAUSE = "end-of-P3 hold for P4 timing (bosses safe to kill before Meteor)";

export const DANCING_MAD_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Dancing Mad",
  phases: {
    1: { note: "Kefka must be under 15% when he goes untargetable" },
    2: { pool: 44_100_000, fixedPool: true, carriesOver: false },
    3: { pool: 75_100_000, fixedPool: true, carriesOver: false, multiTarget: true, note: "Exdeath and Chaos" },
    4: { fixedPool: false, carriesOver: false, note: "Kefka must be under 25% by the final Ultima Upsurge" },
    5: { pool: 56_900_000, fixedPool: true, decidesEnrage: true },
  },
  // Past a check: from the first hit that leaves Kefka under the line to
  // the end of the phase. A pull that never got him there has no window.
  forcedWindows: (pull) => {
    const out: ForcedWindow[] = [];
    for (const [phase, line] of Object.entries(HP_CHECKS)) {
      for (const span of phaseSpans(pull, Number(phase))) {
        const crossed = pull.players
          .flatMap((p) => p.damageDone)
          .filter((e) => e.timestamp >= span.startMs && e.timestamp <= span.endMs
            && e.target === "Kefka" && e.healthAfter !== undefined && e.maxHealth
            && e.healthAfter / e.maxHealth <= line)
          .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined);
        const reached = line === 0 ? "at 0%" : `under ${line * 100}%`;
        if (crossed !== undefined) out.push({ startMs: crossed, endMs: span.endMs, cause: `P${phase} check passed: Kefka ${reached}` });
      }
    }
    out.push(...p3HoldWindows(pull));
    return out;
  },
  movementWindows: (pull) => [
    ...pull.players
      .filter((p) => p.rangeType === "Melee")
      .flatMap((p) => p.damageTaken
        .filter((e) => e.abilityId === PATH_OF_LIGHT && e.x !== undefined && e.y !== undefined
          && Math.hypot(e.x - ARENA.x, e.y - ARENA.y) >= FAR_SPOT_MIN)
        .map((e) => ({
          startMs: e.timestamp - FORSAKEN_BEFORE_MS, endMs: e.timestamp + FORSAKEN_AFTER_MS,
          cause: "Forsaken: outer tower spot", players: [p.name],
        }))),
    ...(pull.enemyCasts ?? [])
      .filter((e) => GAZE_NAMES.has(e.abilityName))
      .map((e) => ({ startMs: e.timestamp - GAZE_BEFORE_MS, endMs: e.timestamp + GAZE_AFTER_MS, cause: `${e.abilityName} (statue gaze)` })),
    ...(pull.enemyCasts ?? [])
      .filter((e) => e.abilityId === TRINE)
      .map((e) => e.timestamp)
      .sort((a, b) => a - b)
      .reduce<{ startMs: number; endMs: number }[]>((chains, t) => {
        const last = chains[chains.length - 1];
        if (last && t - last.endMs <= TRINE_CHAIN_MS) last.endMs = t;
        else chains.push({ startMs: t, endMs: t });
        return chains;
      }, [])
      .map((ch) => ({ startMs: ch.startMs - TRINE_BEFORE_MS, endMs: ch.endMs + TRINE_AFTER_MS, cause: "Trines (out of melee)" })),
  ],
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
