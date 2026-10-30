// lib/mechanics/ffxiv/fru/common.ts
//
// Helpers shared by the Futures Rewritten phase modules (fatebreaker.ts,
// usurper-of-frost.ts, oracle-of-darkness.ts, enter-the-dragon.ts, pandora.ts): who was alive when, hits on the living, cast and
// aura lookups, and name formatting. Moved out of fatebreaker.ts unchanged.
// Also used by TEA (tea/*) and every TOP module. buildLife dates a raise by
// the Weakness / Brink of Death (+1.5s settle) or the first cast / real hit,
// whichever is first (2026-10-30; raisedAt below).

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { EnemyEvent, PullError } from "@/types/PullError";
import { joinNames, playerlessMinor } from "@/lib/mechanics/wow/common";

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

// Weakness / Brink of Death: applied the moment a raise is accepted.
export const WEAKNESS = 1000043;
export const BRINK_OF_DEATH = 1000044;
// A raised player who hasn't acted yet counts as back this long after the
// Weakness: they get up where their body lay, often inside the hazard that
// killed them. Each of these hits came 1.1-1.9s after the Weakness and was
// the player's first event, so blaming it would be new noise: FRU
// JZ1KXhDbqkNH3jxR Pull 9 4:02.8 (Hallowed Ray, 1.1s), TEA
// 1NG4Zah79yKYHCDv Pull 66 2:04.2 and HwjvVh3TNAZmMQyq Pull 17 2:05.1 (Hawk
// Blaster, 1.5s / 1.9s), 6pzyKv8fnYBZ2XGa Pull 3 1:26.9 (a tank raised 1.8s
// before Drainage, whose ruling excuses it as tank-dead).
const RAISE_SETTLE_MS = 1500;

/**
 * When a dead player was raised: their next cast or real hit, or their
 * Weakness / Brink of Death + RAISE_SETTLE_MS if that's earlier. Not
 * common.ts's rezzedAt, which counts body hits as a sign of life (A4: the
 * OT's body took the second Cyclonic Break's cones and read as raised). The
 * cast/hit date alone ran late by however long the raised player waited to
 * act: 0.1-25.8s after the Weakness on disk, median 2.6s (TOP KCX2 Pull 38:
 * the SCH's Weakness 5:10.4, 0.7s before Hello World, first cast 5:16.5, read
 * as dead at the duty handout and cut the pull off at Hello World).
 */
function raisedAt(p: PlayerInfo, deathT: number, nextDeathT: number): number | undefined {
  const weak = p.debuffs
    .filter((e) => (e.abilityId === WEAKNESS || e.abilityId === BRINK_OF_DEATH) && e.debuffStatus === "applied")
    .map((e) => e.timestamp)
    .filter((x) => x > deathT && x < nextDeathT)
    .sort((a, b) => a - b)[0];
  const t = [...p.damageTaken.filter((e) => !bodyHit(e)), ...p.casts]
    .map((e) => e.timestamp)
    .filter((x) => x > deathT + 2000 && x < nextDeathT)
    .sort((a, b) => a - b)[0];
  if (weak === undefined) return t;
  const settled = Math.min(weak + RAISE_SETTLE_MS, nextDeathT);
  return t === undefined ? settled : Math.min(settled, t);
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

/**
 * A called wipe's no-killing-blow deaths, minus a first one followed by a
 * death to a mechanic before the next no-killing-blow death: the reset
 * follows the failure, so that first death was its own mistake (user,
 * 2026-10-12: T25 P2 +87.6 the sage walked into the wall, the cones killed
 * four, then the raid reset; T30 +0:49 in P1 the picto smudged into the
 * wall, a spread doubled onto the healer, then the reset). Only the first,
 * and only with nobody dead in the 10s before it: a mechanic death in the
 * middle of a reset (B22 +0:32, a Burn Mark among seven) doesn't split it,
 * nor does a death right behind others (C41 +1:21, 4.7s after Blastburn
 * with two already knocked out).
 */
/**
 * Mark of Mortality (a short stack) always means something went wrong
 * (user, 2026-10-12). A Mark in [start, end] with no error of the module's
 * within 6s before to 1.5s after it is reported player-less: most were the
 * third Refrain Water or an Unholy left short by earlier deaths (20 of 151
 * on disk). Major when a marked player died within 30s.
 */
export function unexplainedMarks(players: PlayerInfo[], deaths: DeathEvent[], errors: PullError[], start: number, end: number, ruleId: string): PullError[] {
  const marks = players.flatMap((p) => p.debuffs.filter((e) => e.abilityId === MARK_OF_MORTALITY && e.debuffStatus === "applied" && e.timestamp >= start && e.timestamp <= end).map((e) => ({ p, e })))
    .sort((a, b) => a.e.timestamp - b.e.timestamp);
  const out: PullError[] = [];
  const groups: (typeof marks)[] = [];
  for (const m of marks) {
    const g = groups[groups.length - 1];
    if (g && m.e.timestamp - g[0].e.timestamp <= 1500) g.push(m); else groups.push([m]);
  }
  for (const g of groups) {
    const t = g[0].e.timestamp;
    if (errors.some((x) => x.timestamp >= t - 6000 && x.timestamp <= t + 1500)) continue;
    const who = uniq(g.map((m) => m.p));
    const died = who.filter((p) => deaths.some((d) => d.player === p.name && d.timestamp > t && d.timestamp - t <= 30_000));
    const cause = g[0].e.causeAbilityName ?? g[0].e.abilityName;
    out.push({
      ...playerlessMinor(ruleId, "Mark of Mortality",
        `${namesOf(who)} got Mark of Mortality${cause && cause !== "Mark of Mortality" ? ` from ${cause}` : ""}: a stack came up short.${died.length ? ` ${namesOf(died)} died.` : ""} Mark of Mortality always means something went wrong; look at who was missing (often a player dead from an earlier mistake).`,
        t, MARK_OF_MORTALITY, "Mark of Mortality"),
      severity: died.length ? "Major" : "Minor",
    });
  }
  return out;
}

export function resetCluster(near: DeathEvent[], deaths: DeathEvent[]): DeathEvent[] {
  const sorted = [...near].sort((a, b) => a.timestamp - b.timestamp);
  const [first, next] = sorted;
  if (!next || !deaths.some((k) => k.killingAbilityGameId && k.timestamp > first.timestamp && k.timestamp < next.timestamp)) return near;
  if (deaths.some((k) => k !== first && k.timestamp <= first.timestamp && first.timestamp - k.timestamp <= 10_000)) return near;
  return sorted.slice(1);
}
