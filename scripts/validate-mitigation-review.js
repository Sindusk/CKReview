// Throwaway sanity check for lib/mechanics/ffxiv/dancingmad/mitigation-review.ts
// Run: node scripts/validate-mitigation-review.js [reportDir]
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders } = require('./lib/load-report-folder');

const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt    = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const { getMitigationPlan } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts');
const { buildMitigationReview } = requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-review.ts');

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

    console.log(`\n### ${code} — ${pulls.length} pulls`);
    for (const pull of pulls.slice(0, 3)) {
      const rows = buildMitigationReview(pull, plan);
      const enemyCastCount = (pull.enemyCasts || []).length;
      const reachedCount = rows.filter(r => r.reached).length;
      console.log(`Pull ${pull.pullNumber}: enemyCasts=${enemyCastCount}, review rows=${rows.length} (reached=${reachedCount}, future=${rows.length - reachedCount})`);
      // Print the last reached row and first future row (the boundary) plus the very last row.
      const lastReachedIdx = rows.map(r => r.reached).lastIndexOf(true);
      const toShow = [rows[0], rows[lastReachedIdx], rows[lastReachedIdx + 1], rows[rows.length - 1]].filter(Boolean);
      for (const row of toShow) {
        const cells = [...row.cellsByActorId.entries()].map(([id, c]) => {
          const p = pull.players.find(p => p.actorId === id);
          const checks = c.checks.map(chk => `${chk.status}:${chk.abilityName}${chk.carryOver ? '(carry)' : ''}`).join('+');
          return `${p ? p.name : id}:${checks}${c.tentativeSlot ? '?' : ''}(${c.slotLabel})`;
        }).join(', ');
        console.log(`  [${(row.anchorMs/1000).toFixed(1)}s] reached=${row.reached} ${row.phaseTitle} / ${row.mech.name} -> ${cells}`);
      }
    }
  }
})();
