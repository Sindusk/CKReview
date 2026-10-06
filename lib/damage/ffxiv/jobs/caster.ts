// lib/damage/ffxiv/jobs/caster.ts
//
// Caster checks (caster batch). Cast interruptions and cast-time GCD locks
// are engine checks (begin-cast + duration, lib/damage/timeline.ts and
// checks.ts). The rest, per job:
//
// Pictomancer (verified on dQ8wmb1VhKt6yBXk):
//   - Starry Muse contents, from xivanalysis
//     src/parser/jobs/pct/modules/StarryMuse.tsx: three Hammer GCDs, Star
//     Prism, Rainbow Drip, Comet in Black, three Subtractive spells, one
//     Living Muse, and Mog of the Ages or Retribution of the Madeen. A
//     missing one is its average × the window's bonus, measured from the
//     multiplier because Starry Muse lines up with the party's buffs.
//   - Additive spells inside Starry Muse (xivanalysis expects none): each
//     is the player's average Subtractive spell minus the Additive's own
//     average. An upper bound, marked inference.
//   - Not checked: motifs hardcast while the boss is targetable. A first
//     version flagged ~20 per pull on dQ8wmb1VhKt6yBXk; the standard
//     rotation repaints in uptime, so only motifs that could have waited
//     for known downtime would be a real loss, which needs the fight
//     context.
//   - On dQ8wmb1VhKt6yBXk every Starry Muse window holds only one Hammer
//     (the PCT starts Hammer Time at the window's end, after a second
//     Subtractive round). Consistent across pulls, so likely a chosen
//     line; confirm with the player before treating it as a loss.
// Black Mage, Summoner, Red Mage (unverified, no sample has them):
//   - BLM High Thunder / High Thunder II uptime and clipping (DoTs.tsx).
//   - SMN Searing Light with one Searing Flash (SearingLight.tsx).
//   - Cooldowns for all three in tracked-cooldowns.ts.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { burstWindowFindings, dotFindings, k, statusWindows, type ExpectedAction } from "./shared";

const ids = (...keys: string[]) => keys.filter((key) => A[key]).map((key) => A[key].id);
const best = (ctx: PlayerCheckContext, list: number[]) => Math.max(0, ...list.map((x) => ctx.values.perUse(x)));

const HAMMERS = ids("HAMMER_STAMP", "HAMMER_BRUSH", "POLISHING_HAMMER");
const SUBTRACTIVE = ids("BLIZZARD_IN_CYAN", "STONE_IN_YELLOW", "THUNDER_IN_MAGENTA");
const ADDITIVE = ids("FIRE_IN_RED", "AERO_IN_GREEN", "WATER_IN_BLUE", "FIRE_II_IN_RED", "AERO_II_IN_GREEN", "WATER_II_IN_BLUE", "HOLY_IN_WHITE");

const starryMuse: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.STARRY_MUSE.id, name: "Starry Muse", bonus: "observed",
  bonusBasis: "each missing action × its average × the window's measured bonus (multiplier inside vs outside raid buffs)",
  expected: (): ExpectedAction[] => [
    { ids: HAMMERS, count: 3, name: "Hammer GCD" },
    { ids: ids("STAR_PRISM"), count: 1, name: "Star Prism" },
    { ids: ids("RAINBOW_DRIP"), count: 1, name: "Rainbow Drip" },
    { ids: ids("COMET_IN_BLACK"), count: 1, name: "Comet in Black" },
    { ids: SUBTRACTIVE, count: 3, name: "Subtractive spell" },
    { ids: ids("POM_MUSE", "WINGED_MUSE", "CLAWED_MUSE", "FANGED_MUSE"), count: 1, name: "Living Muse" },
    { ids: ids("MOG_OF_THE_AGES", "RETRIBUTION_OF_THE_MADEEN"), count: 1, name: "Mog of the Ages / Madeen" },
  ],
});

const starryFillers: JobCheck = (ctx): DamageFinding[] => {
  const additive = new Set(ADDITIVE);
  const sub = best(ctx, SUBTRACTIVE);
  const out: DamageFinding[] = [];
  for (const w of statusWindows(ctx, S.STARRY_MUSE.id)) {
    if (w.endMs > ctx.endMs) continue;
    const used = ctx.uses.filter((u) => u.startMs >= w.startMs && u.startMs <= w.endMs + 100 && additive.has(u.action.id));
    if (used.length === 0) continue;
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs, forced: false, inference: true,
      label: "Additive spells in Starry Muse",
      lostDamage: used.reduce((a, u) => a + Math.max(0, sub - ctx.values.perUse(u.action.id)), 0),
      basis: `each Additive = ${k(sub)} average Subtractive spell minus the Additive's average (upper bound)`,
      detail: `${used.length} Additive spell${used.length > 1 ? "s" : ""} in Starry Muse: ${used.map((u) => u.abilityName).join(", ")}`,
    }));
  }
  return out;
};

const highThunder: JobCheck = (ctx) => dotFindings(ctx, {
  statusIds: [S.HIGH_THUNDER.id, S.HIGH_THUNDER_II.id], name: S.HIGH_THUNDER.name, durationMs: S.HIGH_THUNDER.duration ?? 30_000,
});

const searingLight: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.SEARING_LIGHT.id, name: "Searing Light", bonus: "observed",
  bonusBasis: "Searing Flash's average × the window's measured bonus (not yet checked against a log)",
  expected: () => [{ ids: ids("SEARING_FLASH"), count: 1, name: "Searing Flash" }],
});

export const PCT_CHECKS: JobCheck[] = [starryMuse, starryFillers];
export const BLM_CHECKS: JobCheck[] = [highThunder];
export const SMN_CHECKS: JobCheck[] = [searingLight];
export const RDM_CHECKS: JobCheck[] = [];
