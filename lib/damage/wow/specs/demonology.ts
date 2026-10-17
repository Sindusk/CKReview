// lib/damage/wow/specs/demonology.ts
//
// Demonology Warlock's own checks, beside the shared ones ranged.ts gives
// it (the Demonic Tyrant window; the tracked Summon Demonic Tyrant
// cooldown; the Demonic Core and Infernal Bolt expiries in procs.ts). Built
// in the WoWAnalyzer audit's phase 3 (docs/wowa-audit/warlock-demonology.md),
// every rule valued as damage lost, demons included (pets are ~70% of a
// Demonology player's damage). Measured 2026-10-17 on 35 Demonology
// player-pulls, all Mythic: the top Entombed Sentinels parses 닭콤
// (aZ6NnwL8g9PdpGJ1, 100th) and Darkenedlife (LckJC7GMhQvD6rdw), probes of
// 燃烧之灭 (4M7YDKWTfnxgQctC, 99.9th) and 닥꼼 (N48PJjHAYbdF3Zmx, 99.7th),
// and other Entombed Sentinels kills (160–230k DPS): Bryon
// (VWMbYPRyxCAmhZFj), Neltarian (Vr8dLPtFYWA4G1yg), Petonpassive
// (ACmXHMFtaPLR9k8w), Swaguldan (JvQpZk3CXj78Dx2f), Tuskanoita, Pazlock,
// Bulzwei (wWx8B1GPZMLghAyz); on Vashnik the 99.9th Lydd and 遥远懦夫斯基
// (VbAHWZDdPwJBajmx), probes of Hemlöck and 岁月长衣衫薄 (100th), Lanlv
// and Happywarlock (9w3bK4qhrRC82gVX), Wamp (hjHXmdnJFwTPpMtK), Fetznhi
// (r9CX1kpRGLmKJH4M);
// the weaker Embed (LCFp3wbHvQqNP4my, 20th; probes of Raeffi and Fuzïtîv,
// 23rd) and the static's Fwîî (qpZx3mWaG7gcDdYB, 77th, the case study, and
// his 16 pulls in gVDPhzp61Zm29HMw on six bosses), with Wyrmtongues's two
// Demonology pulls there. Spell ids are from those logs' masterData.
//
// Talents (from casts, buffs and pets; every one of the 35): Diabolist
// (Ruination, Infernal Bolt, the Diabolic Ritual demons), Grimoire: Imp
// Lord, To Hell and Back (imps return after an Implosion), and a Gloomhound
// (or Charhound) that comes with each Call Dreadstalkers. Nobody takes
// Summon Vilefiend, Power Siphon, Summon Doomguard, Grimoire: Fel Ravager
// or Demonic Calling: none is in any log's masterData.
//
// Soul Shards (type 7, logged ×10) show on Hand of Gul'dan and Grimoire
// only. Call Dreadstalkers costs none here: the shard count across it adds
// up without a cost (Darkenedlife 0:40.4 Hand of Gul'dan at 5 → 2, three
// Shadow Bolts and a Dreadstalkers, 5 at 0:53.7), so it is a plain 20s
// cooldown (shortest interval 20.0s on every player).
//
// Both checks below price a held second as a share of a use, and excuse a
// hold that ends in a press lined up with Demonic Tyrant, up to its
// break-even (the earlier passes' "holding a button into a burst can pay").
// Time doesn't count as held when it's forced, in the context's hold
// windows, in the pull's last TAIL_MS, or when most of the LOOKAHEAD_MS
// after it is forced (a press there would summon demons into Stasis).
//
// ── Implosion held (implosionHeld) ──────────────────────────────────────
// WoWAnalyzer's Implosion efficiency (90% of a 15s cooldown) was proposed
// `wrong` in phase 2: Stasis counted as ready, and imps were thought worth
// more kept. The log says otherwise. With To Hell and Back, each Implosion
// (196277) brings imps back: the pet "Wild Imp (Inner Demons/To Hell and
// Back)" deals 33–54k/s in the 15s after a press and ~2k/s anywhere else,
// 0.24–0.78M a press (mean 0.51M over 31 player-pulls), and the amount
// doesn't depend on how many imps were imploded (1 imp 0.61M, 5 imps
// 0.44M; 407 presses). Implosion's own hits (196278, 27–117k a press) are
// about what the imploded imps' remaining Fel Firebolts were worth; both are
// left out. So a press is worth its returned imps less the GCD it takes.
// The cooldown is a flat 15s (shortest interval 15.0s everywhere). The top
// players press it every 16.4–16.8s (median; 18 in a 5:00 kill); the 20th–
// 23rd percentile ones every 20–31s, Fwîî 13 in 6:36.
// Pressed inside the Tyrant window a press returns more: 0.70M vs 0.47M
// outside (161 / 246 presses, pooled), so a hold that ends in a press inside
// the window is excused up to IMP_TYRANT_EXCUSE_MS: 0.23M ÷ (0.47M − a
// ~54k GCD) × 15s ≈ 8s. The top players do exactly this (닭콤 held 4.2,
// 4.7, 7.9 and 4.9s into his Tyrants).
// Held = ready → next press, past IMP_ALLOW_MS a cycle (top players'
// ordinary delay), only while Wild Imps are out (an imp hit in the last
// IMP_SEEN_MS). Lost = held ÷ 15s × (the player's returned-imp damage per
// press outside Tyrant − their average GCD).
// Measured (lost a pull): 닭콤 none, Darkenedlife 27k; the other Entombed
// Sentinels kills Neltarian 293k, Pazlock 298k, Petonpassive 319k, Swaguldan 343k,
// Bryon 371k. Vashnik is looser: the 99.9th Lydd (VbAHWZDdPwJBajmx) 2.24M
// (14 presses in 6:35, where the two other top Vashnik players probed made
// 18 and 22; WoWAnalyzer's 90% rule flags him too), 遥远懦夫斯基 1.83M on
// the same kill, Fetznhi 185k, Wamp 1.32M, Lanlv 2.52M. Weaker: Embed 6.03M
// (ready 4:54, pressed 5:53: 48.5s held); Fwîî 1.99M on the case study
// (ready 3:51, pressed 4:44, 19.8s past the Tyrant excuse) and 0.20–4.08M on
// each of his static's 16 pulls, 15.0M in all (Ula'tek 4.08M: 1:47 → 2:21,
// 3:16 → 3:51). The largest Demonology loss the audit found.
//
// ── Call Dreadstalkers held (dreadstalkersHeld) ────────────────────────
// Call Dreadstalkers (104316) summons two Dreadstalkers and a Gloomhound
// (~2.5s later, ~12s life; Darkenedlife's 15 casts, 15 hounds). A use is
// their damage to the next cast: 0.45M pooled (0.67M when cast in the 12s
// before a Tyrant, which extends and empowers them: 136 casts vs 252).
// The top players press it on cooldown (median interval 20.6–21.1s, longest
// 21.6–25.1s); the weaker hold it (Embed's longest 34.1s, Raeffi 37.4s).
// A hold that ends in a cast in the 12s before a Tyrant is excused up to
// DS_TYRANT_EXCUSE_MS: 0.22M ÷ (0.45M − a ~54k GCD) × 20s ≈ 11s.
// Held = ready → next cast, past DS_ALLOW_MS a cycle. Lost = held ÷ 20s ×
// (the player's damage per cast not before a Tyrant − their average GCD).
// Measured (lost a pull): 닭콤 none, Darkenedlife 6k, Lydd 139k; the other
// Entombed Sentinels kills Bryon none, Neltarian 5k, Pazlock 12k,
// Petonpassive 53k, Swaguldan 276k.
// Weaker: Tuskanoita 756k (ready 1:19, pressed 1:36), Happywarlock 621k,
// Bulzwei 268k, Embed 64k (his long gaps were in Stasis); Fwîî 5k on the
// case study, 1.26M over his static's 16 pulls (Ula'tek 635k: ready 3:14,
// pressed 3:40). A small loss: Dreadstalkers is well kept.
//
// ── Measured and not built ─────────────────────────────────────────────
// - Dreadstalkers in the 12s before Tyrant: every one of the 140 Tyrant
//   windows on the first 31 player-pulls had one. Shards at Tyrant (Diabolist wants 5;
//   read from the next Hand of Gul'dan when nothing generates between):
//   5 on almost every cast, 3–4 as often on the top players (Darkenedlife
//   4, 5, 3, 5, 4). Shards left after the window: 3–5 on the first spender
//   after it for everyone, top players included; a Hand of Gul'dan's shard
//   is worth 50k inside the window vs 41k outside (875 / 1111 casts, its
//   imps included), so moving one in gains ~9k a shard. Grimoire: Imp Lord
//   2–11s before Tyrant on every player but once (Pazlock, a top one).
//   Demonic Cores at Tyrant: the top players bring 2–4, Fwîî 0–2, worth a
//   few shards' 9k. All negligible.
// - Soul Shards can't be rebuilt exactly: between two spenders the count
//   gains a shard the casts don't explain (no cast: +1 in 47 of 49 pairs;
//   a Shadow Bolt +1 or +2), so the shard rules stay unbuilt.

import type { JobCheck, Moment } from "../../types";
import { finding, type PlayerCheckContext } from "../../checks";
import { mergeWindows, overlapMs, type Window } from "../../timeline";
import { k, s, statusWindows } from "./shared";

const IMPLOSION = 196277;
const CALL_DREADSTALKERS = 104316;
const SUMMON_DEMONIC_TYRANT = 265187;   // the cast and the player's buff (the window)
const RETURNED_IMPS = "Wild Imp (Inner Demons/To Hell and Back)";
const DREADSTALKER_PETS = /^(Dreadstalker|Gloomhound|Charhound)$/;
const WILD_IMP = /^Wild Imp/;

const IMP_CD_MS = 15_000;
const IMP_ALLOW_MS = 2_000;
const IMP_TYRANT_EXCUSE_MS = 8_000;
const IMP_RETURN_MS = 15_000;     // returned imps' damage counted this long after a press
const IMP_SEEN_MS = 3_000;
const DS_CD_MS = 20_000;
const DS_ALLOW_MS = 2_000;
const DS_TYRANT_EXCUSE_MS = 11_000;
const DS_BEFORE_TYRANT_MS = 12_000;
const LOOKAHEAD_MS = 10_000;
const TAIL_MS = 10_000;
const MIN_PRESSES = 5;
const MIN_HELD_MS = 250;
const STEP_MS = 250;

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);
const inside = (ws: Window[], t: number) => ws.some((w) => t >= w.startMs && t <= w.endMs);

/** One press per instant (a press can log twice), before the pull's end. */
function presses(ctx: PlayerCheckContext, id: number): number[] {
  const out: number[] = [];
  for (const t of ctx.player.casts.filter((c) => !c.fake && c.abilityId === id && c.timestamp < ctx.endMs).map((c) => c.timestamp).sort((a, b) => a - b)) {
    if (out.length && t - out[out.length - 1] < 100) continue;
    out.push(t);
  }
  return out;
}

type HeldSpec = {
  label:     string;
  name:      string;
  cdMs:      number;
  allowMs:   number;
  excuseMs:  number;
  presses:   number[];
  // Whether a press at t lines up with a Tyrant (its hold is excused up to excuseMs).
  aligned(t: number): boolean;
  // Whether the button could be pressed at t (Implosion needs imps out).
  usable?(t: number): boolean;
  perUse:    { value: number; basis: string };
  rule:      string;
};

/** Held time on a flat cooldown, priced as a share of a use, with the Tyrant line-up excused to its break-even. */
function heldFindings(ctx: PlayerCheckContext, spec: HeldSpec) {
  const forced = mergeWindows([...ctx.forced, ...(ctx.context?.cooldownHoldWindows?.(ctx.pull) ?? [])]);
  const lastUseful = ctx.endMs - TAIL_MS;
  const counts = (t: number) => t < lastUseful && !inside(forced, t)
    && overlapMs(t, t + LOOKAHEAD_MS, forced) <= LOOKAHEAD_MS / 2
    && (spec.usable?.(t) ?? true);
  const perMs = spec.perUse.value / spec.cdMs;
  const moments: Moment[] = [];
  let heldMs = 0, excusedMs = 0;
  spec.presses.forEach((prev, i) => {
    const ready = prev + spec.cdMs;
    const next = spec.presses[i + 1];
    const until = Math.min(next ?? lastUseful, lastUseful);
    if (until <= ready) return;
    let open = 0;
    for (let t = ready; t < until; t += STEP_MS) if (counts(t)) open += Math.min(STEP_MS, until - t);
    let held = open - spec.allowMs;
    if (held <= 0) return;
    let excused = 0;
    if (next !== undefined && spec.aligned(next)) { excused = Math.min(held, spec.excuseMs); held -= excused; }
    excusedMs += excused;
    if (held < MIN_HELD_MS) return;
    heldMs += held;
    moments.push({ startMs: ready, endMs: next ?? ctx.endMs, lostDamage: held * perMs,
      detail: `${spec.name} ready at ${clock(ready)}, ${next !== undefined ? `pressed at ${clock(next)}` : "not pressed again"}: ${s(held)} held` +
        (excused > 0 ? ` (${s(excused)} more excused: lined up with Demonic Tyrant)` : "") });
  });
  if (moments.length === 0) return [];
  return [finding(ctx, {
    kind: "cooldown-drift", startMs: moments[0].startMs, endMs: moments[moments.length - 1].endMs, forced: false, inference: true,
    label: spec.label,
    lostDamage: heldMs * perMs,
    basis: `held time (past ${s(spec.allowMs)} a cycle, outside forced time) ÷ ${s(spec.cdMs)} cooldown × ${spec.perUse.basis}` +
      (excusedMs > 0 ? `; ${s(excusedMs)} held to line up with Demonic Tyrant excused (up to ${s(spec.excuseMs)} a hold, its break-even)` : ""),
    detail: `${spec.name} sat ready ${s(heldMs)} past the allowance in ${moments.length} cycle${moments.length > 1 ? "s" : ""} (${spec.rule})`,
    moments,
  })];
}

// ── Implosion held ─────────────────────────────────────────────────────

const implosionHeld: JobCheck = (ctx) => {
  const imp = presses(ctx, IMPLOSION);
  if (imp.length < MIN_PRESSES) return [];
  const p = ctx.player;
  const tyrant = statusWindows(ctx, SUMMON_DEMONIC_TYRANT);
  const forced = mergeWindows(ctx.forced);
  const returned = p.damageDone.filter((e) => e.pet === RETURNED_IMPS && e.timestamp < ctx.endMs);
  // Returned-imp damage per press outside Tyrant, over presses with a whole return span mostly unforced.
  const rows = imp.map((t, i) => {
    const end = Math.min(imp[i + 1] ?? Infinity, t + IMP_RETURN_MS, ctx.endMs);
    return { t, end, dmg: returned.filter((e) => e.timestamp > t && e.timestamp <= end).reduce((a, e) => a + (e.amount ?? 0), 0) };
  }).filter((r) => r.end - r.t >= 12_000 && overlapMs(r.t, r.end, forced) <= (r.end - r.t) / 2);
  const outside = rows.filter((r) => !inside(tyrant, r.t));
  const base = outside.length >= 3 ? outside : rows;
  if (base.length < 3) return [];
  const perPress = avg(base.map((r) => r.dmg));
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = perPress - gcd;
  if (!(value > 0)) return [];
  const imps = p.damageDone.filter((e) => e.pet && WILD_IMP.test(e.pet)).map((e) => e.timestamp).sort((a, b) => a - b);
  const impsOut = (t: number) => {
    let lo = 0, hi = imps.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (imps[mid] <= t) lo = mid + 1; else hi = mid; }
    return lo > 0 && t - imps[lo - 1] <= IMP_SEEN_MS;
  };
  return heldFindings(ctx, {
    label: "Implosion held", name: "Implosion", cdMs: IMP_CD_MS, allowMs: IMP_ALLOW_MS, excuseMs: IMP_TYRANT_EXCUSE_MS,
    presses: imp,
    aligned: (t) => inside(tyrant, t),
    usable: impsOut,
    perUse: { value, basis: `(${k(perPress)} returned imps a press outside Tyrant, ${base.length} presses, − ${k(gcd)} average GCD)` },
    rule: "15s cooldown; each press brings imps back (To Hell and Back)",
  });
};

// ── Call Dreadstalkers held ────────────────────────────────────────────

const dreadstalkersHeld: JobCheck = (ctx) => {
  const ds = presses(ctx, CALL_DREADSTALKERS);
  if (ds.length < MIN_PRESSES) return [];
  const p = ctx.player;
  const tyrantCasts = presses(ctx, SUMMON_DEMONIC_TYRANT);
  const beforeTyrant = (t: number) => tyrantCasts.some((x) => x >= t && x - t <= DS_BEFORE_TYRANT_MS);
  const pets = p.damageDone.filter((e) => e.pet && DREADSTALKER_PETS.test(e.pet) && e.timestamp < ctx.endMs);
  const rows = ds.slice(0, -1).map((t, i) => ({ t, dmg: pets.filter((e) => e.timestamp >= t && e.timestamp < ds[i + 1]).reduce((a, e) => a + (e.amount ?? 0), 0) }));
  const plain = rows.filter((r) => !beforeTyrant(r.t));
  if (plain.length < 3) return [];
  const perCast = avg(plain.map((r) => r.dmg));
  const gcd = ctx.values.gcdValue(undefined, false);
  const value = perCast - gcd;
  if (!(value > 0)) return [];
  return heldFindings(ctx, {
    label: "Call Dreadstalkers held", name: "Call Dreadstalkers", cdMs: DS_CD_MS, allowMs: DS_ALLOW_MS, excuseMs: DS_TYRANT_EXCUSE_MS,
    presses: ds,
    aligned: beforeTyrant,
    perUse: { value, basis: `(${k(perCast)} Dreadstalkers and hound a cast not before a Tyrant, ${plain.length} casts, − ${k(gcd)} average GCD)` },
    rule: "20s cooldown, no Soul Shard cost",
  });
};

export const DEMONOLOGY_CHECKS: JobCheck[] = [implosionHeld, dreadstalkersHeld];
