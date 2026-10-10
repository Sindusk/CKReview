// lib/mitigation/aggregate.ts
//
// Cross-pull view of the mitigation analysis (docs/archive/mitigation-redesign.md,
// Model section 6). One pull is too noisy to plan from, so the plan view
// reads this: each hit matched across pulls by MitigationHit.id (phase +
// ability name + occurrence within the phase), with median and worst
// margin, deaths, how often each mitigation was on it, how often each was
// free, and a droppable set budgeted against the worst pull.
//
// The verdict uses the MEDIAN margin, so one pull lost to a healing gap
// doesn't relabel a hit; it is fail only when most pulls had a death.
// Deaths and the worst margin are shown next to it.

import type {
  DroppableResult, HitVerdict, MitigationGame, MitigationHit, MitigationKind,
} from "./types";
import { findDroppable, verdictFor } from "./analyze";
import { aggregateNote } from "./notes";

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
  // Medians over pulls of the per-pull values (MitigationHit).
  rawDamage?:     number;
  takenDamage:    number;
  absorbedDamage: number;
  lowestBefore:   number;
  medianMargin:   number;   // lowest health after
  worstMargin:    number;
  deaths:         number;   // non-vulnerable deaths, summed over pulls
  deathPulls:     number;   // pulls with at least one such death
  verdict:        HitVerdict;
  active:         AggregatedMitigation[];
  free:           AggregatedFree[];
  droppable:      DroppableResult;  // empty unless the verdict is over
  note:           string;
  // Pulls still going when this hit first landed in any pull (those that
  // had it included), and whether it is rare among them: seen in under
  // RARE_SHARE of them, with at least RARE_MIN_REACHED reaching it. A hit
  // the group usually doesn't take is a mistake, not a planned mitigation
  // (Vamp Fatale's Aetherletting: 1 of 8 pulls), whatever the boss. Not
  // half: a randomized mechanic's variants each land in about half the
  // pulls (Red Hot and Deep Blue's Awesome Slab: 20 of 41).
  reached:        number;
  rare:           boolean;
  byPull:         PullHit[];
};

export const RARE_SHARE = 0.25;
export const RARE_MIN_REACHED = 3;

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function aggregateMitigation(
  // durationMs: how long the pull lasted, for `reached`; without it only the
  // pulls that had the hit count as reaching it.
  perPull: { pullId: number; pullNumber: number; durationMs?: number; hits: MitigationHit[] }[],
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
    const margins = hits.map((h) => h.margin);
    const raws = hits.map((h) => h.rawDamage).filter((x): x is number => x !== undefined);

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
        if (p.state !== "free" || p.dead) continue;
        const k = `${p.player}|${p.key}`;
        const agg = free.get(k) ?? { player: p.player, key: p.key, name: p.name, pulls: 0 };
        agg.pulls++;
        free.set(k, agg);
      }
    }

    const deaths = hits.reduce((s, h) => s + h.cleanDeaths, 0);
    const deathPulls = hits.filter((h) => h.cleanDeaths > 0).length;
    const medianMargin = median(margins);
    // Fail only when deaths are the usual outcome; one lost pull is shown
    // as a death count beside the verdict.
    const verdict = verdictFor(medianMargin, deathPulls * 2 > hits.length ? 1 : 0);
    const firstMs = Math.min(...hits.map((h) => h.timestampMs));
    const had = new Set(byPull.map((b) => b.pullId));
    const reached = perPull.filter((p) => had.has(p.pullId) || (p.durationMs ?? 0) > firstMs).length;
    const row: AggregatedHit = {
      id,
      abilityName:  first.abilityName,
      occurrence:   first.occurrence,
      phase:        first.phase,
      damageColumn: first.damageColumn,
      pulls:        hits.length,
      medianMs:     median(hits.map((h) => h.timestampMs)),
      rawDamage:    raws.length ? median(raws) : undefined,
      takenDamage:  median(hits.map((h) => h.takenDamage)),
      absorbedDamage: median(hits.map((h) => h.absorbedDamage)),
      lowestBefore: median(hits.map((h) => h.lowestBefore)),
      medianMargin,
      worstMargin:  Math.min(...margins),
      deaths,
      deathPulls,
      verdict,
      active:       [...active.values()].sort((a, b) => b.pulls - a.pulls || a.name.localeCompare(b.name)),
      free:         [...free.values()].sort((a, b) => b.pulls - a.pulls || a.name.localeCompare(b.name)),
      droppable:    verdict === "over" ? findDroppable(hits, game) : { keys: [], names: [], worstMargin: medianMargin, alternatives: [], candidates: 0 },
      note:         "",
      reached,
      rare:         reached >= RARE_MIN_REACHED && hits.length < RARE_SHARE * reached,
      byPull,
    };
    row.note = aggregateNote(row, game);
    out.push(row);
  }
  return out.sort((a, b) => a.medianMs - b.medianMs);
}
