// scripts/check-deployment-shields.js — Scholar spreadlo attribution
// (lib/mitigation/ffxiv-deployment.ts) on a real report: per pull, the
// Deployment Tactics casts, how many Galvanize/Catalyze absorbs became the
// "spread" statuses, the raidwide hits that now credit Deployment Tactics,
// and the median spread shield size the planner will use for an added one.
//
// Usage: node scripts/check-deployment-shields.js [reportCode] [boss]
//   (defaults: JZ1KXhDbqkNH3jxR, every boss; needs its sampledata)

const { requireTsFromRoot } = require('./lib/require-ts');
const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const an = requireTsFromRoot('lib/mitigation/analyze.ts');
const op = requireTsFromRoot('lib/mitigation/optimize.ts');
const dep = requireTsFromRoot('lib/mitigation/ffxiv-deployment.ts');
const { FFXIV_MITIGATION: G } = requireTsFromRoot('lib/mitigation/ffxiv-catalog.ts');

const CODE = process.argv[2] || 'JZ1KXhDbqkNH3jxR';
const BOSS = process.argv[3];

(async () => {
  const payload = await store.loadSampleReport('ffl', CODE);
  const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
  const pulls = lt.transformFFReportToPulls(payload.fightDataList, abilityMap, CODE)
    .filter((p) => !BOSS || p.name === BOSS)
    .map(dep.withDeploymentShields);
  const fmt = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
  const hitLists = [];
  let deploys = 0;
  let credited = 0;
  for (const p of pulls) {
    const sch = p.players.filter((x) => x.className === 'Scholar');
    const casts = sch.flatMap((s) => s.casts.filter((c) => c.abilityId === 3585).map((c) => c.timestamp));
    if (!casts.length) continue;
    deploys += casts.length;
    let spread = 0, plain = 0;
    for (const pl of p.players) for (const a of pl.shieldAbsorbs ?? []) {
      if (a.statusId > dep.DEPLOYMENT_STATUS_OFFSET) spread++; else if (a.statusId === 1000297 || a.statusId === 1001918) plain++;
    }
    const hits = an.analyzePullMitigation(p, G);
    hitLists.push(hits);
    const withDeploy = hits.filter((h) => h.active.some((a) => a.key === 'deployment-tactics'));
    credited += withDeploy.length;
    console.log(`${p.name} #${p.pullNumber}: Deployment at ${casts.map(fmt).join(', ')}; absorbs spread ${spread}, plain ${plain}; ` +
      `hits crediting it: ${withDeploy.map((h) => `${h.abilityName} #${h.occurrence} ${fmt(h.timestampMs)}`).join(', ') || 'none'}`);
  }
  const sizes = op.medianShieldSizes(hitLists, G);
  const raw = sizes.get('deployment-tactics');
  console.log(`\n${deploys} Deployment casts; ${credited} hits credit it; median spread shield ${raw ? Math.round(raw) : 'none'} HP per target`);
  if (deploys > 0 && credited === 0) { console.log('FAIL: Deployment casts but no hit credits them'); process.exit(1); }
  console.log('PASS');
})().catch((e) => { console.error(e); process.exit(1); });
