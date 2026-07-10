// lib/error-detection.ts
//
// Generic evaluator for ERROR_RULES (lib/error-rules.ts). Player-attributable
// rules ("damage", "debuffApplied") run over the already-built PlayerInfo[]
// roster — identical logic works for WCL and FFLogs pulls since both produce
// the same PlayerInfo / PlayerEvent shapes. Raid-wide rules ("enemyCast",
// "enemyBuffApplied") run separately over EnemyEvent[] streams built from
// NPC-sourced casts/buffs, since those aren't attributable to any one
// friendly player. Nothing in here touches the network.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { DeathEvent } from "@/types/DeathEvent";
import type { PullError, PullErrorRule, EnemyEvent } from "@/types/PullError";
import { ERROR_RULES } from "./error-rules";

// ─── Debuff-uptime helper ──────────────────────────────────────────────────
//
// Determines whether a given debuff was active on the player at `atTime`,
// based on the ordered stream of applydebuff/removedebuff/applydebuffstack
// events for that player. A stack refresh counts as "active"; only an
// explicit removal clears it.

function isDebuffActiveAt(
  debuffEvents: PlayerEvent[],
  abilityId:    number,
  atTime:       number
): boolean {
  let active = false;

  for (const e of debuffEvents) {
    if (e.abilityId !== abilityId) continue;
    if (e.timestamp > atTime) break;

    active = e.debuffStatus !== "removed";
  }

  return active;
}

// ─── Rule evaluation — player-attributable ─────────────────────────────────

function evaluateDamageRule(rule: PullErrorRule, player: PlayerInfo): PullError[] {
  const hits = player.damageTaken
    .filter((e) => e.abilityId === rule.abilityId)
    .filter((e) => !rule.excludeTicks || !e.isDoT);
  const results: PullError[] = [];

  for (const hit of hits) {
    if (
      rule.minEffectiveDamage !== undefined &&
      !((hit.amount ?? 0) > rule.minEffectiveDamage)
    ) {
      continue;
    }

    if (
      rule.requiredDebuffId !== undefined &&
      !isDebuffActiveAt(player.debuffs, rule.requiredDebuffId, hit.timestamp)
    ) {
      continue;
    }

    if (
      rule.forbiddenDebuffId !== undefined &&
      isDebuffActiveAt(player.debuffs, rule.forbiddenDebuffId, hit.timestamp)
    ) {
      continue;
    }

    results.push({
      ruleId:      rule.id,
      severity:    rule.severity,
      name:        rule.name,
      description: rule.description,
      timestamp:   hit.timestamp,
      player:      player.name,
      class:       player.className,
      specId:      player.specId,
      role:        player.role,
      abilityId:   hit.abilityId,
      abilityName: hit.abilityName,
      abilityIcon: hit.abilityIcon,
      amount:      hit.amount,
    });
  }

  return results;
}

function evaluateDebuffAppliedRule(rule: PullErrorRule, player: PlayerInfo): PullError[] {
  const applications = player.debuffs.filter(
    (e) => e.abilityId === rule.abilityId && e.debuffStatus === "applied"
  );

  return applications.map((e) => ({
    ruleId:      rule.id,
    severity:    rule.severity,
    name:        rule.name,
    description: rule.description,
    timestamp:   e.timestamp,
    player:      player.name,
    class:       player.className,
    specId:      player.specId,
    role:        player.role,
    abilityId:   e.abilityId,
    abilityName: e.abilityName,
    abilityIcon: e.abilityIcon,
  }));
}

// ─── Rule evaluation — killing blow (attributed to the player who died) ───

function evaluateKillingBlowRule(rule: PullErrorRule, deathEvents: DeathEvent[]): PullError[] {
  return deathEvents
    .filter((d) => d.killingAbilityGameId === rule.abilityId)
    .map((d) => ({
      ruleId:      rule.id,
      severity:    rule.severity,
      name:        rule.name,
      description: rule.description,
      timestamp:   d.timestamp,
      player:      d.player,
      class:       d.class,
      specId:      d.specId,
      role:        d.role,
      abilityId:   d.killingAbilityGameId,
      abilityName: d.cause,
      abilityIcon: d.causeIcon,
    }));
}

// ─── Rule evaluation — raid-wide (NOT attributable to a single player) ─────
//
// Shared by both "enemyCast" and "enemyBuffApplied" — the input EnemyEvent[]
// is already pre-filtered to the right kind of event by the caller
// (wclBuildEnemyCastEvents/wclBuildEnemyBuffEvents and
// fflBuildEnemyCastEvents/fflBuildEnemyBuffEvents in lib/log-transforms.ts).
// No player/class/role is set on the resulting PullError — see the type
// comment on PullError for why.

function evaluateEnemyEventRule(rule: PullErrorRule, events: EnemyEvent[]): PullError[] {
  return events
    .filter((e) => e.abilityId === rule.abilityId)
    .map((e) => ({
      ruleId:      rule.id,
      severity:    rule.severity,
      name:        rule.name,
      description: rule.description,
      timestamp:   e.timestamp,
      abilityId:   e.abilityId,
      abilityName: e.abilityName,
      abilityIcon: e.abilityIcon,
    }));
}

// ─── Public entry point ─────────────────────────────────────────────────────

export function detectPullErrors(
  players:     PlayerInfo[],
  deathEvents: DeathEvent[] = [],
  enemyCasts:  EnemyEvent[] = [],
  enemyBuffs:  EnemyEvent[] = []
): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    for (const rule of ERROR_RULES) {
      if (rule.trigger === "damage") {
        errors.push(...evaluateDamageRule(rule, player));
      } else if (rule.trigger === "debuffApplied") {
        errors.push(...evaluateDebuffAppliedRule(rule, player));
      }
    }
  }

  for (const rule of ERROR_RULES) {
    if (rule.trigger === "enemyCast") {
      errors.push(...evaluateEnemyEventRule(rule, enemyCasts));
    } else if (rule.trigger === "enemyBuffApplied") {
      errors.push(...evaluateEnemyEventRule(rule, enemyBuffs));
    } else if (rule.trigger === "killingBlow") {
      errors.push(...evaluateKillingBlowRule(rule, deathEvents));
    }
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
