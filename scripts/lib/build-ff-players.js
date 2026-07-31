// scripts/lib/build-ff-players.js
//
// Shared PlayerInfo[]/DeathEvent[] builder for scripts/validate.js's FFXIV
// mechanics. Previously each of the old per-mechanic harnesses
// copy-pasted identical logic and resolved names via a hand-
// maintained per-file JOBS table (actorId -> job abbreviation), which had
// to be updated by hand for every new sample file. Now resolves real
// names/classes from a report folder's meta.json (see
// scripts/lib/load-report-folder.js's buildActorMap) via getFFJobByName
// (lib/ffl-job-data.ts) — no table maintenance needed for new captures.

function buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap) {
  const playerIds = [...new Set(rep.combatantInfo?.data?.map((e) => e.sourceID) ?? [])];
  const onlyLanded = (evs) => evs.filter((e) => e.type === 'damage' || (e.type === 'calculateddamage' && e.unpaired === true));
  const dt = onlyLanded(rep.damageTaken?.data ?? []);
  const dd = onlyLanded(rep.damageDone?.data ?? []);
  const statusMap = { removedebuff: 'removed', applydebuffstack: 'stack', removedebuffstack: 'stackRemoved' };
  // Mirrors lib/log-transforms.ts's fflAbilityName — was a hardcoded
  // 'Ability <id>' placeholder here for every player-sourced stream (never
  // actually looked the name up), which silently broke any check keyed on
  // a real ability NAME instead of ID read off a PlayerInfo stream — found
  // via roles.ts's MT/OT auto-attack detection (checks
  // damageTaken[].abilityName === "Attack") always falling through to the
  // tentative roster-order fallback against every report, even though the
  // raw data has plenty of real "Attack" hits (abilityGameID 49746 etc.).
  const resolveAbilityName = (id) => abilityMap?.get(id) ?? ('Ability ' + id);

  return playerIds.map((id) => {
    const actor = actorMap.get(id);
    const job = getFFJobByName(actor?.subType ?? '');
    return {
      actorId: id,
      name: actor?.name || `P${id}`,
      // Matches lib/log-transforms.ts's real buildFFPlayers: className is
      // the resolved job DISPLAY name (job.name, e.g. "Dark Knight"), not
      // the raw FFLogs subType ("DarkKnight") — they differ for exactly two
      // jobs (DarkKnight/WhiteMage lack the space FFLogs' subType strips).
      // Using the raw subType here silently broke any mechanic module
      // keying its canonical-position tables by className for those two
      // jobs (found via phase1.ts's Graven Image detection returning no
      // errors against real harness data despite a confirmed failure).
      className: job.name || '?',
      specId: 0, specName: job.name, role: job.role, rangeType: job.rangeType, game: 'ffxiv',
      damageDone: dd.filter((e) => e.sourceID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: resolveAbilityName(e.abilityGameID),
        amount: e.amount ?? 0,
        target: actorMap.get(e.targetID)?.name,
        healthAfter: e.targetResources?.hitPoints,
        maxHealth: e.targetResources?.maxHitPoints,
      })),
      // x/y here mirror lib/log-transforms.ts's real fflCastToPlayerEvent:
      // targetResources' x/y, only trustworthy as this player's OWN position
      // when the cast targets themselves (target === this player's name,
      // e.g. a self-buff) — see player-position.ts's `casts: "self"` option.
      casts: (rep.casts?.data ?? []).filter((e) => e.sourceID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: resolveAbilityName(e.abilityGameID),
        target: actorMap.get(e.targetID)?.name,
        x: e.targetResources?.x,
        y: e.targetResources?.y,
      })),
      // NOTE this is oriented OPPOSITE to lib/log-transforms.ts's real
      // buildFFPlayers, which filters healing by sourceID (heals CAST BY
      // this player, x/y = RECIPIENT's position). This harness instead
      // keeps the pre-existing targetID filter (heals RECEIVED by this
      // player, x/y = THIS PLAYER's own position — always valid, not just
      // for self-casts) since other already-validated modules read
      // player.healing expecting exactly that (forsaken.ts's
      // findNearestPosition, blackhole-strategy.ts's showedSignOfLife) —
      // flipping the orientation to match the real pipeline changed their
      // harness output (confirmed via diff), so it stays as-is. `source` is
      // added (previously absent) so a caller can still isolate SELF-casts
      // specifically (source === this player's own name) when that's the
      // only thing being trusted — see limitcut.ts's missing-dash-victim
      // position recovery, which checks player.name against `source` here
      // and against `target` on the real pipeline's (oppositely-oriented)
      // shape, since a self-cast is the one entry safe to read as "this
      // player's own position" under EITHER orientation.
      healing: (rep.healing?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: resolveAbilityName(e.abilityGameID),
        amount: e.amount ?? 0,
        source: actorMap.get(e.sourceID)?.name,
        x: e.targetResources?.x,
        y: e.targetResources?.y,
      })),
      // PlayerInfo.healingReceived's real-pipeline counterpart — heals
      // landing on this player from ANY source, unconditionally
      // trustworthy as this player's own position (see player-position.ts's
      // `healingReceived: "any"` option). This harness's `healing` above
      // already has exactly this shape/orientation (targetID filter), so
      // it's duplicated here under the correctly-named field rather than
      // renaming `healing` itself (which stays as-is for the reasons in
      // the comment above it).
      healingReceived: (rep.healing?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: resolveAbilityName(e.abilityGameID),
        amount: e.amount ?? 0,
        source: actorMap.get(e.sourceID)?.name,
        x: e.targetResources?.x,
        y: e.targetResources?.y,
      })),
      damageTaken: dt.filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp,
        abilityId: e.abilityGameID ?? 0,
        abilityName: resolveAbilityName(e.abilityGameID),
        amount: e.amount ?? 0,
        source: actorMap.get(e.sourceID)?.name,
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
        abilityName: resolveAbilityName(e.abilityGameID),
        debuffStatus: statusMap[e.type] ?? 'applied',
        causeAbilityId: e.extraAbilityGameID,
        causeAbilityName: e.extraAbilityGameID !== undefined
          ? (abilityMap?.get(e.extraAbilityGameID) ?? ('Ability ' + e.extraAbilityGameID))
          : undefined,
      })),
    };
  });
}

function buildFFDeaths(rep, actorMap, getFFJobByName) {
  return (rep.deaths?.data ?? []).map((e) => {
    const actor = actorMap.get(e.targetID);
    const job = getFFJobByName(actor?.subType ?? '');
    const killingId = e.killingAbilityGameID ?? 0;
    // Mirrors lib/log-transforms.ts's fflTransformDeath: sourceID -1 with no
    // resolved ability is an environmental death (e.g. jumping off the
    // arena), used by phase1.ts's jumped-off-arena detection.
    const cause = killingId ? '' : (e.sourceID === -1 ? 'Environmental' : 'Unknown');
    return {
      timestamp: e.timestamp,
      player: actor?.name || `P${e.targetID}`,
      class: actor?.subType || '?', specId: 0, role: job.role,
      killingAbilityGameId: killingId,
      cause,
    };
  });
}

// Mirrors lib/log-transforms.ts's fflBuildBlackHoleGeometry — same
// enemyCasts stream, same actor-name matching ("Kefka" / "black hole"),
// same output shape (types/Pull.ts's BlackHoleGeometry), so
// blackhole-strategy.ts's geometry resolvers work unchanged against
// harness-built pulls. See that module's comment for why Kefka's FACING
// (not position) is the real directional reference, and why the black
// hole NPC's own logged spawn position is used instead of inferring
// cardinal from whichever player got hit.
function buildFFBlackHoleGeometry(rep, actorMap, abilityMap) {
  const kefkaIds = new Set([...actorMap.entries()].filter(([, a]) => a.name === 'Kefka').map(([id]) => id));
  const blackHoleIds = new Set([...actorMap.entries()].filter(([, a]) => a.name === 'black hole').map(([id]) => id));
  const enemyCasts = rep.enemyCasts?.data ?? [];

  const kefkaFacingSamples = enemyCasts
    .filter((e) => e.type === 'cast' && kefkaIds.has(e.sourceID) && e.sourceResources?.facing !== undefined && e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined)
    .map((e) => ({
      timestamp: e.timestamp,
      x: e.sourceResources.x,
      y: e.sourceResources.y,
      facing: e.sourceResources.facing,
      abilityName: (abilityMap?.get(e.abilityGameID)) ?? `Ability ${e.abilityGameID}`,
    }));

  const spawnCasts = enemyCasts
    .filter((e) => e.type === 'cast' && blackHoleIds.has(e.sourceID) && e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined)
    .map((e) => ({
      timestamp: e.timestamp,
      sourceInstance: e.sourceInstance ?? 0,
      x: e.sourceResources.x,
      y: e.sourceResources.y,
      targetActorId: e.targetID !== undefined && e.targetID !== -1 ? e.targetID : null,
    }));

  return { kefkaFacingSamples, spawnCasts };
}

// Mirrors lib/log-transforms.ts's fflBuildEnemyCastEvents — same enemyCasts
// stream, same "cast" (not "begincast") filter, same hitPoints/maxHitPoints
// pass-through from sourceResources that forsaken.ts's enrage-check
// detection reads.
function buildFFEnemyCastEvents(rep, actorMap, abilityMap) {
  return (rep.enemyCasts?.data ?? [])
    .filter((e) => e.type === 'cast' && actorMap.get(e.sourceID)?.type !== 'Player')
    .map((e) => ({
      timestamp: e.timestamp,
      actorId: e.sourceID,
      actorName: actorMap.get(e.sourceID)?.name || `Unknown (${e.sourceID})`,
      abilityId: e.abilityGameID ?? 0,
      abilityName: (abilityMap?.get(e.abilityGameID)) ?? ('Ability ' + e.abilityGameID),
      hitPoints: e.sourceResources?.hitPoints,
      maxHitPoints: e.sourceResources?.maxHitPoints,
    }));
}

// Mirrors lib/log-transforms.ts's fflBuildStompiesPuddleSamples — every
// "Blizzard III" ghost puddle's own spawn position (Stompies/Earthquake
// mechanic), matched by ability NAME (not ID — shares "Blizzard III" with
// Exdeath's own solo announcement cast under a different ID).
function buildFFStompiesPuddleSamples(rep, actorMap, abilityMap) {
  return (rep.enemyCasts?.data ?? [])
    .filter((e) => e.type === 'cast' && (abilityMap?.get(e.abilityGameID)) === 'Blizzard III' && e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined)
    .map((e) => ({
      timestamp: e.timestamp,
      x: e.sourceResources.x,
      y: e.sourceResources.y,
    }));
}

// Mirrors lib/log-transforms.ts's fflBuildPlayerPositionSamples — a
// player's own position from something they DID (landed a hit on the
// boss), via the hostilityType: Enemies + DamageTaken stream, which is the
// only stream FFLogs populates sourceResources (attacker's own position)
// on. See that function's comment for why this exists at all.
function buildFFPlayerPositionSamples(rep, actorMap) {
  return (rep.enemyDamageTaken?.data ?? [])
    .filter((e) => (e.type === 'damage' || (e.type === 'calculateddamage' && e.unpaired === true)) && actorMap.get(e.sourceID)?.type === 'Player' && e.sourceResources?.x !== undefined && e.sourceResources?.y !== undefined)
    .map((e) => ({
      timestamp: e.timestamp,
      playerName: actorMap.get(e.sourceID)?.name || `Unknown (${e.sourceID})`,
      x: e.sourceResources.x,
      y: e.sourceResources.y,
    }));
}

module.exports = { buildFFPlayers, buildFFDeaths, buildFFBlackHoleGeometry, buildFFEnemyCastEvents, buildFFStompiesPuddleSamples, buildFFPlayerPositionSamples };
