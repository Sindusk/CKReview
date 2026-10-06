// lib/damage/compare.ts
//
// Reference-clear comparison (docs/damage-analysis-plan.md, Layer 4; the
// method is docs/dps-analysis.md steps 2, 3 and 5). Pure.
//
// ── Equal windows ──────────────────────────────────────────────────────
// Every log is measured over the same stretch: from the start of the
// compared phase (by default the one that decides the enrage) for L ms,
// where L is the shortest of: that phase in every reference clear, and
// that phase in the own pull up to its end or wipe collapse. Per-phase
// averages mislead (kills end at different times; wipes log on with the
// raid dead), so they're never used. When several own pulls are compared,
// each is measured over its own L against the references over that same
// L, and the per-player results are combined by median.
//
// ── Per player ─────────────────────────────────────────────────────────
// Over the window: damage dealt; received = what others' party buffs added
// to it; own = dealt − received; given = what this player's party buffs
// added to others (lib/damage/buffs.ts). rDPS ≈ own + given, FFLogs'
// definition. Plus GCDs and heal GCDs per minute, deaths, and the
// analysis's own estimated loss inside the window. Each is set against the
// median of the reference players of the same job.
//
// ── Per role ───────────────────────────────────────────────────────────
// Tanks, healers and DPS are summed per log (every log has 2 / 2 / 4), so
// the role rows compare like with like even when the DPS jobs differ.
//
// Pitfall (docs/dps-analysis.md, window-edge artifacts): a burst that
// straddles the window's end reads as a missing cast. The dialog says so.

import type { Pull } from "@/types/Pull";
import type { DamageContext, DamageGame, PullDamageAnalysis } from "./types";
import { buildBuffLedger } from "./buffs";

export type CompareLog = { pull: Pull; analysis: PullDamageAnalysis; label: string };

export type PlayerWindowStats = {
  player:      string;
  job:         string;
  role:        string;
  dps:         number;
  ownDps:      number;
  givenDps:    number;
  rdps:        number;
  gcdsPerMin:  number;
  healGcdsPerMin: number;
  deaths:      number;
  lostDps:     number;   // the analysis's estimated unforced loss in the window, per second
};

export type CompareRow = PlayerWindowStats & {
  refCount:  number;
  ref?:      { rdps: number; ownDps: number; givenDps: number; gcdsPerMin: number; healGcdsPerMin: number };
};

export type RoleRow = { role: string; rdps: number; refRdps?: number; refCount: number };

export type CompareResult = {
  phaseId:    number;
  phaseName:  string;
  windowMs:   number;       // the median window when several own pulls are combined
  ownPulls:   number;
  rows:       CompareRow[];
  roles:      RoleRow[];
  raid:       { dps: number; refDps?: number };
  refs:       { label: string; windowMs: number }[];
};

export type CompareError = { error: string };

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const ROLE_ORDER = ["Tank", "Healer", "DPS"];

/** The compared phase's [start, end) in a log, end cut at the analysis end. */
function phaseSpan(log: CompareLog, phaseId: number): { startMs: number; endMs: number } | undefined {
  const seg = log.pull.phaseSegments?.find((s) => s.phase === phaseId);
  if (!seg) return undefined;
  return { startMs: seg.startMs, endMs: Math.min(seg.endMs, log.analysis.endMs) };
}

export function windowStats(log: CompareLog, game: DamageGame, startMs: number, endMs: number): PlayerWindowStats[] {
  const ledger = buildBuffLedger(log.pull, game, endMs, startMs);
  const secs = (endMs - startMs) / 1000;
  const mins = secs / 60;
  return log.pull.players.map((p) => {
    const summary = log.analysis.players.find((s) => s.player === p.name);
    const dealt = p.damageDone.filter((e) => e.timestamp >= startMs && e.timestamp < endMs)
      .reduce((a, e) => a + (e.amount ?? 0), 0);
    const c = ledger.contributions.get(p.name) ?? { given: 0, received: 0, approximate: false };
    const own = dealt - c.received;
    const inWin = (t: number) => t >= startMs && t < endMs;
    return {
      player: p.name, job: p.className, role: p.role,
      dps: dealt / secs,
      ownDps: own / secs,
      givenDps: c.given / secs,
      rdps: (own + c.given) / secs,
      gcdsPerMin: (summary?.timeline.gcdStarts.filter(inWin).length ?? 0) / mins,
      healGcdsPerMin: (summary?.timeline.healGcdStarts.filter(inWin).length ?? 0) / mins,
      deaths: log.pull.deathEvents.filter((d) => d.player === p.name && inWin(d.timestamp)).length,
      lostDps: (summary?.findings.filter((f) => !f.forced && inWin(f.startMs)).reduce((a, f) => a + f.lostDamage, 0) ?? 0) / secs,
    };
  });
}

export function compareWithReferences(
  own: CompareLog[],
  refs: CompareLog[],
  game: DamageGame,
  context: DamageContext | undefined,
  phaseIdOpt?: number,
): CompareResult | CompareError {
  if (refs.length === 0) return { error: "Add at least one reference clear." };
  const phaseId = phaseIdOpt
    ?? Number(Object.entries(context?.phases ?? {}).find(([, p]) => p.decidesEnrage)?.[0] ?? NaN);
  if (!Number.isFinite(phaseId)) return { error: "This fight has no deciding phase in its context; pick a phase." };

  const refSpans = refs.map((r) => ({ log: r, span: phaseSpan(r, phaseId) }));
  const missingRef = refSpans.find((r) => !r.span);
  if (missingRef) return { error: `${missingRef.log.label} never reached that phase.` };
  const refLen = Math.min(...refSpans.map((r) => r.span!.endMs - r.span!.startMs));

  const ownSpans = own.map((o) => ({ log: o, span: phaseSpan(o, phaseId) })).filter((o) => o.span && o.span.endMs - o.span.startMs >= 10_000);
  if (ownSpans.length === 0) return { error: "No selected pull reached that phase (10s or more)." };

  const phaseName = own[0].pull.encounterPhases?.find((p) => p.id === phaseId)?.name ?? `Phase ${phaseId}`;
  const perPlayer = new Map<string, { stats: PlayerWindowStats[]; refs: PlayerWindowStats[][] }>();
  const roleOwn = new Map<string, number[]>(), roleRef = new Map<string, number[]>();
  const raidOwn: number[] = [], raidRef: number[] = [];
  const windows: number[] = [];

  for (const { log, span } of ownSpans) {
    const len = Math.min(refLen, span!.endMs - span!.startMs);
    windows.push(len);
    const ownStats = windowStats(log, game, span!.startMs, span!.startMs + len);
    const refStats = refSpans.map((r) => windowStats(r.log, game, r.span!.startMs, r.span!.startMs + len));
    for (const s of ownStats) {
      const e = perPlayer.get(s.player) ?? { stats: [], refs: [] };
      e.stats.push(s);
      e.refs.push(refStats.flat().filter((r) => r.job === s.job));
      perPlayer.set(s.player, e);
    }
    const byRole = (list: PlayerWindowStats[], role: string) => list.filter((x) => x.role === role).reduce((a, x) => a + x.rdps, 0);
    for (const role of ROLE_ORDER) {
      (roleOwn.get(role) ?? roleOwn.set(role, []).get(role)!).push(byRole(ownStats, role));
      (roleRef.get(role) ?? roleRef.set(role, []).get(role)!).push(median(refStats.map((rs) => byRole(rs, role))));
    }
    raidOwn.push(ownStats.reduce((a, x) => a + x.dps, 0));
    raidRef.push(median(refStats.map((rs) => rs.reduce((a, x) => a + x.dps, 0))));
  }

  const rows: CompareRow[] = [...perPlayer.values()].map(({ stats, refs: refSets }) => {
    const pick = (f: (s: PlayerWindowStats) => number) => median(stats.map(f));
    const first = stats[0];
    const refMed = (f: (s: PlayerWindowStats) => number) => median(refSets.map((set) => median(set.map(f))).filter(Number.isFinite));
    const refCount = Math.max(...refSets.map((set) => set.length));
    return {
      player: first.player, job: first.job, role: first.role,
      dps: pick((s) => s.dps), ownDps: pick((s) => s.ownDps), givenDps: pick((s) => s.givenDps), rdps: pick((s) => s.rdps),
      gcdsPerMin: pick((s) => s.gcdsPerMin), healGcdsPerMin: pick((s) => s.healGcdsPerMin),
      deaths: stats.reduce((a, s) => a + s.deaths, 0) / stats.length, lostDps: pick((s) => s.lostDps),
      refCount,
      ref: refCount > 0 ? {
        rdps: refMed((s) => s.rdps), ownDps: refMed((s) => s.ownDps), givenDps: refMed((s) => s.givenDps),
        gcdsPerMin: refMed((s) => s.gcdsPerMin), healGcdsPerMin: refMed((s) => s.healGcdsPerMin),
      } : undefined,
    };
  }).sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || b.rdps - a.rdps);

  return {
    phaseId, phaseName, windowMs: median(windows), ownPulls: ownSpans.length,
    rows,
    roles: ROLE_ORDER.map((role) => ({ role, rdps: median(roleOwn.get(role) ?? []), refRdps: median(roleRef.get(role) ?? []), refCount: refs.length })),
    raid: { dps: median(raidOwn), refDps: median(raidRef) },
    refs: refSpans.map((r) => ({ label: r.log.label, windowMs: r.span!.endMs - r.span!.startMs })),
  };
}
