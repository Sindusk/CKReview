// lib/damage/analyze.ts
//
// Per-pull damage analysis (docs/archive/damage-analysis-plan.md). Pure:
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
  DamageContext, DamageFinding, DamageGame, ForcedWindow, PacePeer, PhaseDamageSummary,
  PlayerDamageSummary, PullDamageAnalysis, TimelineGcd,
} from "./types";
import { checkSameSpecPace, paceOf } from "./pace";
import {
  checkCombos, checkCooldownDrift, checkDeaths, checkDisengages, checkPositionals, checkGcdGaps, checkInterrupts, checkPenalties, checkProcs,
  type PlayerCheckContext,
} from "./checks";
import {
  deadWindows, gcdKinds, gcdLockMs, gcdUptime, gcdUses, limitBreakWindows, playerValues, raidBuffSpans, raidBuffWindows, raidDowntime,
  speedProfile, statusWindows, wipeCollapseMs, type GcdKind, type GcdUse, type Window,
} from "./timeline";
import { buildBuffLedger, checkBuffCoverage } from "./buffs";

// A mechanic occurrence labels a gap when it starts this long before the
// gap, or inside it.
const MECHANIC_LOOKBACK_MS = 8_000;

/** Channelled mitigation: from the cast to the player's next action, capped. */
function channelWindows(player: Pull["players"][number], game: DamageGame): ForcedWindow[] {
  const channels = game.mitigationChannels;
  if (!channels?.size) return [];
  const casts = [...player.casts].sort((a, b) => a.timestamp - b.timestamp);
  return casts.flatMap((c, i) => {
    const ch = channels.get(c.abilityId);
    if (!ch) return [];
    const next = casts.slice(i + 1).find((x) => x.timestamp > c.timestamp + 50)?.timestamp ?? Infinity;
    return [{ startMs: c.timestamp, endMs: Math.min(next, c.timestamp + ch.maxMs), cause: `${ch.name} channel (raid mitigation)` }];
  });
}

/**
 * `pacePeers`: other logs' players (reference clears' `pace`), compared
 * with this pull's own same-spec players by the pace check (pace.ts).
 */
export function analyzePullDamage(
  pull: Pull, game: DamageGame, context?: DamageContext, opts?: { pacePeers?: PacePeer[] },
): PullDamageAnalysis {
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
  const contextMovement = context?.movementWindows?.(pull) ?? [];
  const phaseForced: ForcedWindow[] = segments
    .filter((sgm) => context?.phases[sgm.phase]?.damageCounts === false)
    .map((sgm) => ({
      startMs: sgm.startMs, endMs: sgm.endMs,
      cause: `phase damage doesn't count${context?.phases[sgm.phase]?.note ? ` (${context.phases[sgm.phase].note})` : ""}`,
    }));
  const decidingSegment = segments.find((sgm) => context?.phases[sgm.phase]?.decidesEnrage);

  // Only the boss's own anchored mechanics, which its damage context names:
  // pulls also carry the per-player instances of targeted/assigned
  // mechanics (lib/mechanics/occurrences.ts), which aren't damage context.
  const mechanicAround = (startMs: number, end: number): string | undefined => {
    const occ = (pull.mechanicOccurrences ?? [])
      .filter((o) => o.timestamp >= startMs - MECHANIC_LOOKBACK_MS && o.timestamp <= end && !o.players && context?.mechanicLabel?.(o.mechanicKey))
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!occ) return undefined;
    return context?.mechanicLabel?.(occ.mechanicKey);
  };

  const ledger = buildBuffLedger(pull, game, endMs);
  const patch = game.patchOf?.(pull);
  const level = game.levelOf?.(pull);
  const players: PlayerDamageSummary[] = [];
  const usesOf = new Map(pull.players.map((p) => [p.name, gcdUses(p, game)]));
  const speedModels = game.speedModels?.(pull, usesOf, endMs);
  // Healers' pace follows the healing needed, not their hands: no pace.
  const paces = new Map(pull.players.map((p) =>
    [p.name, p.role === "Healer" ? undefined : paceOf(p.name, game.jobOf?.(p) ?? p.className, speedModels?.get(p.name), p.hasteRating)]));
  const pacePeers = [...[...paces.values()].filter((x): x is PacePeer => !!x), ...(opts?.pacePeers ?? [])];
  for (const player of pull.players) {
    const dead = deadWindows(player, pull, endMs);
    const uses = usesOf.get(player.name)!;
    const forced: ForcedWindow[] = [
      ...downtime,
      ...dead.map((w) => ({ ...w, cause: "dead" })),
      ...limitBreakWindows(uses),
      ...channelWindows(player, game),
      ...contextForced.filter((w) => !w.players || w.players.includes(player.name)),
      ...phaseForced,
    ];
    const movement = contextMovement.filter((w) => (!w.players || w.players.includes(player.name)) && w.startMs < endMs);
    const profile = speedProfile(uses, game, statusWindows(player, game.hasteStatusIds, endMs));
    const model = speedModels?.get(player.name);
    const speed = model ? { ...profile, factor: model.factor, at: model.at } : profile;
    const factor = speed.factor;
    const job = game.jobOf?.(player) ?? player.className;
    const buffWindows = raidBuffWindows(player, pull, game, endMs);
    const values = playerValues(player, game, uses, buffWindows, dead, phaseOf, phaseBounds, endMs);

    const ctx: PlayerCheckContext = {
      pull, player, game, context, endMs, uses, job, factor, factorAt: speed.at,
      baseGcdMs: speed.baseRecastMs * factor,
      forced, movement, dead, buffWindows, values, phaseOf, phaseName, mechanicAround,
      decidingPhaseStart: decidingSegment?.startMs,
      ledger,
      patch,
      level,
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
      ...checkBuffCoverage(ctx),
      ...checkSameSpecPace(ctx, paces.get(player.name), pacePeers, model?.hasteAt),
      ...game.jobChecks(job).flatMap((check) => check(ctx)),
    ].sort((a, b) => Number(a.forced) - Number(b.forced) || b.lostDamage - a.lostDamage);
    for (const f of findings) f.target ??= targetAround(player, f);

    const kinds = gcdKinds(player, pull, uses);
    const gcdSplit = { heal: 0, damage: 0, other: 0 };
    for (const u of uses) if (u.startMs < endMs) gcdSplit[kinds.get(u.action.id) ?? "other"]++;
    players.push({
      player: player.name, job, role: player.role,
      damage: values.total,
      lostDamage: findings.filter((f) => !f.forced).reduce((a, f) => a + f.lostDamage, 0),
      forcedDamage: findings.filter((f) => f.forced && !f.movement).reduce((a, f) => a + f.lostDamage, 0),
      movementDamage: findings.filter((f) => f.movement).reduce((a, f) => a + f.lostDamage, 0),
      gcds: uses.filter((u) => u.startMs < endMs).length,
      baseGcdMs: ctx.baseGcdMs,
      pace: paces.get(player.name),
      gcdUptime: gcdUptime(uses, speed.at, [...downtime, ...dead, ...limitBreakWindows(uses)], endMs),
      gcdSplit,
      buffs: ledger.contributions.get(player.name) ?? { given: 0, received: 0, approximate: false },
      findings,
      timeline: {
        gcdStarts: uses.filter((u) => u.startMs < endMs).map((u) => u.startMs),
        healGcdStarts: uses.filter((u) => u.startMs < endMs && kinds.get(u.action.id) === "heal").map((u) => u.startMs),
        gcds: timelineGcds(player, game, uses, kinds, speed.at, endMs),
        buffWindows,
        forced: forced.filter((w) => w.startMs < endMs),
        movement,
        gauges: (game.jobGauges?.(job) ?? []).flatMap((g) => g(ctx)),
        potWindows: game.potWindows?.(player, endMs).filter((w) => w.startMs < endMs),
        raidBuffs: raidBuffSpans(player, pull, game, endMs),
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
    patch,
    level,
    missingData: missingData(pull),
    raidDowntime: downtime,
    players, phases,
  };
}

// Each GCD and the off-GCD presses after it, up to the next GCD's start.
// Weaves leave out auto-attacks and casts the log made itself (WoW fake).
const AUTO_ATTACK_NAME = /^(attack|melee|auto shot|shoot)$/i;
function timelineGcds(
  player: Pull["players"][number], game: DamageGame, uses: GcdUse[], kinds: Map<number, GcdKind>,
  factorAt: (t: number) => number, endMs: number,
): TimelineGcd[] {
  const icons = new Map<number, string>();
  for (const c of player.casts) if (c.abilityIcon && !icons.has(c.abilityId)) icons.set(c.abilityId, c.abilityIcon);
  // One press per name per instant, as the gap check counts weaves
  // (checks.ts): FFLogs can log an action's damage id as a second cast.
  const offGcd = player.casts
    .filter((c) => !c.fake && !game.action(c.abilityId)?.onGcd && !game.action(c.abilityId)?.autoAttack && !AUTO_ATTACK_NAME.test(c.abilityName))
    .sort((a, b) => a.timestamp - b.timestamp)
    .filter((c, i, all) => !all.slice(Math.max(0, i - 4), i).some((p) => p.abilityName === c.abilityName && c.timestamp - p.timestamp <= 50));
  const shown = uses.filter((u) => u.startMs < endMs);
  let w = 0;
  return shown.map((u, i) => {
    const next = shown[i + 1]?.startMs ?? endMs;
    while (w < offGcd.length && offGcd[w].timestamp < u.startMs) w++;
    const weaves: TimelineGcd["weaves"] = [];
    for (let j = w; j < offGcd.length && offGcd[j].timestamp < next; j++) {
      weaves.push({ atMs: offGcd[j].timestamp, name: offGcd[j].abilityName, icon: offGcd[j].abilityIcon });
    }
    return {
      startMs: u.startMs, castMs: u.castMs, lockMs: gcdLockMs(u, factorAt(u.startMs)),
      name: u.abilityName, icon: icons.get(u.action.id), heal: kinds.get(u.action.id) === "heal", weaves,
    };
  });
}

/** HP of the enemy the raid was hitting hardest in the last 5s before `atMs`. */
// The enemy a finding applies to, for the dialog ("on Chaos"): the one the
// player hit most around it (hits that dealt damage), else the last one
// they hit before it. A multi-target phase (Dancing Mad P3's Exdeath and
// Chaos) reads by boss; user, 2026-10-13.
const TARGET_AROUND_MS = 3_000;
const TARGET_LOOKBACK_MS = 15_000;
function targetAround(player: Pull["players"][number], f: DamageFinding): string | undefined {
  if (f.pullWide) return undefined;
  const from = f.startMs - TARGET_AROUND_MS, to = Math.max(f.endMs, f.startMs) + TARGET_AROUND_MS;
  const counts = new Map<string, number>();
  let before: { t: number; name: string } | undefined;
  for (const e of player.damageDone) {
    if (!e.target || !((e.amount ?? 0) > 0)) continue;
    if (e.timestamp >= from && e.timestamp <= to) counts.set(e.target, (counts.get(e.target) ?? 0) + 1);
    else if (e.timestamp < from && e.timestamp >= from - TARGET_LOOKBACK_MS && (!before || e.timestamp > before.t)) before = { t: e.timestamp, name: e.target };
  }
  const best = [...counts].sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? before?.name;
}

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
  const wow = pull.game === "wow";
  if (players.some((p) => p.damageDone.length > 0 && p.damageDone.every((e) => e.hitType === undefined))) {
    out.push(wow ? "crit detail" : "crit / direct-hit detail");
  }
  if (players.some((p) => p.damageDone.length > 0 && p.damageDone.every((e) => e.statusIds === undefined))) {
    out.push(wow ? "aura snapshots on hits" : "damage buff snapshots (penalty debuffs can't be measured)");
  }
  if (pull.bossDebuffs === undefined) out.push(wow ? "boss debuffs (DoTs)" : "boss debuffs (Chain Stratagem windows)");
  return out;
}
