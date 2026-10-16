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
//     and Mog missing at 8:39 (still to come at the kill). Living Muse
//     15/16 (never at three charges; 1s held) is a lost use under the kill
//     rule since 2026-10-15 (a charge back and unused before the kill;
//     172k).
//     Rechecked on the same report's The Tyrant kill (Pull 2, 2026-10-15),
//     nothing to build. Matched: cooldowns 100% (no kill-rule finding
//     either), all six Starry Muse windows complete, the 5 interrupted
//     casts, the 9:35 weave (0.2s) and its GCD downtimes by time (7:02,
//     7:44 are the Flatliner towers; 8:31.8's 1.6s in Starry Muse is his,
//     113k: the other ranged kept casting). App-only and holding: 25
//     Palette over the cap at 1:55 (85k), the tincture 5:56 → 10:08 (24k).
//     No damage: Swiftcast, Lucid Dreaming, Tempera Coat, Addle.
//   - On dQ8wmb1VhKt6yBXk every Starry Muse window holds only one Hammer
//     (the PCT starts Hammer Time at the window's end, after a second
//     Subtractive round). Consistent across pulls, so likely a chosen
//     line; confirm with the player before treating it as a loss.
// Red Mage: see its section below.
// Black Mage, Summoner:
//   - BLM High Thunder / High Thunder II uptime and clipping (DoTs.tsx),
//     AoE on too few targets. Checked against xivanalysis on
//     2T1HzdPKgbhM43am Dancing Mad fight 10 (2026-10-09): its 3
//     interrupted casts and 2 AoE (both Freezes) match. Not built:
//     Paradox overwrites, missing Despair and a weakened Fire III (gauge
//     and MP, which the log doesn't carry).
//     High Fire II, High Blizzard II (under 3) and High Thunder II (one
//     target) added 2026-10-15 from AoEUsages.ts. Seen firing on Red Hot
//     and Deep Blue kills, not matched against xivanalysis: High Blizzard
//     II on both bosses deals ~9.5k a target to Blizzard III's ~45k
//     (7yXZbmqcrCga8PHz 5:29, 9:22, 9:50; djChYqt4b7K8aAfP 7:40;
//     q4mQCNpRKwH1PZjb 9:04; 17-26k each), and on Watery Grave alone
//     (xtcaT8y9CGjpPnHK 5:40, 21k); High Fire II on both at
//     7yXZbmqcrCga8PHz 9:27 (65k); High Thunder II on one boss with the two
//     apart, q4mQCNpRKwH1PZjb 6:53, 7:44, 9:18 (4-8k, direct hit only).
//     Polyglot overcap (Gauge.tsx, 2026-10-15): `polyglot` below, a gauge
//     simulation from casts; hand-checked on xz1wjC6gfXmkMKYt 2:30.
//     Matched xivanalysis on five pages; the one disagreement
//     (r4qDkR9btJCXnKWd Doomtrain pull 6, 4:12) was the app's: Fire I in
//     Umbral Ice drops Enochian, fixed 2026-10-15.
//     Ley Lines casts outside Circle of Power (Leylines.tsx, 2026-10-15):
//     `leyLines` below. Matched xivanalysis's Ley Lines table on all five
//     pages (xz1wjC6gfXmkMKYt 6:36 1 of 9; 7zwpcLxk2Fd1h6Vr 4:00 1 of 9,
//     8:53 2 of 8; r4qDkR9btJCXnKWd Doomtrain pull 6 1:03 1 of 9;
//     Q18Xc93x4wpfMFdT and Y9Fh2BHyj3xAqZ6V Zelenia pull 3 none).
//     Fire I and Umbral Soul in uptime (RotationWatchdog, 2026-10-15):
//     `blmWrongGcds` below. Fire I matched the five pages (one, on
//     r4qDkR9btJCXnKWd pull 6). Not adopted: Triplecast pressed over a
//     stack (a lost instant costs damage only if movement later needed it).
//   - SMN Searing Light with one Searing Flash (SearingLight.tsx).
//     Checked against xivanalysis on qjCMx4bRfgNKwX9T fight 16 (7.5,
//     2026-10-13, the first Summoner sample): Searing Flash 10/10, every
//     cooldown 100%, nothing to build. Its Summons table's short
//     attunements are all forced: 2:44 (the fourth Emerald Rite cut by
//     the 2:56 downtime), 3:01 (past P1's HP check), 6:03 (P2's downtime),
//     14:11 (past P4's HP check), 18:19 (the kill). Its one triple weave
//     (16:11, 0.36s) is under the phase's 0.5s floor.
//   - SMN AoE on too few targets (MultiHitSkills.ts, 2026-10-15):
//     `smnAoe`. Seen firing on Red Hot and Deep Blue kills, not matched
//     against xivanalysis: RaM97t3whCZrJBPm Tri-disaster 6:34 and Topaz
//     Catastrophe 9:01 on one boss (25k, 28k), Emerald Catastrophe
//     3:48-5:33, Umbral Flare 6:41-8:54 and Painflare 8:54 on both (8-30k
//     each: two targets still lose to the single-target spell);
//     fGjA9DKLQbRa2q1k Astral Flare on both 6:38, 6:41 (12-27k). Not seen:
//     Energy Siphon, Brand of Purgatory, Ruby Catastrophe.
//   - Cooldowns for all three in tracked-cooldowns.ts.
//
//   Copyright (c) 2018 Saxon Landers & contributors
//   MIT License; full text in THIRD_PARTY_NOTICES.md.

import { XIVA_ACTIONS as A, XIVA_STATUSES as S } from "../xiva-data";
import type { DamageFinding, JobCheck } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows } from "../../timeline";
import { aoeComboOnOneTarget, burstWindowFindings, castHits, clock, dotFindings, gaugeFindings, k, statusWindows, gaugeCastTimes, type ExpectedAction, type GaugeEvent, type GaugeSpec } from "./shared";

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
  [A.HIGH_FIRE_II.id, [A.FIRE_III.id, A.FIRE_IV.id], 3], [A.HIGH_BLIZZARD_II.id, A.BLIZZARD_III.id, 3],
  // Direct hits only on both sides: High Thunder's average leaves its DoT
  // out too.
  [A.HIGH_THUNDER_II.id, A.HIGH_THUNDER.id],
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
// Not built (from docs/open-items.md 2026-10-15): White Mana overcap
// (xivanalysis: 3 mana on that pull). The cooldown drift check counts
// fewer lost Fleche / Contre Sixte / Corps-a-corps uses than xivanalysis's
// x/y, by method: it counts whole lost uses, with dead time forced.
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
// Polyglot (xivanalysis Gauge.tsx), simulated from casts: Enochian (Astral
// Fire / Umbral Ice) adds one every 30s from the first fire or ice spell,
// Amplifier one more, Xenoglossy and Foul spend one; cap 3. A death empties
// the gauge and stops the timer until the next fire or ice spell. From 7.2
// Astral Fire / Umbral Ice never time out, so Enochian drops only on a
// death, or when Fire I is cast in Umbral Ice (or Blizzard I in Astral
// Fire): it removes the element without granting the other, so the timer
// stops (the Polyglots held stay) until the next fire or ice spell
// restarts it from zero. r4qDkR9btJCXnKWd Doomtrain pull 6 (Laura Razzy):
// Fire I in Umbral Ice at 1:00.2, half a second before a tick; missing it
// put every later tick a Polyglot high and read the 4:12 Amplifier as an
// overcap that xivanalysis ("dropped 1 time") rightly didn't count.
// Earlier logs, where the element could time out, aren't judged. A
// Polyglot gained at the cap, or still held at a kill, is a Xenoglossy
// over the GCD it would have replaced.
const POLYGLOT_MS = 30_000;
const POLYGLOT_CAP = 3;
const FIRE_ELEMENT_IDS = new Set(ids("FIRE_II", "FIRE_III", "FIRE_IV", "HIGH_FIRE_II", "FLARE", "DESPAIR", "FLARE_STAR", "MANAFONT"));
const ICE_ELEMENT_IDS = new Set(ids("BLIZZARD_II", "BLIZZARD_III", "BLIZZARD_IV", "HIGH_BLIZZARD_II", "FREEZE", "UMBRAL_SOUL"));
const POLYGLOT_SPEND = new Set(ids("XENOGLOSSY", "FOUL"));
type Element = "fire" | "ice" | undefined;
const nextElement = (element: Element, abilityId: number): Element => {
  if (FIRE_ELEMENT_IDS.has(abilityId)) return "fire";
  if (ICE_ELEMENT_IDS.has(abilityId)) return "ice";
  if (abilityId === A.FIRE_I.id) return element === "ice" ? undefined : "fire";
  if (abilityId === A.BLIZZARD_I.id) return element === "fire" ? undefined : "ice";
  if (abilityId === A.TRANSPOSE.id && element) return element === "fire" ? "ice" : "fire";
  return element;
};
const PRE_72 = ["7.0", "7.01", "7.05", "7.1"];
const polyglot: JobCheck = (ctx) => {
  if (ctx.patch && PRE_72.includes(ctx.patch)) return [];
  const casts = ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const deaths = [...ctx.dead].sort((a, b) => a.startMs - b.startMs);
  const events: GaugeEvent[] = [];
  let since: number | undefined;
  let element: Element;
  let d = 0;
  const tickTo = (t: number) => {
    if (since === undefined) return;
    while (since + POLYGLOT_MS <= t) {
      since += POLYGLOT_MS;
      events.push({ t: since, type: "gain", amount: 1, label: "Enochian's 30s at 3 Polyglot" });
    }
  };
  const diesBy = (t: number) => {
    while (d < deaths.length && deaths[d].startMs <= t) {
      tickTo(deaths[d].startMs);
      events.push({ t: deaths[d].startMs, type: "reset", label: "death" });
      since = undefined;
      element = undefined;
      d++;
    }
  };
  for (const c of casts) {
    diesBy(c.timestamp);
    tickTo(c.timestamp);
    const before = element;
    element = nextElement(element, c.abilityId);
    if (before && !element) since = undefined;
    else if (element && since === undefined) since = c.timestamp;
    if (c.abilityId === A.AMPLIFIER.id) events.push({ t: c.timestamp, type: "gain", amount: 1, label: "Amplifier at 3 Polyglot" });
    if (POLYGLOT_SPEND.has(c.abilityId)) events.push({ t: c.timestamp, type: "spend", amount: 1, label: c.abilityName });
  }
  diesBy(ctx.endMs);
  tickTo(ctx.endMs);
  const xeno = ctx.values.perUse(A.XENOGLOSSY.id) || ctx.values.perUse(A.FOUL.id);
  const unit = Math.max(0, xeno - ctx.values.gcdValue(undefined, false));
  if (unit <= 0) return [];
  const basis = `${k(xeno)} average Xenoglossy − ${k(ctx.values.gcdValue(undefined, false))} average GCD it would have replaced`;
  return gaugeFindings(ctx, {
    name: "Polyglot", unit: "Polyglot", cap: POLYGLOT_CAP, unitValue: unit, valueBasis: basis, events,
    leftAtKill: { unitValue: unit, valueBasis: basis },
  });
};

// Ley Lines left (xivanalysis Leylines.tsx, 7.2+ "casts affected by Circle
// of Power"): a GCD begun or finished while Ley Lines is up, with Circle of
// Power off at both ends, missed its 15% cast and recast speed. One finding
// per Ley Lines; each such GCD is worth 15% of an average GCD (the time it
// lost, at the end of the pull, buys that share of one more). GCDs in a
// mechanic's movement or forced time are shown, not counted.
// r4qDkR9btJCXnKWd Doomtrain pull 6 (Laura Razzy): the 1:03 Ley Lines,
// Paradox at 1:22.6 outside it (xivanalysis 8/9).
const LEY_LINES_SPEED = 0.15;
const leyLines: JobCheck = (ctx) => {
  const lines = statusWindows(ctx, S.LEY_LINES.id);
  const circle = statusWindows(ctx, S.CIRCLE_OF_POWER.id);
  const excused = [...ctx.forced, ...(ctx.movement ?? [])];
  const out: DamageFinding[] = [];
  for (const w of lines) {
    const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs && (inWindows(u.startMs, [w]) || inWindows(u.startMs + u.castMs, [w])));
    const outside = uses.filter((u) => !inWindows(u.startMs, circle) && !inWindows(u.startMs + u.castMs, circle));
    if (outside.length === 0) continue;
    const counted = outside.filter((u) => !inWindows(u.startMs, excused));
    const lost = counted.reduce((sum, u) => sum + LEY_LINES_SPEED * ctx.values.gcdValue(ctx.phaseOf(u.startMs), inWindows(u.startMs, ctx.buffWindows)), 0);
    const names = outside.map((u) => `${u.abilityName} ${clock(u.startMs)}`).join(", ");
    const last = outside[outside.length - 1];
    out.push(finding(ctx, {
      kind: "buff-uptime", startMs: outside[0].startMs, endMs: last.startMs + Math.max(last.castMs, 1),
      forced: counted.length === 0,
      movement: (counted.length === 0 && outside.some((u) => inWindows(u.startMs, ctx.movement ?? []))) || undefined,
      label: "Circle of Power left during Ley Lines",
      lostDamage: lost,
      basis: `${counted.length} GCD${counted.length === 1 ? "" : "s"} × 15% (Circle of Power's speed) × the average GCD` +
        (counted.length < outside.length ? `; ${outside.length - counted.length} in forced or movement time not counted` : ""),
      detail: `${outside.length} of ${uses.length} GCDs in Ley Lines (${clock(w.startMs)}) outside Circle of Power: ${names}`,
    }));
  }
  return out;
};

// Wasted GCDs (xivanalysis RotationWatchdog ExtraF1Evaluator,
// UptimeSoulsEvaluator):
// - Fire I: every one is wrong in Dawntrail. In Astral Fire it spends a
//   Fire IV's MP for less, so it's worth her average Fire IV less her
//   average Fire I (the Astral Soul it didn't give, which can cost a Flare
//   Star, isn't valued: that needs MP). In Umbral Ice it removes the
//   element (see Polyglot above): worth an average GCD less the Fire I.
//   wNHvD38WTbFtGJKr Zelenia pull 10 (Nez Oomoom) 2:10.3, in the middle
//   of the fire phase's Fire IVs.
// - Umbral Soul while the boss is targetable: a GCD with no damage, worth
//   an average GCD. Downtime is forced time, where it's the right press.
//   r4qDkR9btJCXnKWd Doomtrain: Laura Razzy's 2:10-2:12 Umbral Souls
//   (pulls 10, 12, 15, 19) come 2-3s after the boss is back at 2:08.5,
//   with High Thunder or Paradox pressed right after; pull 15 2:47.9 is
//   after a High Thunder on Aether at 2:45.5.
// In a mechanic's movement or forced time both are shown, not counted.
const blmWrongGcds: JobCheck = (ctx) => {
  const out: DamageFinding[] = [];
  const casts = ctx.player.casts.filter((c) => c.timestamp >= 0 && c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const fire1 = ctx.values.perUse(A.FIRE_I.id);
  const fire4 = ctx.values.perUse(A.FIRE_IV.id);
  let element: Element;
  for (const c of casts) {
    if (inWindows(c.timestamp, ctx.dead)) element = undefined;
    const before = element;
    element = nextElement(element, c.abilityId);
    const isFire1 = c.abilityId === A.FIRE_I.id;
    if (!isFire1 && c.abilityId !== A.UMBRAL_SOUL.id) continue;
    // An Umbral Soul whose GCD runs into downtime is excused too: no cast
    // would have landed (djChYqt4b7K8aAfP Red Hot and Deep Blue 2:42.6,
    // 0.1s before both bosses left).
    const gcdEnd = isFire1 ? c.timestamp + 1 : c.timestamp + ctx.baseGcdMs * ctx.factorAt(c.timestamp);
    const during = forcedPart(c.timestamp - 1, gcdEnd, ctx.forced);
    const moving = inWindows(c.timestamp, ctx.movement ?? []);
    if (!isFire1 && during.ms > 0) continue;
    const gcd = ctx.values.gcdValue(ctx.phaseOf(c.timestamp), inWindows(c.timestamp, ctx.buffWindows));
    const inIce = isFire1 && before === "ice";
    const alt = isFire1 && !inIce && fire4 > 0 ? fire4 : gcd;
    const lost = Math.max(0, alt - (isFire1 ? fire1 : 0));
    if (lost < 1) continue;
    out.push(finding(ctx, {
      kind: "wrong-gcd", startMs: c.timestamp, endMs: c.timestamp, forced: during.ms > 0 || moving, movement: moving || undefined,
      cause: during.ms > 0 ? during.cause : undefined,
      label: isFire1 ? "Fire I" : "Umbral Soul in uptime",
      lostDamage: lost,
      basis: isFire1
        ? `${k(alt)} average ${inIce ? "GCD" : "Fire IV"} − ${k(fire1)} average Fire I`
        : `${k(gcd)} average GCD (Umbral Soul deals no damage)`,
      detail: isFire1
        ? inIce ? "Fire I in Umbral Ice: it removed Umbral Ice and restarted the Polyglot timer (the restart isn't valued)"
          : "Fire I in place of a Fire IV"
        : "Umbral Soul while the boss was targetable",
    }));
  }
  return out;
};

export const BLM_CHECKS: JobCheck[] = [highThunder, blmAoe, polyglot, leyLines, blmWrongGcds];
// xivanalysis MultiHitSkills.ts, each at the highest minimum any patch
// uses (Tri-disaster 4 from 7.3, Painflare 4 in 7.2-7.4): the damage
// comparison lets through the patches where fewer targets win.
const smnAoe = aoeComboOnOneTarget([
  [A.TRI_DISASTER.id, A.RUIN_III.id, 4], [A.ENERGY_SIPHON.id, A.SMN_ENERGY_DRAIN.id], [A.PAINFLARE.id, A.NECROTIZE.id, 4],
  [A.ASTRAL_FLARE.id, A.ASTRAL_IMPULSE.id, 3], [A.BRAND_OF_PURGATORY.id, A.FOUNTAIN_OF_FIRE.id, 3],
  [A.UMBRAL_FLARE.id, A.UMBRAL_IMPULSE.id, 3], [A.RUBY_CATASTROPHE.id, A.RUBY_RITE.id, 3],
  [A.TOPAZ_CATASTROPHE.id, A.TOPAZ_RITE.id, 3], [A.EMERALD_CATASTROPHE.id, A.EMERALD_RITE.id, 3],
]);
export const SMN_CHECKS: JobCheck[] = [searingLight, smnAoe];
export const RDM_CHECKS: JobCheck[] = [manaStacks, dualcastWasted, verprocOverwrites];
