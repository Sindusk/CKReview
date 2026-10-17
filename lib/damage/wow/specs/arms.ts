// lib/damage/wow/specs/arms.ts
//
// Arms Warrior's own checks, beside the shared ones melee.ts gives it
// (Avatar window and drift, Rage at the cap; the Sudden Death expiry is
// procs.ts'). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/warrior-arms.md), every rule valued as damage lost.
// Measured 2026-10-17 on the 44 Arms player-pulls on disk, all Mythic:
// the top Entombed Sentinels parses Peraa (baRCnPv62YQ1dJZN, 100th),
// Белегард (Vr8dLPtFYWA4G1yg, 99.7th) and Quessa beside him, Eroka
// (VWMbYPRyxCAmhZFj, ~99th), Nagafenw (ACmXHMFtaPLR9k8w, ~99th), Crimw
// (dG8D9y6WxrfmtgXp), Gromnakspot (LckJC7GMhQvD6rdw), Chudstrike
// (GndQ9VFWtLzNjKpk); on Vashnik Hanitus (hjHXmdnJFwTPpMtK) and Gillick
// (Kag91qVZ2YJ7MQAb); the weaker Loundy (94.8th) and Gnomerouge (93.7th),
// Jisoozuha (JvQpZk3CXj78Dx2f), Tiapanki (LCFp3wbHvQqNP4my), Captñkrunch
// (r9CX1kpRGLmKJH4M), and the static's Hervous (16 pulls on seven bosses,
// gVDPhzp61Zm29HMw, and the case study qpZx3mWaG7gcDdYB) and Cocomber
// (qpZx3mWaG7gcDdYB). Spell ids are from those logs' masterData.
//
// Talents (from casts, buffs and hits): all 44 play the same build:
// Slayer (Slayer's Strike, Executioner's Precision, Imminent Demise,
// Sudden Death), Colossus Smash (not Warbreaker), Avatar, Bladestorm with
// Unhinged (its Mortal Strikes), Sweeping Strikes, Cleave, Master of
// Warfare's Heroic Strike, and Rend and Deep Wounds applied by their
// presses (Rend is cast by name twice in 44 pulls). Nobody plays
// Colossus (no Demolish or Colossal Might), Ravager or Champion's Spear,
// so the rules for those fire on nothing and aren't built.
//
// ── Colossus Smash's window is armor, not a damage buff ────────────────
// Colossus Smash (167105) puts a 10.0s buff on the Warrior (208086; every
// window 10.0s) that raises physical hits after armor, not before it:
// non-crit hits inside vs outside (outside Avatar) were ×1.4–1.6 on their
// `amount` (Eroka: melee 1.54, Mortal Strike 1.63; Cocomber: Bladestorm
// 1.45, Execute 1.48; secondary targets too: 蒼武影's Bladestorm ticks on a
// Burning Venom 35k vs 24k) but ×0.98–1.08 on `unmitigatedAmount`, and
// magic hits (Rune of Lingering, Rune of Unleashed Fire) ×1.00.
// observedWindowBonus reads `unmitigatedAmount`, so the shared drift check
// had priced a Colossus Smash at its window's 10–24% "bonus", mostly
// Deep Wounds (Hervous qpZx3mWaG7gcDdYB: 11%, 196k for a lost use).
// armorRatios() reads the after-armor ratio per physical hit name instead
// (pooled ×1.32–1.56 a player).
//
// ── Colossus Smash held (smashDrift) ───────────────────────────────────
// The shared spentCooldownDrift (45s less 1s per 20 Rage spent; shared.ts
// has the fit), moved here from melee.ts with its value per use replaced:
// what each of the player's windows added to the hits inside it (each
// hit × (1 − 1/ratio)), averaged. 0.56–1.08M a use. Measured (lost a
// pull): every top player none; Hervous 0.58M on the case study (was
// 196k), 1.65M at Entombed Sentinels Pull 1 (two uses), 0.56–1.08M on
// three more of his pulls; Tiapanki 1.47M (two uses), Lukethewar 0.72M.
//
// ── Bladestorm outside Colossus Smash (bladestormOffSmash) ─────────────
// Every top player presses Bladestorm (446035, a ~4.5s channel: its ticks
// 50622 and the Mortal Strikes it casts) 1–2.5s after each Colossus Smash,
// so it comes every ~30s, the Smash's cadence (Eroka 0:03, 0:30, 1:06,
// 1:37 …). Its own cooldown can't be rebuilt from the log (see the
// ledger's Bladestorm efficiency row), but pressing it between Smashes
// buys no extra uses: weaker players who do it press no more Bladestorms a
// minute (1.5–2.2) than the top ones (1.75–2.0). A Bladestorm pressed
// outside the window, when the next Smash window then had none, put its
// channel where armor wasn't down: lost = its hits × (ratio − 1), less
// what holding it would have cost, the channel's length × the player's
// other presses (physical, not melee swings) per second outside the
// windows × (pooled ratio − 1): held, the channel takes those GCDs' place
// in the window. Not counted: a Bladestorm whose next Smash window had a
// Bladestorm too (an extra use), no Smash left before the pull's last 3s,
// a press or next Smash in forced time, and a channel that spent 20%+ of
// its damage on enemies gone before the next Smash (adds that die can't
// wait: Eroka's 4:58 on a Venom Coagulation, Apook's 3:29 on two Burning
// Venoms). 0–0.5M a press. WoWAnalyzer flags only a Bladestorm with
// Colossus Smash or Avatar ready within a few seconds; the top players
// hold it for the whole wait (up to 30s+).
// Measured (lost a pull): top Peraa, Eroka, Crimw, Gromnakspot, Quessa,
// Chudstrike, Gillick, Hanitus none; Белегард 184k (3:01, Smash 10.3s
// later), Nagafenw 261k (1:19, 4:40). Weaker: Jisoozuha 1.33M (four, 1:22
// the largest at 506k), Cocomber 656k (3:14, 3:37, 5:41), Tiapanki 549k,
// Captñkrunch 409k, Gnomerouge 253k, Loundy none; Hervous 75k on the case
// study (5:15) and 1.65M over his static's 16 pulls (356k at Entombed
// Sentinels Pull 4: 1:22 and 1:56).

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, type Window } from "../../timeline";
import { k, s, spentCooldownDrift, statusWindows } from "./shared";

const COLOSSUS_SMASH = 167105;   // the cast
const SMASH_WINDOW = 208086;     // the armor window, a buff on the Warrior (10.0s)
const AVATAR = 107574;           // the cast and its buff
const BLADESTORM = 446035;       // the cast and its buff (the channel)
const BLADESTORM_TICK = 50622;
// Physical hits Colossus Smash's window raises (by hit name).
const PHYSICAL = new Set(["Melee", "Mortal Strike", "Bladestorm", "Overpower", "Slam", "Execute", "Slayer's Strike",
  "Heroic Strike", "Cleave", "Reap the Storm"]);
const MAX_RATIO = 2;
const END_MARGIN_MS = 3_000;
const DYING_ADDS_SHARE = 0.2;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const inside = (ws: Window[], t: number, slackMs = 0) => ws.some((w) => t >= w.startMs - slackMs && t <= w.endMs);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

type Armor = { ratio(name: string): number; pooled: number; basis: string };

/**
 * What Colossus Smash's window does to the player's hits: per physical hit
 * name, the median non-crit hit (amount after armor) inside the window ÷
 * outside it, outside Avatar. Names with too few hits take the pooled ratio
 * (weighted by hits inside); non-physical hits are 1.
 */
function armorRatios(ctx: PlayerCheckContext): Armor | undefined {
  const smash = statusWindows(ctx, SMASH_WINDOW);
  if (smash.length === 0) return undefined;
  const avatar = statusWindows(ctx, AVATAR);
  const by = new Map<string, { i: number[]; o: number[] }>();
  for (const h of ctx.player.damageDone) {
    if (h.pet || h.hitType !== 1 || !(h.amount! > 0) || h.timestamp >= ctx.endMs || !PHYSICAL.has(h.abilityName)) continue;
    if (inside(avatar, h.timestamp)) continue;
    const g = by.get(h.abilityName) ?? { i: [], o: [] };
    (inside(smash, h.timestamp) ? g.i : g.o).push(h.amount!);
    by.set(h.abilityName, g);
  }
  const ratios = new Map<string, number>();
  let sum = 0, n = 0;
  for (const [name, g] of by) {
    if (g.i.length < 3 || g.o.length < 3) continue;
    const r = Math.min(MAX_RATIO, Math.max(1, median(g.i) / median(g.o)));
    ratios.set(name, r);
    sum += (r - 1) * g.i.length; n += g.i.length;
  }
  if (n < 10) return undefined;
  const pooled = 1 + sum / n;
  return {
    ratio: (name) => ratios.get(name) ?? (PHYSICAL.has(name) ? pooled : 1),
    pooled,
    basis: `physical hits ×${pooled.toFixed(2)} inside Colossus Smash (the player's non-crit hits after armor, inside vs outside, outside Avatar)`,
  };
}

// ── Bladestorm outside Colossus Smash (bladestormOffSmash) ─────────────

const bladestormOffSmash: JobCheck = (ctx) => {
  const armor = armorRatios(ctx);
  if (!armor) return [];
  const smash = statusWindows(ctx, SMASH_WINDOW);
  const storms = statusWindows(ctx, BLADESTORM).filter((w) => w.startMs < ctx.endMs);
  if (storms.length < 2) return [];
  const smashCasts = ctx.player.casts.filter((c) => !c.fake && c.abilityId === COLOSSUS_SMASH).map((c) => c.timestamp).sort((a, b) => a - b);
  const forced = mergeWindows(ctx.forced);
  const hits = ctx.player.damageDone.filter((h) => !h.pet && (h.abilityId === BLADESTORM_TICK || h.abilityName === "Mortal Strike"));
  const smashLen = median(smash.map((w) => w.endMs - w.startMs));
  // The player's ordinary presses: physical hits other than melee swings, per ms outside
  // Colossus Smash, Avatar, Bladestorm and forced time.
  const excluded = mergeWindows([...smash, ...statusWindows(ctx, AVATAR), ...storms, ...forced]);
  const openMs = ctx.endMs - excluded.reduce((a, w) => a + Math.max(0, Math.min(w.endMs, ctx.endMs) - Math.max(0, w.startMs)), 0);
  if (openMs < 30_000) return [];
  const pressRate = ctx.player.damageDone
    .filter((h) => !h.pet && !h.isDoT && h.timestamp < ctx.endMs && PHYSICAL.has(h.abilityName) && h.abilityName !== "Melee" && !inside(excluded, h.timestamp))
    .reduce((a, h) => a + (h.amount ?? 0), 0) / openMs;
  const enemy = (h: { target?: string; targetActorId?: number; targetInstance?: number }) => `${h.targetActorId ?? h.target}.${h.targetInstance ?? 1}`;
  const lastHit = new Map<string, number>();
  for (const h of ctx.player.damageDone) if (!h.pet) lastHit.set(enemy(h), Math.max(lastHit.get(enemy(h)) ?? 0, h.timestamp));
  const moments: Moment[] = [];
  for (const w of storms) {
    if (inside(smash, w.startMs, 50) || inside(forced, w.startMs)) continue;
    const next = smashCasts.find((t) => t > w.startMs);
    if (next === undefined || next > ctx.endMs - END_MARGIN_MS || inside(forced, next)) continue;
    // The next window got a Bladestorm of its own: this one was an extra use, not a misplaced one.
    if (storms.some((x) => x.startMs > w.startMs && x.startMs >= next - 50 && x.startMs <= next + smashLen)) continue;
    const mine = hits.filter((h) => h.timestamp >= w.startMs && h.timestamp <= w.endMs + 100);
    const dmg = mine.reduce((a, h) => a + (h.amount ?? 0), 0);
    // Spent on adds that were gone before the next Smash: held, those hits were lost.
    const gone = mine.filter((h) => !lastHit.has(enemy(h)) || lastHit.get(enemy(h))! < next).reduce((a, h) => a + (h.amount ?? 0), 0);
    if (gone >= DYING_ADDS_SHARE * dmg) continue;
    // Held into the window, the channel takes the time the player's other presses would have had there.
    const displaced = (w.endMs - w.startMs) * pressRate;
    const lost = mine.reduce((a, h) => a + (h.amount ?? 0) * (armor.ratio(h.abilityName) - 1), 0) - displaced * (armor.pooled - 1);
    if (lost <= 0) continue;
    moments.push({ startMs: w.startMs, endMs: next, lostDamage: lost,
      detail: `Bladestorm at ${clock(w.startMs)} outside Colossus Smash (${k(dmg)} against ${k(displaced)} of ordinary GCDs in its ${s(w.endMs - w.startMs)}); the next Smash at ${clock(next)}, ${s(next - w.startMs)} later, had none` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "burst-window", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Bladestorm outside Colossus Smash",
    lostDamage: moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0),
    basis: `(each channel's Bladestorm and Mortal Strike hits − ${k(pressRate * 1000)}/s, the player's other presses outside the windows, over the channel's length: what the window would have had instead) × what Colossus Smash adds (${armor.basis})`,
    detail: `${moments.length} Bladestorm${moments.length > 1 ? "s" : ""} pressed outside Colossus Smash, with no Bladestorm in the next Smash window`,
    moments,
  })];
};

// ── Colossus Smash held (the shared drift, valued by its armor) ────────

/** One Colossus Smash's worth: what its window added to the hits inside it, averaged over the player's windows. */
function smashUseValue(ctx: PlayerCheckContext): { value: number; basis: string } | undefined {
  const armor = armorRatios(ctx);
  if (!armor) return undefined;
  const wins = statusWindows(ctx, SMASH_WINDOW).filter((w) => w.endMs <= ctx.endMs);
  if (wins.length < 2) return undefined;
  const added = wins.map((w) => ctx.player.damageDone
    .filter((h) => !h.pet && h.timestamp >= w.startMs && h.timestamp <= w.endMs)
    .reduce((a, h) => a + (h.amount ?? 0) * (1 - 1 / armor.ratio(h.abilityName)), 0));
  const value = added.reduce((a, x) => a + x, 0) / added.length;
  if (!(value > 0)) return undefined;
  return { value, basis: `${k(value)} a use (what each of the player's ${wins.length} Colossus Smash windows added to the hits in it; ${armor.basis})` };
}

const smashDrift: JobCheck = (ctx) => spentCooldownDrift(ctx, {
  name: "Colossus Smash", actionIds: [COLOSSUS_SMASH], baseMs: 45_000, resourceType: 1, scale: 10, unitsPerSecond: 20,
  firstUseOffsetMs: 3_000, window: { buffId: SMASH_WINDOW }, valuePerUse: smashUseValue,
});

export const ARMS_CHECKS: JobCheck[] = [smashDrift, bladestormOffSmash];
