// Regression harness for lib/mechanics/ffxiv/dancingmad/phase1.ts against
// FFLogs report folders in sampledata/ff/ (gitignored) produced by
// scripts/fetch-ff-report.js. Builds PlayerInfo[]/DeathEvent[] the same
// way the real pipeline does, runs detectPhase1Errors, and prints every
// error per pull — with REAL player names/classes resolved from each
// report folder's meta.json.
//
// Run from the repo root:  node scripts/validate-phase1.js [reportDir]
//
// With no argument, runs against every report folder found under
// sampledata/ff/ (any subdirectory containing a meta.json). Pass a
// specific folder to narrow to one report.
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap, STREAM_KEYS } = require('./lib/load-report-folder');
const { buildFFPlayers, buildFFDeaths } = require('./lib/build-ff-players');

const { detectPhase1Errors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/phase1.ts');
const { getFFJobByName } = requireTsFromRoot('lib/ffl-job-data.ts');

const FF_DATA_DIR = path.join(ROOT, 'sampledata', 'ff');

// phase1.ts's jumped-off-arena check gates on a fight-relative time window
// (matching the real pipeline's convention, where every timestamp is
// already event.timestamp - fightStart) — but load-report-folder's raw
// streams keep WCL's absolute report-ms timestamps. Shift every stream by
// this pull's own earliest event, same as log-transforms.ts's fightStart.
function toFightRelative(rep) {
  const allTimestamps = STREAM_KEYS.flatMap((k) => (rep[k]?.data ?? []).map((e) => e.timestamp));
  const fightStart = Math.min(...allTimestamps);
  const shifted = {};
  for (const key of STREAM_KEYS) {
    shifted[key] = { data: (rep[key]?.data ?? []).map((e) => ({ ...e, timestamp: e.timestamp - fightStart })) };
  }
  return shifted;
}

// Mirrors lib/log-transforms.ts's fflBuildEnemyCastEvents — completed casts
// (not begincast) from non-player actors, minimal EnemyEvent shape.
function buildFFEnemyCasts(rep, actorMap) {
  return (rep.enemyCasts?.data ?? [])
    .filter((e) => e.type === 'cast' && actorMap.get(e.sourceID)?.type !== 'Player')
    .map((e) => ({
      timestamp: e.timestamp,
      actorId: e.sourceID,
      actorName: actorMap.get(e.sourceID)?.name ?? `Unknown (${e.sourceID})`,
      abilityId: e.abilityGameID ?? 0,
      abilityName: 'Ability ' + e.abilityGameID,
    }));
}

const explicitDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const reportDirs = explicitDir ? [explicitDir] : discoverReportFolders(FF_DATA_DIR);

if (reportDirs.length === 0) {
  console.log(`No report folders found under ${FF_DATA_DIR} (looked for subdirectories containing meta.json).`);
  console.log('Fetch one with: node scripts/fetch-ff-report.js <reportCode>');
  process.exit(0);
}

for (const dir of reportDirs) {
  const loaded = loadReportFolder(dir);
  if (!loaded) { console.log(`${dir} -> no meta.json, skipping`); continue; }
  const { meta, pulls } = loaded;
  const actorMap = buildActorMap(meta);
  const abilityMap = buildAbilityMap(meta);

  console.log('#'.repeat(70));
  console.log(`${meta.title ?? meta.code} (${dir})`);
  console.log(`  ${pulls.length} pull(s)`);

  for (const { bossName, pullNumber, rep: rawRep } of pulls) {
    const rep = toFightRelative(rawRep);
    const players = buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap);
    const deaths  = buildFFDeaths(rep, actorMap, getFFJobByName);
    const enemyCasts = buildFFEnemyCasts(rep, actorMap);
    const errors  = detectPhase1Errors(players, deaths, enemyCasts);
    console.log('='.repeat(70));
    console.log(`${bossName} Pull ${pullNumber} ->`, errors.length, 'errors');
    for (const e of errors) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player ?? '(raid)'}: ${e.description}`);
    }
  }
}
