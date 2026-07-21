// Regression harness for lib/mechanics/ffxiv/dancingmad/exdeath.ts against
// FFLogs report folders in sampledata/ff/ (gitignored) produced by
// scripts/fetch-ff-report.js. Builds PlayerInfo[]/DeathEvent[] the same
// way the real pipeline does, runs detectExdeathErrors, and prints every
// error per pull — with REAL player names/classes resolved from each
// report folder's meta.json.
//
// Run from the repo root:  node scripts/validate-exdeath.js [reportDir]
//
// With no argument, runs against every report folder found under
// sampledata/ff/ (any subdirectory containing a meta.json). Pass a
// specific folder to narrow to one report.
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap } = require('./lib/load-report-folder');
const { buildFFPlayers, buildFFDeaths } = require('./lib/build-ff-players');

const { detectExdeathErrors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/exdeath.ts');
const { getFFJobByName } = requireTsFromRoot('lib/ffl-job-data.ts');

const FF_DATA_DIR = path.join(ROOT, 'sampledata', 'ff');

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

  for (const { bossName, pullNumber, rep } of pulls) {
    const players = buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap);
    const deaths  = buildFFDeaths(rep, actorMap, getFFJobByName);
    const errors  = detectExdeathErrors(players, deaths);
    console.log('='.repeat(70));
    console.log(`${bossName} Pull ${pullNumber} ->`, errors.length, 'errors');
    for (const e of errors) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player ?? '(raid)'}: ${e.description}`);
    }
  }
}
