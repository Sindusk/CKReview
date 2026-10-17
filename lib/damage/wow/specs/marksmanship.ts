// lib/damage/wow/specs/marksmanship.ts
//
// Marksmanship Hunter's own checks and values, beside the shared ones
// ranged.ts gives it (the Trueshot window) and the tracked Trueshot
// (tracked-cooldowns.ts, priced by trueshotValue below). Built in the
// WoWAnalyzer audit's phase 3 (docs/wowa-audit/hunter-marksmanship.md),
// every rule valued as damage lost. WoWAnalyzer's Marksmanship is `stale`
// (11.0.5, partly maintained), so each rule was tested against the log
// before its source. Measured 2026-10-17 on the 61 Marksmanship
// player-pulls on disk, all Mythic: the 100th-percentile Qenjua and
// Storcken beside him (6qVxPcBdCgXrkG8a fights 144 and 151, Entombed
// Sentinels and Vashnik, fetched for this pass); the 99.9th Traviexx
// (LckJC7GMhQvD6rdw), 99.8th Leevilh (baRCnPv62YQ1dJZN), 99.7th Taewoos
// (aZ6NnwL8g9PdpGJ1) and 99.2th Tdyipce (GndQ9VFWtLzNjKpk); Firaa and
// Pisslizard (ACmXHMFtaPLR9k8w), Skipcawk (Kag91qVZ2YJ7MQAb), Spicyh and
// Emoseh (mNkHXhaD6Y2tqQTg) and the other mid-table kills; the weaker
// Teinaras (8AFnLQKdrcgawzDC, 110k/s), Marshmallon, Kebah
// (v8bmgMAdcnBCj9Ya), Warwonka (hjHXmdnJFwTPpMtK), Válï and Shadhunt
// (LCFp3wbHvQqNP4my); and the static's Shadowmeld (16 pulls on seven
// bosses in gVDPhzp61Zm29HMw, and the case study qpZx3mWaG7gcDdYB). Spell
// ids are from those logs' masterData.
//
// Talents (from casts, buffs and CombatantInfo): every one of the 61 is a
// Sentinel (Moonlight Chakram 1264949 pressed, Lunar Storm 1253733,
// Stargazer 1253750) with Precise Shots, Lock and Load, Trick Shots,
// Volley, Explosive Shot and Bulletstorm. Nobody plays Dark Ranger: no
// Black Arrow or Wailing Arrow in any log. Kill Shot is a talent 33 of
// the 61 take: one talent-tree entry (135713) is on all 33 who press it
// and on 8 of the 28 who don't, and the 100th-percentile Qenjua and the
// 99.9th Traviexx skip it. Two builds treat Precise Shots differently:
// most spend it with Arcane Shot, Multi-Shot or Kill Shot; Firaa,
// Pisslizard, Chazh and Shadowmeld on the case study have Rapid Fire take
// it at the press and turn its own at the channel's end into a Stargazer
// stack.
//
// ── Precise Shots lost (preciseShotsLost) ──────────────────────────────
// Precise Shots (260242, one stack, 15.0s: 10 of 3,577 spans end at
// 14.99–15.03s with nothing spending it, none longer) comes from every Aimed Shot (19434) and Rapid Fire
// (257044) and goes at the next Arcane Shot (185358), Multi-Shot (257620)
// or Kill Shot (53351). An Arcane Shot with it does ×1.6 one without
// (non-crit unmitigated medians on the ~20 player-pulls with an unbuffed
// non-crit hit: 1.39–1.81, e.g. Ardisus 39k vs 26k, Válï 41k vs 24k; crit rates the
// same), so a Precise Shots that's never spent loses (1 − 1/1.6) of an
// Arcane Shot with it: 31–56k (the player's own ratio when they have
// PS_MIN_HITS unbuffed non-crit hits, which nobody on the samples did).
// It is lost when an Aimed Shot lands on one still held (WCL logs a
// "refreshed"; the old one is gone), or when it runs out.
// Timeline: the GCD an Arcane Shot first takes pushes the Aimed Shot one
// GCD later. Focus doesn't stop it: the overwriting Aimed Shots are
// pressed at 85–125 Focus (Kebah's at 104–125), and no player on the samples ever pressed
// a paid Aimed Shot under its 35 or a Steady Shot under 40. Not counted:
// - an overwrite inside Trueshot, where Aimed Shot recharges fast and the
//   top players overwrite too (Qenjua 7 of his 8, Skipcawk 6 of 9);
// - Rapid Fire over one: holding a ~20s cooldown a GCD costs about what
//   the bonus is worth, and top and weak players do it alike (Tdyipce 7,
//   Aaragondelta 10; Traviexx 1, Kebah 1);
// - an Aimed Shot cast under an Arcane Shot's Focus, and forced time.
// Measured (lost a pull): top Traviexx, Heppishunt, Qenjua (Vashnik) none;
// Qenjua (Entombed Sentinels) 56k (1:02), Taewoos 43k (3:42), Leevilh 87k,
// Tdyipce 90k, Skipcawk 95k, Firaa 42k, Spicyh 44k. Weaker: Kebah 720k
// (23: 0:28, 0:38, 1:11 ..., Aimed Shot after Aimed Shot at 125 Focus with
// Precise Shots held 2–8s), Warwonka 746k (20), Válï 738k (18), Mírsad
// 489k, Bechhunt 431k, Jeffshoot 378k, Ikkuzah 371k; Shadowmeld 0–230k on
// his 16 pulls and 197k on the case study (0:24, 2:01, 3:09, 5:20, 6:25).
// WoWAnalyzer grades used ÷ (used + overwritten) only; its Aimed Shot
// timeline flag is the same event.
//
// ── Trueshot's worth (trueshotValue) ───────────────────────────────────
// Trueshot (288613) deals nothing itself, so the tracked-cooldown drift
// priced a use at 0 and never fired. Each Trueshot grants the Moonlight
// Chakram buff (1264946, 17s; procs.ts), the only way to press the Chakram
// (hits 1266081, 0.3–1.4M a press), and its 15s window raises the
// player's hits ×1.06–1.23 (non-crit medians inside vs outside, per
// ability, capped ×1.3: potions and lust line up with it too). A use is
// worth the player's Chakram damage per Trueshot plus that bonus on what
// they hit inside: 0.89M (Válï) to 2.87M (Qenjua) a use. Valued, the
// drift still fires on none of the 61: everyone presses it within a use
// of on time (intervals 120–171s; Shadowmeld's 193s on The Coiled Altar
// had no room for another use either way).
//
// ── Measured and not built ─────────────────────────────────────────────
// - Kill Shot held in the execute range (a 10.0s cooldown: shortest
//   interval 10.0s on every player but one double cast; usable under
//   20%: no cast found its target higher). A trial check (ready, an enemy the player's aimed
//   shots hit under 20%, bosses only, past 1.5s a cycle, priced at Kill
//   Shot less a Steady Shot) read the top players as high as the weak:
//   Firaa 1.03M (Breath of Ula'tek under 20% from 4:09, Kill Shot at
//   4:27), Tdyipce 848k, Pisslizard 697k, Taewoos 129k, Leevilh 66k
//   against Kebah 163k, Válï 139k, Mírsad 259k, Uldza 301k, Shadowmeld
//   2k–964k. On adds it was worse (Firaa 2.93M): top players leave
//   Entombed Sentinels' Venom Coagulations and Vashnik's Venoms in the
//   execute range to the raid. Kill Shot also takes Precise Shots from an
//   Arcane Shot, so a press isn't free. Not built.
// - Focus at the cap: removed for Marksmanship (ranged.ts has why).
// - Arcane Shot / Multi-Shot without Precise Shots: 0–12 a pull (Ardisus
//   12, Válï 9; top players 0–3). Unbuffed it does 39–65k against a Steady
//   Shot's 37–42k, and the Focus it spends costs nothing (above): about
//   nothing lost.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding } from "../../checks";
import { inWindows, mergeWindows, type Window } from "../../timeline";
import { k, s, statusWindows } from "./shared";

const PRECISE_SHOTS = 260242;            // the player's buff
const TRUESHOT = 288613;                 // the cast and the player's buff
const AIMED_SHOT = 19434;
const ARCANE_SHOT = 185358;
const MULTI_SHOT = 257620;
const KILL_SHOT = 53351;
const RAPID_FIRE = 257044;
const MOONLIGHT_CHAKRAM_HIT = 1266081;   // the Chakram's hits (cast 1264949)
const FOCUS = 2;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[xs.length >> 1];

// ── Precise Shots lost ─────────────────────────────────────────────────

const PS_MS = 15_000;
const PS_NEAR_MS = 60;
const PS_SAME_GAIN_MS = 100;
const PS_DEFAULT_RATIO = 1.6;
const PS_MIN_HITS = 5;
const PS_MAX_RATIO = 2.5;
const ARC_SPAN_MS = 1_500;
const ARC_COST_DEFAULT = 40;

/** The player's Arcane Shots with and without Precise Shots: the buffed average, and the share the buff adds. */
function arcaneValue(player: PlayerInfo, endMs: number, removals: number[]) {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === ARCANE_SHOT && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp);
  const hits = player.damageDone.filter((e) => !e.pet && e.abilityName === "Arcane Shot");
  let buffedDmg = 0, buffedN = 0;
  const w: number[] = [], o: number[] = [];
  casts.forEach((c, i) => {
    const until = Math.min(c.timestamp + ARC_SPAN_MS, casts[i + 1]?.timestamp ?? Infinity);
    const h = hits.filter((e) => e.timestamp >= c.timestamp && e.timestamp < until);
    const buffed = removals.some((t) => Math.abs(t - c.timestamp) <= PS_NEAR_MS);
    if (buffed) { buffedDmg += h.reduce((a, e) => a + (e.amount ?? 0), 0); buffedN++; }
    (buffed ? w : o).push(...h.filter((e) => e.hitType === 1 && e.unmitigatedAmount).map((e) => e.unmitigatedAmount!));
  });
  if (buffedN === 0) return undefined;
  const own = w.length >= PS_MIN_HITS && o.length >= PS_MIN_HITS;
  const ratio = own ? Math.min(PS_MAX_RATIO, Math.max(1, median(w) / median(o))) : PS_DEFAULT_RATIO;
  const avg = buffedDmg / buffedN;
  return { avg, ratio, own, value: avg * (1 - 1 / ratio), nW: w.length, nO: o.length };
}

const preciseShotsLost: JobCheck = (ctx) => {
  const p = ctx.player;
  const ev = (p.buffs ?? []).filter((b) => b.source === p.name && b.abilityId === PRECISE_SHOTS).sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length === 0) return [];
  const removals = ev.filter((b) => b.buffStatus === "removed" || b.buffStatus === "stackRemoved").map((b) => b.timestamp);
  const arc = arcaneValue(p, ctx.endMs, removals);
  if (!arc || !(arc.value > 0)) return [];
  const casts = p.casts.filter((c) => !c.fake);
  const near = (t: number, ids: number[]) => casts.find((c) => ids.includes(c.abilityId) && Math.abs(c.timestamp - t) <= PS_NEAR_MS);
  const arcCosts = casts.filter((c) => c.abilityId === ARCANE_SHOT).map((c) => c.resources?.find((r) => r.type === FOCUS)?.cost ?? 0).filter((x) => x > 0);
  const arcCost = arcCosts.length ? median(arcCosts) : ARC_COST_DEFAULT;
  const trueshot = statusWindows(ctx, TRUESHOT).map((w) => ({ startMs: w.startMs - PS_NEAR_MS, endMs: w.endMs + PS_NEAR_MS }));
  const forced = mergeWindows(ctx.forced);
  const moments: Moment[] = [];
  let overwritten = 0, expired = 0;
  let live = false, gainedAt = -Infinity;
  for (const b of ev) {
    if (b.timestamp >= ctx.endMs) break;
    if (b.buffStatus === "applied" || b.buffStatus === "refreshed" || b.buffStatus === "stack") {
      // Two gains logged within PS_SAME_GAIN_MS are one.
      if (live && b.timestamp - gainedAt > PS_SAME_GAIN_MS) {
        // A Precise Shots still held when an Aimed Shot lands is gone: one
        // Arcane Shot fewer gets the bonus. Rapid Fire over it is excused
        // (holding Rapid Fire a GCD costs about as much), so is Trueshot,
        // where the top players spend the GCD on Aimed Shot too.
        const aimed = near(b.timestamp, [AIMED_SHOT]);
        const focus = aimed?.resources?.find((r) => r.type === FOCUS)?.amount;
        if (aimed && !inWindows(b.timestamp, trueshot) && !inWindows(b.timestamp, forced) && (focus === undefined || focus >= arcCost)) {
          overwritten++;
          moments.push({ startMs: b.timestamp, endMs: b.timestamp, lostDamage: arc.value,
            detail: `Aimed Shot at ${clock(b.timestamp)} over a Precise Shots held ${s(b.timestamp - gainedAt)} (${focus !== undefined ? `${Math.round(focus)} Focus` : "Focus not logged"})` });
        }
      }
      live = true; gainedAt = b.timestamp;
    } else if (b.buffStatus === "removed") {
      const consumed = near(b.timestamp, [ARCANE_SHOT, MULTI_SHOT, KILL_SHOT, RAPID_FIRE]);
      if (!consumed && b.timestamp - gainedAt >= PS_MS - 100 && !inWindows(b.timestamp, forced)) {
        expired++;
        moments.push({ startMs: gainedAt, endMs: b.timestamp, lostDamage: arc.value, detail: `Precise Shots ran out unused at ${clock(b.timestamp)}` });
      }
      live = false;
    }
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Precise Shots lost",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `each lost Precise Shots × (${k(arc.avg)} average Arcane Shot with it × (1 − 1/${arc.ratio.toFixed(2)})): ` +
      (arc.own ? `the player's own Arcane Shot non-crit hits with vs without it (medians, ${arc.nW} / ${arc.nO})` : `×${PS_DEFAULT_RATIO}, its bonus measured on the sample players (too few unbuffed Arcane Shots to read the player's own)`),
    detail: `${overwritten} Precise Shots overwritten by an Aimed Shot outside Trueshot${expired ? `, ${expired} run out unused` : ""}: an Arcane Shot (or Multi-Shot) first would have spent it`,
    moments,
  })];
};

// ── Trueshot's worth (tracked-cooldowns.ts) ────────────────────────────

const TS_MAX_RATIO = 1.3;

/** One Trueshot's worth: the Moonlight Chakram it unlocks, plus what its windows added to the player's hits. */
export function trueshotValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const casts = player.casts.filter((c) => !c.fake && c.abilityId === TRUESHOT && c.timestamp < endMs).length;
  if (casts === 0) return undefined;
  const wins: Window[] = [];
  let open: number | undefined;
  for (const b of [...(player.buffs ?? [])].filter((x) => x.source === player.name && x.abilityId === TRUESHOT).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && open === undefined) open = b.timestamp;
    else if (b.buffStatus === "removed" && open !== undefined) { wins.push({ startMs: open, endMs: b.timestamp }); open = undefined; }
  }
  if (open !== undefined) wins.push({ startMs: open, endMs });
  const inW = (t: number) => wins.some((w) => t >= w.startMs && t <= w.endMs);
  const own = player.damageDone.filter((e) => !e.pet && e.timestamp < endMs);
  const chakram = own.filter((e) => e.abilityId === MOONLIGHT_CHAKRAM_HIT).reduce((a, e) => a + (e.amount ?? 0), 0);
  const by = new Map<number, { i: number[]; o: number[] }>();
  for (const e of own) {
    if (e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount || e.abilityId === MOONLIGHT_CHAKRAM_HIT) continue;
    const g = by.get(e.abilityId) ?? { i: [], o: [] };
    (inW(e.timestamp) ? g.i : g.o).push(e.unmitigatedAmount);
    by.set(e.abilityId, g);
  }
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.i.length < 5 || g.o.length < 5) continue;
    sum += (Math.min(TS_MAX_RATIO, Math.max(1, median(g.i) / median(g.o))) - 1) * g.i.length;
    n += g.i.length;
  }
  const ratio = n >= 20 ? 1 + sum / n : 1;
  const inside = own.filter((e) => e.abilityId !== MOONLIGHT_CHAKRAM_HIT && inW(e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const added = inside * (1 - 1 / ratio);
  const value = (chakram + added) / casts;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `${k(value)} a use (the Moonlight Chakram it unlocks, ${k(chakram / casts)} a Trueshot, + ${k(added / casts)} its window added to the player's hits: ×${ratio.toFixed(2)} inside vs outside, non-crit medians; ${casts} casts)`,
  };
}

export const MARKSMANSHIP_CHECKS: JobCheck[] = [preciseShotsLost];
