// lib/damage/analyze.ts
//
// Per-pull damage analysis (docs/damage-analysis-plan.md). Pure:
// (pull, game, context?) → PullDamageAnalysis. Nothing here is a
// PullError; the result only feeds the Damage dialog.
//
// The analysis window ends at the pull's end or at the wipe collapse,
// whichever is first. Forced windows for a player are:
//   - raid downtime inferred from the log (timeline.ts), for every fight
//   - the player's own dead time (the death finding carries that cost)
//   - the boss context's forced windows
//   - phases whose damage doesn't count (PhaseContext.damageCounts false)
// Findings inside them are shown but not counted against the player.
// Without a DamageContext the analysis still runs on the log-inferred
// downtime alone, and `context` is left undefined so the dialog can say so.

import type { Pull } from "@/types/Pull";
import type {
  DamageContext, DamageFinding, DamageGame, ForcedWindow, PhaseDamageSummary,
  PlayerDamageSummary, PullDamageAnalysis,
} from "./types";
import {
  checkCombos, checkCooldownDrift, checkDeaths, checkDisengages, checkPositionals, checkGcdGaps, checkInterrupts, checkPenalties, checkProcs,
  type PlayerCheckContext,
} from "./checks";
import {
  deadWindows, gcdKinds, gcdUses, inWindows, limitBreakWindows, playerValues, raidBuffWindows, raidDowntime,
  speedFactor, wipeCollapseMs, type Window,
} from "./timeline";

// A mechanic occurrence labels a gap when it starts this long before the
// gap, or inside it.
const MECHANIC_LOOKBACK_MS = 8_000;

export function analyzePullDamage(pull: Pull, game: DamageGame, context?: DamageContext): PullDamageAnalysis {
  const collapseMs = wipeCollapseMs(pull);
  const endMs = Math.min(pull.fightDuration, collapseMs ?? Infinity);

  const segments = pull.phaseSegments ?? [];
  const phaseOf = (t: number): number | undefined => {
    for (let i = segments.length - 1; i >= 0; i--) if (t >= segments[i].startMs) return segments[i].phase;
    return segments[0]?.phase;
  };
  const phaseName = (id: number | undefined) =>
    id === undefined ? undefined : pull.encounterPhases?.find((p) => p.id === id)?.name ?? `Phase ${id}`;
  const phaseBounds = new Map<number, Window>();
  for (const sgm of segments) {
    const b = phaseBounds.get(sgm.phase);
    phaseBounds.set(sgm.phase, b ? { startMs: Math.min(b.startMs, sgm.startMs), endMs: Math.max(b.endMs, sgm.endMs) } : { startMs: sgm.startMs, endMs: sgm.endMs });
  }

  const downtime = raidDowntime(pull, endMs, game);
  const contextForced = context?.forcedWindows?.(pull) ?? [];
  const phaseForced: ForcedWindow[] = segments
    .filter((sgm) => context?.phases[sgm.phase]?.damageCounts === false)
    .map((sgm) => ({
      startMs: sgm.startMs, endMs: sgm.endMs,
      cause: `phase damage doesn't count${context?.phases[sgm.phase]?.note ? ` (${context.phases[sgm.phase].note})` : ""}`,
    }));
  const decidingSegment = segments.find((sgm) => context?.phases[sgm.phase]?.decidesEnrage);

  const mechanicAround = (startMs: number, end: number): string | undefined => {
    const occ = (pull.mechanicOccurrences ?? [])
      .filter((o) => o.timestamp >= startMs - MECHANIC_LOOKBACK_MS && o.timestamp <= end)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!occ) return undefined;
    return context?.mechanicLabel?.(occ.mechanicKey) ?? occ.mechanicKey;
  };

  const players: PlayerDamageSummary[] = [];
  for (const player of pull.players) {
    const dead = deadWindows(player, pull, endMs);
    const uses = gcdUses(player, game);
    const forced: ForcedWindow[] = [
      ...downtime,
      ...dead.map((w) => ({ ...w, cause: "dead" })),
      ...limitBreakWindows(uses),
      ...contextForced.filter((w) => !w.players || w.players.includes(player.name)),
      ...phaseForced,
    ];
    const factor = speedFactor(uses);
    const buffWindows = raidBuffWindows(player, pull, game, endMs);
    const values = playerValues(player, game, uses, buffWindows, dead, phaseOf, phaseBounds, endMs);

    const ctx: PlayerCheckContext = {
      pull, player, game, context, endMs, uses, factor, baseGcdMs: 2500 * factor,
      forced, dead, buffWindows, values, phaseOf, phaseName, mechanicAround,
      decidingPhaseStart: decidingSegment?.startMs,
    };
    const findings: DamageFinding[] = [
      ...checkGcdGaps(ctx),
      ...checkCooldownDrift(ctx),
      ...checkDeaths(ctx),
      ...checkPenalties(ctx),
      ...checkProcs(ctx),
      ...checkInterrupts(ctx),
      ...checkCombos(ctx),
      ...checkDisengages(ctx),
      ...checkPositionals(ctx),
      ...game.jobChecks(player.className).flatMap((check) => check(ctx)),
    ].sort((a, b) => Number(a.forced) - Number(b.forced) || b.lostDamage - a.lostDamage);

    const kinds = gcdKinds(player, pull, uses);
    const gcdSplit = { heal: 0, damage: 0, other: 0 };
    for (const u of uses) if (u.startMs < endMs) gcdSplit[kinds.get(u.action.id) ?? "other"]++;
    const used = uses.filter((u) => u.startMs < endMs && inWindows(u.startMs, buffWindows)).length;
    const fit = buffWindows.reduce((n, w) => n + Math.floor((Math.min(w.endMs, endMs) - w.startMs) / ctx.baseGcdMs), 0);
    players.push({
      player: player.name, job: player.className, role: player.role,
      damage: values.total,
      lostDamage: findings.filter((f) => !f.forced).reduce((a, f) => a + f.lostDamage, 0),
      forcedDamage: findings.filter((f) => f.forced).reduce((a, f) => a + f.lostDamage, 0),
      gcds: uses.filter((u) => u.startMs < endMs).length,
      baseGcdMs: ctx.baseGcdMs,
      buffWindowGcds: { used, fit },
      gcdSplit,
      findings,
      timeline: {
        gcdStarts: uses.filter((u) => u.startMs < endMs).map((u) => u.startMs),
        buffWindows,
        forced: forced.filter((w) => w.startMs < endMs),
      },
    });
  }
  players.sort((a, b) => b.lostDamage - a.lostDamage);

  const phases: PhaseDamageSummary[] = segments
    .filter((sgm) => sgm.startMs < endMs)
    .map((sgm) => {
      const end = Math.min(sgm.endMs, endMs);
      const inPhase = (t: number) => t >= sgm.startMs && t < end;
      const raidDamage = pull.players.reduce((a, p) =>
        a + p.damageDone.filter((e) => inPhase(e.timestamp)).reduce((x, e) => x + (e.amount ?? 0), 0), 0);
      const raidDamageTaken = pull.players.reduce((a, p) =>
        a + p.damageTaken.filter((e) => inPhase(e.timestamp)).reduce((x, e) => x + (e.amount ?? 0) + (e.absorbed ?? 0), 0), 0);
      const raidLostDamage = players.reduce((a, p) =>
        a + p.findings.filter((f) => !f.forced && f.phaseId === sgm.phase && inPhase(f.startMs)).reduce((x, f) => x + f.lostDamage, 0), 0);
      return {
        phaseId: sgm.phase, name: phaseName(sgm.phase) ?? `Phase ${sgm.phase}`,
        startMs: sgm.startMs, endMs: end,
        context: context?.phases[sgm.phase],
        raidDamage, raidLostDamage, raidDamageTaken,
        bossHpLeft: pull.result !== "Kill" && sgm.endMs >= pull.fightDuration ? bossHpAt(pull, endMs) : undefined,
      };
    });

  return {
    pullId: pull.id, pullNumber: pull.pullNumber, endMs, collapseMs,
    context: context?.encounter,
    missingData: missingData(pull),
    raidDowntime: downtime,
    players, phases,
  };
}

/** HP of the enemy the raid was hitting hardest in the last 5s before `atMs`. */
function bossHpAt(pull: Pull, atMs: number): number | undefined {
  const recent = pull.players.flatMap((p) => p.damageDone)
    .filter((e) => e.timestamp <= atMs && e.timestamp > atMs - 5_000 && e.healthAfter !== undefined)
    .sort((a, b) => a.timestamp - b.timestamp);
  if (recent.length === 0) return undefined;
  const biggest = Math.max(...recent.map((e) => e.maxHealth ?? 0));
  const main = recent.filter((e) => (e.maxHealth ?? 0) === biggest);
  return main[main.length - 1].healthAfter;
}

function missingData(pull: Pull): string[] {
  const out: string[] = [];
  const players = pull.players;
  if (players.some((p) => p.buffs === undefined)) out.push("player buffs (procs, raid-buff windows)");
  if (players.some((p) => p.beginCasts === undefined) ||
      players.some((p) => (p.beginCasts ?? []).some((b) => b.durationMs === undefined))) {
    out.push("cast times (begin-casts)");
  }
  if (players.some((p) => p.damageDone.length > 0 && p.damageDone.every((e) => e.hitType === undefined))) {
    out.push("crit / direct-hit detail");
  }
  if (players.some((p) => p.damageDone.length > 0 && p.damageDone.every((e) => e.statusIds === undefined))) {
    out.push("damage buff snapshots (penalty debuffs can't be measured)");
  }
  if (pull.bossDebuffs === undefined) out.push("boss debuffs (Chain Stratagem windows)");
  return out;
}
