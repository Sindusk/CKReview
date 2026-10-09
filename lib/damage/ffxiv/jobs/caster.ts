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
// Red Mage: see its section below.
// Black Mage, Summoner (unverified, no sample has them):
//   - BLM High Thunder / High Thunder II uptime and clipping (DoTs.tsx),
//     AoE on too few targets. Checked against xivanalysis on
//     2T1HzdPKgbhM43am Dancing Mad fight 10 (2026-10-09): its 3
//     interrupted casts and 2 AoE (both Freezes) match. Not built:
//     Paradox overwrites, missing Despair and a weakened Fire III (gauge
//     and MP, which the log doesn't carry).
//   - SMN Searing Light with one Searing Flash (SearingLight.tsx).
//   - Cooldowns for all three in tracked-cooldowns.ts.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { aoeComboOnOneTarget, burstWindowFindings, dotFindings, k, statusWindows, type ExpectedAction } from "./shared";

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

// High Thunder costs a GCD (a Thunderhead proc makes it instant), so an
// early refresh loses ticks to nothing; it brings the next High Thunder
// closer, in place of a Fire IV. Valued like the healer DoTs
// (shared.ts dotApplicationFindings). Seconds of ticks overwritten, the
// old basis, read 0.66M on 2T1HzdPKgbhM43am fight 10. It's instant: one
// pressed to move loses less than the basis says, which it states.
const highThunder: JobCheck = (ctx) => dotFindings(ctx, {
  statusIds: [S.HIGH_THUNDER.id, S.HIGH_THUNDER_II.id], name: S.HIGH_THUNDER.name, durationMs: S.HIGH_THUNDER.duration ?? 30_000,
  fillerId: () => ({ id: A.FIRE_IV.id, name: A.FIRE_IV.name }),
});

// AoE spells on too few targets, each against the single-target spell
// sharing its resource. Freeze needs 3 to beat Blizzard IV; the fight 10
// Black Mage's two Freezes on the two P3 bosses (7:55, 8:15) are
// xivanalysis's 2.
const blmAoe = aoeComboOnOneTarget([
  [A.FOUL.id, A.XENOGLOSSY.id], [A.FLARE.id, A.FIRE_IV.id], [A.FREEZE.id, A.BLIZZARD_IV.id, 3],
]);

const searingLight: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.SEARING_LIGHT.id, name: "Searing Light", bonus: "observed",
  bonusBasis: "Searing Flash's average × the window's measured bonus (not yet checked against a log)",
  expected: () => [{ ids: ids("SEARING_FLASH"), count: 1, name: "Searing Flash" }],
});

// ── Red Mage ───────────────────────────────────────────────────────────
// Checked against xivanalysis on jN3XDrf2z8PmLgRJ Vamp pull 8 (its
// deaths, 17 cancelled casts, out-of-order combo and expired Verfire were
// already found). Each value is an estimate, so marked inference:
// - Mana Stacks: the enchanted combo's last hit (Redoublement, Moulinet
//   Trois) leaves 3 stacks for Verflare / Verholy → Scorch → Resolution. Any
//   other GCD next drops them and the whole finisher chain: the three's
//   averages minus three average GCDs. (Grand Impact at 5:04 on the kill.)
// - Dualcast spent on an instant GCD (enchanted melee, Grand Impact): the
//   free hardcast is gone, worth a Verthunder / Veraero III over a Jolt III.
// - Verfire / Verstone Ready refreshed by a cast while held: one proc lost,
//   a Verfire over the Jolt III cast instead (its 5 mana not valued).
//   Matches xivanalysis's 4 + 5; the opener's two (Verthunder III under
//   Swiftcast and Acceleration) and finisher refreshes count too.
const FINISHERS = ids("VERFLARE", "VERHOLY");
const BASE_CAST_MS = new Map(Object.values(A).map((a) => [a.id, a.castTime ?? 0]));
const COMBO_ENDS = ids("ENCHANTED_REDOUBLEMENT", "ENCHANTED_MOULINET_TROIS");

const manaStacks: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const ends = new Set(COMBO_ENDS), fin = new Set(FINISHERS);
  const chain = best(ctx, FINISHERS) + ctx.values.perUse(A.SCORCH.id) + ctx.values.perUse(A.RESOLUTION.id);
  ctx.uses.forEach((u, i) => {
    const next = ctx.uses[i + 1];
    if (!ends.has(u.action.id) || !next || next.startMs >= ctx.endMs || fin.has(next.action.id)) return;
    if (ctx.dead.some((d) => d.startMs >= u.startMs && d.startMs <= next.startMs)) return;
    const plain = 3 * ctx.values.gcdValue(ctx.phaseOf(next.startMs), false);
    out.push(finding(ctx, {
      kind: "combo-broken", startMs: next.startMs, endMs: next.startMs, forced: false, inference: true,
      label: "Mana Stacks dropped",
      lostDamage: Math.max(0, chain - plain),
      basis: `${k(chain)} for Verflare / Verholy + Scorch + Resolution (averages) − ${k(plain)} for three average GCDs`,
      detail: `${next.abilityName} after ${u.abilityName} dropped the Mana Stacks and the finisher chain`,
    }));
  });
  return out;
};

const dualcastWasted: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const value = Math.max(0, best(ctx, ids("VERTHUNDER_III", "VERAERO_III")) - ctx.values.perUse(A.JOLT_III.id));
  for (const e of ctx.player.buffs ?? []) {
    if (e.abilityId !== S.DUALCAST.id || e.buffStatus !== "removed" || e.timestamp >= ctx.endMs) continue;
    const used = ctx.uses.find((u) => Math.abs(u.startMs - e.timestamp) <= 100);
    // A spell with a base cast time is what Dualcast is for.
    if (!used || (BASE_CAST_MS.get(used.action.id) ?? 0) > 0) continue;
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: false, inference: true,
      label: `Dualcast spent on ${used.abilityName}`,
      lostDamage: value,
      basis: `a free Verthunder / Veraero III (${k(best(ctx, ids("VERTHUNDER_III", "VERAERO_III")))}) over a Jolt III (${k(ctx.values.perUse(A.JOLT_III.id))})`,
      detail: `${used.abilityName} used up Dualcast; it's instant anyway`,
    }));
  }
  return out;
};

const verprocOverwrites: JobCheck = (ctx): DamageFinding[] => {
  const out: DamageFinding[] = [];
  const procs = new Map([[S.VERFIRE_READY.id, A.VERFIRE.id], [S.VERSTONE_READY.id, A.VERSTONE.id]]);
  for (const e of ctx.player.buffs ?? []) {
    const spell = procs.get(e.abilityId);
    if (spell === undefined || e.buffStatus !== "refreshed" || e.source !== ctx.player.name || e.timestamp >= ctx.endMs) continue;
    const cast = ctx.player.casts.find((c) => Math.abs(c.timestamp - e.timestamp) <= 100);
    if (!cast) continue;
    const value = Math.max(0, ctx.values.perUse(spell) - ctx.values.perUse(A.JOLT_III.id));
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: false, inference: true,
      label: `${e.abilityName} overwritten`,
      lostDamage: value,
      basis: `a ${A[spell === A.VERFIRE.id ? "VERFIRE" : "VERSTONE"].name} (${k(ctx.values.perUse(spell))}) over the Jolt III cast instead ` +
        `(${k(ctx.values.perUse(A.JOLT_III.id))}); its 5 mana isn't valued`,
      detail: `${cast.abilityName} gave ${e.abilityName} while one was still held`,
    }));
  }
  return out;
};

export const PCT_CHECKS: JobCheck[] = [starryMuse, starryFillers];
export const BLM_CHECKS: JobCheck[] = [highThunder, blmAoe];
export const SMN_CHECKS: JobCheck[] = [searingLight];
export const RDM_CHECKS: JobCheck[] = [manaStacks, dualcastWasted, verprocOverwrites];
