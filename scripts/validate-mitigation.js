// Regression harness for lib/mechanics/ffxiv/dancingmad/mitigation-detection.ts
// against FFLogs report folders in sampledata/ff/ (gitignored). Unlike the
// other validate-*.js harnesses (which hand-build PlayerInfo/DeathEvent from
// raw slim JSON via scripts/lib/build-ff-players.js), this one goes through
// lib/sample-report-store.ts + lib/log-transforms.ts's real
// transformFFReportToPulls — mitigation detection needs properly-resolved
// ability names on casts/deaths (not the shortcut '' placeholders the other
// harnesses' shared builder uses), and the sample-report-store reshaping is
// exactly what the app itself uses to load a report from disk.
//
// Run from the repo root:  node scripts/validate-mitigation.js [reportDir]
const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders } = require('./lib/load-report-folder');

// sample-report-store.ts reads from process.cwd()-relative 'sampledata/...',
// which matches ROOT here since we run from the repo root.
const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt    = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const { getMitigationPlan } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts');
const { detectMitigationErrors } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-detection.ts');

const FF_DATA_DIR = path.join(ROOT, 'sampledata', 'ff');
const explicitDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const reportDirs = explicitDir ? [explicitDir] : discoverReportFolders(FF_DATA_DIR);

const plan = getMitigationPlan('ikuya');

(async () => {
  for (const dir of reportDirs) {
    const code = path.basename(dir);
    if (!(await store.sampleReportExists('ffl', code))) continue;

    const payload = await store.loadSampleReport('ffl', code);
    if (payload.source !== 'ffl') continue;

    const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
    const pulls = lt.transformFFReportToPulls(payload.fightDataList, abilityMap, code);

    console.log('#'.repeat(70));
    console.log(`${payload.report.title ?? code} (${dir}) — ${pulls.length} pull(s)`);

    for (const pull of pulls) {
      if (pull.name !== 'Dancing Mad' && !/Kefka/i.test(pull.name)) continue;
      const errors = detectMitigationErrors(pull, plan);
      console.log('='.repeat(70));
      console.log(`${pull.name} Pull ${pull.pullNumber} (${pull.deathEvents.length} deaths) ->`, errors.length, 'mitigation errors');
      for (const e of errors) {
        console.log(`  t=${(e.timestamp/1000).toFixed(1)}s ${e.player} (${e.class}): ${e.description}`);
      }
    }
  }
})().catch((err) => { console.error(err); process.exit(1); });
