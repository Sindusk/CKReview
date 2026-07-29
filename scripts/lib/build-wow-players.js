// scripts/lib/build-wow-players.js
//
// Shared PlayerInfo[]/DeathEvent[]/EnemyEvent[] builder for WCL (WoW)
// report folders, extracted verbatim from the old validate-midnightfalls.js
// so scripts/validate.js can share it. Mirrors the live WCL pipeline in
// lib/log-transforms.ts: fight-relative timestamps, tick→isDoT, enemyCasts
// "cast"-only, enemyBuffs "applybuff"-only, friendly-NPC damage stream.
//
// `getSpecInfo` is passed in (transpiled from lib/spec-data.ts by the
// caller) rather than required here, keeping this file dependency-free.

function fightStartOf(rep) {
  let t0 = Infinity;
  for (const k of Object.keys(rep)) {
    for (const e of (rep[k]?.data ?? [])) if (e.timestamp < t0) t0 = e.timestamp;
  }
  return t0 === Infinity ? 0 : t0;
}

function buildWowPull(rep, actorMap, abilityMap, getSpecInfo) {
  const t0 = fightStartOf(rep);
  const playerIds = [...new Set((rep.combatantInfo?.data ?? []).map((e) => e.sourceID))];
  const specByPlayer = new Map((rep.combatantInfo?.data ?? []).map((e) => [e.sourceID, e.specID ?? 0]));
  const abilityName = (id) => abilityMap.get(id) ?? `Ability ${id}`;
  const playerName = (id) => actorMap.get(id)?.name || `P${id}`;

  const players = playerIds.map((id) => {
    const spec = getSpecInfo(specByPlayer.get(id) ?? 0);
    return {
      actorId: id,
      name: playerName(id),
      className: spec.className,
      specId: specByPlayer.get(id) ?? 0,
      specName: spec.name,
      role: spec.role,
      rangeType: spec.rangeType,
      game: 'wow',
      damageDone: [],
      // Completed casts with target names — the Terminate kick-order
      // detection filters on target === "Termination Matrix", same as the
      // live wclCastToPlayerEvent.
      casts: (rep.casts?.data ?? []).filter((e) => e.sourceID === id && e.type === 'cast').map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        target: actorMap.get(e.targetID)?.name,
      })),
      // target name matters here — the Dusk Crystal rule filters heals by
      // target === "Dusk Crystal", same as the live wclHealToPlayerEvent.
      // amount>0 deliberately NOT filtered here — matches the real
      // pipeline (log-transforms.ts) after the FF graven-image.ts
      // "SNAPSHOT POSITION" fix found 0-amount (fully overhealed) entries
      // still carry a usable position; the Healing tab UI filters amount>0
      // itself instead. WoW doesn't currently use healing for position
      // sampling, but this keeps the harness matching the real pipeline.
      healing: (rep.healing?.data ?? []).filter((e) => e.sourceID === id).map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        amount: e.amount ?? 0,
        target: actorMap.get(e.targetID)?.name,
      })),
      // PlayerInfo.healingReceived's real-pipeline counterpart — empty of
      // position for WoW (WCLHealEvent carries none), kept only for
      // type-shape parity with FF.
      healingReceived: (rep.healing?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        amount: e.amount ?? 0,
        source: actorMap.get(e.sourceID)?.name,
      })),
      damageTaken: (rep.damageTaken?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        amount: e.amount ?? 0,
        overkill: e.overkill,
        isDoT: e.tick === true,
        x: e.x,
        y: e.y,
      })),
      debuffs: (rep.debuffs?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        debuffStatus:
          e.type === 'removedebuff' ? 'removed' :
          e.type === 'applydebuffstack' ? 'stack' :
          e.type === 'removedebuffstack' ? 'stackRemoved' : 'applied',
      })),
    };
  });

  const deaths = (rep.deaths?.data ?? []).map((e) => {
    const spec = getSpecInfo(specByPlayer.get(e.targetID) ?? 0);
    return {
      timestamp: e.timestamp - t0,
      player: playerName(e.targetID),
      class: spec.className, specId: specByPlayer.get(e.targetID) ?? 0, role: spec.role,
      killingAbilityGameId: e.killingAbilityGameID ?? 0,
      cause: abilityName(e.killingAbilityGameID ?? 0),
    };
  });

  const enemyCasts = (rep.enemyCasts?.data ?? []).filter((e) => e.type === 'cast').map((e) => ({
    timestamp: e.timestamp - t0,
    actorId: e.sourceID,
    actorName: actorMap.get(e.sourceID)?.name || `NPC${e.sourceID}`,
    abilityId: e.abilityGameID ?? 0,
    abilityName: abilityName(e.abilityGameID ?? 0),
  }));

  const enemyBuffs = (rep.enemyBuffs?.data ?? []).filter((e) => e.type === 'applybuff').map((e) => ({
    timestamp: e.timestamp - t0,
    actorId: e.targetID,
    actorName: actorMap.get(e.targetID)?.name || `NPC${e.targetID}`,
    abilityId: e.abilityGameID ?? 0,
    abilityName: abilityName(e.abilityGameID ?? 0),
  }));

  // Damage on friendly NPCs (Dusk Crystal Dimming ticks) — mirrors
  // wclBuildFriendlyNpcDamageEvents in lib/log-transforms.ts.
  const friendlyNpcDamage = (rep.damageTaken?.data ?? [])
    .filter((e) => actorMap.get(e.targetID)?.type === 'NPC')
    .map((e) => ({
      timestamp: e.timestamp - t0,
      actorId: e.targetID,
      actorName: actorMap.get(e.targetID)?.name || `NPC${e.targetID}`,
      abilityId: e.abilityGameID ?? 0,
      abilityName: abilityName(e.abilityGameID ?? 0),
    }));

  return { players, deaths, enemyCasts, enemyBuffs, friendlyNpcDamage };
}

module.exports = { buildWowPull, fightStartOf };
