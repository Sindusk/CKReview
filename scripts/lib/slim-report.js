// scripts/lib/slim-report.js
//
// Projects raw WCL/FFLogs event streams down to only the fields this
// codebase actually reads, before writing sample captures to disk.
// Measured on a real Midnight Falls pull: damageDone/damageTaken/casts
// carry ~20 fields per event from the API's `includeResources: true`
// flag (gear stats, buffs-as-a-string, resource bars — none of it read
// anywhere in lib/), and the biggest single field (a semicolon-list
// `buffs` string) alone was the largest contributor in a sample. This
// keeps `x`/`y` (used for position-based root-cause analysis, e.g. the
// Midnight Falls crystal-drop distance work) and `hitPoints`/
// `maxHitPoints` (used for health-before/after context), but drops
// everything else — routinely ~75-85% smaller per fight in testing.
//
// Deliberately does NOT drop the `healing` stream (nothing reads it yet,
// but Midnight Falls detection is expected to need it soon) or shrink
// low-count streams (deaths/debuffs/enemyCasts/enemyBuffs — each under
// 0.1% of a fight's total bytes even unslimmed) beyond dropping the
// redundant `fight`/`packetID` id, which every event in a single-fight
// file already implies.
//
// WCL and FFLogs shapes differ (WCL: flat x/y on the event; FFLogs:
// nested under targetResources/sourceResources, per fflBuild* consumers
// in lib/log-transforms.ts and the scripts/validate-{forsaken,limitcut,
// blackhole}.js harnesses) — projectors below preserve each API's own
// native shape rather than normalizing, so existing FF harness code
// (`e.targetResources?.x`) keeps working unchanged against these files.

function pick(obj, keys) {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
}

function omit(obj, keys) {
  const out = {};
  for (const k of Object.keys(obj)) if (!keys.includes(k)) out[k] = obj[k];
  return out;
}

function pickNested(obj, key, subKeys) {
  return obj[key] ? pick(obj[key], subKeys) : obj[key];
}

function project(streams, projectors) {
  const out = {};
  for (const key of Object.keys(projectors)) {
    const data = streams[key]?.data ?? [];
    out[key] = { data: data.map(projectors[key]) };
  }
  return out;
}

// ─── WarcraftLogs (WoW) ─────────────────────────────────────────────────────

const WCL_PROJECTORS = {
  deaths:        (e) => omit(e, ['fight']),
  combatantInfo: (e) => pick(e, ['timestamp', 'type', 'sourceID', 'specID']),
  casts:         (e) => pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'targetInstance', 'sourceInstance', 'abilityGameID', 'x', 'y']),
  damageDone:    (e) => pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'abilityGameID', 'amount', 'overkill', 'tick', 'x', 'y', 'sourceInstance']),
  damageTaken:   (e) => pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'abilityGameID', 'amount', 'overkill', 'tick', 'hitPoints', 'maxHitPoints', 'x', 'y', 'sourceInstance']),
  healing:       (e) => pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'targetInstance', 'abilityGameID', 'amount', 'overheal', 'hitPoints', 'maxHitPoints']),
  debuffs:       (e) => omit(e, ['fight']),
  enemyCasts:    (e) => omit(e, ['fight']),
  enemyBuffs:    (e) => omit(e, ['fight']),
};

function slimWclReport(streams) {
  return project(streams, WCL_PROJECTORS);
}

// ─── FFLogs (FFXIV) ─────────────────────────────────────────────────────────

const FF_RESOURCE_SUBKEYS = ['x', 'y', 'hitPoints', 'maxHitPoints'];

const FFL_PROJECTORS = {
  deaths:        (e) => omit(e, ['fight', 'packetID']),
  // Only .sourceID is ever read (as a player-id roster source in the
  // validate-*.js harnesses — the app itself doesn't use combatantInfo
  // for FF at all, roster comes from fight.friendlyPlayers instead) —
  // the gear/auras/stat block this stream otherwise carries is pure bloat.
  combatantInfo: (e) => pick(e, ['timestamp', 'type', 'sourceID']),
  casts: (e) => ({
    ...pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'sourceInstance', 'targetInstance', 'abilityGameID']),
    targetResources: pickNested(e, 'targetResources', FF_RESOURCE_SUBKEYS),
  }),
  damageDone: (e) => ({
    ...pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'sourceInstance', 'targetInstance', 'abilityGameID', 'amount', 'unpaired']),
    targetResources: pickNested(e, 'targetResources', FF_RESOURCE_SUBKEYS),
  }),
  damageTaken: (e) => ({
    ...pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'sourceInstance', 'targetInstance', 'abilityGameID', 'amount', 'unpaired']),
    targetResources: pickNested(e, 'targetResources', FF_RESOURCE_SUBKEYS),
  }),
  healing: (e) => ({
    ...pick(e, ['timestamp', 'type', 'sourceID', 'targetID', 'sourceInstance', 'abilityGameID', 'amount', 'overheal', 'unpaired']),
    targetResources: pickNested(e, 'targetResources', FF_RESOURCE_SUBKEYS),
  }),
  debuffs:    (e) => omit(e, ['fight', 'packetID']),
  enemyCasts: (e) => omit(e, ['fight', 'packetID']),
  enemyBuffs: (e) => omit(e, ['fight', 'packetID']),
};

function slimFflReport(streams) {
  return project(streams, FFL_PROJECTORS);
}

module.exports = { slimWclReport, slimFflReport };
