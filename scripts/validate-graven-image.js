// Regression harness for lib/mechanics/ffxiv/dancingmad/graven-image.ts
// against FFLogs report folders in sampledata/ff/ (gitignored). Cross-pull
// like blackhole-strategy.ts's harness section in validate-blackhole.js:
// learns the report's own layout from ALL its pulls, then checks each pull
// against it.
//
// Run from the repo root:  node scripts/validate-graven-image.js [reportDir]
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap, STREAM_KEYS } = require('./lib/load-report-folder');
const { buildFFPlayers, buildFFDeaths } = require('./lib/build-ff-players');

const { learnGravenImageLayout, detectGravenImageSpreadErrors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/graven-image.ts');
const { getFFJobByName } = requireTsFromRoot('lib/ffl-job-data.ts');

const FF_DATA_DIR = path.join(ROOT, 'sampledata', 'ff');

// The mechanic's time window is fight-relative; raw streams keep WCL's
// absolute report-ms timestamps — shift by this pull's own earliest event,
// same as validate-phase1.js.
function toFightRelative(rep) {
  const allTimestamps = STREAM_KEYS.flatMap((k) => (rep[k]?.data ?? []).map((e) => e.timestamp));
  const fightStart = Math.min(...allTimestamps);
  const shifted = {};
  for (const key of STREAM_KEYS) {
    shifted[key] = { data: (rep[key]?.data ?? []).map((e) => ({ ...e, timestamp: e.timestamp - fightStart })) };
  }
  return shifted;
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

  const pullLikes = pulls.map(({ bossName, pullNumber, rep: rawRep }) => {
    const rep = toFightRelative(rawRep);
    return {
      game: 'ffxiv',
      players: buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap),
      deathEvents: buildFFDeaths(rep, actorMap, getFFJobByName),
      bossName, pullNumber,
    };
  });

  const layout = learnGravenImageLayout(pullLikes);
  console.log('-'.repeat(70));
  console.log('  Learned layout:');
  for (const [className, { north, south }] of Object.entries(layout)) {
    console.log(`    ${className.padEnd(12)} north=${north ? `${north.x},${north.y}` : '—'}  south=${south ? `${south.x},${south.y}` : '—'}`);
  }

  for (const p of pullLikes) {
    const errors = detectGravenImageSpreadErrors(p, layout);
    console.log('='.repeat(70));
    console.log(`${p.bossName} Pull ${p.pullNumber} ->`, errors.length, 'errors');
    for (const e of errors) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
    }
  }
}
