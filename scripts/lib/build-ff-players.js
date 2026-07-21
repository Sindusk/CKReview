// scripts/lib/build-ff-players.js
//
// Shared PlayerInfo[]/DeathEvent[] builder for the FFXIV Dancing Mad
// validate-*.js harnesses (forsaken/limitcut/blackhole). Previously each
// harness copy-pasted identical logic and resolved names via a hand-
// maintained per-file JOBS table (actorId -> job abbreviation), which had
// to be updated by hand for every new sample file. Now resolves real
// names/classes from a report folder's meta.json (see
// scripts/lib/load-report-folder.js's buildActorMap) via getFFJobByName
// (lib/ffl-job-data.ts) — no table maintenance needed for new captures.

function buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap) {
  const playerIds = [...new Set(rep.combatantInfo?.data?.map((e) => e.sourceID) ?? [])];
  const onlyLanded = (evs) => evs.filter((e) => e.type === 'damage' || (e.type === 'calculateddamage' && e.unpaired === true));
  const dt = onlyLanded(rep.damageTaken?.data ?? []);
  const statusMap = { removedebuff: 'removed', applydebuffstack: 'stack', removedebuffstack: 'stackRemoved' };

  return playerIds.map((id) => {
    const actor = actorMap.get(id);
    const job = getFFJobByName(actor?.subType ?? '');
    return {
      actorId: id,
      name: actor?.name || `P${id}`,
      className: actor?.subType || '?',
      specId: 0, specName: job.name, role: job.role, rangeType: job.rangeType, game: 'ffxiv',
      damageDone: [], casts: [],
      healing: (rep.healing?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: 'Ability ' + e.abilityGameID,
        amount: e.amount ?? 0,
        x: e.targetResources?.x,
        y: e.targetResources?.y,
      })),
      damageTaken: dt.filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: 'Ability ' + e.abilityGameID,
        amount: e.amount ?? 0,
        sourceInstance: e.sourceInstance,
        x: e.targetResources?.x,
        y: e.targetResources?.y,
        overkill: e.overkill,
        activeBuffNames: abilityMap
          ? (e.buffs ?? '').split('.').filter(Boolean).map((id) => abilityMap.get(Number(id))).filter(Boolean)
          : undefined,
      })),
      debuffs: (rep.debuffs?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: 'Debuff ' + e.abilityGameID,
        debuffStatus: statusMap[e.type] ?? 'applied',
      })),
    };
  });
}

function buildFFDeaths(rep, actorMap, getFFJobByName) {
  return (rep.deaths?.data ?? []).map((e) => {
    const actor = actorMap.get(e.targetID);
    const job = getFFJobByName(actor?.subType ?? '');
    return {
      timestamp: e.timestamp,
      player: actor?.name || `P${e.targetID}`,
      class: actor?.subType || '?', specId: 0, role: job.role,
      killingAbilityGameId: e.killingAbilityGameID ?? 0,
      cause: '',
    };
  });
}

module.exports = { buildFFPlayers, buildFFDeaths };
