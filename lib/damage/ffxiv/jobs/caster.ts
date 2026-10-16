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
//     `blmWrongGcds` below. Fire I matched eight pages (one each on
//     r4qDkR9btJCXnKWd pull 6, wNHvD38WTbFtGJKr fight 11,
//     qh3VDQFy274mNPfJ fight 22). Umbral Soul: r4qDkR9btJCXnKWd fight 15
//     2 of xivanalysis's 5; its other 3 (4:49-4:55) are in a car change
//     with no party hits, which it doesn't excuse. Not adopted: Triplecast pressed over a
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
import type { DamageFinding, GaugeTrack, JobCheck } from "../../types";
import type { PlayerEvent } from "@/types/PlayerInfo";
import { finding, type PlayerCheckContext } from "../../checks";
import { forcedPart, inWindows } from "../../timeline";
import { aoeComboOnOneTarget, baseValue, burstWindowFindings, castHits, clock, critMultOf, dotFindings, gaugeFindings, gaugeTrack, k, rollGainOf, statusWindows, gaugeCastTimes, type ExpectedAction, type GaugeEvent, type GaugeSpec } from "./shared";

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
// - White / Black Mana overcap and imbalance (2026-10-15): `rdmManaCheck`
//   below. On that pull it finds none against xivanalysis's 3 White: it
//   adds mana per damage event, so AoE finishers on two targets count
//   twice there. The cooldown drift check counts
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
    // Ran out with no GCD to spend it (xivanalysis Dualcast.tsx, "lost due
    // to not casting"): the same free hardcast lost. In forced time or
    // just before a death: shown, not counted. jN3XDrf2z8PmLgRJ Red Hot
    // and Deep Blue pull 44 (Laura Razzy) matches its one.
    if (!used) {
      if (ctx.player.casts.some((c) => Math.abs(c.timestamp - e.timestamp) <= 100)) continue;
      const during = forcedPart(e.timestamp - 1, e.timestamp + 1, ctx.forced);
      const died = ctx.dead.some((d) => d.startMs >= e.timestamp - 100 && d.startMs - e.timestamp <= 2_000);
      out.push(finding(ctx, {
        kind: "proc-lost", startMs: e.timestamp, endMs: e.timestamp, forced: during.ms > 0 || died, inference: true,
        cause: during.ms > 0 ? during.cause : died ? "lost to the death that followed" : undefined,
        label: "Dualcast ran out", lostDamage: value,
        basis: `a free Verthunder / Veraero III (${k(best(ctx, ids("VERTHUNDER_III", "VERAERO_III")))}) over a Jolt III (${k(ctx.values.perUse(A.JOLT_III.id))})`,
        detail: "Dualcast ran out with no spell cast",
      }));
      continue;
    }
    // A spell with a base cast time is what Dualcast is for.
    if ((BASE_CAST_MS.get(used.action.id) ?? 0) > 0) continue;
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
//
// The whole gauge (blmGauge), after xivanalysis Gauge.tsx's 7.2+ branch,
// one pass over the casts (each applies its cast effect, then its hit
// effect, at the cast's time):
// - Astral Fire / Umbral Ice, 0-3: Fire II / High Fire II / Fire III /
//   Despair / Flare / Manafont give AF3, Blizzard II / High Blizzard II /
//   Blizzard III UI3, Fire IV / Blizzard IV / Freeze 1 from none, Umbral
//   Soul +1 UI, Transpose swaps to 1 of the other. Fire I in Umbral Ice or
//   Blizzard I in Astral Fire (and Umbral Soul in Astral Fire) end the
//   element: hearts and Astral Soul empty, the Polyglot timer stops.
// - Umbral Hearts, 0-3: Blizzard IV / Freeze fill them, Umbral Soul (in
//   Umbral Ice) and Manafont add; each Fire I / II / High Fire II / IV and
//   a hardcast Fire III spends one in Astral Fire (a Firestarter Fire III
//   doesn't), Flare all of them.
// - Astral Soul, 0-6: Fire IV +1, Flare +3; Flare Star, Umbral Ice or the
//   element ending empty it.
// - Paradox, 0-1: gained leaving Umbral Ice III with 3 hearts, leaving
//   Astral Fire III, or by Manafont; Paradox spends it. One gained while
//   held is an overwrite (paradoxFindings below).
// - Polyglot, as above.
// A death empties all of it. Before 7.2 (element timers) it isn't run.
// Shown as six lanes in the Damage dialog (gauges.ts JOB_GAUGES).
const POLYGLOT_MS = 30_000;
const POLYGLOT_CAP = 3;
const POLYGLOT_SPEND = new Set(ids("XENOGLOSSY", "FOUL"));
const PRE_72 = ["7.0", "7.01", "7.05", "7.1"];
const ELEMENT_MAX = 3, HEARTS_MAX = 3, SOUL_MAX = 6;
const idOf = (key: string) => A[key]?.id ?? -1;

export type BlmState = { af: number; ui: number; hearts: number; soul: number; paradox: number };
type BlmLane = "af" | "ui" | "hearts" | "soul" | "paradox";
export type BlmGauge = {
  casts: { cast: PlayerEvent; before: BlmState; after: BlmState; proc: boolean }[];
  polyglot: GaugeEvent[];
  paradoxGains: { t: number; overwrite: boolean; label: string }[];
  paradoxShort: number;
  steps: Record<BlmLane, GaugeTrack["steps"]>;
};
const blmCache = new WeakMap<PlayerCheckContext, BlmGauge | undefined>();

export function blmGauge(ctx: PlayerCheckContext): BlmGauge | undefined {
  if (blmCache.has(ctx)) return blmCache.get(ctx);
  const result = ctx.patch && PRE_72.includes(ctx.patch) ? undefined : runBlmGauge(ctx);
  blmCache.set(ctx, result);
  return result;
}

function runBlmGauge(ctx: PlayerCheckContext): BlmGauge {
  const casts = ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const deaths = [...ctx.dead].sort((a, b) => a.startMs - b.startMs);
  const firestarter = statusWindows(ctx, S.FIRESTARTER.id);
  const out: BlmGauge = {
    casts: [], polyglot: [], paradoxGains: [], paradoxShort: 0,
    steps: { af: [{ t: 0, value: 0 }], ui: [{ t: 0, value: 0 }], hearts: [{ t: 0, value: 0 }], soul: [{ t: 0, value: 0 }], paradox: [{ t: 0, value: 0 }] },
  };
  const s: BlmState = { af: 0, ui: 0, hearts: 0, soul: 0, paradox: 0 };
  let since: number | undefined;
  let d = 0;
  const record = (t: number) => {
    for (const lane of Object.keys(out.steps) as BlmLane[]) {
      const steps = out.steps[lane];
      const last = steps[steps.length - 1];
      if (last.value === s[lane]) continue;
      if (last.t === t) last.value = s[lane];
      else steps.push({ t, value: s[lane] });
    }
  };
  const tickTo = (t: number) => {
    if (since === undefined) return;
    while (since + POLYGLOT_MS <= t) {
      since += POLYGLOT_MS;
      out.polyglot.push({ t: since, type: "gain", amount: 1, label: "Enochian's 30s at 3 Polyglot" });
    }
  };
  const diesBy = (t: number) => {
    while (d < deaths.length && deaths[d].startMs <= t) {
      const at = deaths[d].startMs;
      tickTo(at);
      out.polyglot.push({ t: at, type: "reset", label: "death" });
      Object.assign(s, { af: 0, ui: 0, hearts: 0, soul: 0, paradox: 0 });
      since = undefined;
      record(at);
      d++;
    }
  };
  const endElement = () => { Object.assign(s, { af: 0, ui: 0, hearts: 0, soul: 0 }); since = undefined; };
  const gainAF = (n: number, drops = true) => {
    if (s.ui > 0 && drops) return endElement();
    s.ui = 0;
    s.af = Math.min(ELEMENT_MAX, s.af + n);
  };
  const gainUI = (n: number, drops = true) => {
    if (s.af > 0 && drops) return endElement();
    s.af = 0;
    s.ui = Math.min(ELEMENT_MAX, s.ui + n);
    s.soul = 0;
  };
  const spendHearts = (n: number, force = false) => { if (s.hearts > 0 && (s.af > 0 || force)) s.hearts = Math.max(0, s.hearts - n); };
  const gainParadox = (t: number, label: string) => {
    out.paradoxGains.push({ t, overwrite: s.paradox > 0, label });
    s.paradox = 1;
  };
  // xivanalysis addEvent: a change from the previous state can grant
  // Paradox, and any element starts the Polyglot timer.
  const settle = (prev: BlmState, t: number) => {
    if (prev.ui === ELEMENT_MAX && s.af > 0 && s.hearts === HEARTS_MAX) gainParadox(t, "Paradox from Umbral Ice III with 3 hearts");
    else if (prev.af === ELEMENT_MAX && s.ui > 0) gainParadox(t, "Paradox from Astral Fire III");
    if ((s.af > 0 || s.ui > 0) && since === undefined) since = t;
  };
  for (const c of casts) {
    const t = c.timestamp, id = c.abilityId;
    diesBy(t);
    tickTo(t);
    const before = { ...s };
    const proc = id === idOf("FIRE_III") && firestarter.some((w) => w.startMs < t && Math.abs(w.endMs - t) <= 300);
    // On cast.
    if (id === idOf("UMBRAL_SOUL")) { gainUI(1); if (s.ui > 0) s.hearts = Math.min(HEARTS_MAX, s.hearts + 1); }
    else if ([idOf("FIRE_I"), idOf("FIRE_II"), idOf("HIGH_FIRE_II"), idOf("FIRE_IV")].includes(id)) spendHearts(1);
    else if (id === idOf("FIRE_III")) { if (!proc) spendHearts(1); }
    else if (id === idOf("FLARE")) spendHearts(HEARTS_MAX, true);
    else if (POLYGLOT_SPEND.has(id)) out.polyglot.push({ t, type: "spend", amount: 1, label: c.abilityName });
    else if (id === idOf("TRANSPOSE")) { if (s.af > 0) gainUI(1, false); else if (s.ui > 0) gainAF(1, false); }
    else if (id === idOf("PARADOX")) { if (s.paradox > 0) s.paradox = 0; else out.paradoxShort++; }
    else if (id === idOf("AMPLIFIER")) out.polyglot.push({ t, type: "gain", amount: 1, label: "Amplifier at 3 Polyglot" });
    else if (id === idOf("FLARE_STAR")) s.soul = 0;
    else if (id === idOf("MANAFONT")) { gainAF(ELEMENT_MAX, false); s.hearts = HEARTS_MAX; gainParadox(t, "Paradox from Manafont"); }
    settle(before, t);
    // On hit.
    const mid = { ...s };
    if (id === idOf("BLIZZARD_I")) gainUI(1);
    else if ([idOf("BLIZZARD_II"), idOf("HIGH_BLIZZARD_II"), idOf("BLIZZARD_III")].includes(id)) gainUI(ELEMENT_MAX, false);
    else if (id === idOf("FREEZE") || id === idOf("BLIZZARD_IV")) { if (s.ui === 0) gainUI(1, false); s.hearts = HEARTS_MAX; }
    else if (id === idOf("FIRE_I")) gainAF(1);
    else if ([idOf("FIRE_II"), idOf("HIGH_FIRE_II"), idOf("FIRE_III"), idOf("DESPAIR")].includes(id)) gainAF(ELEMENT_MAX, false);
    else if (id === idOf("FIRE_IV")) { if (s.af === 0) gainAF(1, false); s.soul = Math.min(SOUL_MAX, s.soul + 1); }
    else if (id === idOf("FLARE")) { gainAF(ELEMENT_MAX, false); s.soul = Math.min(SOUL_MAX, s.soul + 3); }
    settle(mid, t);
    record(t);
    out.casts.push({ cast: c, before, after: { ...s }, proc });
  }
  diesBy(ctx.endMs);
  tickTo(ctx.endMs);
  return out;
}

const xenoUnit = (ctx: PlayerCheckContext) => {
  const xeno = ctx.values.perUse(A.XENOGLOSSY.id) || ctx.values.perUse(A.FOUL.id);
  const gcd = ctx.values.gcdValue(undefined, false);
  return { unit: Math.max(0, xeno - gcd), basis: `${k(xeno)} average Xenoglossy − ${k(gcd)} average GCD it would have replaced` };
};

export function polyglotSpec(ctx: PlayerCheckContext): GaugeSpec | undefined {
  const gauge = blmGauge(ctx);
  if (!gauge) return undefined;
  const { unit, basis } = xenoUnit(ctx);
  return {
    name: "Polyglot", unit: "Polyglot", cap: POLYGLOT_CAP, unitValue: unit, valueBasis: basis, events: gauge.polyglot,
    leftAtKill: { unitValue: unit, valueBasis: basis },
  };
}

const polyglot: JobCheck = (ctx) => {
  const spec = polyglotSpec(ctx);
  return spec && spec.unitValue > 0 ? gaugeFindings(ctx, spec) : [];
};

/** The Damage dialog's Black Mage lanes, from blmGauge. */
export function blmGaugeTracks(ctx: PlayerCheckContext): GaugeTrack[] {
  const gauge = blmGauge(ctx);
  const spec = polyglotSpec(ctx);
  if (!gauge || !spec) return [];
  const lane = (name: string, max: number, steps: GaugeTrack["steps"], note: string, marks?: GaugeTrack["marks"]): GaugeTrack =>
    ({ name, max, steps, capped: [], note, marks });
  const overwrites = gauge.paradoxGains.filter((g) => g.overwrite);
  const flareStars = gauge.casts.filter((c) => c.cast.abilityId === idOf("FLARE_STAR"));
  return [
    gaugeTrack(ctx, spec),
    lane("Astral Fire", ELEMENT_MAX, gauge.steps.af, "Astral Fire stacks, simulated from casts"),
    lane("Umbral Ice", ELEMENT_MAX, gauge.steps.ui, "Umbral Ice stacks, simulated from casts"),
    lane("Hearts", HEARTS_MAX, gauge.steps.hearts, "Umbral Hearts, simulated from casts"),
    lane("Astral Soul", SOUL_MAX, gauge.steps.soul, "Astral Soul (6 for Flare Star); ticks are Flare Stars",
      flareStars.map((c) => ({ t: c.cast.timestamp, label: "Flare Star", tone: "use" as const }))),
    lane("Paradox", 1, gauge.steps.paradox,
      `${overwrites.length} Paradox overwritten (amber)` +
        (gauge.paradoxShort > 0 ? `; ${gauge.paradoxShort} Paradox the simulation had no marker for (model or log off)` : ""),
      overwrites.map((g, i) => ({ t: g.t, label: `${g.label}, one already held: overwritten${i === 0 ? " (the first, forgiven)" : ""}`,
        tone: i === 0 ? "use" as const : "lost" as const }))),
  ];
}

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
  const fire1 = ctx.values.perUse(A.FIRE_I.id);
  const fire4 = ctx.values.perUse(A.FIRE_IV.id);
  // Before 7.2 there's no gauge run: every Fire I is judged against Fire IV.
  const casts = blmGauge(ctx)?.casts ??
    ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).map((cast) => ({ cast, before: undefined }));
  for (const { cast: c, before } of casts) {
    if (c.timestamp < 0) continue;
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
    const inIce = isFire1 && (before?.ui ?? 0) > 0;
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

// From the gauge (xivanalysis Gauge.tsx, RotationWatchdog ColdF3Evaluator,
// LukewarmF4Evaluator), 7.2+:
// - Paradox overwritten: a Paradox gained with one held, the pull's first
//   forgiven (the opener's, deliberate). Worth her average Paradox less
//   her average rotation GCD (cycleGcdValue). In forced
//   time shown, not counted. r4qDkR9btJCXnKWd Doomtrain pull 6 1:58.9,
//   3:16.8, 4:12.0 and pull 14 4:16.0 matched xivanalysis (1:58, 3:16,
//   4:11; 4:15); qh3VDQFy274mNPfJ's only one is its first (none there).
// - Cold Fire III matched xivanalysis on pull 6 (1:29.7, 2:13.6, 4:12.0,
//   its "3 phases"), wNHvD38WTbFtGJKr fight 11 (6:48.1), and none on
//   pull 14 and qh3VDQFy274mNPfJ.
// - Cold Fire III: a hardcast Fire III from Umbral Ice III with 3 hearts,
//   which the Umbral Ice penalty weakens (Transpose, Paradox and the
//   Firestarter Fire III reach Astral Fire III without it).
// - Lukewarm Fire IV: a Fire IV below Astral Fire III.
// Both are measured: her buff-neutral average of the same spell cast the
// right way (Fire III from Astral Fire, Fire IV at Astral Fire III) less
// this cast's, priced at this cast's buffs and her crit / direct-hit
// rate.
const PARADOX_HIT_MS = 3_000;
// A Paradox costs no MP, so one lost makes the fire and ice cycle a GCD
// shorter: that GCD's time goes to the cycle's average GCD. Xenoglossy,
// Foul and High Thunder come with time, not with cycles, so they're left
// out. Against her Fire IV (Paradox is unaspected, Fire IV has Astral
// Fire's bonus) the two are level, and djChYqt4b7K8aAfP's 2:40 and 3:53
// overwrites (xivanalysis 2) were valued at nothing. Even so a Paradox is
// about an average rotation GCD (Flare Star and Despair lift it), so most
// overwrites cost little directly: each is still listed (0 when the
// Paradox averages under the cycle) so the count matches xivanalysis.
const TIME_GATED_GCDS = new Set(ids("XENOGLOSSY", "FOUL", "HIGH_THUNDER", "HIGH_THUNDER_II"));
function cycleGcdValue(ctx: PlayerCheckContext): number {
  const uses = ctx.uses.filter((u) => u.startMs < ctx.endMs && !TIME_GATED_GCDS.has(u.action.id));
  if (uses.length === 0) return ctx.values.gcdValue(undefined, false);
  return uses.reduce((a, u) => a + ctx.values.perUse(u.action.id), 0) / uses.length;
}
const blmGaugeChecks: JobCheck = (ctx) => {
  const gauge = blmGauge(ctx);
  if (!gauge) return [];
  const out: DamageFinding[] = [];
  const excused = (t: number) => {
    const during = forcedPart(t - 1, t + 1, ctx.forced);
    const moving = inWindows(t, ctx.movement ?? []);
    return { forced: during.ms > 0 || moving, movement: moving || undefined, cause: during.ms > 0 ? during.cause : undefined };
  };
  const paradox = ctx.values.perUse(A.PARADOX.id);
  const cycle = cycleGcdValue(ctx);
  const overwrites = gauge.paradoxGains.filter((g) => g.overwrite && g.t >= 0);
  // The first is forgiven, as xivanalysis does: the 5+7 opener spends that
  // MP on an extra Fire IV for a second Flare Star.
  for (const g of overwrites.slice(1)) {
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: g.t, endMs: g.t, ...excused(g.t), inference: true,
      label: "Paradox overwritten", lostDamage: Math.max(0, paradox - cycle),
      basis: `${k(paradox)} average Paradox − ${k(cycle)} her average rotation GCD (Xenoglossy, Foul and High Thunder left out: ` +
        "they come with time, not with the cycle a Paradox lengthens); the Firestarter an Astral Fire Paradox grants isn't " +
        "valued here (a cold Fire III it forces is its own finding)",
      detail: `${g.label} with one already held: the held Paradox was lost`,
    }));
  }
  const critMult = critMultOf(ctx), roll = rollGainOf(ctx, critMult);
  const hitOf = (c: PlayerEvent) => ctx.player.damageDone.find((e) => e.abilityId === c.abilityId && !e.isDoT && !e.pet &&
    (e.amount ?? 0) > 0 && e.timestamp >= c.timestamp && e.timestamp < c.timestamp + PARADOX_HIT_MS);
  const judge = (abilityId: number, isGood: (b: BlmState, proc: boolean) => boolean, isBad: (b: BlmState, proc: boolean) => boolean,
    label: string, detail: string, goodName: string) => {
    const mine = gauge.casts.filter((c) => c.cast.abilityId === abilityId && c.cast.timestamp >= 0)
      .map((c) => ({ ...c, hit: hitOf(c.cast) })).filter((c) => c.hit);
    const good = mine.filter((c) => isGood(c.before, c.proc));
    if (good.length === 0) return;
    const ref = good.reduce((a, c) => a + baseValue(c.hit!, critMult), 0) / good.length;
    for (const c of mine) {
      if (!isBad(c.before, c.proc)) continue;
      const hit = c.hit!, m = hit.multiplier && hit.multiplier > 0 ? hit.multiplier : 1;
      const lost = (ref - baseValue(hit, critMult)) * m * roll;
      if (lost < 1) continue;
      out.push(finding(ctx, {
        kind: "wrong-gcd", startMs: c.cast.timestamp, endMs: c.cast.timestamp, ...excused(c.cast.timestamp), inference: true,
        label, lostDamage: lost,
        basis: `${k(ref * m * roll)} her ${goodName} at this cast's buffs (${good.length} cast${good.length === 1 ? "" : "s"}) − ${k(baseValue(hit, critMult) * m * roll)} this one`,
        detail,
      }));
    }
  };
  judge(A.FIRE_III.id, (b) => b.af > 0, (b, proc) => !proc && b.ui === ELEMENT_MAX && b.hearts === HEARTS_MAX,
    "Cold Fire III", "Fire III from Umbral Ice III with 3 hearts: Transpose, Paradox and the Firestarter Fire III skip the Umbral Ice penalty",
    "average Fire III from Astral Fire");
  judge(A.FIRE_IV.id, (b) => b.af === ELEMENT_MAX, (b) => b.af > 0 && b.af < ELEMENT_MAX,
    "Fire IV below Astral Fire III", "Fire IV before reaching Astral Fire III", "average Fire IV at Astral Fire III");
  return out;
};

export const BLM_CHECKS: JobCheck[] = [highThunder, blmAoe, polyglot, leyLines, blmWrongGcds, blmGaugeChecks];
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
// White / Black Mana (xivanalysis ManaGauge.tsx), simulated from casts:
// a spell gives its mana when it lands (a cast with no hit gives none),
// halved (rounded down) for the lower colour while the other leads it by
// more than 30; the enchanted melee steps spend theirs, nothing under
// Magicked Swordplay; cap 100 each; a death empties both. Dawntrail's
// Manafication grants no mana. Mana lost at the cap or to the imbalance
// is worth an enchanted combo's chain over the spells its time would hold,
// per 50 mana. Also the Red Mage's timeline lanes (gauges.ts).
const MANA_CAP = 100, MANA_IMBALANCE = 30, MANA_PER_COMBO = 50, RDM_HIT_MS = 3_000;
const MANA_GAIN: [string, number, number][] = [
  ["VERAERO", 6, 0], ["VERAERO_II", 7, 0], ["VERAERO_III", 6, 0], ["VERSTONE", 5, 0], ["VERHOLY", 11, 0],
  ["VERTHUNDER", 0, 6], ["VERTHUNDER_II", 0, 7], ["VERTHUNDER_III", 0, 6], ["VERFIRE", 0, 5], ["VERFLARE", 0, 11],
  ["JOLT", 2, 2], ["JOLT_II", 2, 2], ["JOLT_III", 2, 2], ["SCATTER", 3, 3], ["IMPACT", 3, 3], ["GRAND_IMPACT", 3, 3],
  ["SCORCH", 4, 4], ["RESOLUTION", 4, 4],
];
const MANA_SPEND: [string, number][] = [
  ["ENCHANTED_REPRISE", 5], ["ENCHANTED_MOULINET", 20], ["ENCHANTED_MOULINET_DEUX", 15], ["ENCHANTED_MOULINET_TROIS", 15],
  ["ENCHANTED_RIPOSTE", 20], ["MANAFICATION_ENCHANTED_RIPOSTE", 20], ["ENCHANTED_ZWERCHHAU", 15],
  ["MANAFICATION_ENCHANTED_ZWERCHHAU", 15], ["ENCHANTED_REDOUBLEMENT", 15], ["MANAFICATION_ENCHANTED_REDOUBLEMENT", 15],
];
export type RdmMana = { specs: GaugeSpec[]; imbalance: { t: number; white: number; black: number }[] };
export function rdmMana(ctx: PlayerCheckContext): RdmMana {
  const gains = new Map(MANA_GAIN.filter(([key]) => A[key]).map(([key, w, b]) => [A[key].id, { w, b }]));
  const spends = new Map(MANA_SPEND.filter(([key]) => A[key]).map(([key, n]) => [A[key].id, n]));
  const swordplay = statusWindows(ctx, S.MAGICKED_SWORDPLAY.id);
  const casts = ctx.player.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const deaths = [...ctx.dead].sort((a, b) => a.startMs - b.startMs);
  const white: GaugeEvent[] = [], black: GaugeEvent[] = [];
  const imbalance: RdmMana["imbalance"] = [];
  let w = 0, b = 0, d = 0;
  for (const c of casts) {
    while (d < deaths.length && deaths[d].startMs <= c.timestamp) {
      w = b = 0;
      white.push({ t: deaths[d].startMs, type: "reset", label: "death" });
      black.push({ t: deaths[d].startMs, type: "reset", label: "death" });
      d++;
    }
    const gain = gains.get(c.abilityId);
    if (gain) {
      const landed = ctx.player.damageDone.some((e) => e.abilityId === c.abilityId && (e.amount ?? 0) > 0 &&
        e.timestamp >= c.timestamp && e.timestamp < c.timestamp + RDM_HIT_MS);
      if (!landed) continue;
      const gw = w > 0 && b - w > MANA_IMBALANCE ? Math.floor(gain.w / 2) : gain.w;
      const gb = b > 0 && w - b > MANA_IMBALANCE ? Math.floor(gain.b / 2) : gain.b;
      if (gw < gain.w || gb < gain.b) imbalance.push({ t: c.timestamp, white: gain.w - gw, black: gain.b - gb });
      if (gw) white.push({ t: c.timestamp, type: "gain", amount: gw, label: `${c.abilityName} at 100 White Mana` });
      if (gb) black.push({ t: c.timestamp, type: "gain", amount: gb, label: `${c.abilityName} at 100 Black Mana` });
      w = Math.min(MANA_CAP, w + gw);
      b = Math.min(MANA_CAP, b + gb);
      continue;
    }
    const spend = spends.get(c.abilityId);
    if (spend && !swordplay.some((x) => c.timestamp > x.startMs && c.timestamp <= x.endMs + 50)) {
      white.push({ t: c.timestamp, type: "spend", amount: spend, label: c.abilityName });
      black.push({ t: c.timestamp, type: "spend", amount: spend, label: c.abilityName });
      w = Math.max(0, w - spend);
      b = Math.max(0, b - spend);
    }
  }
  for (; d < deaths.length; d++) {
    white.push({ t: deaths[d].startMs, type: "reset", label: "death" });
    black.push({ t: deaths[d].startMs, type: "reset", label: "death" });
  }
  // An enchanted combo and its finishers, against the spells their time
  // would hold: 3 melee GCDs at 1.5s and 3 at 2.5s, 12s of Jolt III /
  // Verthunder III-Veraero III (dualcast pairs, so their average).
  const v = (key: string) => ctx.values.perUse(A[key]?.id ?? -1);
  const combo = v("ENCHANTED_RIPOSTE") + v("ENCHANTED_ZWERCHHAU") + v("ENCHANTED_REDOUBLEMENT") +
    best(ctx, FINISHERS) + v("SCORCH") + v("RESOLUTION");
  const spell = (v("JOLT_III") + best(ctx, ids("VERTHUNDER_III", "VERAERO_III"))) / 2;
  const perMana = Math.max(0, combo - (12_000 / 2_500) * spell) / MANA_PER_COMBO;
  const basis = `(${k(combo)} an enchanted combo with Verflare / Verholy, Scorch and Resolution − ${k((12_000 / 2_500) * spell)} ` +
    `for the 12s of spells it replaces) ÷ 50 mana`;
  return {
    specs: [
      { name: "White Mana", unit: "White Mana", cap: MANA_CAP, unitValue: perMana, valueBasis: basis, events: white },
      { name: "Black Mana", unit: "Black Mana", cap: MANA_CAP, unitValue: perMana, valueBasis: basis, events: black },
    ],
    imbalance,
  };
}
const rdmManaCheck: JobCheck = (ctx) => {
  const mana = rdmMana(ctx);
  const out = mana.specs.flatMap((spec) => (spec.unitValue > 0 ? gaugeFindings(ctx, spec) : []));
  const lost = mana.imbalance.filter((x) => !inWindows(x.t, ctx.forced));
  const total = lost.reduce((a, x) => a + x.white + x.black, 0);
  const perMana = mana.specs[0].unitValue;
  if (total > 0 && perMana > 0) {
    out.push(finding(ctx, {
      kind: "gauge-overcap", startMs: lost[0].t, endMs: lost[lost.length - 1].t, forced: false, inference: true,
      label: "Mana lost to imbalance", lostDamage: total * perMana,
      basis: `${total} mana × ${mana.specs[0].valueBasis}`,
      detail: `${lost.length} spell${lost.length === 1 ? "" : "s"} gave half their mana while the other colour led by more than 30 ` +
        `(${clock(lost[0].t)}${lost.length > 1 ? `-${clock(lost[lost.length - 1].t)}` : ""})`,
    }));
  }
  return out;
};

export const RDM_CHECKS: JobCheck[] = [manaStacks, dualcastWasted, verprocOverwrites, rdmManaCheck];
