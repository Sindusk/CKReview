// Regression harness for lib/mechanics/ffxiv/dancingmad/blackhole.ts against
// FFLogs report folders in sampledata/ff/ (gitignored) produced by
// scripts/fetch-ff-report.js. Builds PlayerInfo[]/DeathEvent[] the same
// way the real pipeline does (onlyLanded filter, debuffStatus mapping),
// runs detectBlackHoleErrors, and prints every error per pull — with REAL
// player names/classes resolved from each report folder's meta.json via
// getFFJobByName, not a hand-maintained JOBS table.
//
// Run from the repo root:  node scripts/validate-blackhole.js [reportDir]
//
// With no argument, runs against every report folder found under
// sampledata/ff/ (any subdirectory containing a meta.json). Pass a
// specific folder to narrow to one report.
//
// 2026-07-17: the flat hand-picked sample files this harness used to
// reference (BlackHoleFailPull5.json, ForsakenSuccess.json, etc.) were
// deleted when sampledata/ was reorganized around scripts/fetch-*-report.js
// report folders — no verified expected-results table exists yet for
// whatever's currently in sampledata/ff/. This harness's role for now is
// regression protection (no crashes) plus a per-pull error summary.
const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap } = require('./lib/load-report-folder');
const { buildFFPlayers, buildFFDeaths, buildFFBlackHoleGeometry } = require('./lib/build-ff-players');

const { detectBlackHoleErrors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/blackhole.ts');
const { detectBlackHoleStrategy, detectMissedAssignedTetherErrors, detectClippedByNeighborTetherErrors, detectIncorrectBlackHoleDirectionErrors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/blackhole-strategy.ts');
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

  // Pull-like objects (game/players/deathEvents) — the minimum
  // detectBlackHoleStrategy/detectMissedAssignedTetherErrors need — built
  // once so the cross-pull strategy analysis sees every pull in the report,
  // same as the app's page.tsx does over its live `pulls` state.
  const pullLikes = pulls.map(({ bossName, pullNumber, rep }) => ({
    game: 'ffxiv',
    players: buildFFPlayers(rep, actorMap, getFFJobByName, abilityMap),
    deathEvents: buildFFDeaths(rep, actorMap, getFFJobByName),
    blackHoleGeometry: buildFFBlackHoleGeometry(rep, actorMap, abilityMap),
    bossName, pullNumber,
  }));

  const strategy = detectBlackHoleStrategy(pullLikes);
  if (strategy) {
    console.log('-'.repeat(70));
    console.log(`  Black Hole strategy: ${strategy.strategyId} (shape: ${strategy.shape}, from ${strategy.pullsAnalyzed} pull(s))`);
    for (const lane of strategy.lanes) {
      console.log(`    ${lane.slotLabel.padEnd(20)} ${lane.player} (${lane.className}) -> tethers ${lane.moments.join(',')}`);
    }
  } else {
    console.log('  Black Hole strategy: not enough recognized-composition pulls to resolve');
  }

  for (const p of pullLikes) {
    const errors = detectBlackHoleErrors(p.players, p.deathEvents);
    const missedAssigned = detectMissedAssignedTetherErrors(p, strategy);
    const clipped = detectClippedByNeighborTetherErrors(p, strategy);
    const wrongDirection = detectIncorrectBlackHoleDirectionErrors(p, strategy);
    console.log('='.repeat(70));
    console.log(`${p.bossName} Pull ${p.pullNumber} ->`, errors.length, 'errors,', missedAssigned.length, 'missed-assigned-tether,', clipped.length, 'clipped-by-neighbor,', wrongDirection.length, 'incorrect-direction');
    for (const e of errors) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player ?? '(raid)'}: ${e.description}`);
    }
    for (const e of missedAssigned) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
    }
    for (const e of clipped) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
    }
    for (const e of wrongDirection) {
      console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
    }
  }
}
