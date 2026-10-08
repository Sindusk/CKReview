// lib/damage/buffs.ts
//
// Party buffs across the pull: who applied each buff a hit carried, what it
// added to that hit, and whether a buff cast reached the whole party. Feeds
// the rDPS split (PlayerDamageSummary.buffs) and the buff-coverage check.
// docs/dps-analysis.md (method step 5) is why: a buffer's numbers depend on
// the party's damage under their buff, so own play and buffs given are
// shown apart.
//
// ── What a buff added to a hit ─────────────────────────────────────────
// - Damage % buffs: the share 1 − 1 ÷ (1 + f). f is re-measured per pull
//   as the median FFLogs multiplier of hits carrying that buff and no other
//   multiplier status (cards per recipient range), with 3+ such hits;
//   else the game table's value. That handles Radiant Finale's 2/4/6% and
//   the cards' 6%/3% split without modelling them.
// - Crit and direct-hit rate buffs aren't in the multiplier, so their
//   share is an estimate: r(M − 1) ÷ (1 + (p + r)(M − 1)), with crit
//   M = 1.55 at base rate p = 25%, and direct hit M = 1.25 at p = 30%.
//   Anything they feed is marked approximate.
// - The buff's source: the latest application of it on that player (the
//   player-buff stream names the source) at or before the hit, + 1s for
//   the snapshot lag; boss debuffs (Chain Stratagem, Dokumori) from
//   Pull.bossDebuffs. A player's own buff on their own hits is their own
//   damage, not "given".
//
// ── Coverage ───────────────────────────────────────────────────────────
// A party-wide buff's applications from one player within COVERAGE_GAP_MS
// form one cast. A living party member who didn't get it is a finding on
// the buffer, valued at that member's damage over the buff's duration × the
// buff's share. (FFLogs applies the buff to pets too; only players count.)

import type { Pull } from "@/types/Pull";
import type { PlayerInfo } from "@/types/PlayerInfo";
import type { DamageFinding, DamageGame, PartyBuff } from "./types";
import { finding, type PlayerCheckContext } from "./checks";
import { deadWindows, inWindows, type Window } from "./timeline";

const CRIT_M = 1.55, CRIT_P = 0.25, DH_M = 1.25, DH_P = 0.3;
const SNAPSHOT_LAG_MS = 1_000;
const COVERAGE_GAP_MS = 3_000;
const MIN_SAMPLES = 3;

export type BuffLedger = {
  /** Share of a hit's damage this buff added, for this recipient. */
  share(statusId: number, recipient: PlayerInfo): number;
  approximate(statusId: number): boolean;
  contributions: Map<string, { given: number; received: number; approximate: boolean }>;
  // Every party-wide buff cast: who cast it, when, and who got it.
  casts: { source: string; statusId: number; name: string; startMs: number; durationMs: number; recipients: Set<string> }[];
  dead: Map<string, Window[]>;
};

const rangeOf = (p: PlayerInfo) => (p.role === "Tank" || p.rangeType === "Melee" ? "melee" : "ranged");

/**
 * `fromMs` limits the given/received totals to hits from then on (the
 * reference-clear comparison's equal window); buff factors are still
 * measured over the whole pull.
 */
export function buildBuffLedger(pull: Pull, game: DamageGame, endMs: number, fromMs = 0): BuffLedger {
  const players = pull.players;

  // Measured damage factors.
  const samples = new Map<string, number[]>();
  for (const p of players) {
    for (const e of p.damageDone) {
      if (e.multiplier === undefined || !e.statusIds || e.timestamp >= endMs) continue;
      const mult = [...new Set(e.statusIds)].filter((id) => {
        const b = game.partyBuff(id);
        return !(b && b.damage === undefined && b.damageByRange === undefined); // crit/DH buffs aren't in the multiplier
      });
      if (mult.length !== 1) continue;
      const b = game.partyBuff(mult[0]);
      if (!b) continue;
      const key = b.damageByRange ? `${mult[0]}|${rangeOf(p)}` : `${mult[0]}`;
      const list = samples.get(key) ?? [];
      list.push(e.multiplier);
      samples.set(key, list);
    }
  }
  const measured = new Map<string, number>();
  for (const [key, list] of samples) {
    if (list.length < MIN_SAMPLES) continue;
    const sorted = [...list].sort((a, b) => a - b);
    const f = sorted[Math.floor(sorted.length / 2)] - 1;
    if (f > 0 && f < 0.25) measured.set(key, f);
  }

  const shareOf = (statusId: number, b: PartyBuff, recipient: PlayerInfo): number => {
    let share = 0;
    if (b.damage !== undefined || b.damageByRange) {
      const key = b.damageByRange ? `${statusId}|${rangeOf(recipient)}` : `${statusId}`;
      const f = measured.get(key) ?? b.damage ?? b.damageByRange![rangeOf(recipient)];
      share += 1 - 1 / (1 + f);
    }
    if (b.crit) share += (b.crit * (CRIT_M - 1)) / (1 + (CRIT_P + b.crit) * (CRIT_M - 1));
    if (b.directHit) share += (b.directHit * (DH_M - 1)) / (1 + (DH_P + b.directHit) * (DH_M - 1));
    if (b.haste) share += b.haste / (1 + b.haste);
    return share;
  };
  const isApprox = (b: PartyBuff) => b.crit !== undefined || b.directHit !== undefined || b.haste !== undefined;

  // Sources: applications on each player, and boss debuffs.
  const applied = new Map<string, Map<number, { t: number; source: string }[]>>();
  for (const p of players) {
    const m = new Map<number, { t: number; source: string }[]>();
    for (const e of p.buffs ?? []) {
      if (!game.partyBuff(e.abilityId) || (e.buffStatus !== "applied" && e.buffStatus !== "refreshed") || !e.source) continue;
      const list = m.get(e.abilityId) ?? [];
      list.push({ t: e.timestamp, source: e.source });
      m.set(e.abilityId, list);
    }
    applied.set(p.name, m);
  }
  const bossApplied = new Map<number, { t: number; source: string }[]>();
  for (const e of pull.bossDebuffs ?? []) {
    if (!game.partyBuff(e.statusId) || e.status === "removed") continue;
    const list = bossApplied.get(e.statusId) ?? [];
    list.push({ t: e.timestamp, source: e.sourceName });
    bossApplied.set(e.statusId, list);
  }
  const sourceAt = (list: { t: number; source: string }[] | undefined, t: number) => {
    let src: string | undefined;
    for (const a of list ?? []) { if (a.t <= t + SNAPSHOT_LAG_MS) src = a.source; else break; }
    return src;
  };

  const contributions = new Map<string, { given: number; received: number; approximate: boolean }>();
  const entry = (name: string) => {
    const c = contributions.get(name) ?? { given: 0, received: 0, approximate: false };
    contributions.set(name, c);
    return c;
  };
  for (const p of players) entry(p.name);
  for (const p of players) {
    const mine = applied.get(p.name)!;
    for (const e of p.damageDone) {
      if (!e.statusIds || e.timestamp >= endMs || e.timestamp < fromMs) continue;
      // A dance partner's hits list Devilment's status id twice.
      for (const id of new Set(e.statusIds)) {
        const b = game.partyBuff(id);
        if (!b) continue;
        const src = sourceAt(mine.get(id) ?? bossApplied.get(id), e.timestamp);
        if (!src || src === p.name || !contributions.has(src)) continue;
        const add = (e.amount ?? 0) * shareOf(id, b, p);
        const approx = isApprox(b);
        const giver = entry(src), taker = entry(p.name);
        giver.given += add; taker.received += add;
        if (approx) { giver.approximate = true; taker.approximate = true; }
      }
    }
  }

  // Party-wide casts and who they reached.
  const casts: BuffLedger["casts"] = [];
  const all: { t: number; source: string; statusId: number; recipient: string; duration?: number }[] = [];
  for (const p of players) {
    for (const e of p.buffs ?? []) {
      const b = game.partyBuff(e.abilityId);
      if (!b?.partyWide || e.buffStatus !== "applied" || !e.source) continue;
      all.push({ t: e.timestamp, source: e.source, statusId: e.abilityId, recipient: p.name, duration: e.durationMs });
    }
  }
  all.sort((a, b) => a.t - b.t);
  for (const a of all) {
    const open = casts.find((c) => c.source === a.source && c.statusId === a.statusId && a.t - c.startMs <= COVERAGE_GAP_MS);
    if (open) { open.recipients.add(a.recipient); continue; }
    casts.push({
      source: a.source, statusId: a.statusId, name: game.partyBuff(a.statusId)!.name,
      startMs: a.t, durationMs: a.duration ?? 20_000, recipients: new Set([a.recipient]),
    });
  }

  const dead = new Map(players.map((p) => [p.name, deadWindows(p, pull, endMs)]));
  return {
    share: (statusId, recipient) => { const b = game.partyBuff(statusId); return b ? shareOf(statusId, b, recipient) : 0; },
    approximate: (statusId) => { const b = game.partyBuff(statusId); return !!b && isApprox(b); },
    contributions, casts, dead,
  };
}

const clock = (ms: number) => {
  const t = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};
const k = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : `${Math.round(n / 1000)}k`);

export function checkBuffCoverage(ctx: PlayerCheckContext): DamageFinding[] {
  const ledger = ctx.ledger;
  if (!ledger) return [];
  const out: DamageFinding[] = [];
  for (const c of ledger.casts) {
    if (c.source !== ctx.player.name || c.startMs >= ctx.endMs) continue;
    const end = Math.min(c.startMs + c.durationMs, ctx.endMs);
    // Never the caster: some buffs put a separate self status on them (Red
    // Mage's Embolden is 1001239 on the RDM, 1001297 on the party), so the
    // party status is missing from them by design.
    const missed = ctx.pull.players.filter((p) =>
      p.name !== c.source &&
      !c.recipients.has(p.name) && !inWindows(c.startMs, ledger.dead.get(p.name) ?? []) &&
      p.damageDone.some((e) => e.timestamp >= c.startMs && e.timestamp < end));
    if (missed.length === 0) continue;
    let lost = 0;
    for (const p of missed) {
      const dealt = p.damageDone.filter((e) => e.timestamp >= c.startMs && e.timestamp < end).reduce((a, e) => a + (e.amount ?? 0), 0);
      lost += dealt * ledger.share(c.statusId, p);
    }
    const during = ctx.mechanicAround(c.startMs, c.startMs);
    out.push(finding(ctx, {
      kind: "buff-coverage", startMs: c.startMs, endMs: end, forced: false,
      cause: during ? `during ${during}` : undefined,
      label: `${c.name} missed players`,
      lostDamage: lost,
      inference: ledger.approximate(c.statusId) || undefined,
      basis: `each missed player's damage over the buff (${(c.durationMs / 1000).toFixed(0)}s) × the share it would have added`,
      detail: `${c.name} at ${clock(c.startMs)} missed ${missed.map((p) => p.name).join(", ")} (${k(lost)})`,
    }));
  }
  return out;
}
