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
//   - Palette gauge and Monochrome Tones overwrites (below).
//   - Checked against xivanalysis on dDar482XvFKBPJYh FRU kill (7.1,
//     2026-10-12): its 11 missing Starry Muse actions, 1 Additive in
//     Starry Muse, 1 Subtractive Palette lost to overcap and 1 Monochrome
//     Tones overwrite all match. Its Living Muse 30/31 fits only with
//     perfect play (under one recast of unforced hold, and muses wait on
//     motifs); Starry Muse 9/10 was ready just before P4's downtime and
//     held for the 14:13 burst; its Swiftcast "9/24" is utility, not damage.
//   - Checked against xivanalysis on qjCMx4bRfgNKwX9T Dancing Mad kill
//     (7.5, 2026-10-13): its 15 missing Starry Muse actions are the
//     Hammers of 6:03, 12:04, 14:04 and 16:07 plus 14:04's Comet; all but
//     16:07 run into downtime or past an HP check (forced here). At 16:07
//     the three Hammers went 16:00-16:05, with Hammer Time good to 16:20.
//     Its 1 Additive (Holy in White, 6:03) was counted unforced until
//     then. Cooldowns, 3 interrupted casts match; Swiftcast 12/23 is
//     utility.
//   - Checked against xivanalysis on K6qfMamL7rN8yz2Q Vamp Fatale (7.4,
//     2026-10-14). Matched: 3 interrupted casts (1:59, 7:07, 8:39's
//     Chromatic Fantasy), the 2:28 and 7:03 weaving gaps, its small delays
//     by time. Overstated: the 8:09 Starry Muse's Hammer 1/3 (Hammer
//     Brush cast at 8:30.12, the instant Starry Muse ended, carries it in
//     its hit; the 1.30 → 1.24 drop is Technical Finish ending; ours 2/3).
//     Ours adds three hits for 0 on a Charnel Cell at 7:12-7:21 (Polishing
//     Hammer, Water in Blue, Holy in White; others damaged cells then).
//     Living Muse 14/16 is one charge unused from 8:17.9 to the kill (24s;
//     the other came back 0.4s before it): a cooldown-drift finding since
//     2026-10-15 (checks.ts usesLostAtKill, 151k).
//     Built: the Palette and Paint lanes (jobs/gauges.ts); gauge from
//     Water in Blue now comes with the cast, not its hit (gaugeCastTimes).
//     Not adopted: Swiftcast 6/11, Lucid, Tempera Coat, Addle.
//     Rechecked on the same report's Red Hot and Deep Blue kill (Pull 2,
//     2026-10-14). Matched: GCD uptime (94.2% / 94.3%), its GCD downtimes
//     by time (4:56, 7:16, 7:20 are Hot Aerial / Freaky Pyrotation
//     movement here; 8:18 Smudge + Sprint 2.3s, 69k; 8:30 the interrupted
//     Stone in Yellow, 2.5s), the 7:41 weave, the first four Starry Muse
//     windows full. Built, all from the 8:39.8 Starry Muse the kill cut at
//     11.6s (it was skipped whole): its Hammers ×3 (Striking Muse 8:25,
//     every Hammer at 8:32-8:38 with Hammer Time good to 8:55; 107k;
//     ExpectedAction.readyAgain = the next Striking Muse); the Additive
//     spells in it (Water II in Blue 8:46.5, Holy in White 8:47.8; 123k,
//     upper bound, and with the Hammers it claims 5 GCD slots where 4
//     followed Star Prism); AoE paint spells under 3 targets (that Water
//     II in Starry Muse out-did the average Water in Blue, so not flagged).
//     The same Hammers-before-the-last-window habit: vVPtwaTQ62Jg391q Red
//     Hot and Deep Blue 8:37 (71k). Not adopted: its Rainbow Drip, Comet
//     and Mog missing at 8:39 (still to come at the kill); Living Muse 15/16
//     (never at three charges; 1s held).
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
//     Checked against xivanalysis on qjCMx4bRfgNKwX9T fight 16 (7.5,
//     2026-10-13, the first Summoner sample): Searing Flash 10/10, every
//     cooldown 100%, nothing to build. Its Summons table's short
//     attunements are all forced: 2:44 (the fourth Emerald Rite cut by
//     the 2:56 downtime), 3:01 (past P1's HP check), 6:03 (P2's downtime),
//     14:11 (past P4's HP check), 18:19 (the kill). Its one triple weave
//     (16:11, 0.36s) is under the phase's 0.5s floor.
//   - Cooldowns for all three in tracked-cooldowns.ts.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows } from "../../timeline";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, dotFindings, gaugeFindings, k, statusWindows, gaugeCastTimes, type ExpectedAction, type GaugeEvent, type GaugeSpec } from "./shared";

const ids = (...keys: string[]) => keys.filter((key) => A[key]).map((key) => A[key].id);
const best = (ctx: PlayerCheckContext, list: number[]) => Math.max(0, ...list.map((x) => ctx.values.perUse(x)));

const HAMMERS = ids("HAMMER_STAMP", "HAMMER_BRUSH", "POLISHING_HAMMER");
const SUBTRACTIVE = ids("BLIZZARD_IN_CYAN", "STONE_IN_YELLOW", "THUNDER_IN_MAGENTA");
const ADDITIVE = ids("FIRE_IN_RED", "AERO_IN_GREEN", "WATER_IN_BLUE", "FIRE_II_IN_RED", "AERO_II_IN_GREEN", "WATER_II_IN_BLUE", "HOLY_IN_WHITE");

// Patch-specific (lib/damage/ffxiv/patches.ts), from xivanalysis
// StarryMuse.tsx: in 7.2 only, a window could trade Hammers for extra
// Subtractive spells and Comets ("6Sub"), so skipped Hammers are allowed
// as long as the earlier ones are the ones skipped, a fourth Subtractive
// is expected when the Comets didn't make up for them, and an Additive
// spell isn't an error. 7.1 and 7.3+ expect all three Hammers. In every
// patch: a creature motif painted in the window pushes two Subtractive
// spells and Rainbow Drip out of it, and a Comet carried in (two in the
// window) pushes one Subtractive out.
const CREATURE_MOTIFS = ids("POM_MOTIF", "WING_MOTIF", "CLAW_MOTIF", "MAW_MOTIF");
const starryMuse: JobCheck = (ctx) => burstWindowFindings(ctx, {
  statusId: S.STARRY_MUSE.id, name: "Starry Muse", bonus: "observed",
  bonusBasis: "each missing action × its average × the window's measured bonus (multiplier inside vs outside raid buffs)" +
    (ctx.patch ? `; patch ${ctx.patch} rules` : ""),
  expected: (_c, casts): ExpectedAction[] => {
    const used = (list: number[]) => casts.filter((c) => list.includes(c.abilityId)).length;
    const motifs = used(CREATURE_MOTIFS);
    const comets = used(ids("COMET_IN_BLACK"));
    const hammersUsed = used(HAMMERS);
    let hammers = 3, subtractive = 3;
    if (ctx.patch === "7.2") {
      if (used(ids("HAMMER_STAMP")) === 0) {
        hammers--;
        if (used(ids("HAMMER_BRUSH")) === 0) { hammers--; if (used(ids("POLISHING_HAMMER")) === 0) hammers--; }
      }
      if ((hammersUsed === 2 && comets < 2) || (hammersUsed < 2 && comets < 3)) subtractive++;
    }
    if (ctx.patch !== "7.2" || hammersUsed > 2) {
      if (motifs > 0) subtractive -= 2;
      if (comets > 1) subtractive--;
    }
    return [
      // A spent Hammer Time stack comes back only with the next Striking
      // Muse (for a window the kill cut short: K6qfMamL7rN8yz2Q Red Hot and
      // Deep Blue, all three Hammers at 8:32-8:38, Starry Muse at 8:39.8,
      // Hammer Time good to 8:55).
      { ids: HAMMERS, count: hammers, name: "Hammer GCD",
        readyAgain: (c, t) => c.player.casts.find((x) => x.abilityId === A.STRIKING_MUSE.id && x.timestamp > t)?.timestamp ?? Infinity },
      { ids: ids("STAR_PRISM"), count: 1, name: "Star Prism" },
      { ids: ids("RAINBOW_DRIP"), count: motifs > 0 ? 0 : 1, name: "Rainbow Drip" },
      { ids: ids("COMET_IN_BLACK"), count: Math.max(1, comets), name: "Comet in Black" },
      { ids: SUBTRACTIVE, count: Math.max(0, subtractive), name: "Subtractive spell" },
      { ids: ids("POM_MUSE", "WINGED_MUSE", "CLAWED_MUSE", "FANGED_MUSE"), count: 1, name: "Living Muse" },
      { ids: ids("MOG_OF_THE_AGES", "RETRIBUTION_OF_THE_MADEEN"), count: 1, name: "Mog of the Ages / Madeen" },
    ];
  },
});

// Additive spells landing inside Starry Muse (xivanalysis expects none,
// except in 7.2). Judged by when the spell lands, which is when Starry
// Muse's bonus applies: a Water in Blue started inside the 6:11 window on
// dDar482XvFKBPJYh's FRU kill landed 0.5s after it ended (xivanalysis's 1
// Additive was the 16:30 Holy in White alone).
const starryFillers: JobCheck = (ctx): DamageFinding[] => {
  if (ctx.patch === "7.2") return [];
  const additive = new Set(ADDITIVE);
  const sub = best(ctx, SUBTRACTIVE);
  const out: DamageFinding[] = [];
  for (const win of statusWindows(ctx, S.STARRY_MUSE.id)) {
    // A window the kill cut short counts up to the kill: an Additive cast
    // in it was a choice (K6qfMamL7rN8yz2Q Red Hot and Deep Blue, Water II
    // in Blue 8:46.5 and Holy in White 8:47.8 in the 8:39.8 window).
    const w = { startMs: win.startMs, endMs: Math.min(win.endMs, ctx.endMs) };
    if (w.startMs >= w.endMs) continue;
    const used = ctx.uses.filter((u) => u.startMs + u.castMs >= w.startMs && u.startMs + u.castMs <= w.endMs + 100 && additive.has(u.action.id));
    if (used.length === 0) continue;
    // As burstWindowFindings judges the window itself: the 6:03 window on
    // qjCMx4bRfgNKwX9T's kill, past P2's check, counted its Holy in White.
    const during = forcedPart(w.startMs, w.endMs, ctx.forced);
    out.push(finding(ctx, {
      kind: "burst-window", startMs: w.startMs, endMs: w.endMs, inference: true,
      forced: during.ms >= 1_500, cause: during.ms >= 1_500 ? during.cause : undefined,
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

// Palette gauge (cap 100), from xivanalysis pct/modules/Gauge.tsx: +25 per
// Water in Blue / Water II in Blue that hits; Subtractive Palette spends 50
// unless Subtractive Spectrum (Starry Muse's free one) is up. 50 gauge is
// one Subtractive Palette: three Subtractive spells over three Additive
// ones, plus the Comet in Black over the Holy in White its Monochrome Tones
// turns into one (the player's averages).
// Monochrome Tones overwritten (Gauge.tsx "overtones"): a Subtractive
// Palette while it's still up loses a Comet in Black, worth a Comet over a
// Holy in White.
const ADDITIVE_ST = ids("FIRE_IN_RED", "AERO_IN_GREEN", "WATER_IN_BLUE");
// Averages outside raid buffs: Subtractive spells and Comets mostly land
// in Starry Muse, Additive ones and Holy outside it, so the plain averages
// put the burst's bonus into the difference (182k for one Subtractive
// Palette on dDar482XvFKBPJYh's FRU kill).
const avgOf = (ctx: PlayerCheckContext, list: number[]) => {
  const vals = list.map((x) => {
    const hits = castHits(ctx, x).filter((h) => !inWindows(h.timestamp, ctx.buffWindows));
    return hits.length ? hits.reduce((a, h) => a + (h.amount ?? 0), 0) / hits.length : 0;
  }).filter((v) => v > 0);
  return vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : 0;
};
// The timeline draws the same simulation (jobs/gauges.ts, gaugeTrack).
export function paletteSpec(ctx: PlayerCheckContext): GaugeSpec | undefined {
  const sp = A.SUBTRACTIVE_PALETTE.id;
  const spCasts = ctx.player.casts.filter((c) => c.abilityId === sp);
  if (spCasts.length === 0) return undefined;
  const spectrum = statusWindows(ctx, S.SUBTRACTIVE_SPECTRUM.id);
  const events: GaugeEvent[] = [];
  for (const id of ids("WATER_IN_BLUE", "WATER_II_IN_BLUE")) {
    for (const t of gaugeCastTimes(ctx, id)) events.push({ t, type: "gain", amount: 25, label: `${A.WATER_IN_BLUE.id === id ? "Water in Blue" : "Water II in Blue"} at full Palette` });
  }
  for (const c of spCasts) {
    if (!spectrum.some((w) => c.timestamp >= w.startMs && c.timestamp <= w.endMs + 200)) {
      events.push({ t: c.timestamp, type: "spend", amount: 50, label: "Subtractive Palette" });
    }
  }
  for (const d of ctx.dead) events.push({ t: d.startMs, type: "reset", label: "death" });
  const comet = avgOf(ctx, [A.COMET_IN_BLACK.id]), holy = avgOf(ctx, [A.HOLY_IN_WHITE.id]);
  const cometGain = Math.max(0, comet - holy);
  const perPalette = 3 * Math.max(0, avgOf(ctx, SUBTRACTIVE) - avgOf(ctx, ADDITIVE_ST)) + cometGain;
  return {
    name: "Palette", unit: "Palette gauge", cap: 100, unitValue: perPalette / 50,
    valueBasis: `(3 × (Subtractive − Additive) + Comet − Holy, averages outside raid buffs = ${k(perPalette)}) per 50`,
    events,
  };
}

const palette: JobCheck = (ctx): DamageFinding[] => {
  const spec = paletteSpec(ctx);
  if (!spec) return [];
  const spCasts = ctx.player.casts.filter((c) => c.abilityId === A.SUBTRACTIVE_PALETTE.id);
  const comet = avgOf(ctx, [A.COMET_IN_BLACK.id]), holy = avgOf(ctx, [A.HOLY_IN_WHITE.id]);
  const cometGain = Math.max(0, comet - holy);
  const out = gaugeFindings(ctx, spec);
  const tones = statusWindows(ctx, S.MONOCHROME_TONES.id);
  for (const c of spCasts) {
    if (c.timestamp >= ctx.endMs || !tones.some((w) => w.startMs < c.timestamp - 50 && w.endMs >= c.timestamp)) continue;
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: c.timestamp, endMs: c.timestamp, forced: false, inference: true,
      label: "Monochrome Tones overwritten",
      lostDamage: cometGain,
      basis: `${k(comet)} average Comet in Black − ${k(holy)} average Holy in White, outside raid buffs`,
      detail: "Subtractive Palette while Monochrome Tones was still up: a Comet in Black lost",
    }));
  }
  return out;
};

// AoE paint spells under three targets, each against its single-target
// spell (xivanalysis AoEUsages.ts). K6qfMamL7rN8yz2Q Red Hot and Deep
// Blue: Water II in Blue at 8:46.5 on Deep Blue alone.
const pctAoe = aoeComboOnOneTarget(([
  ["FIRE_II_IN_RED", "FIRE_IN_RED"], ["AERO_II_IN_GREEN", "AERO_IN_GREEN"], ["WATER_II_IN_BLUE", "WATER_IN_BLUE"],
  ["BLIZZARD_II_IN_CYAN", "BLIZZARD_IN_CYAN"], ["STONE_II_IN_YELLOW", "STONE_IN_YELLOW"], ["THUNDER_II_IN_MAGENTA", "THUNDER_IN_MAGENTA"],
] as const).filter(([a, b]) => A[a] && A[b]).map(([a, b]) => [A[a].id, A[b].id, 3] as [number, number, number]));

export const PCT_CHECKS: JobCheck[] = [starryMuse, starryFillers, palette, pctAoe];
export const BLM_CHECKS: JobCheck[] = [highThunder, blmAoe];
export const SMN_CHECKS: JobCheck[] = [searingLight];
export const RDM_CHECKS: JobCheck[] = [manaStacks, dualcastWasted, verprocOverwrites];
