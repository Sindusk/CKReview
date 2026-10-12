// lib/mitigation/tanking.ts
//
// The Mitigation dialog's Tanking view, per pull: each tank's damage stream,
// who held the boss at each moment, and the busters with their follow-up
// margins (docs/tanking-panel-plan.md, Model 1-2). Pure: (pull, hits) ->
// PullTanking. Every amount is a fraction of the tank's max HP, never raw HP
// (user, 2026-10-11: level-synced content makes raw numbers meaningless).
//
// ── Tank damage stream ─────────────────────────────────────────────────
// Every enemy damage event on each tank: autos, busters, raidwides, DoT
// ticks (MitigationGame.isTick / isAutoAttack, or the log's isDoT). Dead
// bodies' hits (logged at 0 HP) are left out, as in analyze.ts. Each event
// keeps its raw damage, damage to health (overkill included), shield
// absorb, statuses and damage type. Damage covered by an invulnerability
// (an invuln status in the event's snapshot, or Living Dead's unlisted
// Walking Dead: analyze.ts trailingInvulnAt) counts as 0.
//
// ── Who is tanking ─────────────────────────────────────────────────────
// Whoever receives an enemy's auto-attacks. Spans run per source enemy, so a
// tank swap needs no configuration and a two-boss fight gives one holder
// per boss.
//
// ── Busters ────────────────────────────────────────────────────────────
// A buster is a tank-only hit (MitigationHit.tankOnly: raw damage at least
// TANK_HIT_MIN_RAW of max HP on some tank). Its kind, by who it hit:
//   - single: one tank
//   - shared / dual: both tanks, labelled in buster-kinds.ts
//   - both:   both tanks, no label
//   - solo:   one tank took a buster meant for both (the "cheese", usually
//     under an invuln). Per pull: a labelled ability that hit one tank.
//     Across pulls (aggregateBusters): an unlabelled ability that hits
//     both tanks in most of its instances. A dual buster's solo tank takes
//     two parts; a shared one's takes one part at about double the damage
//     (Red Hot and Deep Blue's snaking Hot Impact).
//
// ── Buster check: from full HP, plus FOLLOW_UP_MS ──────────────────────
// Per tank hit (user, 2026-10-11): margin = 1 − the buster's damage to
// health − every enemy damage to health on that tank from the buster's
// first part to FOLLOW_UP_MS after its last, with no healing counted and
// the mitigation that was really up on each event. It starts from FULL HP,
// not the logged HP before (the question is whether the tank's plan is
// enough; a tank entering low is the healers' problem): the logged HP
// before is kept beside it as `before`. A follow-up event bigger than the
// tank's whole bar is a failed mechanic and left out (as analyze.ts
// laterDrop does). The logged margin is unbuffered like analyze.ts's;
// DAMAGE_ROLL_BUFFER applies to what-ifs only.
// Verdict per tank: invuln when the buster was taken under one (its damage
// and covered follow-up count 0; the healing Holmgang, Living Dead and
// Superbolide need afterwards is the healers' implicit job); fail when the
// tank died to it (not vulnerable) or the margin is below 0; under below
// TANK_MARGIN_UNDER; good below TANK_MARGIN_OVER; over above. A buster's
// verdict and margin are its worst non-invulnerable tank's. A margin below
// 0 is a fail even when healers kept the tank alive (user, 2026-10-11:
// the plan must survive the follow-up without healing).
//
// ── Across pulls (aggregateBusters) ────────────────────────────────────
// Matched by MitigationHit.id: median and worst margin over the pulls not
// taken under an invuln, the most common kind, and `rare` (BUSTER_MIN_PULLS)
// for tank-only hits that landed on a tank by accident.

import type { Pull } from "@/types/Pull";
import type { PlayerEvent, PlayerInfo } from "@/types/PlayerInfo";
import type { HitVerdict, MitigationGame, MitigationHit } from "./types";
import { rawOf, trailingInvulnAt } from "./analyze";
import { busterLabel } from "./buster-kinds";
import { RARE_SHARE } from "./aggregate";

export const FOLLOW_UP_MS = 10_000;  // user
// Tunables: chosen by the builder, not yet confirmed (docs/open-items.md).
export const TANK_MARGIN_UNDER = 0.15;
export const TANK_MARGIN_OVER = 0.30;
const SAME_HIT_MS = 100;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// ── Types ──────────────────────────────────────────────────────────────

export type TankEventKind = "auto" | "buster" | "tick" | "other";

export type TankEvent = {
  timestampMs: number;
  abilityName: string;
  source?:     string;
  kind:        TankEventKind;
  busterId?:   string;           // the tank-only hit it belongs to
  raw?:        number;           // before mitigation, fraction of max HP
  taken:       number;           // to health, overkill included (0 under an invuln)
  absorbed:    number;           // by shields
  invuln?:     string;           // catalog key of the invuln covering it
  column?:     "physical" | "magical" | "none";
  statusIds:   number[];         // catalog statuses in the event's snapshot
};

export type TankStream = {
  player:    string;
  job:       string;
  maxHealth: number;
  events:    TankEvent[];  // by time
};

// One enemy's autos going to one tank, first to last auto.
export type TankingSpan = { source: string; player: string; startMs: number; endMs: number; autos: number };

export type BusterKind = "single" | "shared" | "dual" | "both" | "solo";
export type TankVerdict = HitVerdict | "invuln";

export type BusterTank = {
  player:   string;
  job:      string;
  parts:    number;
  raw?:     number;   // all parts, fraction of max HP
  taken:    number;   // the buster's damage to health (0 under an invuln)
  absorbed: number;
  followUp: number;   // enemy damage to health in the follow-up window
  margin:   number;   // 1 − taken − followUp
  before:   number;   // logged HP before the first part (a marker, not part of the verdict)
  invuln?:  string;   // catalog key
  vulnerable: boolean;
  died:     boolean;
  verdict:  TankVerdict;
};

export type Buster = {
  id:          string;   // MitigationHit.id, the cross-pull key
  abilityName: string;
  occurrence:  number;
  phase?:      string;
  timestampMs: number;
  endMs:       number;
  kind:        BusterKind;
  tanks:       BusterTank[];
  margin?:     number;   // worst non-invulnerable tank; undefined when all were invulnerable
  verdict:     TankVerdict;
};

export type PullTanking = {
  tanks:   TankStream[];
  tanking: TankingSpan[];
  busters: Buster[];
};

// ── Entry point ────────────────────────────────────────────────────────

export function analyzePullTanking(pull: Pull, hits: MitigationHit[], game: MitigationGame): PullTanking {
  const playerNames = new Set(pull.players.map((p) => p.name));
  const tanks = pull.players.filter((p) => p.role === "Tank");
  const busterHits = hits.filter((h) => h.tankOnly);
  const streams = tanks.map((p) => buildStream(p, playerNames, busterHits, game)).filter((s): s is TankStream => !!s);
  return {
    tanks: streams,
    tanking: tankingSpans(tanks, playerNames, game),
    busters: busterHits.map((h) => buildBuster(pull, h, streams)),
  };
}

// ── Stream ─────────────────────────────────────────────────────────────

function buildStream(player: PlayerInfo, playerNames: Set<string>, busters: MitigationHit[], game: MitigationGame): TankStream | null {
  const maxHealth = player.damageTaken.find((e) => e.maxHealth)?.maxHealth;
  if (!maxHealth) return null;
  const parts = busters.flatMap((h) => (h.targets.find((t) => t.player === player.name)?.parts ?? [])
    .map((p) => ({ id: h.id, t: p.timestampMs, ability: p.abilityName })));
  const events: TankEvent[] = [];
  for (const e of player.damageTaken) {
    if (!e.source || playerNames.has(e.source)) continue;
    if (e.healthBefore === 0) continue;  // a dead body's hit
    const max = e.maxHealth ?? maxHealth;
    const part = parts.find((p) => p.ability === e.abilityName && Math.abs(p.t - e.timestamp) <= SAME_HIT_MS);
    const invuln = invulnOf(player, e, game);
    const raw = rawOf(e);
    events.push({
      timestampMs: e.timestamp,
      abilityName: e.abilityName,
      source:      e.source,
      kind:        part ? "buster" : game.isAutoAttack(e.abilityName) ? "auto"
        : e.isDoT || game.isTick(e.abilityId) ? "tick" : "other",
      busterId:    part?.id,
      raw:         raw === undefined ? undefined : raw / max,
      taken:       invuln ? 0 : ((e.amount ?? 0) + (e.overkill ?? 0)) / max,
      absorbed:    (e.absorbed ?? 0) / max,
      invuln,
      column:      game.damageColumn(e.damageType),
      statusIds:   (e.statusIds ?? []).filter((id) => game.statusIndex.has(id)),
    });
  }
  events.sort((a, b) => a.timestampMs - b.timestampMs);
  return { player: player.name, job: player.className, maxHealth, events };
}

function invulnOf(player: PlayerInfo, e: PlayerEvent, game: MitigationGame): string | undefined {
  for (const id of e.statusIds ?? []) {
    const s = game.statusIndex.get(id);
    if (s?.entry.kind === "invuln") return s.entry.key;
  }
  return trailingInvulnAt(player, game, e.timestamp)?.key;
}

// ── Who is tanking ─────────────────────────────────────────────────────

function tankingSpans(tanks: PlayerInfo[], playerNames: Set<string>, game: MitigationGame): TankingSpan[] {
  const autos: { t: number; source: string; player: string }[] = [];
  for (const p of tanks) {
    for (const e of p.damageTaken) {
      if (!e.source || playerNames.has(e.source) || !game.isAutoAttack(e.abilityName) || e.healthBefore === 0) continue;
      autos.push({ t: e.timestamp, source: e.source, player: p.name });
    }
  }
  autos.sort((a, b) => a.t - b.t);
  const spans: TankingSpan[] = [];
  const open = new Map<string, TankingSpan>();
  for (const a of autos) {
    const cur = open.get(a.source);
    if (cur && cur.player === a.player) {
      cur.endMs = a.t;
      cur.autos++;
      continue;
    }
    const span = { source: a.source, player: a.player, startMs: a.t, endMs: a.t, autos: 1 };
    spans.push(span);
    open.set(a.source, span);
  }
  return spans;
}

/** Who held `source`'s autos at `atMs` (the latest span started by then); any source when omitted. */
export function tankAt(spans: TankingSpan[], atMs: number, source?: string): string | undefined {
  let best: TankingSpan | undefined;
  for (const s of spans) {
    if (source && s.source !== source) continue;
    if (s.startMs <= atMs && (!best || s.startMs > best.startMs)) best = s;
  }
  return best?.player;
}

// ── Busters ────────────────────────────────────────────────────────────

function buildBuster(pull: Pull, hit: MitigationHit, streams: TankStream[]): Buster {
  const tanks: BusterTank[] = [];
  for (const t of hit.targets) {
    const stream = streams.find((s) => s.player === t.player);
    if (!stream) continue;
    const mine = stream.events.filter((e) => e.busterId === hit.id);
    const first = mine[0]?.timestampMs ?? hit.timestampMs;
    const last = mine.length ? mine[mine.length - 1].timestampMs : hit.endMs;
    const taken = mine.reduce((s, e) => s + e.taken, 0);
    const followUp = stream.events
      .filter((e) => e.busterId !== hit.id && e.timestampMs >= first && e.timestampMs <= last + FOLLOW_UP_MS)
      // A single event bigger than the whole bar is a failed mechanic.
      .filter((e) => e.invuln || e.taken < 1)
      .reduce((s, e) => s + e.taken, 0);
    const invuln = t.invulnerable ? (mine.find((e) => e.invuln)?.invuln ?? "invuln") : undefined;
    const margin = 1 - taken - followUp;
    // A death from low HP before the buster is the healers' (the margin
    // starts from full HP); from near full, it's the plan's.
    const died = t.died && !t.vulnerable && t.deathCause === "mitigation";
    tanks.push({
      player: t.player, job: t.job, parts: t.parts.length,
      raw: t.unmitigated === undefined ? undefined : t.unmitigated / t.maxHealth,
      taken, absorbed: t.absorbed / t.maxHealth, followUp, margin,
      // Capped: simultaneous events log health before as after + amount.
      before: Math.min(1, t.healthBefore / t.maxHealth), invuln, vulnerable: t.vulnerable, died,
      verdict: invuln ? "invuln" : tankVerdict(margin, died),
    });
  }
  const label = busterLabel(pull.name, hit.abilityName);
  const kind: BusterKind = tanks.length >= 2 ? (label ?? "both") : label ? "solo" : "single";
  const mortal = tanks.filter((t) => !t.invuln);
  const worst = mortal.length ? mortal.reduce((a, b) => (b.margin < a.margin || (b.verdict === "fail" && a.verdict !== "fail") ? b : a)) : undefined;
  return {
    id: hit.id, abilityName: hit.abilityName, occurrence: hit.occurrence, phase: hit.phase,
    timestampMs: hit.timestampMs, endMs: hit.endMs, kind, tanks,
    margin: worst?.margin, verdict: worst ? worst.verdict : "invuln",
  };
}

export function tankVerdict(margin: number, died: boolean): HitVerdict {
  if (died || margin < 0) return "fail";
  if (margin < TANK_MARGIN_UNDER) return "under";
  if (margin < TANK_MARGIN_OVER) return "good";
  return "over";
}

// ── Across pulls ───────────────────────────────────────────────────────

export type PullTankingRef = { pullId: number | string; pullNumber: number; durationMs: number; tanking: PullTanking };

// A tank-only hit seen in fewer than BUSTER_MIN_PULLS pulls, when at least
// that many pulls lasted until it and it landed in under RARE_SHARE of
// them (aggregate.ts), hit a tank by accident (Flame Floater, Steam Burst,
// Xtreme Wave): not a buster to plan (user, 2026-10-11). A late buster
// only the best pulls reach is kept (Vamp's third Hardcore: 1 of 3; the
// other two lost it to a non-tank after the OT died).
export const BUSTER_MIN_PULLS = 3;

export type AggregatedBuster = {
  id:          string;
  abilityName: string;
  occurrence:  number;
  phase?:      string;
  medianMs:    number;
  pulls:       number;
  kind:        BusterKind;          // the most common kind (solo upgraded as in the header)
  kinds:       Record<string, number>;
  medianMargin?: number;            // over pulls not taken under an invuln
  worstMargin?:  number;
  invulnPulls: number;
  verdict:     TankVerdict;         // by the median margin; invuln when most pulls were
  reached:     number;              // pulls still going at its earliest time
  rare:        boolean;             // see BUSTER_MIN_PULLS
  byPull:      { pullId: number | string; pullNumber: number; buster: Buster }[];
};

/** Busters matched across pulls by id, with the solo upgrade for unlabelled abilities. */
export function aggregateBusters(perPull: PullTankingRef[]): AggregatedBuster[] {
  // An ability that hits both tanks in most of its instances is a two-tank
  // buster; its one-tank instances are solo.
  const byAbility = new Map<string, { both: number; all: number }>();
  for (const p of perPull) for (const b of p.tanking.busters) {
    const x = byAbility.get(b.abilityName) ?? { both: 0, all: 0 };
    x.all++;
    if (b.tanks.length >= 2) x.both++;
    byAbility.set(b.abilityName, x);
  }
  const twoTank = (name: string) => { const x = byAbility.get(name)!; return x.both * 2 > x.all; };

  const rows = new Map<string, AggregatedBuster>();
  for (const p of perPull) for (const b of p.tanking.busters) {
    const kind = b.kind === "single" && twoTank(b.abilityName) ? "solo" : b.kind;
    const buster = kind === b.kind ? b : { ...b, kind };
    const row = rows.get(b.id) ?? {
      id: b.id, abilityName: b.abilityName, occurrence: b.occurrence, phase: b.phase, medianMs: 0, pulls: 0,
      kind, kinds: {}, invulnPulls: 0, verdict: "good" as TankVerdict, reached: 0, rare: false, byPull: [],
    };
    row.byPull.push({ pullId: p.pullId, pullNumber: p.pullNumber, buster });
    row.kinds[kind] = (row.kinds[kind] ?? 0) + 1;
    rows.set(b.id, row);
  }
  for (const row of rows.values()) {
    row.pulls = row.byPull.length;
    row.medianMs = median(row.byPull.map((x) => x.buster.timestampMs));
    const earliest = Math.min(...row.byPull.map((x) => x.buster.timestampMs));
    row.reached = perPull.filter((p) => p.durationMs >= earliest).length;
    row.rare = row.pulls < BUSTER_MIN_PULLS && row.reached >= BUSTER_MIN_PULLS && row.pulls < RARE_SHARE * row.reached;
    row.kind = Object.entries(row.kinds).sort((a, b) => b[1] - a[1])[0][0] as BusterKind;
    const margins = row.byPull.map((x) => x.buster.margin).filter((m): m is number => m !== undefined);
    row.invulnPulls = row.byPull.length - margins.length;
    row.medianMargin = margins.length ? median(margins) : undefined;
    row.worstMargin = margins.length ? Math.min(...margins) : undefined;
    const deaths = row.byPull.filter((x) => x.buster.tanks.some((t) => t.died)).length;
    row.verdict = row.invulnPulls * 2 > row.pulls || row.medianMargin === undefined ? "invuln"
      : tankVerdict(row.medianMargin, deaths * 2 > margins.length);
  }
  return [...rows.values()].sort((a, b) => a.medianMs - b.medianMs);
}
