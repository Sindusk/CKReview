// lib/mechanics/ffxiv/fru/common.ts
//
// Helpers shared by the Futures Rewritten phase modules (fatebreaker.ts,
// usurper-of-frost.ts, oracle-of-darkness.ts, enter-the-dragon.ts, pandora.ts): who was alive when, hits on the living, cast and
// aura lookups, and name formatting. Moved out of fatebreaker.ts unchanged.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { EnemyEvent } from "@/types/PullError";
import { joinNames } from "@/lib/mechanics/wow/common";

export const DAMAGE_DOWN = 1002911;
export const MARK_OF_MORTALITY = 1004372;

// FFLogs logs the death event ~2.0s after the fatal hit (README).
export const DEATH_EVENT_LAG_MS = 2000;
export const DIED_FROM_HIT_MS   = 3000;
// Hits this large are FFLogs' unpaired previews of lethal hits: counted as
// hits, never compared as amounts.
export const PREVIEW_AMOUNT     = 1_500_000;

export type Hit = { p: PlayerInfo; e: PlayerEvent };

export type Life = {
  alive: (p: PlayerInfo, t: number) => boolean;
  hitAlive: (p: PlayerInfo, hitT: number) => boolean;
  diedFrom: (p: PlayerInfo, hitT: number) => DeathEvent | undefined;
  outIntervals: { p: PlayerInfo; start: number; end: number }[];
};

/**
 * A dead body still logs hits: 0 damage at 0 HP. The live pipeline marks
 * them healthBefore 0; the validate harness has only healthAfter.
 */
export const bodyHit = (e: PlayerEvent) => e.healthBefore === 0 || (e.healthAfter === 0 && !((e.amount ?? 0) > 0));

/**
 * When a dead player was raised: their next cast or real hit. Not common.ts's
 * rezzedAt, which counts body hits as a sign of life (A4: the OT's body took
 * the second Cyclonic Break's cones and read as raised).
 */
function raisedAt(p: PlayerInfo, deathT: number, nextDeathT: number): number | undefined {
  const t = [...p.damageTaken.filter((e) => !bodyHit(e)), ...p.casts]
    .map((e) => e.timestamp)
    .filter((x) => x > deathT + 2000 && x < nextDeathT)
    .sort((a, b) => a - b)[0];
  return t;
}

export function buildLife(players: PlayerInfo[], deaths: DeathEvent[]): Life {
  const outIntervals: Life["outIntervals"] = [];
  for (const p of players) {
    const own = deaths.filter((d) => d.player === p.name).sort((a, b) => a.timestamp - b.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const end = raisedAt(p, d.timestamp, next) ?? next - DEATH_EVENT_LAG_MS - 100;
      outIntervals.push({ p, start: d.timestamp - DEATH_EVENT_LAG_MS - 100, end });
    });
  }
  const alive = (p: PlayerInfo, t: number) => !outIntervals.some((w) => w.p === p && t >= w.start && t < w.end);
  return {
    outIntervals,
    alive,
    hitAlive: (p, hitT) => alive(p, hitT - 500),
    diedFrom: (p, hitT) => deaths.find((d) => d.player === p.name && d.timestamp >= hitT && d.timestamp <= hitT + DIED_FROM_HIT_MS),
  };
}

/** Hits on living players (a dead body still logs 0-damage hits). */
export function hitsOf(players: PlayerInfo[], life: Life, ids: number | number[], until: number): Hit[] {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  const out: Hit[] = [];
  for (const p of players) {
    for (const e of p.damageTaken) {
      if (!set.has(e.abilityId) || e.timestamp > until || bodyHit(e)) continue;
      if (life.hitAlive(p, e.timestamp)) out.push({ p, e });
    }
  }
  return out.sort((a, b) => a.e.timestamp - b.e.timestamp);
}

export const castsOf = (casts: EnemyEvent[], ids: number | number[], until: number) => {
  const set = new Set(Array.isArray(ids) ? ids : [ids]);
  return casts.filter((c) => set.has(c.abilityId) && c.timestamp <= until).sort((a, b) => a.timestamp - b.timestamp);
};

export function gotAura(p: PlayerInfo, id: number, t: number, ms = 1500): boolean {
  return p.debuffs.some((e) => e.abilityId === id && e.debuffStatus === "applied" && Math.abs(e.timestamp - t) <= ms);
}

/** ms into the pull as m:ss.s, the way reviewers read VOD timestamps. */
export const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${((ms % 60_000) / 1000).toFixed(1).padStart(4, "0")}`;
export const uniq = <T,>(xs: T[]) => [...new Set(xs)];
export const namesOf = (ps: PlayerInfo[]) => joinNames(uniq(ps).map((p) => p.name));
export const isTank = (p: PlayerInfo) => p.role === "Tank";
export const realAmount = (e: PlayerEvent) => ((e.amount ?? 0) >= PREVIEW_AMOUNT ? 0 : e.amount ?? 0);
export const allAlive = (players: PlayerInfo[], life: Life, t: number) => players.every((p) => life.alive(p, t));
export const byPlayer = (hits: Hit[]) => {
  const m = new Map<PlayerInfo, PlayerEvent[]>();
  for (const h of hits) m.set(h.p, [...(m.get(h.p) ?? []), h.e]);
  return m;
};
