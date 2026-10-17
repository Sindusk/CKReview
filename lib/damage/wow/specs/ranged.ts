// lib/damage/wow/specs/ranged.ts
//
// Ranged and caster checks (docs/archive/damage-analysis-plan.md, "WoW build order"
// step 6, last role batch, 2026-10-06). Which cooldowns, DoTs and resources
// matter was informed by WoWAnalyzer (read, not copied: AGPL); every id is
// from our own logs (lib/damage/wow/spell-data.ts). Sample players: Arcane
// 19, Elemental 13, Beast Mastery 11, Balance 11, Shadow 9, Demonology 9,
// Marksmanship 8, Devastation 7, Affliction 6; Augmentation 3, Fire 2,
// Devourer 2, Frost Mage 1, Destruction 1 (under 3: unverified).
//
// - Main cooldown window (burstGcdFindings, bonus read from the hits,
//   inference): Arcane Surge, Combustion, Incarnation, Bestial Wrath,
//   Trueshot, Voidform, Ascendance, Malevolence, Demonic Tyrant,
//   Dragonrage. Frost Mage, Augmentation and Devourer have none here
//   (Icy Veins wasn't cast in the samples; Ebon Might is up 97% of the time).
// - Main resource at the cap (primaryResourceCapFindings): Maelstrom,
//   Insanity, Astral Power, Focus (Beast Mastery only since 2026-10-17;
//   see Marksmanship below). Mages log only mana; Soul Shards and
//   Essence only on their spenders: not judged.
// - DoT uptime (dotUptimeFindings, from Pull.bossDebuffs): Shadow Word:
//   Pain, Vampiric Touch; Agony, Unstable Affliction, Wither / Corruption;
//   Moonfire, Sunfire; Flame Shock; Destruction's Wither.
// - Cancelled casts are the engine's own check (begin-casts with no cast).
// - Augmentation's support (Ebon Might, Prescience) isn't in the rDPS split
//   yet: WCL credits it its own way and our streams don't carry it.
// Tracked cooldowns are in tracked-cooldowns.ts.
//
// Balance, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Sylmigron, 6th percentile; reference dBxtMyAc1zYHXQnK fight 18's Kadss,
// 100th; checked 2026-10-13):
// - Matched: spenders outside Eclipse not near the cap, 28 vs 4 there;
//   spenderOutsideEclipse finds 26 vs 4 (1.69M vs 0.28M; other strong
//   Balance players 5–9). Active time 80.4% vs 94.0%; cancelled casts
//   22.7% vs 5.8% (22 Starfires, their time counted in the gaps). Pace
//   1.21s vs 1.07s from the reference kill's other Balance (2.61M).
// - Fine: Incarnation 100%, Moonfire / Sunfire uptime 99%, Astral Power
//   waste 5.0% vs 4.4%. Fury of Elune 66% vs 73% (holds mostly Stasis).
// - Not adopted: Eclipse uptime 53% vs 69% and Starlord at 3 stacks 52%
//   vs 63%: the spenders above carry most of it.
// - The WoWAnalyzer audit's phase 3 (2026-10-17; docs/wowa-audit/
//   druid-balance.md, 50 player-pulls) moved Balance's own checks to
//   balance.ts. Eclipse is a press now (two charges, 30s), and Sylmigron's
//   low uptime was Eclipses not pressed: Eclipse charges capped reads 1.06M
//   here. The spenders check above fired on the top players as much as on
//   him (Delvkin 2.32M: free procs, Incarnation and Starfall's enemy count
//   in its price), so it now counts only paid spends that could have waited
//   for the player's next Eclipse without capping (182k here). Also built:
//   Fury of Elune held (its cooldown fitted: 45s less 1.5s per arcane
//   cast) and Starfall on one enemy.
//
// Elemental, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Cocroach; reference JZjf9x3mK76NzabP fight 9's Nickshockz, 99th
// percentile; checked 2026-10-13): no new check. Cooldowns (Ascendance,
// Stormkeeper, Ancestral Swiftness), Elemental Blast spending, Flame
// Shock (99.5%) and Maelstrom (2.7% vs 2.2%) match. Time on GCD 75.0% vs
// 81.4%: the app's small delays (18.1s, 2.32M) and gaps; Call of the
// Ancestors "bad" (24 of 41 vs 8 of 38) is WoWAnalyzer grading active
// time inside each Ancestor window (under 75%), the same idle. Fewer
// Spiritwalker's Grace (4 vs 6) fits his larger movement share (2.79M vs
// 0.74M, not counted by the user's rule). Astral Shift / Earth Elemental:
// utility. The WoWAnalyzer audit's phase 3 (2026-10-16) added Elemental's
// own checks in elemental.ts (casts that can't overload inside Ascendance,
// Lava Burst without Flame Shock); docs/wowa-audit/shaman-elemental.md.
//
// Beast Mastery, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Deathstriker; reference jmprxRc62fHCZy7g fight 25's Matcheh, 99th
// percentile; checked 2026-10-13). Its page has only Focus waste (19.2% vs
// 17.9%, both "bad") and potions (2/2 both). Cast rates match (Kill
// Command 17.0 vs 15.8 a minute, Barbed Shot 9.2 vs 9.9, Cobra Shot 13.7
// vs 15.4, Bestial Wrath 1.9 vs 2.0). Fixed: Barbed Shot at full Focus
// isn't waste (BARBED_SHOT below). Left: pace 1.22s vs 1.11s from the
// reference kill's other BM (1.63M); 39.9 vs 43.2 GCDs a minute; a 3.9s
// gap in Aspect of the Turtle at 5:02 (a survival call, counted).
// The WoWAnalyzer audit's phase 3 (2026-10-17; docs/wowa-audit/
// hunter-beastmastery.md, 40 player-pulls) found the pet behind most of
// BM's numbers: a BM GCD had been priced at the player's own hits, half its
// worth (game.ts now counts Kill Command's and the other presses' pet
// hits), and the tracked Bestial Wrath was worth 0 a use (its damage is the
// pet's), so its drift never fired. beastmastery.ts judges Bestial Wrath
// held time (Vashnik's hold windows read), Kill Commands without Nature's
// Ally, and Wild Thrash on one enemy.
//
// Demonology, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Fwîî; reference MAkCVqHfwx1vnDW8 fight 9's Killulock, 99th percentile;
// checked 2026-10-13): no new check. Casts per unforced minute match
// (Demonbolt 9.8 vs 9.8, Hand of Gul'dan 13.8 vs 14.6, Infernal Bolt,
// Ruination); est. loss 2.7k/s vs 1.5k/s. Tyrant 92% (its holds were in
// Stasis), Dreadstalkers 85% vs 80%, Grimoire 91% vs 95%, potions 2/2.
// Implosion 48% vs 79%: WoWAnalyzer counts Stasis as ready time; outside
// it ~42s of holds (1:52–2:13, 5:21–5:42), and Implosion needs Wild Imps,
// so not judged. The rest of the DPS gap is talents: Killulock's Shadow
// Nova (2.8M) and bigger demon Mind Sear / Greater Felbolt shares.
// The WoWAnalyzer audit's phase 3 (2026-10-17) overturned the Implosion
// call: with To Hell and Back each press brings back ~0.5M of imps, the
// top players press it every ~16.5s, and the holds cost Fwîî 1.99M on
// this pull. demonology.ts now judges Implosion and Call Dreadstalkers held
// time (a Tyrant line-up excused to its break-even);
// docs/wowa-audit/warlock-demonology.md.
//
// Affliction has no case study. The WoWAnalyzer audit's phase 3
// (2026-10-17; docs/wowa-audit/warlock-affliction.md) measured it on 18
// player-pulls (five top parses, four weaker, the static's Wyrmtongues)
// and added Haunt dropped in affliction.ts (a Haunt recast late loses a
// share of a Haunt), the Nightfall expiry (procs.ts) and Drain Soul as a
// channel (game.ts: its channels had read as idle). The DoT checks here
// fire on top and weak players alike for Unstable Affliction (top 0–0.45M
// a pull); its gaps end on a cast with 3–5 Soul Shards banked, so they're
// delays, not shard starvation. Dark Harvest held measured negligible.
//
// Arcane, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Neximage; reference 3Vz6Qt2RyTPXwpJn's Màzz, 100th percentile, page
// saved; checked 2026-10-13):
// - Matched: active time 82.1% vs 96.2%; small GCD delays 9.5s vs 1.9s
//   (Arcane Missiles ended 0.31s vs 0.10s late on average). Arcane Surge
//   100%, potions 2/2.
// - Overstated: Touch of the Magi 84% (0:49–1:34 "missed"): ready inside
//   Stasis, then held to line up with Arcane Surge at 1:34; Màzz spent his
//   into Stasis's 99% reduction. No lost use.
// - Not adopted: Arcane Orb 8 bad of 11 (cast at 4 charges): the charge
//   waste isn't in the log (Arcane Charges aren't fetched). The "294k an
//   Orb" first quoted here was all Orb damage over his presses; a pressed
//   Orb's own hits are ~47k, the rest are Orbs he didn't press (phase 3,
//   2026-10-17). Prismatic Bolt munched 3 (Màzz 6). Idle during Stasis
//   (16.2s, 13.8s, 9.1s): Màzz cast through it but hit no harder after
//   (0.52–0.81× his average in the 15s after vs Neximage's 0.67–0.91×).
// - The WoWAnalyzer audit's phase 3 (2026-10-17) added the Touch of the
//   Magi window in arcane.ts (idle inside it priced at the share the burst
//   banks). It proposed the Salvo ladder for Barrage and Missiles and the
//   Orb efficiency rule as `wrong`; docs/wowa-audit/mage-arcane.md.
//
// Marksmanship, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Shadowmeld; reference: 3Vz6Qt2RyTPXwpJn's Imnotanorc, 100th
// percentile, page saved too; checked 2026-10-13):
// - Matched: uptime 79.6% vs the reference's 94.9%; 6 cancelled Steady /
//   Aimed Shots at 3:25, 3:48, 3:52, 4:01, 4:14, 6:27, the ~2s gaps it
//   flags. One combat potion of two (combatPotion, potion.ts); the
//   reference missed its second too.
// - Overstated: Trueshot 88% (0:03, 2:13, 4:47): ready at 4:13, Stasis
//   from 4:14.7, pressed 15.7s after it; prompt use adds only a ~4s
//   Trueshot before the kill. No lost use.
// - Not counted (user's choice): most of his idle fell inside movement
//   windows he carried (Murk 52%, Miasma 40%, slime switch 29% idle;
//   the reference 0–1%). Shown as movement, 3.15M.
// - The WoWAnalyzer audit's phase 3 (2026-10-17; docs/wowa-audit/
//   hunter-marksmanship.md, 61 player-pulls) added marksmanship.ts:
//   Precise Shots lost (an Aimed Shot over a held one outside Trueshot;
//   the top players 0–95k a pull, the weaker up to 746k), and a value for
//   the tracked Trueshot (worth 0 before: it has no hits; now its Moonlight
//   Chakram and window bonus, 0.9–2.9M a use). The Moonlight Chakram
//   Trueshot grants is in procs.ts (17s; a lost one is a whole Chakram).
// - Focus at the cap was removed for Marksmanship (2026-10-17): it read
//   0.15–2.0M on the top players (Firaa ACmXHMFtaPLR9k8w 2.04M, Leevilh
//   baRCnPv62YQ1dJZN 1.58M, Qenjua 6qVxPcBdCgXrkG8a 1.13M, Taewoos 935k),
//   mostly Rapid Fire pressed at full Focus, priced at ~10k a Focus point
//   from Aimed Shot. But Focus never limits a Marksmanship player: on 18
//   player-pulls checked (top and weak), 22–50% of casts are made at the
//   125 cap, no Steady Shot is pressed under 40 Focus and no paid Aimed
//   Shot under its 35. Aimed Shot waits on its charges, not on Focus, so
//   Focus lost at the cap costs no spender. For the user's review.
//
// Devastation, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Bragontix, Scalecommander; log 2026-10-02, checked 2026-10-13):
// - Matched: Dragonrage 3 casts; the 2:03 → 2:46 hold ran into Stasis
//   (2:29–2:48), and 3 full windows beat 4 with two cut, so no lost use
//   (WoWAnalyzer's 87% counts the hold). Cancelled casts: 4 Living Flames.
//   Strafing Run 6 of 7 (strafingRun).
// - Fixed in the engine from this page: empowers read as cancelled
//   (timeline.ts latestBegin), Dragonrage windows cut by Animosity's
//   re-applications (statusWindows), Deep Breath's flight read as idle
//   (game.ts lockStatus), channels counted as missing GCDs in burst windows
//   (burstGcdFindings).
// - Not adopted: Essence waste (logged on spenders only; it graded 12.7%
//   "good"); Burnout / Leaping Flames / Mass Disintegrate / Imminent
//   Destruction expiries (3 / 1 / 1 / 1 outside his death, each worth well
//   under a GCD).
// - Open: Fire Breath / Eternity Surge "sat ready" (86% / 82%): their
//   recharge is cut by Disintegrate ticks (Causality) and the rule isn't
//   pinned from one player; Disintegrate tick efficiency (340/385).

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { inWindows, mergeWindows, overlapMs, statusWindows } from "../../timeline";
import { AFFLICTION_CHECKS } from "./affliction";
import { ARCANE_CHECKS } from "./arcane";
import { BALANCE_CHECKS } from "./balance";
import { BEAST_MASTERY_CHECKS } from "./beastmastery";
import { DEMONOLOGY_CHECKS } from "./demonology";
import { ELEMENTAL_CHECKS } from "./elemental";
import { MARKSMANSHIP_CHECKS } from "./marksmanship";
import { burstGcdFindings, castTimeProcFindings, dotUptimeFindings, k, observedWindowBonus, primaryResourceCapFindings, spentCooldownDrift } from "./shared";

// Backdraft (117828): Conflagrate (17962) adds a stack, max 2; Chaos Bolt
// (116858), Incinerate (29722) and Soul Fire (6353) each take one. Ids and
// the max from qpZx3mWaG7gcDdYB pull 3 (applybuffstack 2, then
// refreshbuff on a Conflagrate at 2).
const backdraft: JobCheck = (ctx) => castTimeProcFindings(ctx, {
  statusId: 117828, name: "Backdraft", maxStacks: 2,
  generatorIds: [17962], consumerIds: [116858, 29722, 6353],
});

// Stormkeeper (191634, the cast and the buff): 60s less 3s per Ancestor
// summoned (Call of the Ancestors 447244 applied or stacked; Offering From
// Beyond), measured on seven top Mythic parses 2026-10-16
// (docs/wowa-audit/shaman-elemental.md). Often cast before the pull: the
// buff drops at 0:02–0:05 with no cast. A fixed recast can't track it
// (tracked-cooldowns.ts).
// A use is worth the Ancestor it summons (one within 1.5s of every cast on
// Malegusxd and Cocroach; ~300k each) plus what its ~2 empowered Lightning
// Bolts / Chain Lightnings add over the player's ordinary ones. The buff is
// spent at the cast, so its hits don't carry it: each consumer is a cast
// between Stormkeeper and the buff's removal, its damage its own and its
// overload's hits until the next cast.
const LB_CL: Record<number, number[]> = { 188196: [188196, 45284], 188443: [188443, 45297] };
function stormkeeperUse(ctx: PlayerCheckContext): { value: number; basis: string } | undefined {
  const p = ctx.player;
  const own = (p.buffs ?? []).filter((b) => b.source === p.name);
  const summons = own.filter((b) => b.abilityId === 447244 && (b.buffStatus === "applied" || b.buffStatus === "stack")).length;
  const ancestor = p.damageDone.filter((e) => e.pet === "Ancestor").reduce((a, e) => a + (e.amount ?? 0), 0);
  const perSummon = summons > 0 ? ancestor / summons : 0;
  const casts = p.casts.filter((c) => c.timestamp < ctx.endMs).sort((a, b) => a.timestamp - b.timestamp);
  const castDamage = (i: number) => {
    const ids = LB_CL[casts[i].abilityId];
    const until = casts[i + 1]?.timestamp ?? ctx.endMs;
    return p.damageDone.filter((e) => !e.pet && ids.includes(e.abilityId) && e.timestamp >= casts[i].timestamp && e.timestamp < until)
      .reduce((a, e) => a + (e.amount ?? 0), 0);
  };
  const removals = own.filter((b) => b.abilityId === 191634 && b.buffStatus === "removed").map((b) => b.timestamp);
  const empowered = new Set<number>();
  for (const c of casts.filter((x) => x.abilityId === 191634)) {
    const end = removals.find((t) => t > c.timestamp) ?? c.timestamp;
    casts.forEach((x, i) => { if (LB_CL[x.abilityId] && x.timestamp > c.timestamp && x.timestamp <= end + 100) empowered.add(i); });
  }
  let added = 0, uses = 0;
  for (const id of Object.keys(LB_CL).map(Number)) {
    const idx = casts.map((x, i) => (x.abilityId === id ? i : -1)).filter((i) => i >= 0);
    const plain = idx.filter((i) => !empowered.has(i)).map(castDamage);
    if (plain.length === 0) continue;
    const avg = plain.reduce((a, x) => a + x, 0) / plain.length;
    for (const i of idx.filter((i) => empowered.has(i))) { added += castDamage(i) - avg; uses++; }
  }
  const skCasts = casts.filter((x) => x.abilityId === 191634).length;
  const perUse = perSummon + (skCasts > 0 ? Math.max(0, added) / skCasts : 0);
  if (perUse <= 0) return undefined;
  return {
    value: perUse,
    basis: `${k(perUse)} a use: an Ancestor (${k(perSummon)}, the player's Ancestor damage ÷ ${summons} summons) + ${k(Math.max(0, added) / Math.max(1, skCasts))} from its empowered casts (${uses} over ${skCasts} uses, against the player's ordinary Lightning Bolt / Chain Lightning)`,
  };
}
const stormkeeper: JobCheck = (ctx) => spentCooldownDrift(ctx, {
  name: "Stormkeeper", actionIds: [191634], baseMs: 60_000,
  reduceOn: { buffId: 447244, ms: 3_000, label: "3s per Ancestor summoned" },
  firstUseOffsetMs: 3_000, prePullFromBuff: true, window: { buffId: 191634 },
  valuePerUse: stormkeeperUse,
});

// Havoc (80240, a debuff on an enemy, 20s here) copies the player's
// single-target spells onto that enemy, so it belongs on an enemy they're
// NOT attacking. On qpZx3mWaG7gcDdYB pull 3 Wyrmtongues put it on Breath at
// 2:46, then the post-Stasis swap made Breath their main target: 12 of 13
// spells in the window went at the Havoc target and almost nothing was
// copied. The two top Destruction Warlocks on NK1hBtW9rckdjq36 put it on
// the other boss at all 9 of their swaps.
// A window counts when 60%+ of its single-target casts (3+) went at the
// Havoc target and the player hit another enemy within it ±5s. Lost = the
// share aimed at it × the player's average copied damage per window
// (hits on the Havoc target in windows where nothing was aimed at it), ×
// the window's unforced share. Inference: what a proper target would have
// copied.
const HAVOC = 80240;
const HAVOC_SPELLS = new Set([116858, 29722, 17962, 17877, 6353]); // Chaos Bolt, Incinerate, Conflagrate, Shadowburn, Soul Fire
const havocTarget: JobCheck = (ctx) => {
  const ev = (ctx.pull.bossDebuffs ?? []).filter((e) => e.statusId === HAVOC && e.sourceName === ctx.player.name)
    .sort((a, b) => a.timestamp - b.timestamp);
  const wins: { startMs: number; endMs: number; target: string }[] = [];
  for (const e of ev) {
    if (e.status === "applied") wins.push({ startMs: e.timestamp, endMs: ctx.endMs, target: e.targetName });
    else if (e.status === "removed" && wins.length && wins[wins.length - 1].target === e.targetName) wins[wins.length - 1].endMs = e.timestamp;
  }
  const own = ctx.player.damageDone.filter((h) => !h.pet);
  const stats = wins.map((w) => {
    const casts = ctx.player.casts.filter((c) => HAVOC_SPELLS.has(c.abilityId) && c.timestamp >= w.startMs && c.timestamp <= w.endMs);
    const aimed = casts.filter((c) => c.target === w.target).length;
    const onTarget = own.filter((h) => HAVOC_SPELLS.has(h.abilityId) && h.target === w.target && h.timestamp >= w.startMs && h.timestamp <= w.endMs + 2_000)
      .reduce((a, h) => a + (h.amount ?? 0), 0);
    const other = own.some((h) => h.target !== w.target && h.timestamp >= w.startMs - 5_000 && h.timestamp <= w.endMs + 5_000);
    return { w, casts: casts.length, aimed, onTarget, other };
  });
  const clean = stats.filter((x) => x.casts >= 3 && x.aimed === 0);
  if (clean.length < 2) return [];
  const perWindow = clean.reduce((a, x) => a + x.onTarget, 0) / clean.length;
  const forced = mergeWindows(ctx.forced);
  return stats.filter((x) => x.casts >= 3 && x.other && x.aimed / x.casts >= 0.6 && x.w.endMs <= ctx.endMs).map((x) => {
    const len = x.w.endMs - x.w.startMs;
    const unforced = len > 0 ? 1 - overlapMs(x.w.startMs, x.w.endMs, forced) / len : 0;
    const share = x.aimed / x.casts;
    const t = Math.round(x.w.startMs / 1000);
    return finding(ctx, {
      kind: "burst-window", startMs: x.w.startMs, endMs: x.w.endMs, forced: false,
      label: "Havoc on the main target", inference: true,
      lostDamage: share * perWindow * unforced,
      basis: `${x.aimed} of ${x.casts} single-target spells at the Havoc target (${Math.round(share * 100)}%) × ${k(perWindow)} copied per Havoc on another enemy (${clean.length} windows)` +
        (unforced < 1 ? ` × ${Math.round(unforced * 100)}% of the window outside forced time` : ""),
      detail: `Havoc at ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} on ${x.w.target}, then ${x.aimed} of ${x.casts} spells went at it: nothing to copy them to`,
    });
  });
};

// Strafing Run (1266165, Scalecommander): each Deep Breath (433874) grants
// one recast within 18s; the buff goes when it's used. On qpZx3mWaG7gcDdYB
// pull 3 Bragontix used 6 of 7 (WoWAnalyzer: 6 good, 1 bad); the one from
// 1:57 ran out at 2:15. A buff removed with no Deep Breath within 150ms is a
// Deep Breath lost: the player's own damage per Deep Breath (its hits and
// ticks, logged as "Deep Breath" under 353759, and the Melt Armor debuff it
// applies for 12s, 2.56M of Bragontix's 69M) less the flight's lock at
// their average GCD's rate. Melt Armor's damage-taken increase isn't
// counted. Forced when under 3s of its 18s was unforced.
const STRAFING_RUN = 1266165;
const DEEP_BREATH = 433874;
const strafingRun: JobCheck = (ctx) => {
  const casts = ctx.player.casts.filter((c) => c.abilityId === DEEP_BREATH);
  if (casts.length === 0) return [];
  const dmg = ctx.player.damageDone.filter((h) => !h.pet && (h.abilityName === "Deep Breath" || h.abilityName === "Melt Armor"))
    .reduce((a, h) => a + (h.amount ?? 0), 0);
  const perCast = dmg / casts.length;
  const locks = ctx.uses.filter((u) => u.action.id === DEEP_BREATH && u.statusLock).map((u) => u.castMs);
  const lockMs = locks.length ? locks.reduce((a, x) => a + x, 0) / locks.length : ctx.baseGcdMs;
  const forced = mergeWindows(ctx.forced);
  const ev = (ctx.player.buffs ?? []).filter((e) => e.abilityId === STRAFING_RUN).sort((a, b) => a.timestamp - b.timestamp);
  let grantedAt: number | undefined;
  const out = [];
  for (const e of ev) {
    if (e.buffStatus === "applied") { grantedAt = e.timestamp; continue; }
    if (e.buffStatus !== "removed" || grantedAt === undefined || e.timestamp >= ctx.endMs) continue;
    const from = grantedAt;
    grantedAt = undefined;
    if (casts.some((c) => Math.abs(c.timestamp - e.timestamp) <= 150)) continue;
    const unforcedMs = e.timestamp - from - overlapMs(from, e.timestamp, forced);
    const value = ctx.values.gcdValue(ctx.phaseOf(e.timestamp), false);
    const lost = Math.max(0, perCast - lockMs * value / ctx.baseGcdMs);
    const t = Math.round(e.timestamp / 1000);
    out.push(finding(ctx, {
      kind: "proc-lost", startMs: from, endMs: e.timestamp, forced: unforcedMs < 3_000,
      label: "Strafing Run expired",
      lostDamage: lost,
      basis: `${k(perCast)} per Deep Breath with its Melt Armor (${casts.length} casts) −${(lockMs / 1000).toFixed(1)}s flight ÷ ${(ctx.baseGcdMs / 1000).toFixed(2)}s GCD × ${k(value)} average GCD`,
      detail: `Strafing Run ran out at ${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")} without the second Deep Breath`,
    }));
  }
  return out;
};

// Beast Mastery's Barbed Shot (217200) gives its Focus over the next
// seconds and runs on charges: pressing it at full Focus isn't waste. The
// 99th-percentile Matcheh (jmprxRc62fHCZy7g) did it 38 times, Deathstriker
// (qpZx3mWaG7gcDdYB) 28, and only Deathstriker's read as 888k lost (his
// Barbed Shot gain happened to measure, Matcheh's didn't).
const BARBED_SHOT = 217200;

// Balance's spenders outside Eclipse (built 2026-10-13 on qpZx3mWaG7gcDdYB
// pull 3) moved to balance.ts in the WoWAnalyzer audit's phase 3
// (2026-10-17), with its rule and price reworked; its header has why.

const window = (statusId: number, name: string): JobCheck => (ctx) => burstGcdFindings(ctx, {
  statusId, name,
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});
const dot = (name: string, ...statusIds: number[]): JobCheck => (ctx) => dotUptimeFindings(ctx, { statusIds, name });

export const RANGED_CHECKS: Record<string, JobCheck[]> = {
  "Arcane Mage":          [window(365362, "Arcane Surge"), ...ARCANE_CHECKS],
  "Fire Mage":            [window(190319, "Combustion")],
  "Frost Mage":           [],
  "Balance Druid":        [window(102560, "Incarnation"), primaryResourceCapFindings, dot("Moonfire", 164812), dot("Sunfire", 164815), ...BALANCE_CHECKS],
  "Beast Mastery Hunter": [window(19574, "Bestial Wrath"), (ctx) => primaryResourceCapFindings(ctx, [BARBED_SHOT]), ...BEAST_MASTERY_CHECKS],
  "Marksmanship Hunter":  [window(288613, "Trueshot"), ...MARKSMANSHIP_CHECKS],
  "Shadow Priest":        [window(194249, "Voidform"), primaryResourceCapFindings, dot("Shadow Word: Pain", 589), dot("Vampiric Touch", 34914)],
  "Elemental Shaman":     [window(1219480, "Ascendance"), primaryResourceCapFindings, dot("Flame Shock", 188389), stormkeeper, ...ELEMENTAL_CHECKS],
  "Affliction Warlock":   [window(442726, "Malevolence"), dot("Agony", 980), dot("Unstable Affliction", 1259790), dot("Wither / Corruption", 445474, 146739), ...AFFLICTION_CHECKS],
  "Demonology Warlock":   [window(265187, "Demonic Tyrant"), ...DEMONOLOGY_CHECKS],
  "Destruction Warlock":  [window(442726, "Malevolence"), dot("Wither", 445474), backdraft, havocTarget],
  "Devastation Evoker":   [window(375087, "Dragonrage"), strafingRun],
  "Augmentation Evoker":  [],
  "Devourer Demon Hunter": [],
};
