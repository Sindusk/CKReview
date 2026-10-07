// lib/mitigation/aggregate.ts
//
// Cross-pull view of the mitigation analysis (docs/archive/mitigation-redesign.md,
// Model section 6). One pull is too noisy to plan from, so the plan view
// reads this: each hit matched across pulls by MitigationHit.id (phase +
// ability name + occurrence within the phase), with median and worst
// margin, deaths, how often each mitigation was on it, how often each was
// free, and a droppable set budgeted against the worst pull.
//
// The verdict uses the MEDIAN sequence margin, so one pull lost to a
// healing gap doesn't relabel a hit; deaths and the worst margin are shown
// next to it.

import type {
  DroppableResult, HitVerdict, MitigationGame, MitigationHit, MitigationKind,
} from "./types";
import { findDroppable, verdictFor } from "./analyze";

export type AggregatedMitigation = {
  key:     string;
  name:    string;
  kind:    MitigationKind;
  pulls:   number;                  // pulls where it was on this hit
  casters: Record<string, number>;  // caster -> pulls
};

export type AggregatedFree = {
  player: string;
  key:    string;
  name:   string;
  pulls:  number;  // pulls where it was free at this hit
};

export type PullHit = { pullId: number; pullNumber: number; hit: MitigationHit };

export type AggregatedHit = {
  id:             string;
  abilityName:    string;
  occurrence:     number;
  phase?:         string;
  damageColumn?:  "physical" | "magical" | "none";
  pulls:          number;   // pulls that reached it
  medianMs:       number;   // median time into the pull
  medianMargin:   number;   // sequence-aware
  worstMargin:    number;   // sequence-aware
  deaths:         number;   // non-vulnerable deaths, summed over pulls
  deathPulls:     number;   // pulls with at least one such death
  verdict:        HitVerdict;
  active:         AggregatedMitigation[];
  free:           AggregatedFree[];
  droppable:      DroppableResult;
  byPull:         PullHit[];
};

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function aggregateMitigation(
  perPull: { pullId: number; pullNumber: number; hits: MitigationHit[] }[],
  game: MitigationGame,
): AggregatedHit[] {
  const groups = new Map<string, PullHit[]>();
  for (const p of perPull) {
    for (const hit of p.hits) {
      const list = groups.get(hit.id) ?? [];
      list.push({ pullId: p.pullId, pullNumber: p.pullNumber, hit });
      groups.set(hit.id, list);
    }
  }

  const out: AggregatedHit[] = [];
  for (const [id, byPull] of groups) {
    const hits = byPull.map((b) => b.hit);
    const first = hits[0];
    const seqMargins = hits.map((h) => Math.min(h.margin, h.sequenceMargin));

    const active = new Map<string, AggregatedMitigation>();
    for (const h of hits) {
      for (const a of h.active) {
        const agg = active.get(a.key) ?? { key: a.key, name: a.name, kind: a.kind, pulls: 0, casters: {} };
        agg.pulls++;
        for (const c of a.casters) agg.casters[c] = (agg.casters[c] ?? 0) + 1;
        active.set(a.key, agg);
      }
    }

    const free = new Map<string, AggregatedFree>();
    for (const h of hits) {
      for (const p of h.players) {
        if (p.state !== "free") continue;
        const k = `${p.player}|${p.key}`;
        const agg = free.get(k) ?? { player: p.player, key: p.key, name: p.name, pulls: 0 };
        agg.pulls++;
        free.set(k, agg);
      }
    }

    const deaths = hits.reduce((s, h) => s + h.cleanDeaths, 0);
    const medianMargin = median(seqMargins);
    out.push({
      id,
      abilityName:  first.abilityName,
      occurrence:   first.occurrence,
      phase:        first.phase,
      damageColumn: first.damageColumn,
      pulls:        hits.length,
      medianMs:     median(hits.map((h) => h.timestampMs)),
      medianMargin,
      worstMargin:  Math.min(...seqMargins),
      deaths,
      deathPulls:   hits.filter((h) => h.cleanDeaths > 0).length,
      verdict:      verdictFor(medianMargin, 0),
      active:       [...active.values()].sort((a, b) => b.pulls - a.pulls || a.name.localeCompare(b.name)),
      free:         [...free.values()].sort((a, b) => b.pulls - a.pulls || a.name.localeCompare(b.name)),
      droppable:    findDroppable(hits, game),
      byPull,
    });
  }
  return out.sort((a, b) => a.medianMs - b.medianMs);
}
