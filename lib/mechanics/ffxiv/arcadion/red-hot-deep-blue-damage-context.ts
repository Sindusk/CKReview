// lib/mechanics/ffxiv/arcadion/red-hot-deep-blue-damage-context.ts
//
// Damage context for Red Hot and Deep Blue (M10S).
//
// Sources:
// - red-hot-deep-blue.ts header (VERIFIED AGAINST LOGS): a timed script
//   (every pull within ~1s), Red Hot alone to ~1:30, Deep Blue from ~1:32,
//   both bosses after; Watery Grave (the prison) +337..+396, fixed length
//   ("breaking the bubble early doesn't move later mechanics"); Over the
//   Falls, the hard enrage, at +600 (B35 enraged with Red Hot at 5.9%).
// - HP measured 2026-10-14 with build-fight-context/tools/phase-hp.js on
//   the kills CABrk9zXLfJG8h6R pull 1 (9:45.8), vVPtwaTQ62Jg391q pull 1
//   (8:49.1) and d3vRbwfpNBLzJ2Xh pull 4 (9:39.8).
// - Movement measured 2026-10-14 on those three kills and the
//   jN3XDrf2z8PmLgRJ wipes 15, 35 and 44 (start-of-pull captures to
//   5:28-6:40): per 2s bin, the share of melee and of ranged players' alive,
//   targetable time with no GCD running (the engine's timeline), against
//   each player's whole-pull idle (1-17%); and melee ranged-filler GCDs
//   (Piercing Talon, Enpi, Harpe, Unmend, Shield Lob, Tomahawk, Writhing
//   Snap), with who was hit by which tether or bait around them. Times
//   below are the CABrk9zXLfJG8h6R kill's unless named.
//
// One phase. The log has no phase segments; phase 0 is the whole pull and
// the deciding phase.
// - Pool: 118.98M, two bosses of 59.49M. The kills dealt 118.99M, 118.99M
//   and 117.31M (Deep Blue left at 0.1%) across the two; Epic Brotherhood
//   keeps their HP in step (both at 30% at 6:47.6 on the CABrk9zXLfJG8h6R
//   kill), so neither dies alone. Over the Falls ends the pull at ~10:00
//   either way: the pool decides the enrage. Both bosses are targetable
//   together from ~1:32, so cleave counts on both (multiTarget).
// - Watery Grave (86.34M) isn't in the pool: the players dealt 8.6-8.8M
//   (10%) and the six Red Xtreme Waves the rest. The prison is fixed length,
//   so damage on it neither moves the script nor carries over; left as is
//   (the bosses are away, it's the only target).
// - No hold and no HP check before the enrage.
//
// Forced windows:
// - Both bosses at 1 HP: from when the second one crosses to the end.
// - Red Hot leaves, Deep Blue arrives: no target from the last cast on Red
//   Hot to the first on Deep Blue, ~1:29.3-1:31.3 on every kill (ranged
//   idle 57-79% in that bin, everyone in the wipes). Too short for the
//   engine's own downtime inference.
// - The prison breaks, the bosses return: from the last cast on Watery
//   Grave to the first on a boss after it, ~6:32-6:34 (the engine inferred
//   it only on vVPtwaTQ62Jg391q, 6:31.4-6:34.7).
//
// Movement windows (docs/dps-analysis.md: idle beyond the player's usual
// rate is movement, not a loss; out-of-melee positions are movement, not
// forced; user, 2026-10-13):
// - Flame Floater carriers, melee (per player): First..Fourth in Line
//   1003004/1003005/1003006/1003451, from 3.5s before its removal (the
//   dash) to 2s after. The carrier stretches the tether to a wall; every
//   opening-Floater ranged filler on the three kills was a carrier's, 0.3s
//   after to 3.1s before their dash (Dragoon 0:30.8, Dark Knight 0:39.9;
//   d3vRbwfpNBLzJ2Xh Dragoon 0:32.7, Reaper 0:36.4, Dark Knight 0:38.4 and
//   0:40.9; vVPtwaTQ62Jg391q Paladin 0:38.3).
// - Sick Swell's knockback, melee: from the wave (46540) to 4.5s after.
//   The 1:55.9 wave lands inside the engine's untargetable stretch (to
//   ~1:58.9); melee were back on the boss only at ~2:00 (Dark Knight and
//   Dragoon idle to 2:00.2; Piercing Talon 1:58.0 and 1:58.4 on the other
//   kills). Only the first wave: the later two (5:02.6, 7:27.6) sit inside
//   the Hot Aerial and Freaky Pyrotation windows below.
// - Deep Varial, melee: Deep Blue jumps to an edge for the cone (47249 cast
//   4:36.4), then Inferno and Awesome Splash; from 1.5s before the cast to
//   7.5s after. Ranged fillers at 4:35.5-4:41.1 on every kill; melee idle
//   13-18% (d3vRbwfpNBLzJ2Xh), 7-16% (vVPtwaTQ62Jg391q), 19-99% in the
//   wipes. Ranged idle stayed normal on the kills.
// - Hot Aerial and Sickest Take-Off, everyone: Red Hot jumps at the far
//   fire players (46532 cast 4:49.8, jumps to 4:57.6) while Deep Blue surfs
//   (4:53.6-5:02.6, its tank has no target) and the wave knocks everyone
//   across; from the Hot Aerial cast to 3.5s after the Take-Off lane (46542,
//   5:02.6). Melee idle 17-54% / 25-39% / 25-31% per bin at 4:54-5:05 on
//   the three kills (28-100% in the wipes), ranged 10-31%, against 1-10%
//   usual; ranged fillers in every kill (6 on vVPtwaTQ62Jg391q).
// - Deep Aerial tower soakers (per player): the two players the tower traps
//   in Watery Grave (1004829, the healers in every pull), from 4s before
//   it lands (5:37.8) to 4s after. They walk into the center tower: no
//   damage GCD from ~5:35 to 5:40-5:42 on every kill (ranged idle 26-35% at
//   5:36-5:39).
// - Xtreme Wave tether holders, melee (per player): each wave hit (46545 /
//   46546) on a melee player outside the prison, from 4.5s before it to 1s
//   after. Each free player holds two tethers and stretches them across the
//   arena; every prison ranged filler on the three kills (6, 7, 11) was a
//   holder's, 0.2-4s before their wave.
// - Split-arena Inferno, melee: the Inferno after the split Floater (46528,
//   7:05.7), whose circles drop at the side edges; from 3s before the cast
//   to 4s after. Ranged fillers 7:04.0-7:07.0 on every kill (2-3 each),
//   melee idle 22-28% (vVPtwaTQ62Jg391q), 40-50% (d3vRbwfpNBLzJ2Xh).
// - Freaky Pyrotation and the split Take-Off, everyone: pair stacks (46486
//   cast 7:18.6), Take-Off's knockback (7:27.6) and the light-party stacks
//   (Awesome Slab 46544, 7:30.2); from 3s before the Pyrotation cast to 2s
//   after Slab. Melee idle 32-58% (CABrk9zXLfJG8h6R), 25% and 51% peaks on
//   the others, ranged 13-64%, ranged fillers 7:16.2-7:31.5 on every kill.
// - Insane Air, melee: the bosses jump to new corners for each volley;
//   from 3.5s before each Air 2 volley (Red Hot 46566, 46568: 8:05.5,
//   8:15.8, 8:26.1, 8:36.5) to 3s after, and the first Air 1 volley (47255,
//   3:15.5). Air 2 ranged fillers 4/5/8 on the three kills, 0.4-3.2s before
//   a volley; Air 1 only its first volley showed melee idle (12-35%), with
//   one filler.
// - The final Double-Dip and Inferno, melee: the Double-Dip after Xtreme
//   snaking (46557, 9:04.8) and the Inferno (9:07.0); from 3s before the
//   Double-Dip to 6.5s after. Melee idle 30-47% (CABrk9zXLfJG8h6R) and 22%
//   with six fillers 9:02.1-9:09.3 (d3vRbwfpNBLzJ2Xh); the vVPtwaTQ62Jg391q
//   kill ended before it.
//
// Not added: Deep Impact's far tank (Paladins kept uptime with the
// Confiteor chain; one Dark Knight used two Unmends, d3vRbwfpNBLzJ2Xh
// 5:11.7); the final Pyrotation stacks (the 9:12-9:18 idle on the two kills
// was the Deep Impact tank and players dying); the other Air 1 volleys,
// the opening Inferno, Pyrotation and Double-Dip (no idle past normal).

import type { Pull } from "@/types/Pull";
import type { DamageContext, ForcedWindow } from "../../../damage/types";
import { mechanicLabelForKey } from "../../rule-meta";

const RED = "Red Hot";
const BLUE = "Deep Blue";
const GRAVE = "Watery Grave";
const ONE_HP = 0.001;
// A no-target gap shorter than this isn't worth a window.
const MIN_GAP_MS = 1_000;

const IN_LINE = [1003004, 1003005, 1003006, 1003451];   // First..Fourth in Line
const FLOATER_BEFORE_MS = 3_500;
const FLOATER_AFTER_MS = 2_000;

const SICK_SWELL_WAVE = 46540;
const SWELL_AFTER_MS = 4_500;

const DEEP_VARIAL_CAST = 47249;
const VARIAL_BEFORE_MS = 1_500;
const VARIAL_AFTER_MS = 7_500;

const HOT_AERIAL_CAST = 46532;
const TAKE_OFF_LANE = 46542;
const TAKE_OFF_AFTER_MS = 3_500;
const AERIAL_FALLBACK_MS = 16_000;   // Hot Aerial cast to Take-Off lane +3.5s
const AERIAL_LOOKAHEAD_MS = 20_000;

const WATERY_GRAVE = 1004829;
const TOWER_BEFORE_MS = 4_000;
const TOWER_AFTER_MS = 4_000;

const XTREME_WAVE_HITS = new Set([46545, 46546]);
const WAVE_BEFORE_MS = 4_500;
const WAVE_AFTER_MS = 1_000;

const SPLIT_FLOATER = [46548, 46527];
const INFERNO_CAST = 46528;
const SPLIT_LOOKAHEAD_MS = 20_000;
const SPLIT_INFERNO_BEFORE_MS = 3_000;
const SPLIT_INFERNO_AFTER_MS = 4_000;

const FREAKY_PYROTATION_CAST = 46486;
const AWESOME_SLAB = 46544;
const FREAKY_BEFORE_MS = 3_000;
const SLAB_AFTER_MS = 2_000;
const FREAKY_FALLBACK_MS = 13_600;   // Pyrotation cast to Slab +2s

const AIR_2_VOLLEYS = new Set([46566, 46568]);   // Red Hot's; Deep Blue's land with them
const AIR_1_FIRST = 47255;
const AIR_BEFORE_MS = 3_500;
const AIR_AFTER_MS = 3_000;

const XTREME_SNAKING_CAST = 46510;
const DOUBLE_DIP_CAST = 46557;
const FINAL_BEFORE_MS = 3_000;
const FINAL_AFTER_MS = 6_500;

const RULE_KEY_LABELS: Record<string, string> = {
  "ffxiv-rhdb-avoidable":      "avoidable damage",
  "ffxiv-rhdb-fire":           "fire",
  "ffxiv-rhdb-wall":           "the deathwall",
  "ffxiv-rhdb-overlap":        "bait overlaps",
  "ffxiv-rhdb-split-drop":     "the split arena",
  "ffxiv-rhdb-buster":         "tankbusters",
  "ffxiv-rhdb-deep-impact":    "Deep Impact",
  "ffxiv-rhdb-stack":          "stacks",
  "ffxiv-rhdb-prison":         "Watery Grave",
  "ffxiv-rhdb-xtreme-cleanse": "Xtreme snaking cleanses",
  "ffxiv-rhdb-enrage":         "Over the Falls",
  "ffxiv-rhdb-collapse":       "a collapse",
  "ffxiv-rhdb-called-wipe":    "a called wipe",
};

const isPlayer = (pull: Pull, name: string | undefined) => !!name && pull.players.some((p) => p.name === name);

// Player casts on enemies, by target, in time order.
function enemyCasts(pull: Pull): { t: number; target: string }[] {
  return pull.players
    .flatMap((p) => p.casts.filter((c) => c.target && !isPlayer(pull, c.target)).map((c) => ({ t: c.timestamp, target: c.target as string })))
    .sort((a, b) => a.t - b.t);
}

// No target: from the last cast on `from` before the first cast on `to`
// (after `after`) to that first cast.
function noTargetGap(casts: { t: number; target: string }[], from: string[], to: string[], after: number): { startMs: number; endMs: number } | undefined {
  const first = casts.find((c) => c.t > after && to.includes(c.target));
  if (!first) return undefined;
  const last = casts.filter((c) => c.t < first.t && from.includes(c.target)).pop();
  if (!last || first.t - last.t < MIN_GAP_MS) return undefined;
  return { startMs: last.t, endMs: first.t };
}

export const RED_HOT_DEEP_BLUE_DAMAGE_CONTEXT: DamageContext = {
  encounter: "Red Hot and Deep Blue",
  phases: {
    0: { pool: 118_980_000, fixedPool: true, carriesOver: false, decidesEnrage: true, multiTarget: true,
      note: "Red Hot and Deep Blue (59.49M each) to 1 HP before Over the Falls (~10:00)" },
  },
  forcedWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const end = pull.fightDuration;

    // Both bosses at 1 HP: from when the second one crosses.
    const crossed = [RED, BLUE].map((boss) => pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.target === boss && e.healthAfter !== undefined && e.maxHealth && e.healthAfter / e.maxHealth <= ONE_HP)
      .reduce<number | undefined>((min, e) => (min === undefined || e.timestamp < min ? e.timestamp : min), undefined));
    if (crossed.every((t) => t !== undefined)) {
      const both = Math.max(...(crossed as number[]));
      if (both < end) out.push({ startMs: both, endMs: end, cause: "both bosses at 1 HP: the check is met" });
    }

    const casts = enemyCasts(pull);
    // Red Hot leaves, Deep Blue arrives (~1:29-1:31).
    const swap = noTargetGap(casts, [RED], [BLUE], 0);
    if (swap) out.push({ ...swap, cause: "no target: Red Hot leaves, Deep Blue arrives" });
    // The prison breaks, the bosses return (~6:32-6:34).
    const firstGrave = casts.find((c) => c.target === GRAVE);
    if (firstGrave) {
      const back = noTargetGap(casts, [GRAVE], [RED, BLUE], firstGrave.t);
      if (back) out.push({ ...back, cause: "no target: the prison breaks, the bosses return" });
    }
    return out;
  },
  movementWindows: (pull: Pull) => {
    const out: ForcedWindow[] = [];
    const enemy = (pull.enemyCasts ?? []).slice().sort((a, b) => a.timestamp - b.timestamp);
    const next = (id: number | Set<number>, after: number, within: number) =>
      enemy.find((e) => (typeof id === "number" ? e.abilityId === id : id.has(e.abilityId)) && e.timestamp > after && e.timestamp <= after + within);
    const melee = pull.players.filter((p) => p.rangeType === "Melee");
    const meleeNames = melee.map((p) => p.name);

    // Flame Floater carriers (melee): around their dash.
    for (const p of melee) {
      for (const d of p.debuffs.filter((e) => IN_LINE.includes(e.abilityId) && e.debuffStatus === "removed")) {
        out.push({ startMs: d.timestamp - FLOATER_BEFORE_MS, endMs: d.timestamp + FLOATER_AFTER_MS,
          cause: "Flame Floater: stretching the tether", players: [p.name] });
      }
    }
    // Sick Swell's knockback (melee): the opening wave; the later two land
    // inside the Hot Aerial and Freaky Pyrotation windows.
    const swell = enemy.find((e) => e.abilityId === SICK_SWELL_WAVE);
    if (swell) out.push({ startMs: swell.timestamp, endMs: swell.timestamp + SWELL_AFTER_MS, cause: "Sick Swell knockback", players: meleeNames });
    // Deep Varial (melee): Deep Blue jumps to the edge.
    for (const e of enemy.filter((e) => e.abilityId === DEEP_VARIAL_CAST)) {
      out.push({ startMs: e.timestamp - VARIAL_BEFORE_MS, endMs: e.timestamp + VARIAL_AFTER_MS, cause: "Deep Varial (Deep Blue at the edge)", players: meleeNames });
    }
    // Hot Aerial jumps and Sickest Take-Off (everyone).
    for (const e of enemy.filter((e) => e.abilityId === HOT_AERIAL_CAST)) {
      const lane = next(TAKE_OFF_LANE, e.timestamp, AERIAL_LOOKAHEAD_MS);
      out.push({ startMs: e.timestamp, endMs: lane ? lane.timestamp + TAKE_OFF_AFTER_MS : e.timestamp + AERIAL_FALLBACK_MS,
        cause: "Hot Aerial and Sickest Take-Off" });
    }
    // Deep Aerial tower soakers: walking into the prison tower.
    for (const p of pull.players) {
      const grave = p.debuffs.find((e) => e.abilityId === WATERY_GRAVE && e.debuffStatus === "applied");
      if (grave) out.push({ startMs: grave.timestamp - TOWER_BEFORE_MS, endMs: grave.timestamp + TOWER_AFTER_MS,
        cause: "Deep Aerial tower soak", players: [p.name] });
    }
    // Xtreme Wave tether holders (melee, outside the prison).
    for (const p of melee) {
      const graves = p.debuffs.filter((e) => e.abilityId === WATERY_GRAVE);
      for (const h of p.damageTaken.filter((e) => XTREME_WAVE_HITS.has(e.abilityId))) {
        const applied = graves.filter((g) => g.debuffStatus === "applied" && g.timestamp <= h.timestamp).pop();
        const removed = applied && graves.find((g) => g.debuffStatus === "removed" && g.timestamp > applied.timestamp);
        if (applied && (!removed || removed.timestamp > h.timestamp)) continue;   // an inmate
        out.push({ startMs: h.timestamp - WAVE_BEFORE_MS, endMs: h.timestamp + WAVE_AFTER_MS,
          cause: "Xtreme Wave: stretching the tether", players: [p.name] });
      }
    }
    // The split arena's Inferno (melee): circles at the side edges.
    // (Its two Floater ids log together: one window.)
    const split = enemy.find((e) => SPLIT_FLOATER.includes(e.abilityId));
    if (split) {
      const inferno = next(INFERNO_CAST, split.timestamp, SPLIT_LOOKAHEAD_MS);
      if (inferno) out.push({ startMs: inferno.timestamp - SPLIT_INFERNO_BEFORE_MS, endMs: inferno.timestamp + SPLIT_INFERNO_AFTER_MS,
        cause: "split-arena Alley-Oop Inferno", players: meleeNames });
    }
    // Freaky Pyrotation, the split Take-Off and Awesome Slab (everyone).
    for (const e of enemy.filter((e) => e.abilityId === FREAKY_PYROTATION_CAST)) {
      const slab = next(AWESOME_SLAB, e.timestamp, AERIAL_LOOKAHEAD_MS);
      out.push({ startMs: e.timestamp - FREAKY_BEFORE_MS, endMs: slab ? slab.timestamp + SLAB_AFTER_MS : e.timestamp + FREAKY_FALLBACK_MS,
        cause: "Freaky Pyrotation and Sickest Take-Off" });
    }
    // Insane Air (melee): Air 2's four volleys and Air 1's first.
    for (const e of enemy.filter((e) => AIR_2_VOLLEYS.has(e.abilityId) || e.abilityId === AIR_1_FIRST)) {
      out.push({ startMs: e.timestamp - AIR_BEFORE_MS, endMs: e.timestamp + AIR_AFTER_MS, cause: "Insane Air (bosses jump)", players: meleeNames });
    }
    // The final Double-Dip and Inferno (melee), after Xtreme snaking.
    const xtreme = enemy.find((e) => e.abilityId === XTREME_SNAKING_CAST);
    if (xtreme) {
      const dip = enemy.find((e) => e.abilityId === DOUBLE_DIP_CAST && e.timestamp > xtreme.timestamp);
      if (dip) out.push({ startMs: dip.timestamp - FINAL_BEFORE_MS, endMs: dip.timestamp + FINAL_AFTER_MS,
        cause: "final Double-Dip and Inferno", players: meleeNames });
    }
    return out.map((w) => ({ ...w, startMs: Math.max(0, w.startMs), endMs: Math.min(pull.fightDuration, w.endMs) }))
      .filter((w) => w.endMs > w.startMs);
  },
  mechanicLabel: (key) => mechanicLabelForKey(key) ?? RULE_KEY_LABELS[key],
};
