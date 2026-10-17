// lib/damage/wow/specs/unholy.ts
//
// Unholy Death Knight's own checks and values, beside the Dark
// Transformation window melee.ts gives it and the tracked Dark
// Transformation and Army of the Dead drift (tracked-cooldowns.ts, valued
// here). Built in the WoWAnalyzer audit's phase 3
// (docs/wowa-audit/deathknight-unholy.md, 2026-10-17), every rule valued as
// damage lost, pets included (pets are 35–48% of an Unholy player's
// damage). WoWAnalyzer's Unholy is `lagging` (12.0.7 against a 12.1.0
// clone), so its rules were checked against the log, not trusted.
//
// Measured on 31 Unholy player-pulls, all Mythic kills: the top parses
// Youlongdk (Mp129Kf8bqcVZmrv, Vashnik 100th, fetched for this pass),
// Yldksi (VbAHWZDdPwJBajmx, Vashnik 99.9th), Finesthour (th1Ap4QrBPJyma23,
// 98.1st), Zetalive (mC2HTDW7n3A1xK4b, Entombed Sentinels 100th, fetched),
// Zarmakai (Kag91qVZ2YJ7MQAb) and Kleaver (KB1a9CWc6pT4VGqA); the weaker
// Skargur (BTAdZMzQxgJf4XyH, Entombed Sentinels 8.8th, fetched), Klingdeath
// (Ndh2H6Qw4Pp1qaMk, Vashnik 17th) with Dkchilly beside him, 封神幻憶
// (7B1wQbjNhgXJDaHC, 17.6th), 默陌然, 亡者大軍, Varandar, Tilvayne and the
// rest of the Vashnik and Entombed Sentinels kills on disk. Spell ids are
// from those logs' masterData.
//
// Talents (casts, buffs, pets; CombatantInfo has entry ids without
// names): 30 of 31 are San'layn (Vampiric Strike, Essence of the Blood
// Queen, Blood Beast); Фаерволочка (7L3RKpavDA8T4MjY) is Rider of the
// Apocalypse (the four horsemen, no Vampiric Strike, no Abomination).
// Everyone plays Putrefy, Festering Scythe, Lesser Ghouls, Forbidden
// Knowledge (Army of the Dead's 30s: Death Coil becomes Necrotic Coil),
// Sudden Doom, Soul Reaper with Reaping (each Dark Transformation allows
// one, 30.0s) and Dread Plague; Blightfall on 28, Graveyard on 19,
// Epidemic on 15. Lord of the Dead and Magus of the Dead are up all pull
// (not Army's); Army raises the Abomination (30s).
//
// ── Dread / Virulent Plague off every enemy (plagueOff) ────────────────
// Blightfall (1271967, a ready buff that never runs out: held up to 44s)
// consumes both plagues on its target for one big Erupt (1.04M a press).
// The next Scourge / Vampiric Strike puts Virulent Plague (191587) back;
// Dread Plague (1240996) comes back only ~0.5s after the next Putrefy. The
// top players press Putrefy right after Blightfall (Youlongdk 0:26.4 →
// 0:27.1), so Dread Plague never leaves them; the weaker ones press
// Blightfall outside Dark Transformation with no Putrefy to follow
// (Klingdeath 3:01 → 3:33, 33s without it). A second of uptime is worth the
// plague's ticks plus the Erupts the strikes burst from it (the strikes'
// Erupts need the plague up; Blightfall's own left out): Dread Plague 21–23k
// a second (ticks 9–11k, Erupts 10–12k), Virulent 11–13k. Gaps from the
// first application, outside forced time, past one GCD + 1s (time to
// reapply), on any enemy. Measured (lost a pull): Dread Plague top Yldksi
// 48k, Zarmakai 64k, Zetalive 160k (5:19, 4.4s), Youlongdk, Finesthour,
// Kleaver none; weaker Dkchilly 1.85M (88.7s in eight stretches, 5:43–6:11
// the longest), Klingdeath 1.48M, 默陌然 1.41M, Varandar 945k, Bdknevermeta
// 709k, 烽痞巴拉刚 667k, Skargur 630k. Virulent Plague top 0–54k, weaker up
// to 258k (Varandar).
//
// ── Strike without a Lesser Ghoul (strikeWithoutGhoul) ─────────────────
// Festering Strike, Festering Scythe and Putrefy put Lesser Ghoul charges
// on the player (1254252, up to 8; they never run out: 0 unused removals
// outside deaths on 31 player-pulls); each Scourge Strike (55090) or
// Vampiric Strike (433895) spends one and raises a Lesser Ghoul (1242998
// stacks by one). The strike's own hit is the same with or without a
// charge (Vampiric Strike 73–112k with, 59–161k without, noisy), so a
// strike with none lost the ghoul it would have raised: the Lesser Ghouls'
// hits over the ghouls raised, 24–40k (Army's ghouls in the count too).
// Spent = a charge removal 20ms before to 60ms after the strike. Measured
// (stackless strikes, lost): top Yldksi 0, Youlongdk 1 (31k), Finesthour 1,
// Zarmakai 1, Zetalive 4 (159k: 0:18, 0:19, 3:46, 5:02), Kleaver 3; weaker
// 默陌然 37 (1.07M), Dkchilly 26 (903k), 亡者大軍 25 (671k), 堕落者埃蒙 20
// (646k), Skargur 17 (452k).
//
// ── Sudden Doom lost (suddenDoomLost) ──────────────────────────────────
// Sudden Doom (81340, two stacks, 10.0s: 4 removals with no coil at
// 10.00–10.06s after the last gain, the longest span of 1,585) empowers the
// next Death Coil, Necrotic Coil, Epidemic or Graveyard: the removal lands
// 0.2–0.35s after the coil (it travels), so it's matched within 500ms. It
// doesn't refund the 30 Runic Power. What it adds, the player's own coils
// with it less without (own hits by name to 1s, plus the Lesser Ghouls'
// Death / Epidemic Order to the next cast, which it sets off): Necrotic Coil
// +75–100k (150–250k vs 70–120k), Death Coil +10–25k. A lost one is priced
// at the coil it would have gone to: Necrotic Coil inside Forbidden
// Knowledge. Two ways to lose one: it runs out (9.4–11.5s after the last
// gain, no consumer beside), or a new one comes at two stacks (logged as a
// "refreshed" with no stackRemoved beside it). checkProcs has no entry for
// it (procs.ts). Everyone spends it fast (median 1.4–2.6s after the gain,
// top and weak alike), so speed isn't judged. Measured (lost a pull): top
// Youlongdk, Yldksi, Zarmakai, Zetalive none; Finesthour 206k (two at
// 4:40–4:42, held at full Runic Power through his Army / Dark
// Transformation opener), Kleaver 80k; weaker Tilvayne 406k (7), Varandar
// 224k (9), Machiñe 184k, 燃烧的火龙 165k, Heringodie 138k, Klingdeath 134k.
//
// ── Dark Transformation's and Army of the Dead's worth ─────────────────
// Neither deals damage under its cast id, so the tracked drift
// (tracked-cooldowns.ts) priced a lost use at 0 and never fired.
// darkTransformationValue: what the window (1235391) added to every hit,
// pets included (per ability, median non-crit inside ÷ outside, weighted,
// capped at 30%; Erupts read ×1.9, Putrefy ×1.3, the ghoul's melee ×3.5,
// so the cap always holds), × the damage inside each window: 0.95–2.74M a
// use (Youlongdk 2.73M, Skargur 949k). armyOfTheDeadValue: the
// Abomination's hits a use (0.38–0.93M; none for the Rider) plus Forbidden
// Knowledge's Necrotic Coils over as many Death Coils (0.18–1.21M a use),
// less the GCD it takes: 0.6–1.9M (the Rider ~0.1M). Dark Transformation is a clean 45s
// (shortest 45.0s, Skargur's median 45.8s), Army 90.3–91.1s. Drift now
// fires on no top player; weaker Klingdeath (Dark Transformation 0:51 →
// 1:57, 1.48M; Army 0:03 → 1:58, 972k), 堕落者埃蒙, Tilvayne, 钰秀, Varandar
// (1.14–1.98M a use lost), Ketaminkeith (Army 912k).
//
// ── Runic Power at the cap: dropped for Unholy (melee.ts) ──────────────
// The shared check read 41–507k a pull on everyone (Youlongdk 275k:
// Dark Transformation ×2 and Death Grip at 1000; Heringodie 507k from
// Death Grip ×5 and Blightfall). Every cast it can see at full Runic Power
// generates none: bracketed to the next Runic-Power-logging cast within
// 1.2s, Festering Scythe gave ≤3 in 236 of 250 pairs, Dark Transformation
// 34 of 43, Blightfall 22 of 22, Death Grip 50 of 52. The generators
// (Scourge / Vampiric / Festering Strike, Putrefy, Soul Reaper) log runes,
// not Runic Power, on their casts, so their overflow isn't in the log, and
// it priced a unit at every spender's hits (Graveyard's included). Frost
// and Blood dropped it for the same reason.
//
// ── Measured and not built (numbers in the ledger) ─────────────────────
// - Reaping run out (the Soul Reaper per Dark Transformation): 30.0s, 7
//   expiries on 31 player-pulls (top Youlongdk 1; 亡者大軍 and Skargur 3).
//   A Soul Reaper with it is 65–167k, at or under the average GCD (81–156k
//   once the Erupts and Orders count, game.ts), so a lost one is worth ~0.
// - Putrefy charges and Putrefy outside Dark Transformation: no charge
//   model fits tightly (the slowest with no impossible press, 3 charges,
//   30s less 3s per ghoul raised, leaves the top players capped 28–37% of
//   the pull, the weak 35–72%: they pool for Dark Transformation); at equal
//   ghouls up a Putrefy inside the window isn't worth more (0.60 vs 0.52 of
//   an average press's hits in 2s).
// - Festering Scythe's buff (1241077, ~25s): up 98–99% on the top players,
//   73–87% on some weaker, but no hit reads higher with it (ratios 0.6–1.0),
//   so its loss can't be priced.
// - A lead outside WoWAnalyzer's rules: Lesser Ghoul charges lost to the
//   cap of 8 (Festering Strike / Scythe or Putrefy pressed at 7–8): top
//   5–18 charges a pull, most weaker players the same, but Varandar ~134
//   and Phobius ~102 (Festering Strike pressed at 8, 35–41 presses a pull
//   against the usual ~20). Unpriced.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { inWindows, mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s } from "./shared";

const DT_BUFF = 1235391;                 // Dark Transformation (the window; cast 1233448)
const ARMY = 42650;
const FORBIDDEN_KNOWLEDGE = 1242223;     // 30s from each Army of the Dead: Death Coil becomes Necrotic Coil
const VIRULENT_PLAGUE = 191587;
const DREAD_PLAGUE = 1240996;
const VP_ERUPT = 1241167;
const DP_ERUPT = 1241171;
const BLIGHTFALL = 1271967;
const SCOURGE_STRIKE = 55090;
const VAMPIRIC_STRIKE = 433895;
const LG_CHARGE = 1254252;               // Lesser Ghoul charges (Festering Strike / Scythe, Putrefy), spent by the strikes
const LG_RAISED = 1242998;               // Lesser Ghouls up (a stack per ghoul raised)
const SUDDEN_DOOM = 81340;
const DEATH_COIL = 47541;
const NECROTIC_COIL = 1242174;
const EPIDEMIC = 207317;
const GRAVEYARD = 383269;
const ORDERS = new Set([1294264, 1300330]); // Lesser Ghouls' Death Order / Epidemic Order
const COIL_IDS = new Set([DEATH_COIL, NECROTIC_COIL]);
const SD_CONSUMERS = new Set([DEATH_COIL, NECROTIC_COIL, EPIDEMIC, GRAVEYARD]);

const BLIGHTFALL_ERUPT_MS = 400;
const STRIKE_SPEND_BEFORE_MS = 20;
const STRIKE_SPEND_AFTER_MS = 60;
const MIN_GHOULS = 20;
const SD_MS = 10_000;
const SD_MAX = 2;
const SD_LAND_MS = 500;                  // a coil's removal of Sudden Doom lands up to ~0.35s after it
const COIL_HIT_MS = 1_000;
const PAIR_MS = 5;
const BONUS_CAP = 0.3;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

/** One press per spell per instant, before the pull's end. */
function presses(player: PlayerInfo, ids: Set<number>, endMs: number) {
  const out: { t: number; id: number }[] = [];
  for (const c of player.casts.filter((c) => !c.fake && ids.has(c.abilityId) && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp)) {
    if (out.length && c.timestamp - out[out.length - 1].t < 100 && out[out.length - 1].id === c.abilityId) continue;
    out.push({ t: c.timestamp, id: c.abilityId });
  }
  return out;
}

/** The player's own buff as windows (apply → remove). */
function buffWindows(player: PlayerInfo, id: number, endMs: number): Window[] {
  const ws: Window[] = [];
  let st: number | undefined;
  for (const b of (player.buffs ?? []).filter((b) => b.abilityId === id).sort((a, b) => a.timestamp - b.timestamp)) {
    if (b.buffStatus === "applied" && st === undefined) st = b.timestamp;
    else if (b.buffStatus === "removed" && st !== undefined) { ws.push({ startMs: st, endMs: b.timestamp }); st = undefined; }
  }
  if (st !== undefined) ws.push({ startMs: st, endMs });
  return ws.filter((w) => w.startMs < endMs);
}

// ── Virulent / Dread Plague off every enemy ────────────────────────────

const plagueOff = (name: string, statusId: number, eruptId: number): JobCheck => (ctx) => {
  const p = ctx.player;
  const events = (ctx.pull.bossDebuffs ?? [])
    .filter((e) => e.statusId === statusId && e.sourceName === p.name && e.timestamp < ctx.endMs)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (events.length === 0) return [];
  const ws: Window[] = [];
  const open = new Map<string, number>();
  for (const e of events) {
    const key = `${e.targetActorId}.${e.targetInstance ?? 1}`;
    if (e.status === "removed") {
      const st = open.get(key);
      if (st !== undefined) { ws.push({ startMs: st, endMs: e.timestamp }); open.delete(key); }
    } else if (!open.has(key)) open.set(key, e.timestamp);
  }
  for (const st of open.values()) ws.push({ startMs: st, endMs: ctx.endMs });
  const up = mergeWindows(ws);
  const upMs = up.reduce((a, w) => a + Math.min(w.endMs, ctx.endMs) - w.startMs, 0);
  if (upMs <= 0) return [];
  // A second of uptime is worth its ticks and the Erupts the strikes burst
  // from it; Blightfall's own Erupt (it consumes the plague) isn't counted.
  const blight = p.casts.filter((c) => !c.fake && c.abilityId === BLIGHTFALL).map((c) => c.timestamp);
  const fromBlightfall = (t: number) => blight.some((b) => t >= b && t - b < BLIGHTFALL_ERUPT_MS);
  let ticks = 0, erupts = 0;
  for (const e of p.damageDone) {
    if (e.pet || e.timestamp >= ctx.endMs) continue;
    if (e.abilityId === statusId && e.isDoT) ticks += e.amount ?? 0;
    else if (e.abilityId === eruptId && !fromBlightfall(e.timestamp)) erupts += e.amount ?? 0;
  }
  const perMs = (ticks + erupts) / upMs;
  if (!(perMs > 0)) return [];
  const forced = mergeWindows(ctx.forced);
  const grace = ctx.baseGcdMs + 1_000;
  const moments: Moment[] = [];
  let lostMs = 0;
  let cursor = up[0].startMs;
  for (const w of [...up, { startMs: ctx.endMs, endMs: ctx.endMs }]) {
    if (w.startMs > cursor) {
      const len = w.startMs - cursor - overlapMs(cursor, w.startMs, forced);
      if (len >= grace) {
        lostMs += len;
        moments.push({ startMs: cursor, endMs: w.startMs, lostDamage: len * perMs,
          detail: `${name} on no enemy ${clock(cursor)}–${clock(w.startMs)} (${s(len)} outside forced time)` });
      }
    }
    cursor = Math.max(cursor, w.endMs);
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "dot-uptime", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: `${name} off every enemy`,
    lostDamage: lostMs * perMs,
    basis: `${s(lostMs)} × ${k(perMs * 1000)}/s (${name}'s ticks ${k(ticks / upMs * 1000)}/s + the Erupts strikes burst from it ${k(erupts / upMs * 1000)}/s, per second of uptime this pull; Blightfall's Erupt left out)`,
    detail: `${name} was on no enemy for ${s(lostMs)} in ${moments.length} stretch${moments.length > 1 ? "es" : ""} past ${s(grace)} each`,
    moments,
  })];
};

// ── Scourge / Vampiric Strike without a Lesser Ghoul ───────────────────

/** One Lesser Ghoul's worth: the Lesser Ghouls' damage over the ghouls raised. */
function ghoulValue(p: PlayerInfo, endMs: number): { value: number; raised: number } | undefined {
  const raised = (p.buffs ?? []).filter((b) => b.abilityId === LG_RAISED && b.timestamp < endMs && (b.buffStatus === "applied" || b.buffStatus === "stack")).length;
  if (raised < MIN_GHOULS) return undefined;
  const dmg = p.damageDone.filter((e) => e.pet === "Lesser Ghoul" && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  return dmg > 0 ? { value: dmg / raised, raised } : undefined;
}

const strikeWithoutGhoul: JobCheck = (ctx) => {
  const p = ctx.player;
  const charges = (p.buffs ?? []).filter((b) => b.abilityId === LG_CHARGE);
  if (charges.length < 10) return [];
  const g = ghoulValue(p, ctx.endMs);
  if (!g) return [];
  const spends = charges.filter((b) => b.buffStatus === "stackRemoved" || b.buffStatus === "removed").map((b) => b.timestamp);
  const forced = mergeWindows(ctx.forced);
  const strikes = presses(p, new Set([SCOURGE_STRIKE, VAMPIRIC_STRIKE]), ctx.endMs);
  const moments: Moment[] = [];
  for (const { t, id } of strikes) {
    if (inWindows(t, forced)) continue;
    if (spends.some((x) => x >= t - STRIKE_SPEND_BEFORE_MS && x <= t + STRIKE_SPEND_AFTER_MS)) continue;
    moments.push({ startMs: t, endMs: t, lostDamage: g.value,
      detail: `${id === VAMPIRIC_STRIKE ? "Vampiric Strike" : "Scourge Strike"} at ${clock(t)} with no Lesser Ghoul charge: no ghoul raised` });
  }
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "wrong-gcd", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Strike without a Lesser Ghoul",
    lostDamage: moments.length * g.value,
    basis: `${moments.length} × ${k(g.value)} a Lesser Ghoul (their hits this pull over the ${g.raised} raised): a strike with a charge raises one, the strike's own hit is the same either way`,
    detail: `${moments.length} of ${strikes.length} Scourge / Vampiric Strikes spent no Lesser Ghoul charge (Festering Strike first would have given some)`,
    moments,
  })];
};

// ── Sudden Doom lost ───────────────────────────────────────────────────

/** A coil's worth with Sudden Doom less without, per coil, from the player's own (own hits by name + the ghouls' Orders to the next cast). */
function coilGains(p: PlayerInfo, endMs: number): Map<number, { gain: number; n: number }> {
  const sd = (p.buffs ?? []).filter((b) => b.abilityId === SUDDEN_DOOM && (b.buffStatus === "removed" || b.buffStatus === "stackRemoved")).map((b) => b.timestamp);
  const casts = p.casts.filter((c) => !c.fake && c.timestamp < endMs).sort((a, b) => a.timestamp - b.timestamp);
  const rows = new Map<number, { w: number[]; wo: number[] }>();
  casts.forEach((c, i) => {
    if (!COIL_IDS.has(c.abilityId)) return;
    const next = Math.min(casts[i + 1]?.timestamp ?? Infinity, c.timestamp + COIL_HIT_MS);
    let d = 0;
    for (const e of p.damageDone) {
      if (e.timestamp < c.timestamp || e.timestamp >= c.timestamp + COIL_HIT_MS) continue;
      if (!e.pet && e.abilityName === c.abilityName) d += e.amount ?? 0;
      else if (e.pet && ORDERS.has(e.abilityId) && e.timestamp < next) d += e.amount ?? 0;
    }
    const withSd = sd.some((x) => x - c.timestamp >= -20 && x - c.timestamp <= SD_LAND_MS);
    const r = rows.get(c.abilityId) ?? { w: [], wo: [] };
    (withSd ? r.w : r.wo).push(d);
    rows.set(c.abilityId, r);
  });
  const out = new Map<number, { gain: number; n: number }>();
  for (const [id, r] of rows) if (r.w.length >= 3 && r.wo.length >= 3) out.set(id, { gain: Math.max(0, avg(r.w) - avg(r.wo)), n: r.w.length });
  return out;
}

const suddenDoomLost: JobCheck = (ctx) => {
  const p = ctx.player;
  const ev = (p.buffs ?? []).filter((b) => b.abilityId === SUDDEN_DOOM).sort((a, b) => a.timestamp - b.timestamp);
  if (ev.length < 10) return [];
  const gains = coilGains(p, ctx.endMs);
  const fk = buffWindows(p, FORBIDDEN_KNOWLEDGE, ctx.endMs);
  // The coil a lost proc would have gone to: Necrotic Coil inside Forbidden Knowledge.
  const valueAt = (t: number) => (inWindows(t, fk) ? gains.get(NECROTIC_COIL) : gains.get(DEATH_COIL)) ?? gains.get(DEATH_COIL) ?? gains.get(NECROTIC_COIL);
  const forced = mergeWindows(ctx.forced);
  const consumers = p.casts.filter((c) => !c.fake && SD_CONSUMERS.has(c.abilityId)).map((c) => c.timestamp);
  const moments: Moment[] = [];
  let n = 0, lastGain = -Infinity, expired = 0, overwritten = 0;
  for (const b of ev) {
    const paired = ev.some((x) => x !== b && x.buffStatus === "stackRemoved" && Math.abs(x.timestamp - b.timestamp) <= PAIR_MS);
    if (b.buffStatus === "applied") { n = 1; lastGain = b.timestamp; }
    else if (b.buffStatus === "stack") { n = Math.min(SD_MAX, n + 1); lastGain = b.timestamp; }
    else if (b.buffStatus === "refreshed" && !paired) {
      // A new proc at two stacks: the gain is lost.
      if (n >= SD_MAX && b.timestamp < ctx.endMs && !inWindows(b.timestamp, forced)) {
        const v = valueAt(b.timestamp);
        if (v && v.gain > 0) {
          overwritten++;
          moments.push({ startMs: b.timestamp, endMs: b.timestamp, lostDamage: v.gain, detail: `Sudden Doom gained at ${clock(b.timestamp)} with two held: the new one was lost` });
        }
      }
      lastGain = b.timestamp;
    } else if (b.buffStatus === "stackRemoved") n = Math.max(0, n - 1);
    else if (b.buffStatus === "removed") {
      const used = consumers.some((t) => b.timestamp - t >= -50 && b.timestamp - t <= SD_LAND_MS);
      const since = b.timestamp - lastGain;
      if (!used && since >= SD_MS - 600 && since <= SD_MS + 1_500 && b.timestamp < ctx.endMs && !inWindows(b.timestamp, forced)) {
        const v = valueAt(b.timestamp);
        const lost = Math.max(1, n);
        if (v && v.gain > 0) {
          expired += lost;
          moments.push({ startMs: lastGain, endMs: b.timestamp, lostDamage: lost * v.gain,
            detail: `Sudden Doom ran out at ${clock(b.timestamp)}${lost > 1 ? ` with ${lost} stacks` : ""}` });
        }
      }
      n = 0;
    }
  }
  if (moments.length === 0) return [];
  const lost = moments.reduce((a, m) => a + (m.lostDamage ?? 0), 0);
  const parts = [...gains].map(([id, g]) => `${id === NECROTIC_COIL ? "Necrotic Coil" : "Death Coil"} +${k(g.gain)}`).join(", ");
  return [finding(ctx, {
    kind: "proc-lost", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: "Sudden Doom lost",
    lostDamage: lost,
    basis: `each lost proc at what Sudden Doom adds to the coil it would have gone to (the player's own coils with it − without, own hits and the Lesser Ghouls' Orders: ${parts}; Necrotic Coil inside Forbidden Knowledge)`,
    detail: [overwritten ? `${overwritten} gained with two already held` : "", expired ? `${expired} ran out unused` : ""].filter(Boolean).join("; "),
    moments,
  })];
};

// ── Tracked cooldowns' worth per use (tracked-cooldowns.ts) ────────────

/**
 * One Dark Transformation's worth: what its window added to the player's
 * hits, pets included. Per ability (pet abilities apart), the median
 * non-crit hit inside ÷ outside, weighted by hits inside, capped at 30%;
 * × the damage done inside each window.
 */
export function darkTransformationValue(player: PlayerInfo, endMs: number): { value: number; basis: string } | undefined {
  const wins = buffWindows(player, DT_BUFF, endMs);
  if (wins.length === 0) return undefined;
  const inside = (t: number) => wins.some((w) => t >= w.startMs && t <= w.endMs);
  const by = new Map<string, { i: number[]; o: number[] }>();
  for (const e of player.damageDone) {
    if (e.isDoT || e.hitType !== 1 || !e.unmitigatedAmount || e.timestamp >= endMs) continue;
    const key = `${e.pet ?? ""}|${e.abilityId}`;
    const g = by.get(key) ?? { i: [], o: [] };
    (inside(e.timestamp) ? g.i : g.o).push(e.unmitigatedAmount);
    by.set(key, g);
  }
  let sum = 0, n = 0;
  for (const g of by.values()) {
    if (g.i.length === 0 || g.o.length < 3) continue;
    sum += (median(g.i) / median(g.o) - 1) * g.i.length;
    n += g.i.length;
  }
  const bonus = n > 0 ? Math.min(BONUS_CAP, Math.max(0, sum / n)) : 0;
  if (bonus <= 0) return undefined;
  const dmg = player.damageDone.filter((e) => e.timestamp < endMs && inside(e.timestamp)).reduce((a, e) => a + (e.amount ?? 0), 0);
  const each = dmg / wins.length;
  return {
    value: each * bonus / (1 + bonus),
    basis: `${k(each * bonus / (1 + bonus))} that an average Dark Transformation added (${k(each)} done inside each of ${wins.length} windows, pets included, ` +
      `+${Math.round(bonus * 100)}% read from the hits inside vs outside, capped at ${BONUS_CAP * 100}%)`,
  };
}

/**
 * One Army of the Dead's worth: the Abomination it raises (its hits a use)
 * plus what its Forbidden Knowledge adds to the coils (the player's Necrotic
 * Coil over their Death Coil, own hits by name, × Necrotic Coils a use),
 * less the GCD the press takes.
 */
export function armyOfTheDeadValue(player: PlayerInfo, endMs: number, gcdValue: number): { value: number; basis: string } | undefined {
  const uses = player.casts.filter((c) => !c.fake && c.abilityId === ARMY && c.timestamp < endMs).length;
  if (uses === 0) return undefined;
  const abom = player.damageDone.filter((e) => e.pet === "Abomination" && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0) / uses;
  const own = (name: string) => player.damageDone.filter((e) => !e.pet && e.abilityName === name && e.timestamp < endMs).reduce((a, e) => a + (e.amount ?? 0), 0);
  const count = (id: number) => player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < endMs).length;
  const nc = count(NECROTIC_COIL), dc = count(DEATH_COIL);
  const coil = nc > 0 && dc > 0 ? Math.max(0, own("Necrotic Coil") / nc - own("Death Coil") / dc) * nc / uses : 0;
  const value = abom + coil - gcdValue;
  if (!(value > 0)) return undefined;
  return {
    value,
    basis: `(${k(abom)} the Abomination's hits a use + ${k(coil)} its Necrotic Coils over Death Coils a use − ${k(gcdValue)} average GCD; ${uses} uses)`,
  };
}

export const UNHOLY_CHECKS: JobCheck[] = [
  plagueOff("Dread Plague", DREAD_PLAGUE, DP_ERUPT),
  plagueOff("Virulent Plague", VIRULENT_PLAGUE, VP_ERUPT),
  strikeWithoutGhoul,
  suddenDoomLost,
];
