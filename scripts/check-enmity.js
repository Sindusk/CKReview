// scripts/check-enmity.js — how well the enmity table (lib/mitigation/enmity.ts)
// predicts each boss's autos, per sample report.
//
// For every tracked enemy: single-target autos the table named before
// correcting itself, and the holder changes by cause (predicted / all).
// --list prints each change with its pull and MM:SS. Needs sampledata.
//
// Usage: node scripts/check-enmity.js <code> [<code> ...] [--list]

const { requireTsFromRoot } = require('./lib/require-ts');
const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const en = requireTsFromRoot('lib/mitigation/enmity.ts');
const { FFXIV_MITIGATION: G } = requireTsFromRoot('lib/mitigation/ffxiv-catalog.ts');

const args = process.argv.slice(2);
const list = args.includes('--list');
const codes = args.filter((a) => !a.startsWith('--'));
const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '-');

(async () => {
  if (!codes.length) { console.log('usage: node scripts/check-enmity.js <code> [...] [--list]'); process.exit(1); }
  for (const code of codes) {
    const payload = await store.loadSampleReport('ffl', code);
    const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
    const pulls = lt.transformFFReportToPulls(payload.fightDataList, abilityMap, code);
    const byBoss = new Map();
    for (const pull of pulls) {
      const r = en.analyzePullEnmity(pull, G);
      const b = byBoss.get(pull.name) ?? { pulls: 0, autos: 0, agreed: 0, dual: new Set(), causes: {}, lines: [] };
      b.pulls++;
      for (const o of r.enemies) {
        b.autos += o.check.autos; b.agreed += o.check.agreed;
        if (o.dualAutos) b.dual.add(o.enemy);
        for (const c of o.changes) {
          if (c.cause === 'pull') continue;
          const x = (b.causes[c.cause] ??= { n: 0, predicted: 0 });
          x.n++; if (c.predicted) x.predicted++;
          b.lines.push(`  Pull ${pull.pullNumber} ${mmss(c.atMs)} ${o.enemy}: ${c.from} -> ${c.to} (${c.cause}${c.predicted ? '' : ', autos only'})`);
        }
      }
      byBoss.set(pull.name, b);
    }
    for (const [boss, b] of byBoss) {
      const causes = Object.entries(b.causes).map(([k, v]) => `${k} ${v.predicted}/${v.n}`).join(', ');
      console.log(`${code} ${boss}: ${b.pulls} pulls, autos named ${b.agreed}/${b.autos} (${pct(b.agreed, b.autos)}); changes ${causes || 'none'}` +
        (b.dual.size ? `; dual autos: ${[...b.dual].join(', ')}` : ''));
      if (list) for (const l of b.lines) console.log(l);
    }
  }
})();
