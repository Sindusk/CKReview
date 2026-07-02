// lib/error-detection.ts
//
// Generic evaluator for ERROR_RULES (lib/error-rules.ts). Runs once at
// import time, over the already-built PlayerInfo[] roster — identical logic
// works for WCL and FFLogs pulls since both produce the same PlayerInfo /
// PlayerEvent shapes. Nothing in here touches the network.

import type { PlayerInfo, PlayerEvent } from "@/types/PlayerInfo";
import type { PullError, PullErrorRule } from "@/types/PullError";
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

// ─── Rule evaluation ────────────────────────────────────────────────────────

function evaluateDamageRule(rule: PullErrorRule, player: PlayerInfo): PullError[] {
  const hits = player.damageTaken.filter((e) => e.abilityId === rule.abilityId);
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
      role:        player.role,
      abilityId:   hit.abilityId,
      abilityName: hit.abilityName,
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
    role:        player.role,
    abilityId:   e.abilityId,
    abilityName: e.abilityName,
  }));
}

// ─── Public entry point ─────────────────────────────────────────────────────

export function detectPullErrors(players: PlayerInfo[]): PullError[] {
  const errors: PullError[] = [];

  for (const player of players) {
    for (const rule of ERROR_RULES) {
      if (rule.trigger === "damage") {
        errors.push(...evaluateDamageRule(rule, player));
      } else {
        errors.push(...evaluateDebuffAppliedRule(rule, player));
      }
    }
  }

  return errors.sort((a, b) => a.timestamp - b.timestamp);
}
