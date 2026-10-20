// lib/mitigation/enmity.ts
//
// Who holds each enemy's enmity (aggro) through an FFXIV pull, and why it
// moved. FFXIV logs carry no enmity, so this rebuilds it from two signals
// (measured 2026-10-19 on 17 sample reports, ~11.7k autos; check with
// `node scripts/check-enmity.js`):
//
// ── 1. Autos are the ground truth for #1 ───────────────────────────────
// A boss's single-target auto-attack lands on its top-enmity player. The
// enmity-targeted busters agree: Revolting Ruin III, Ultimate Embrace and
// Hot Impact landed on the last auto's target 103 of 105 times, and the
// boss's facing at its own casts pointed at the auto target in 880 of 917
// cases where the tanks stood 30°+ apart. Every change of auto target was
// a Provoke, a Shirk, a tank death, or an overtake by damage (The Tyrant,
// Pull 13: the Dark Knight pulls with Unmend, turns Grit on at 0:06 and
// takes the autos from the Paladin at 0:15 with no Provoke).
//
// ── 2. A simple enmity table fills the gaps ────────────────────────────
// Between autos (untargetable windows, out-of-range tanks) and for the
// lead over #2, a per-enemy table is simulated:
//   - damage to the enemy: 1 enmity per point, x STANCE_MULT in tank stance
//     (Iron Will, Defiance, Grit, Royal Guard); pets' damage counts for the
//     owner, never stanced. 3-20 all scored the same (the stance dominates).
//   - healing: HEAL_MULT per point healed, split over the tracked enemies
//     (0 to 1 scored the same).
//   - Provoke: the caster to the top (current top + 1).
//   - Shirk: 25% of the caster's enmity on every enemy to the target.
//   - death: the dead player's enmity to 0.
//   - each observed single-target auto that the table disagrees with lifts
//     its target just above the top (ANCHOR_LEAD): the table never
//     contradicts what the boss did.
// Before that correction, the table named the auto's target on 80-99% of
// single-auto bosses' autos (check-enmity.js, 2026-10-19: Dancing Mad
// 98-99%, The Epic of Alexander, Vamp Fatale, Red Hot and Deep Blue 94-96%,
// Enuo 91%, The Omega Protocol 90%, Lindwurm II 88%, Futures Rewritten
// 87%, Zelenia 84%, Necron 82%, The Tyrant 80%), and Provoke, Shirk and
// death swaps almost always.
//
// ── The holder ─────────────────────────────────────────────────────────
// Single autos, Provoke, Shirk and deaths move the holder at once. While
// single autos are landing (one within AUTO_GAP_MS) nothing else does: two
// tanks racing within a few % flipped the table's top several times a
// second between autos (The Tyrant, Pull 13, 0:09-0:14). In an auto
// silence the table moves it only on a lead over ENMITY_CLOSE_LEAD
// (DUAL_LEAD for dual autos). A change the table didn't have before the
// autos showed it is `predicted: false`.
//
// Stance before the pull isn't logged: on unless the tank's first stance
// event turns it on. A tank who never touches stance is assumed stanced.
//
// ── Where it can't tell ────────────────────────────────────────────────
//   - Dual autos (Lindwurm, Queen Eternal, Pandora): one swing hits the top
//     two (94% of swings), but which instance hit #1 is a coin flip
//     (55/45). The swing confirms the pair only; #1 is the table's guess,
//     and swaps there were called 22-37% of the time. `dualAutos` marks it.
//   - Close races: within a few % the table is a coin flip (Lindwurm II
//     Pull 13 0:48: 14.5M vs 14.3M, the autos went the other way).
//     `minLead` on a span says how close #2 came.
//   - No autos: a span with no auto inside is the table's guess
//     (`observed: false`).
// Enemies are keyed by name (Necron autos from one actor and takes damage
// on another), split by instance only when players' damage itself lands on
// several instances of that name.
//
// FFXIV only; WoW pulls get no enemies.

import type { Pull } from "@/types/Pull";
import { isLandedHeal, type PlayerEvent } from "@/types/PlayerInfo";
import type { MitigationGame } from "./types";

// Tunables: chosen by the builder from the 2026-10-19 sweep, not confirmed.
export const STANCE_MULT = 10;
export const HEAL_MULT = 0.5;
const ANCHOR_LEAD = 0.01;
const SHIRK_SHARE = 0.25;
// Autos come every ~3s and pause through a boss's own casts; a longer
// silence ends what the autos confirm (and lets the table move the holder).
const AUTO_GAP_MS = 10_000;
// A stretch this long with no autos at all is the boss away (untargetable,
// a transition): no holder is drawn.
const AWAY_MS = 20_000;
// Same swing: hits from one enemy this close together.
const SWING_MS = 50;
// An enemy is tracked once it lands this many autos.
const MIN_AUTOS = 3;
// Share of swings hitting 2+ players that makes an enemy dual-auto.
const DUAL_SHARE = 0.3;
// A cause (Provoke, Shirk, death) this long before the autos moved
// explains the move (Provoke -> next auto measured up to ~4s).
const CAUSE_MS = 6_000;
// A span's lead right after it starts is ~0 by construction (Provoke sets
// top + 1); minLead ignores its first seconds.
const LEAD_SETTLE_MS = 5_000;
// Under this lead the hold is a coin flip.
export const ENMITY_CLOSE_LEAD = 0.05;
// With dual autos nothing in the log separates #1 from #2, so the table
// alone moves the holder only on a wide lead (at 5% it flipped ~5 times a
// pull on Queen Eternal).
const DUAL_LEAD = 0.2;

const PROVOKE = 7533;
const SHIRK = 7537;
// Tank stance statuses (+1000000) and the actions that turn them on / off.
const STANCE_STATUS = new Set([1000079, 1000091, 1000743, 1001833]);
const STANCE_ON = new Set([28, 48, 3629, 16142]);
const STANCE_OFF = new Set([32065, 32066, 32067, 32068]);

export type EnmityCause =
  | "pull"       // the first holder
  | "provoke"    // the new holder's Provoke
  | "shirk"      // the old holder's Shirk
  | "death"      // the old holder died
  | "overtake";  // more enmity with no Provoke, Shirk or death

export type EnmityChange = {
  atMs:   number;
  from?:  string;
  to:     string;
  cause:  EnmityCause;
  // Stance state at the change, for the two players involved.
  stance: Record<string, boolean | undefined>;
  // The table had it coming (true) or only the autos showed it (false).
  predicted: boolean;
};

// One holder, start to end, of one enemy.
export type EnmitySpan = {
  player:   string;
  startMs:  number;
  endMs:    number;
  autos:    number;          // single-target autos on the holder in the span
  observed: boolean;         // autos confirm it (not just the table)
  second?:  string;          // #2 at the closest moment
  minLead?: number;          // (top − #2) / top, at the closest moment after LEAD_SETTLE_MS
  minLeadAtMs?: number;
};

export type EnemyEnmity = {
  enemy:     string;
  dualAutos: boolean;
  spans:     EnmitySpan[];
  changes:   EnmityChange[];
  // How often the table, before correcting, named the next single auto's target.
  check:     { autos: number; agreed: number };
};

export type PullEnmity = { enemies: EnemyEnmity[] };

type Ev =
  | { t: number; k: "damage"; enemy: string; player: string; amount: number; pet: boolean }
  | { t: number; k: "heal"; player: string; amount: number }
  | { t: number; k: "provoke"; enemy: string; player: string }
  | { t: number; k: "shirk"; player: string; to: string }
  | { t: number; k: "death"; player: string }
  | { t: number; k: "stance"; player: string; on: boolean }
  | { t: number; k: "swing"; enemy: string; players: string[] };

const ORDER: Record<Ev["k"], number> = { stance: 0, death: 1, provoke: 2, shirk: 3, damage: 4, heal: 5, swing: 6 };

export function analyzePullEnmity(pull: Pull, game: MitigationGame): PullEnmity {
  if (pull.game !== "ffxiv") return { enemies: [] };
  const players = new Set(pull.players.map((p) => p.name));
  const isAuto = (e: PlayerEvent) => game.isAutoAttack(e.abilityName) || e.abilityName.toLowerCase() === "attack";

  // Enemy keys: name, or name:instance when damage splits across instances.
  const instances = new Map<string, Set<number>>();
  for (const p of pull.players) for (const e of p.damageDone) {
    if (!e.target || players.has(e.target)) continue;
    const s = instances.get(e.target) ?? new Set<number>();
    s.add(e.targetInstance ?? 0);
    instances.set(e.target, s);
  }
  const key = (name: string, inst?: number) => ((instances.get(name)?.size ?? 0) > 1 ? `${name} ${inst ?? 0}` : name);

  // Swings: an enemy's autos within SWING_MS of each other.
  const hits: { t: number; enemy: string; player: string }[] = [];
  for (const p of pull.players) for (const e of p.damageTaken) {
    if (!e.source || players.has(e.source) || !isAuto(e) || e.healthBefore === 0) continue;
    hits.push({ t: e.timestamp, enemy: key(e.source, e.sourceInstance), player: p.name });
  }
  hits.sort((a, b) => a.t - b.t);
  const swings: Extract<Ev, { k: "swing" }>[] = [];
  const lastSwing = new Map<string, Extract<Ev, { k: "swing" }>>();
  for (const h of hits) {
    const s = lastSwing.get(h.enemy);
    if (s && h.t - s.t <= SWING_MS) { if (!s.players.includes(h.player)) s.players.push(h.player); continue; }
    const n = { t: h.t, k: "swing" as const, enemy: h.enemy, players: [h.player] };
    swings.push(n);
    lastSwing.set(h.enemy, n);
  }
  const tracked = [...new Set(swings.map((s) => s.enemy))].filter((en) => swings.filter((s) => s.enemy === en).length >= MIN_AUTOS);
  if (!tracked.length) return { enemies: [] };
  const trackedSet = new Set(tracked);
  const dual = new Set(tracked.filter((en) => {
    const xs = swings.filter((s) => s.enemy === en);
    return xs.filter((s) => s.players.length > 1).length / xs.length >= DUAL_SHARE;
  }));

  // Every input, in time order.
  const evs: Ev[] = swings.filter((s) => trackedSet.has(s.enemy));
  const tanks = pull.players.filter((p) => p.role === "Tank");
  const stanceAtStart = new Map<string, boolean>();
  for (const p of pull.players) {
    for (const e of p.damageDone) {
      if (!e.target || !trackedSet.has(key(e.target, e.targetInstance))) continue;
      evs.push({ t: e.timestamp, k: "damage", enemy: key(e.target, e.targetInstance), player: p.name, amount: e.amount ?? 0, pet: !!e.pet });
    }
    for (const e of p.healing) {
      if (!isLandedHeal(e) || !e.amount) continue;
      evs.push({ t: e.timestamp, k: "heal", player: p.name, amount: e.amount });
    }
    for (const e of p.casts) {
      if (e.abilityId === PROVOKE && e.target && trackedSet.has(key(e.target, e.targetInstance))) {
        evs.push({ t: e.timestamp, k: "provoke", enemy: key(e.target, e.targetInstance), player: p.name });
      } else if (e.abilityId === SHIRK && e.target && players.has(e.target)) {
        evs.push({ t: e.timestamp, k: "shirk", player: p.name, to: e.target });
      }
    }
  }
  for (const p of tanks) {
    const toggles: { t: number; on: boolean }[] = [];
    for (const e of p.buffs ?? []) {
      if (!STANCE_STATUS.has(e.abilityId)) continue;
      if (e.buffStatus === "applied") toggles.push({ t: e.timestamp, on: true });
      else if (e.buffStatus === "removed") toggles.push({ t: e.timestamp, on: false });
    }
    // Pulls without the buffs stream: the stance actions themselves.
    if (!p.buffs) for (const e of p.casts) {
      if (STANCE_ON.has(e.abilityId)) toggles.push({ t: e.timestamp, on: true });
      else if (STANCE_OFF.has(e.abilityId)) toggles.push({ t: e.timestamp, on: false });
    }
    toggles.sort((a, b) => a.t - b.t);
    stanceAtStart.set(p.name, toggles.length ? !toggles[0].on : true);
    for (const x of toggles) evs.push({ t: x.t, k: "stance", player: p.name, on: x.on });
  }
  for (const d of pull.deathEvents) if (players.has(d.player)) evs.push({ t: d.timestamp, k: "death", player: d.player });
  evs.sort((a, b) => a.t - b.t || ORDER[a.k] - ORDER[b.k]);

  // Simulate.
  const stance = new Map(stanceAtStart);
  const tables = new Map(tracked.map((en) => [en, new Map<string, number>()]));
  const out = new Map(tracked.map((en): [string, EnemyEnmity] => [en, { enemy: en, dualAutos: dual.has(en), spans: [], changes: [], check: { autos: 0, agreed: 0 } }]));
  const holder = new Map<string, string>();
  const lastAuto = new Map<string, number>();
  const recent: Ev[] = [];   // causes in the last CAUSE_MS

  const ranked = (en: string) => [...tables.get(en)!].sort((a, b) => b[1] - a[1]);
  const top = (en: string) => ranked(en)[0]?.[0];
  const add = (en: string, p: string, v: number) => { const tb = tables.get(en)!; tb.set(p, (tb.get(p) ?? 0) + v); };

  const causeOf = (en: string, from: string | undefined, to: string, t: number, trigger: Ev): EnmityCause => {
    if (!from) return "pull";
    const near = trigger.k === "swing" ? recent.filter((e) => e.t >= t - CAUSE_MS) : [trigger];
    if (near.some((e) => e.k === "provoke" && e.player === to && e.enemy === en)) return "provoke";
    if (near.some((e) => e.k === "shirk" && e.player === from)) return "shirk";
    if (near.some((e) => e.k === "death" && e.player === from)) return "death";
    return "overtake";
  };

  const observe = (en: string, t: number, trigger: Ev, predicted: boolean) => {
    let now = top(en);
    if (!now) return;
    // Autos (single-target), Provoke, Shirk and deaths move the holder at
    // once. The table alone moves it only while no single autos are
    // landing, and only on a clear lead (hysteresis).
    const held = holder.get(en);
    const forced = trigger.k === "provoke" || trigger.k === "shirk" || trigger.k === "death" || (trigger.k === "swing" && !dual.has(en));
    const autosLanding = !dual.has(en) && t - (lastAuto.get(en) ?? -Infinity) <= AUTO_GAP_MS;
    if (held && now !== held && !forced && autosLanding) now = held;
    if (held && now !== held && !forced) {
      const tb = tables.get(en)!;
      const a = tb.get(now) ?? 0, b = tb.get(held) ?? 0;
      if (a <= 0 || (a - b) / a <= (dual.has(en) ? DUAL_LEAD : ENMITY_CLOSE_LEAD)) now = held;
    }
    const o = out.get(en)!;
    const cur = o.spans[o.spans.length - 1];
    if (cur && cur.player === now) { cur.endMs = Math.max(cur.endMs, t); }
    else {
      const from = holder.get(en);
      o.changes.push({
        atMs: t, from, to: now, cause: causeOf(en, from, now, t, trigger), predicted,
        stance: Object.fromEntries([from, now].filter((x): x is string => !!x).map((x) => [x, stance.get(x)])),
      });
      if (cur) cur.endMs = t;
      o.spans.push({ player: now, startMs: t, endMs: t, autos: 0, observed: false });
      holder.set(en, now);
    }
    // The holder's lead over the next player, after the span settles
    // (negative while a challenger is inside the hysteresis).
    const span = o.spans[o.spans.length - 1];
    const r = ranked(en).filter(([p]) => p !== now);
    const mine = tables.get(en)!.get(now) ?? 0;
    if (r.length && mine > 0 && t - span.startMs >= LEAD_SETTLE_MS) {
      const lead = (mine - r[0][1]) / mine;
      if (span.minLead === undefined || lead < span.minLead) { span.minLead = lead; span.minLeadAtMs = t; span.second = r[0][0]; }
    }
  };

  for (const e of evs) {
    if (e.k !== "swing" && e.k !== "damage" && e.k !== "heal") {
      recent.push(e);
      while (recent.length && recent[0].t < e.t - CAUSE_MS) recent.shift();
    }
    switch (e.k) {
      case "stance": stance.set(e.player, e.on); break;
      case "death":
        for (const [en, tb] of tables) { if (tb.has(e.player)) { tb.set(e.player, 0); observe(en, e.t, e, true); } }
        break;
      case "provoke": {
        const tb = tables.get(e.enemy)!;
        tb.set(e.player, Math.max(0, ...tb.values()) + 1);
        observe(e.enemy, e.t, e, true);
        break;
      }
      case "shirk":
        for (const [en, tb] of tables) {
          const v = tb.get(e.player) ?? 0;
          if (!v) continue;
          tb.set(e.player, v * (1 - SHIRK_SHARE));
          tb.set(e.to, (tb.get(e.to) ?? 0) + v * SHIRK_SHARE);
          observe(en, e.t, e, true);
        }
        break;
      case "damage":
        add(e.enemy, e.player, e.amount * (!e.pet && stance.get(e.player) ? STANCE_MULT : 1));
        if (holder.has(e.enemy)) observe(e.enemy, e.t, e, true);
        break;
      case "heal":
        for (const en of tracked) if (tables.get(en)!.size) add(en, e.player, (e.amount * HEAL_MULT) / tracked.length);
        break;
      case "swing": {
        const o = out.get(e.enemy)!;
        const tb = tables.get(e.enemy)!;
        let agreed = true;
        if (e.players.length === 1 && !o.dualAutos) {
          const [p] = e.players;
          o.check.autos++;
          agreed = top(e.enemy) === p;
          if (agreed) o.check.agreed++;
          else tb.set(p, Math.max(1, ...tb.values()) * (1 + ANCHOR_LEAD));
        } else {
          // Dual autos confirm the pair, not the order: lift a hit player
          // only when it's outside the table's top two.
          const r = ranked(e.enemy);
          const k = Math.min(e.players.length, r.length);
          const floor = k ? r[k - 1][1] : 0;
          for (const p of e.players) if (!r.slice(0, k).some(([q]) => q === p)) tb.set(p, floor + 1);
        }
        observe(e.enemy, e.t, e, agreed);
        lastAuto.set(e.enemy, e.t);
        break;
      }
    }
  }

  // The last span runs to the enemy's last auto; each span is confirmed
  // only as far as its autos reach (autos counted there).
  const enemies: EnemyEnmity[] = [];
  for (const en of tracked) {
    const o = out.get(en)!;
    const mine = swings.filter((s) => s.enemy === en);
    const tail = o.spans[o.spans.length - 1];
    if (tail) tail.endMs = Math.max(tail.endMs, lastAuto.get(en) ?? 0);
    // Drawn from the first auto to the last (before it, who the table puts
    // on top is a guess from a few hits); long auto-less stretches are the
    // boss away.
    const from = mine[0].t, to = mine[mine.length - 1].t;
    o.spans = splitByAutoGaps(o.spans, mine, o.dualAutos)
      .map((s) => ({ ...s, startMs: Math.max(s.startMs, from), endMs: Math.min(s.endMs, to) }))
      .filter((s) => s.endMs > s.startMs || s.autos)
      .filter((s) => s.observed || o.dualAutos || s.endMs - s.startMs < AWAY_MS);
    o.changes = o.changes.filter((c) => c.atMs >= from && c.atMs <= to);
    if (o.changes[0]?.atMs === from) o.changes[0] = { ...o.changes[0], from: undefined, cause: "pull" };
    else if (o.spans.length) o.changes.unshift({ atMs: from, to: o.spans[0].player, cause: "pull", stance: {}, predicted: true });
    enemies.push(o);
  }
  // One row per name when its instances come one after another (a boss
  // re-spawned for a phase); the base name when merged.
  const rows: EnemyEnmity[] = [];
  for (const o of enemies) {
    const base = o.enemy.replace(/ \d+$/, "");
    const range = (x: EnemyEnmity) => [x.spans[0]?.startMs ?? 0, x.spans[x.spans.length - 1]?.endMs ?? 0];
    const [a, b] = range(o);
    const twin = rows.find((r) => r.enemy.replace(/ \d+$/, "") === base && r.dualAutos === o.dualAutos
      && rows.filter((q) => q.enemy.replace(/ \d+$/, "") === base).length === 1
      && (range(r)[1] <= a || b <= range(r)[0]));
    if (!twin) { rows.push(o); continue; }
    twin.enemy = base;
    twin.spans = [...twin.spans, ...o.spans].sort((x, y) => x.startMs - y.startMs);
    twin.changes = [...twin.changes, ...o.changes].sort((x, y) => x.atMs - y.atMs);
    twin.check = { autos: twin.check.autos + o.check.autos, agreed: twin.check.agreed + o.check.agreed };
  }
  // Most autos first: the boss before its adds.
  const autosOf = (o: EnemyEnmity) => o.spans.reduce((n, s) => n + s.autos, 0);
  return { enemies: rows.filter((o) => o.spans.length).sort((a, b) => autosOf(b) - autosOf(a)) };
}

/** Splits each span where its holder went AUTO_GAP_MS without an auto: observed where autos land, the table's guess between. */
function splitByAutoGaps(spans: EnmitySpan[], swings: { t: number; players: string[] }[], dualAutos: boolean): EnmitySpan[] {
  const out: EnmitySpan[] = [];
  for (const s of spans) {
    const autos = swings.filter((w) => w.t >= s.startMs && w.t <= s.endMs && w.players.includes(s.player)).map((w) => w.t);
    if (dualAutos || !autos.length) { out.push({ ...s, observed: false }); continue; }
    // Runs of autos no more than AUTO_GAP_MS apart; the table's guess between.
    const runs: { a: number; b: number; n: number }[] = [];
    for (const t of autos) {
      const r = runs[runs.length - 1];
      if (r && t - r.b <= AUTO_GAP_MS) { r.b = t; r.n++; } else runs.push({ a: t, b: t, n: 1 });
    }
    if (runs[0].a - s.startMs <= AUTO_GAP_MS) runs[0].a = s.startMs;
    const last = runs[runs.length - 1];
    if (s.endMs - last.b <= AUTO_GAP_MS) last.b = s.endMs;
    const piece = (a: number, b: number, n: number, observed: boolean): EnmitySpan => {
      const p: EnmitySpan = { ...s, startMs: a, endMs: b, autos: n, observed };
      // The closest lead belongs to the piece it fell in.
      if (s.minLeadAtMs === undefined || s.minLeadAtMs < a || s.minLeadAtMs > b) { delete p.minLead; delete p.minLeadAtMs; delete p.second; }
      return p;
    };
    let at = s.startMs;
    for (const r of runs) {
      if (r.a > at) out.push(piece(at, r.a, 0, false));
      out.push(piece(r.a, r.b, r.n, true));
      at = r.b;
    }
    if (s.endMs > at) out.push(piece(at, s.endMs, 0, false));
  }
  return out;
}

/** Who holds `enemy` (the first tracked enemy when omitted) at `atMs`. */
export function enmityHolderAt(enmity: PullEnmity, atMs: number, enemy?: string): EnmitySpan | undefined {
  const o = enemy ? enmity.enemies.find((x) => x.enemy === enemy) : enmity.enemies[0];
  if (!o) return undefined;
  let best: EnmitySpan | undefined;
  for (const s of o.spans) if (s.startMs <= atMs) best = s;
  return best;
}
