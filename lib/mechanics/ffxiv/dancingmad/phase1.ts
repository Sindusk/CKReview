// lib/mechanics/ffxiv/dancingmad/phase1.ts
//
// Encounter-specific error detection for Phase 1 of FFXIV's Dancing Mad
// (Kefka's Return) ultimate — everything up through the phase transition
// at roughly 3:25 (205s) into the fight.
//
// ── BLIZZARD III BLOWOUT SILENT KILL (confirmed 2026-07, VtdBqhLQkWJXMvDg) ──
//
// Blizzard III Blowout (ability IDs vary — 47765/47768/47771/47774, all
// sharing the in-game name "Blizzard III Blowout") normally punishes a
// missed mechanic by applying Damage Down (1002911), already caught by the
// generic `ffxiv-damage-down` rule in error-rules.ts. Confirmed across
// every OTHER hit by this ability in this report: every survivor picked up
// Damage Down at the same instant as the hit. But when the hit is also the
// killing blow, the debuff application can lose the race with death and
// never actually land — the generic rule then has nothing to fire on, even
// though the mechanic was clearly missed. This rule covers that gap the
// same way exdeath.ts's Shockwave silent-kill check does: a death credited
// to Blizzard III Blowout with no preceding Damage Down application is
// flagged directly.
//
// ── JUMPED OFF THE ARENA (confirmed 2026-07, same report) ──────────────────
//
// When Phase 1 goes badly enough that the raid calls it, players commonly
// jump off the arena's edge to force an instant wipe/reset rather than
// waiting out the boss's remaining kit. FFLogs logs this as a "death" event
// with sourceID -1 and no killingAbilityGameID — fflTransformDeath already
// resolves that combination to DeathEvent.cause "Environmental" (no other
// death shape reaches this code path here; every other confirmed cause in
// this report's Phase 1 carries a real killingAbilityGameId). Once one
// player jumps, the rest of the raid typically follows suit within a few
// seconds — those are fallout of the same decision, not independent
// mistakes, so only the FIRST such death in Phase 1 gets a Raid-severity
// error naming that player; every later one in the same pull is suppressed.
//
// ── WAVE CANNON OUT OF POSITION (confirmed 2026-07, same report, pull 4) ───
//
// Wave Cannon (47784) hits exactly 4 players — one per fixed arena spot —
// while the other 4 handle towers elsewhere. Each of the 8 possible spots
// is tied to a specific JOB, not a specific person or a rotating debuff:
// across every clean resolution in this report (21 of 22 pulls), whichever
// player happened to be playing a given job always took Wave Cannon at the
// same spot (centi-yalm coordinates, tight to within ~1.5 yalms of natural
// standing jitter) — see WAVE_CANNON_JOB_POSITIONS. FFLogs' `sourceInstance`
// on each hit identifies which of the 4 concurrent beams landed on a
// target; a clean hit is always exactly one instance per player. The one
// confirmed failure (pull 4): the Viper stood ~6.9 yalms off their own
// job's spot, well inside the neighboring Pictomancer's beam — both players
// took TWO distinct sourceInstance hits that volley (their own plus each
// other's overlap) and both died. Detection is gated on that overlap
// outcome (2+ distinct instances hitting the same target in one volley),
// per this codebase's usual "gate on outcome, use position for attribution"
// approach — a player standing slightly off their spot with no overlap
// isn't flagged. Among the overlapping players, only the one whose ACTUAL
// position deviates well beyond normal jitter from their own job's spot is
// named; a victim who was standing correctly and just got caught by a
// neighbor's mistake is not flagged (this codebase's root-cause-only
// attribution philosophy).
//
// Known open item: 3 other pulls in this report (9, 13, 18) show one job
// each landing at a visibly different spot with no confirmed VOD ground
// truth and no overlap/death — left unexplained rather than guessed at;
// WAVE_CANNON_JOB_POSITIONS was built excluding those outliers.

import type { PlayerInfo } from "@/types/PlayerInfo";
import type { PullError } from "@/types/PullError";
import type { DeathEvent } from "@/types/DeathEvent";

export const BLIZZARD_III_SILENT_KILL_RULE_ID = "ffxiv-phase1-blizzard3-silent-kill";
export const JUMPED_OFF_ARENA_RULE_ID          = "ffxiv-phase1-jumped-off-arena";
export const WAVE_CANNON_OUT_OF_POSITION_RULE_ID = "ffxiv-phase1-wave-cannon-out-of-position";

const BLIZZARD_III_BLOWOUT_ABILITY_IDS = new Set([47765, 47768, 47771, 47774]);
const DAMAGE_DOWN_ABILITY_ID = 1002911;

// Phase 1 runs roughly 0-205s (the "~3:25" phase transition the user's own
// mitigation plan already anchors on — see mitigation-plans/ikuya.json's
// phaseTimeSeconds: 205 entry for Phase 2's start). Generous past that
// point costs nothing (a genuine jump this late would still be a fair
// catch), so this is a soft upper bound, not a tight one.
const PHASE_1_END_MS = 210_000;

const WAVE_CANNON_ABILITY_ID = 47784;

// Volley hits on different targets land within tens of ms of each other on
// real logs (observed: <50ms apart); generous without risking merging two
// genuinely separate Wave Cannon activations (which never recur this close
// together in Phase 1).
const WAVE_CANNON_VOLLEY_CLUSTER_MS = 250;

// Each job's fixed Wave Cannon spot, centi-yalms (arena center 10000,10000)
// — centroid of every clean hit in this report (outliers >4y from the
// per-job median excluded; see module comment). Natural per-pull jitter
// within a job's own clean cluster tops out around 1.5 yalms (150).
const WAVE_CANNON_JOB_POSITIONS: Readonly<Record<string, { x: number; y: number }>> = {
  "Dancer":      { x: 11762, y: 9853 },
  "Viper":       { x: 10694, y: 10353 },
  "White Mage":  { x: 8767,  y: 10030 },
  "Sage":        { x: 8213,  y: 10063 },
  "Pictomancer": { x: 11219, y: 10011 },
  "Dark Knight": { x: 9261,  y: 10036 },
  "Reaper":      { x: 10186, y: 10668 },
  "Paladin":     { x: 9613,  y: 10427 },
};

// Comfortably above the ~1.5-yalm natural jitter seen in every clean job
// cluster, comfortably below the confirmed failure's ~6.9-yalm deviation.
const WAVE_CANNON_OUT_OF_POSITION_THRESHOLD_CENTIYALMS = 400;

function detectBlizzardIIIBlowoutSilentKillErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  const errors: PullError[] = [];

  for (const death of deathEvents) {
    if (!BLIZZARD_III_BLOWOUT_ABILITY_IDS.has(death.killingAbilityGameId)) continue;

    const victim = players.find((p) => p.name === death.player);
    if (!victim) continue;

    const everHadDamageDown = victim.debuffs.some(
      (d) =>
        d.abilityId === DAMAGE_DOWN_ABILITY_ID &&
        d.debuffStatus === "applied" &&
        d.timestamp <= death.timestamp
    );
    if (everHadDamageDown) continue; // the generic ffxiv-damage-down rule already covers this

    errors.push({
      ruleId:      BLIZZARD_III_SILENT_KILL_RULE_ID,
      severity:    "Major",
      name:        "Blizzard III Blowout Killed Instantly",
      description: "Died to Blizzard III Blowout without ever receiving the Damage Down debuff it normally applies — the mechanic was missed badly enough to kill outright instead of just punishing with the debuff.",
      timestamp:   death.timestamp,
      player:      death.player,
      class:       death.class,
      specId:      death.specId,
      role:        death.role,
      abilityId:   death.killingAbilityGameId,
      abilityName: "Blizzard III Blowout",
    });
  }

  return errors;
}

function detectJumpedOffArenaError(deathEvents: DeathEvent[]): PullError[] {
  const jump = deathEvents
    .filter((d) => d.timestamp <= PHASE_1_END_MS && d.cause === "Environmental")
    .sort((a, b) => a.timestamp - b.timestamp)[0];
  if (!jump) return [];

  return [
    {
      ruleId:      JUMPED_OFF_ARENA_RULE_ID,
      severity:    "Raid",
      name:        "Jumped Off The Arena",
      description: `${jump.player} jumped off the arena, signaling a raid wipe and reset.`,
      timestamp:   jump.timestamp,
      abilityId:   0,
      abilityName: "Jumped Off The Arena",
    },
  ];
}

function detectWaveCannonOutOfPositionErrors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  type Hit = { player: PlayerInfo; timestamp: number; sourceInstance: number; x?: number; y?: number };
  const hits: Hit[] = [];
  for (const player of players) {
    for (const e of player.damageTaken) {
      if (e.abilityId !== WAVE_CANNON_ABILITY_ID || e.sourceInstance === undefined) continue;
      hits.push({ player, timestamp: e.timestamp, sourceInstance: e.sourceInstance, x: e.x, y: e.y });
    }
  }
  if (hits.length === 0) return [];

  hits.sort((a, b) => a.timestamp - b.timestamp);
  const clusters: Hit[][] = [];
  for (const hit of hits) {
    const current = clusters[clusters.length - 1];
    if (current && hit.timestamp - current[current.length - 1].timestamp <= WAVE_CANNON_VOLLEY_CLUSTER_MS) {
      current.push(hit);
    } else {
      clusters.push([hit]);
    }
  }

  const errors: PullError[] = [];

  for (const cluster of clusters) {
    const byPlayer = new Map<number, Hit[]>();
    for (const h of cluster) {
      const list = byPlayer.get(h.player.actorId) ?? [];
      list.push(h);
      byPlayer.set(h.player.actorId, list);
    }

    const compromised = [...byPlayer.values()].filter(
      (hs) => new Set(hs.map((h) => h.sourceInstance)).size >= 2
    );
    if (compromised.length === 0) continue; // every hit landed as a clean single beam

    const candidates = compromised
      .map((hs) => {
        const canonical = WAVE_CANNON_JOB_POSITIONS[hs[0].player.className];
        if (!canonical || hs[0].x === undefined || hs[0].y === undefined) return null;
        const distanceCentiyalms = Math.hypot(hs[0].x - canonical.x, hs[0].y - canonical.y);
        return { player: hs[0].player, timestamp: hs[0].timestamp, distanceCentiyalms };
      })
      .filter((c): c is { player: PlayerInfo; timestamp: number; distanceCentiyalms: number } => c !== null);

    const outOfPosition = candidates.filter(
      (c) => c.distanceCentiyalms > WAVE_CANNON_OUT_OF_POSITION_THRESHOLD_CENTIYALMS
    );
    // A victim standing correctly who just got caught by a neighbor's
    // mistake stays unflagged — only the one(s) actually off their spot are.
    if (outOfPosition.length === 0) continue;

    const others = compromised
      .flatMap((hs) => hs[0].player.name)
      .filter((name) => !outOfPosition.some((c) => c.player.name === name));

    const diedToWaveCannon = (playerName: string, aroundMs: number) =>
      deathEvents.some(
        (d) =>
          d.player === playerName &&
          d.killingAbilityGameId === WAVE_CANNON_ABILITY_ID &&
          Math.abs(d.timestamp - aroundMs) <= WAVE_CANNON_VOLLEY_CLUSTER_MS + 5000
      );

    for (const { player, timestamp, distanceCentiyalms } of outOfPosition) {
      const yalmsOff = (distanceCentiyalms / 100).toFixed(1);
      const deadOthers = others.filter((name) => diedToWaveCannon(name, timestamp));
      const selfDied = diedToWaveCannon(player.name, timestamp);

      let overlapNote = "";
      if (others.length > 0) {
        overlapNote = ` Overlapped with ${others.join(" and ")}'s Wave Cannon`;
        const bothDied = selfDied && deadOthers.length > 0;
        if (bothDied) overlapNote += `, killing them both`;
        else if (deadOthers.length > 0) overlapNote += `, killing ${deadOthers.join(" and ")}`;
        overlapNote += ".";
      }

      errors.push({
        ruleId:      WAVE_CANNON_OUT_OF_POSITION_RULE_ID,
        severity:    "Major",
        name:        "Wave Cannon Incorrect Position",
        description: `Was roughly ${yalmsOff} yalms off their expected Wave Cannon spot.${overlapNote}`,
        timestamp,
        player:      player.name,
        class:       player.className,
        specId:      player.specId,
        role:        player.role,
        abilityId:   WAVE_CANNON_ABILITY_ID,
        abilityName: "Wave Cannon",
      });
    }
  }

  return errors;
}

/**
 * Returns [] immediately for any pull that never touches Phase 1's tracked
 * abilities — self-gating the same way exdeath.ts does, so it's safe to
 * always call.
 */
export function detectPhase1Errors(players: PlayerInfo[], deathEvents: DeathEvent[]): PullError[] {
  return [
    ...detectBlizzardIIIBlowoutSilentKillErrors(players, deathEvents),
    ...detectJumpedOffArenaError(deathEvents),
    ...detectWaveCannonOutOfPositionErrors(players, deathEvents),
  ].sort((a, b) => a.timestamp - b.timestamp);
}
