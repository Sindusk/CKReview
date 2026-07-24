// Regression harness for lib/mechanics/ffxiv/dancingmad/stompies.ts against
// FFLogs report folders in sampledata/ff/ (gitignored) produced by
// scripts/fetch-ff-report.js. Builds PlayerInfo[]/DeathEvent[]/EnemyEvent[]/
// BlackHoleGeometry the same way the real pipeline does, runs
// detectStompiesErrors, and prints every error per pull.
//
// Run from the repo root:  node scripts/validate-stompies.js [reportDir]
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap } = require('./lib/load-report-folder');
const { buildFFPlayers, buildFFDeaths, buildFFBlackHoleGeometry, buildFFEnemyCastEvents, buildFFStompiesPuddleSamples } = require('./lib/build-ff-players');

const { detectStompiesErrors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/stompies.ts');
const { getFFJobByName } = requireTsFromRoot('lib/ffl-job-data.ts');

const FF_DATA_DIR = path.join(ROOT, 'sampledata', 'ff');

const explicitDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const reportDirs = explicitDir ? [explicitDir] : discoverReportFolders(FF_DATA_DIR);

if (reportDirs.length === 0) {
  console.log(`No report folders found under ${FF_DATA_DIR} (looked for subdirectories containing meta.json).`);
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

  for (const { bossName, pullNumber, rep } of pulls) {
    const players = buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap);
    const deathEvents = buildFFDeaths(rep, actorMap, getFFJobByName);
    const enemyCasts = buildFFEnemyCastEvents(rep, actorMap, abilityMap);
    const geometry = buildFFBlackHoleGeometry(rep, actorMap, abilityMap);
    const puddleSamples = buildFFStompiesPuddleSamples(rep, actorMap, abilityMap);

    const errors = detectStompiesErrors(players, deathEvents, enemyCasts, geometry, puddleSamples);
    console.log(`${bossName} Pull ${pullNumber} -> ${errors.length} stompies error(s)`);
    for (const e of errors) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
    }
  }
}
