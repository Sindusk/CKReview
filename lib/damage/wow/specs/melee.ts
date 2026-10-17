// lib/damage/wow/specs/melee.ts
//
// Melee checks (docs/archive/damage-analysis-plan.md, "WoW build order" step 6, third
// role batch, 2026-10-06). Which cooldowns and windows matter was informed
// by WoWAnalyzer (read, not copied: AGPL); every id is from our own logs
// (lib/damage/wow/spell-data.ts, the status the spec's cooldown puts on
// them). Sample players per spec: Arms 19, Windwalker 10, Havoc 9,
// Retribution 8, Assassination 6, Subtlety 4, Unholy 3, Frost DK 2, Fury 2,
// Feral, Survival and Outlaw 1 each (fewer than 3: unverified; Feral has
// 14 player-pulls since its audit pass, below).
//
// Every melee spec gets:
// - its main cooldown's window (burstGcdFindings): GCDs that fit vs GCDs
//   pressed. The window's bonus is read from the player's own hits
//   (observedWindowBonus, capped at 30%), so it's inference.
// - its main resource capped (primaryResourceCapFindings): Rage, Fury,
//   Runic Power, Energy or Focus, whichever the player's casts log most;
//   spenders are every cast that logged a cost of it. Energy and Focus
//   regenerate, and their spenders cost them, so most of that waste stays
//   invisible: the check sees only non-spending casts made at the cap.
// Tracked cooldowns are in tracked-cooldowns.ts.
//
// Windwalker, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Blkphnx; reference ACmXHMFtaPLR9k8w's Styphi, 99th percentile; checked
// 2026-10-13):
// - Matched: Invoke Xuen and Zenith 100%, Celestial Conduit 5/5 for both;
//   potions 2/2. GCDs a minute 39.6 vs 47.9 (WW's GCD is a fixed 1.0s),
//   counted as gaps and delays.
// - Fists of Fury 65% vs 84%, 4.4 vs 7.2 casts per unforced minute:
//   built in the WoWAnalyzer audit's phase 3 (2026-10-17) as "Fists of
//   Fury held", with the cooldown rebuilt from what the log shows (haste,
//   Heart of the Jade Serpent, Blackout Kicks, critical kicks), and
//   "Zenith Stomp unused" beside it. Both live in windwalker.ts, whose
//   header has the models and measurements. Most of the gap WoWAnalyzer
//   counted sits in Vitriolic Stasis (forced): the check finds 394k on
//   Blkphnx here, none on Styphi.
// - Not adopted: Touch of Karma 1 cast vs 3 (a defensive); Combo Strikes
//   mastery breaks 3 vs 0; proc grades similar.
//
// Assassination, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Nearby; reference ACmXHMFtaPLR9k8w's Auxeus, 99th percentile; checked
// 2026-10-13):
// - Matched: Vanish 61%, opener use skipped (tracked-cooldowns.ts, Vanish
//   with openerUse and the Garrote it empowers: 784k). Potions 2/2.
// - Similar to the reference: Envenom (20 bad vs 25), Rupture, Garrote,
//   Fan of Knives on one target (56% vs 51%), Deathmark, Kingsbane.
// - Not adopted: Energy waste 4.0% vs 0.7% (both "perfect"; regen waste
//   isn't in the log).
// - A floor: GCD gaps. Assassination waits on Energy; Nearby presses 45.9
//   GCDs a minute to Auxeus's 46.1 and reads 15.6k/s estimated loss to
//   Auxeus's 23.4k/s. The four top parses fetched in the audit sit at
//   73–80% GCD uptime too.
// - WoWAnalyzer audit phase 3 (2026-10-17, docs/wowa-audit/
//   rogue-assassination.md; WoWAnalyzer's Assassination is stale):
//   "Rupture off every enemy", "Garrote off every enemy" and "Rupture
//   refreshed early" are in assassination.ts, whose header has the bleed
//   durations, the models and the numbers (top players 0–111k a pull,
//   weaker up to 457k). Vanish drift now prices a player with no Vanish
//   Garrote at 2× their ordinary one (tracked-cooldowns.ts; Hofix read 0).
//   Re-run on the top players: Vanish, Deathmark, Energy at the cap and
//   the Kingsbane window fire little or not at all; Kingsbane drift reads
//   777k on Ireath (z8rQ23NBy4LwM6PZ, burst opened at 0:19). Combo points
//   at the cap and low-point Envenoms fire on the top players as much and
//   aren't built.
//
// Retribution, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Polpo; reference ACmXHMFtaPLR9k8w fight 15's Yenvenger, 99th
// percentile, page saved; checked 2026-10-13):
// - Matched: Holy Power wasted 41.9% vs 12.9% (holyPowerWaste rebuilds
//   33% vs 6% after forced time: 5.62M vs 1.14M); ability uptime 80.1% vs
//   91.3%; one combat potion of two (potion.ts, 1.77M). The pace check
//   finds his base GCD 1.15s against 1.02s from Yenvenger (3.06M).
// - Cooldowns: Avenging Wrath, Execution Sentence 100%; Wake of Ashes 89%
//   (its holds were in Stasis; no lost use). Divine Toll 90%: ~27s of holds
//   outside Stasis cost at most a cast just before the kill (tracked since
//   the audit: 132k here).
// - Not adopted: Expurgation 88% vs 92% (small).
// - WoWAnalyzer audit phase 3 (2026-10-17, docs/wowa-audit/
//   paladin-retribution.md): retribution.ts holds the models and numbers.
//   The tracked cooldowns now have a value per use (Avenging Wrath and
//   Execution Sentence were worth 0, so their drift never showed), Divine
//   Toll is tracked (a clean 60s on Retribution), and all four honor the
//   fight's hold windows (Vashnik's Imbibes, Ula'tek's Hearts). New:
//   "Divine Arbiter expired unused". Re-run on the top players: Holy Power
//   capped reads 3–13% of generation on them (0.36–3.29M; Pipala, 100th on
//   Vashnik, the most) against 19–33% on the weaker (Polpo 5.62M here), as
//   WoWAnalyzer has it (Yenvenger 12.9%): a real, common loss, kept. The
//   window and pace checks fire on the top players little or not at all.
//
// Arms, WoWAnalyzer audit phase 3 (2026-10-17, docs/wowa-audit/
// warrior-arms.md; WoWAnalyzer's Arms is "Foundation" support and grades
// almost nothing): "Colossus Smash drift" revalued by the window's armor
// (it had read 10–24% from unmitigated hits; the after-armor ratio is
// ×1.3–1.6) and "Bladestorm outside Colossus Smash" are in arms.ts, whose
// header has the models and numbers. Every sample player is Slayer with
// Colossus Smash; the Colossus, Demolish, Ravager and Champion's Spear
// rules fire on nothing. Rend and Deep Wounds uptime measured and not
// built (Rend ~3k/s; Deep Wounds fires on the top players as much).
//
// Frost Death Knight, WoWAnalyzer audit phase 3 (2026-10-17, docs/wowa-audit/
// deathknight-frost.md; WoWAnalyzer's Frost lags a patch and grades only a
// guide). No case study; measured on 31 player-pulls (top Winningdk,
// Vildk, 眼口补偿器, Jiyeon; the static's Veinglas on 16). frostdk.ts holds
// the models and numbers: "Killing Machine lost" (expiries and Empower Rune
// Weapon pressed at two stacks, valued as an Obliterate with it less one
// without; moved there from procs.ts), "Rime overwritten", "Frostscythe on
// one enemy", and Breath of Sindragosa / Frostwyrm's Fury held with the
// wait for the next Pillar excused up to its break-even. The tracked
// Pillar of Frost now has a value per use (its window) and Reaper's Mark
// counts its hits under all three ids. Frost gets no Runic Power cap
// check: the shared one read 0.08–2.49M on the top players as on the weak,
// from casts that generate nothing, and rebuilt properly the overflow is
// 10–27% of generation on every player, a GCD-bound floor (frostdk.ts).
// The Pillar of Frost window stays: top 0–31k, weaker up to 95k a pull.
//
// Feral Druid, WoWAnalyzer audit phase 3 (2026-10-17, docs/wowa-audit/
// druid-feral.md; no case study). Measured on 14 player-pulls of 13
// players fetched for it (top Catalyà, 万花通灵, Vydal, Scaricat, Samarae;
// weak Cheezywizzy, Chesteria, Lylyvienne, Munchkinz, Tyger). feral.ts
// holds the models and numbers: "Rip off every enemy" (top none, weak up
// to 241k), "Ferocious Bite below 5 points" (top 0–37k, weak up to 332k),
// the window check for Incarnation players (the one here is Berserk's),
// and the tracked cooldowns' values per use (Tiger's Fury, Berserk,
// Incarnation, Convoke, Feral Frenzy were all worth 0, so their drift
// never showed; Convoke is 120s, Incarnation newly tracked). Clearcasting
// and Apex Predator's Craving expire in procs.ts. Lunar Inspiration's
// Moonfire is a GCD press (game.ts: Scaricat's gaps and delays 6.74M →
// 2.76M). Kept after re-running on the top players: the Berserk window
// (top 0.04–0.52M, Scaricat the most; weak 0.02–0.29M: it prices idle the
// gap check also sees, at the window's bonus) and Energy at the cap (top
// 0.05–0.82M, Catalyà the most from seven Tiger's Furies pressed at 120
// Energy; weak 0.35–1.07M). Tiger's Fury grants no Energy now (the next
// cast shows only regen), so a TF at the cap wastes only the regen.
//
// Havoc, checked against WoWAnalyzer on qpZx3mWaG7gcDdYB pull 3
// (Mythnarra; reference 3Vz6Qt2RyTPXwpJn's Hawkerton, 100th percentile,
// page saved; checked 2026-10-13):
// - Matched: Eternal Hunt 2 good of 6 (eternalHunt below); potions 2/2.
// - Overstated: Metamorphosis 79% (0:09, 2:53, 5:23): the 2:08 → 2:53 hold
//   ran into Stasis, and 5:23 instead of 4:53 still leaves no fourth use
//   before the kill. Eye Beam 99%, The Hunt 100%, Essence Break 93% (the
//   app: one use, 88k).
// - A floor, not his mistake: Fury at the cap (2.24M, mostly Reaver's
//   Glaive) and small GCD delays (2.64M); Hawkerton shows 2.32M and 3.64M.
//   WoWAnalyzer rates both players' Fury waste good (13.7% / 17.5%).
// - WoWAnalyzer audit phase 3 (2026-10-17, docs/wowa-audit/
//   demonhunter-havoc.md): "Eye Beam held" (cooldown rebuilt from Cycle of
//   Hatred stacks and the Metamorphosis reset) and "Death Sweep reset
//   unused" (the Blade Dance / Death Sweep reset each Eye Beam leaves) are in
//   havoc.ts, whose header has the models and numbers. Reaver's Glaive
//   (442294) wasn't in the spell survey, so each press read as an idle
//   GCD; game.ts now marks it on-GCD. Most of the delays above were that:
//   Mythnarra's GCD delays went from 6.27M to 3.29M, Poetry's (99.9th) from
//   4.79M to 2.29M. Left unbuilt: Blade Dance / Death Sweep held, for want of
//   a cooldown model (9.5 presses an unforced minute against 10.8–12.7).

import type { JobCheck } from "../../types";
import { finding } from "../../checks";
import { forcedPart } from "../../timeline";
import { burstGcdFindings, k, observedWindowBonus, primaryResourceCapFindings, spenderSnapshotWaste, spentCooldownDrift } from "./shared";
import { WINDWALKER_CHECKS } from "./windwalker";
import { HAVOC_CHECKS } from "./havoc";
import { ARMS_CHECKS } from "./arms";
import { RETRIBUTION_CHECKS } from "./retribution";
import { FROST_DK_CHECKS } from "./frostdk";
import { ASSASSINATION_CHECKS } from "./assassination";
import { FERAL_CHECKS } from "./feral";

const window = (statusId: number, name: string): JobCheck => (ctx) => burstGcdFindings(ctx, {
  statusId, name,
  bonus: observedWindowBonus,
  bonusBasis: "the window's bonus read from the player's own hits, inside vs outside, capped at 30%",
  inference: true,
});

// Main cooldown buff per spec (status id as logged on the player).
const MELEE_WINDOWS: Record<string, [number, string]> = {
  "Arms Warrior":           [107574, "Avatar"],
  "Fury Warrior":           [1719, "Recklessness"],
  "Retribution Paladin":    [31884, "Avenging Wrath"],
  "Havoc Demon Hunter":     [162264, "Metamorphosis"],
  "Windwalker Monk":        [123904, "Invoke Xuen"],
  "Frost Death Knight":     [51271, "Pillar of Frost"],
  "Unholy Death Knight":    [1235391, "Dark Transformation"],
  "Assassination Rogue":    [385627, "Kingsbane"],
  "Subtlety Rogue":         [121471, "Shadow Blades"],
  "Outlaw Rogue":           [13750, "Adrenaline Rush"],
  "Feral Druid":            [106951, "Berserk"],
  "Survival Hunter":        [1250646, "Takedown"],
};

// Arms: Avatar and Colossus Smash recharge with Rage spent (shared.ts
// spentCooldownDrift has the measurement). Colossus Smash's window is a
// buff on the Warrior (208086, 13 on Cocomber's 13 casts), not an enemy
// debuff, and it lowers armor rather than raising damage, so its drift
// lives in arms.ts with its own value per use. Bladestorm's cooldown
// can't be rebuilt (11–20s comebacks); its placement against Colossus
// Smash is arms.ts's.
const ARMS_SPENT: JobCheck[] = [
  (ctx) => spentCooldownDrift(ctx, {
    name: "Avatar", actionIds: [107574], baseMs: 90_000, resourceType: 1, scale: 10, unitsPerSecond: 20,
    firstUseOffsetMs: 3_000, window: { buffId: 107574 },
  }),
  // Colossus Smash's drift is in arms.ts, valued by its armor window.
];

// Havoc's Eternal Hunt: The Hunt (370965) grants Empowered Eye Beam
// (1271144; in the buff stream since 2026-10-17, 12s: Poetry's from the
// 4:29 Hunt on LckJC7GMhQvD6rdw ran out at 4:41), consumed by the next Eye Beam. On
// 3Vz6Qt2RyTPXwpJn the 100th-percentile Hawkerton pressed Eye Beam 0.3–4.2s
// after every Hunt, for 1.8–2.6× an ordinary Eye Beam (median ~2.1×).
// Mythnarra (qpZx3mWaG7gcDdYB pull 3) pressed Eye Beam just before four of
// his six Hunts, so the next came 15–20s later at ordinary damage
// (WoWAnalyzer: 2 good, 4 bad); 6.7s after still counted (2.65×). An Eye
// Beam within EMPOWERED_MS of the Hunt counts as empowered (the buff's
// length isn't logged; 6.7s in, 15.1s out). Lost per miss: the player's own
// empowered average less their ordinary average (both measured; 2.1× the
// ordinary when they had no empowered one). Inference.
const THE_HUNT = 370965;
const EMPOWERED_MS = 10_000;
const EMPOWERED_RATIO = 2.1;
const eternalHunt: JobCheck = (ctx) => {
  const hunts = ctx.player.casts.filter((c) => c.abilityId === THE_HUNT && c.timestamp < ctx.endMs).map((c) => c.timestamp);
  const beams = ctx.player.casts.filter((c) => c.abilityName === "Eye Beam").map((c) => c.timestamp).sort((a, b) => a - b);
  if (hunts.length === 0 || beams.length < 3) return [];
  const hits = ctx.player.damageDone.filter((h) => !h.pet && h.abilityName === "Eye Beam");
  const dmgOf = (i: number) => hits.filter((h) => h.timestamp >= beams[i] && h.timestamp < Math.min(beams[i + 1] ?? Infinity, beams[i] + 4_000))
    .reduce((a, h) => a + (h.amount ?? 0), 0);
  const empowered = new Set<number>();
  const missed: number[] = [];
  for (const h of hunts) {
    const i = beams.findIndex((t) => t > h);
    if (i >= 0 && beams[i] - h <= EMPOWERED_MS) empowered.add(i);
    else if (forcedPart(h, h + EMPOWERED_MS, ctx.forced).ms < EMPOWERED_MS / 2) missed.push(h);
  }
  if (missed.length === 0) return [];
  const avg = (xs: number[]) => xs.reduce((a, x) => a + x, 0) / xs.length;
  const ordinary = avg(beams.map((_, i) => i).filter((i) => !empowered.has(i)).map(dmgOf));
  const boosted = empowered.size ? avg([...empowered].map(dmgOf)) : ordinary * EMPOWERED_RATIO;
  const per = Math.max(0, boosted - ordinary);
  const clock = (ms: number) => { const t = Math.round(ms / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
  return [finding(ctx, {
    kind: "proc-lost", startMs: missed[0], endMs: missed[missed.length - 1] + EMPOWERED_MS, forced: false, inference: true,
    label: "Eternal Hunt not used",
    lostDamage: missed.length * per,
    basis: `${missed.length} × (${k(boosted)} empowered Eye Beam${empowered.size ? ` (${empowered.size} here)` : ` (${EMPOWERED_RATIO}× assumed)`} − ${k(ordinary)} ordinary)`,
    detail: `No Eye Beam within ${EMPOWERED_MS / 1000}s of The Hunt at ${missed.map(clock).join(", ")} (${hunts.length - missed.length} of ${hunts.length} used)`,
    moments: missed.map((t) => ({ startMs: t, endMs: t + EMPOWERED_MS, detail: `The Hunt at ${clock(t)}: no Eye Beam within ${EMPOWERED_MS / 1000}s` })),
  })];
};

// Retribution's Holy Power (type 9), logged on spenders only
// (shared.ts spenderSnapshotWaste has the method and its check).
const holyPowerWaste: JobCheck = (ctx) => spenderSnapshotWaste(ctx, { type: 9, name: "Holy Power" });

export const MELEE_CHECKS: Record<string, JobCheck[]> = Object.fromEntries(
  Object.entries(MELEE_WINDOWS).map(([spec, [id, name]]) => [spec, [
    window(id, name),
    // Frost DK: no Runic Power cap check (see the header's Frost Death Knight notes).
    ...(spec === "Frost Death Knight" ? FROST_DK_CHECKS : [primaryResourceCapFindings]),
    ...(spec === "Arms Warrior" ? [...ARMS_SPENT, ...ARMS_CHECKS] : []),
    ...(spec === "Havoc Demon Hunter" ? [eternalHunt, ...HAVOC_CHECKS] : []),
    ...(spec === "Retribution Paladin" ? [holyPowerWaste, ...RETRIBUTION_CHECKS] : []),
    ...(spec === "Windwalker Monk" ? WINDWALKER_CHECKS : []),
    ...(spec === "Assassination Rogue" ? ASSASSINATION_CHECKS : []),
    ...(spec === "Feral Druid" ? FERAL_CHECKS : []),
  ]]),
);
