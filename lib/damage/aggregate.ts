// lib/damage/aggregate.ts
//
// Damage findings across the loaded pulls: per player, the average loss
// per pull and which findings recur. A finding recurs when the same label
// appears in the same phase in several pulls (labels are pull-independent:
// "GCD gap during Limit Cut", "Technical Step drift"). Pure.

import type { DamageFinding, FindingKind, PullDamageAnalysis } from "./types";

export type RecurringFinding = {
  kind:       FindingKind;
  label:      string;
  phase?:     string;
  forced:     boolean;
  pulls:      number;     // pulls it appeared in
  count:      number;     // occurrences in total
  lostDamage: number;     // summed over every pull
  example:    DamageFinding;
};

export type PlayerDamageAggregate = {
  player:          string;
  job:             string;
  role:            string;
  pulls:           number;   // pulls this player was in
  lostPerPull:     number;   // unforced
  forcedPerPull:   number;
  damagePerPull:   number;   // damage dealt, average per pull
  // Over every pull's eligible time together (alive, boss targetable): 0-1.
  gcdUptime:       number;
  recurring:       RecurringFinding[];
};

export function aggregateDamage(analyses: PullDamageAnalysis[]): PlayerDamageAggregate[] {
  const byPlayer = new Map<string, PlayerDamageAggregate & {
    lost: number; forcedLost: number; dealt: number; activeMs: number; eligibleMs: number;
    groups: Map<string, RecurringFinding & { pullIds: Set<number> }>;
  }>();
  for (const a of analyses) {
    for (const p of a.players) {
      const agg = byPlayer.get(p.player) ?? {
        player: p.player, job: p.job, role: p.role, pulls: 0, lostPerPull: 0, forcedPerPull: 0, damagePerPull: 0, gcdUptime: 0, recurring: [],
        lost: 0, forcedLost: 0, dealt: 0, activeMs: 0, eligibleMs: 0, groups: new Map(),
      };
      agg.pulls++;
      agg.dealt += p.damage;
      agg.lost += p.lostDamage;
      agg.forcedLost += p.forcedDamage;
      agg.activeMs += p.gcdUptime.activeMs;
      agg.eligibleMs += p.gcdUptime.eligibleMs;
      for (const f of p.findings) {
        const key = `${f.kind}|${f.phase ?? ""}|${f.label}|${f.forced}`;
        const g = agg.groups.get(key) ?? {
          kind: f.kind, label: f.label, phase: f.phase, forced: f.forced,
          pulls: 0, count: 0, lostDamage: 0, example: f, pullIds: new Set<number>(),
        };
        g.count++;
        g.lostDamage += f.lostDamage;
        g.pullIds.add(a.pullId);
        g.pulls = g.pullIds.size;
        if (f.lostDamage > g.example.lostDamage) g.example = f;
        agg.groups.set(key, g);
      }
      byPlayer.set(p.player, agg);
    }
  }
  return [...byPlayer.values()].map((agg) => ({
    player: agg.player, job: agg.job, role: agg.role, pulls: agg.pulls,
    lostPerPull: agg.lost / agg.pulls,
    forcedPerPull: agg.forcedLost / agg.pulls,
    damagePerPull: agg.dealt / agg.pulls,
    gcdUptime: agg.eligibleMs > 0 ? agg.activeMs / agg.eligibleMs : 0,
    recurring: [...agg.groups.values()]
      .map(({ pullIds: _ids, ...g }) => g)
      .sort((a, b) => Number(a.forced) - Number(b.forced) || b.lostDamage - a.lostDamage),
  })).sort((a, b) => b.lostPerPull - a.lostPerPull);
}
