// scripts/check-local-log.js
//
// Runs an ACT / IINACT network log through the local-log importer
// (lib/local-log/act-report.ts) and the app's detection pipeline (per-pull
// transform + cross-pull passes, as pull-errors.js does for FFLogs
// samples), and prints what came out: the duties in the file, then per
// pull its encounter, result, length, phases, deaths and errors by rule.
// Players print as jobs, never names. Read-only; the log stays where it is.
//
//   node scripts/check-local-log.js <Network_*.log> [--zone "<zone name>"] [--pulls 1,3-5] [--errors] [--stats]
//
// --zone    only that duty (default: every duty with pulls)
// --errors  list each error at MM:SS with its job and rule
// --stats   per pull, the count of each event stream (compare with an
//           FFLogs sample of the same fight)

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot } = require(path.join(__dirname, 'lib', 'require-ts'));

const clock = (ms) => { const s = Math.max(0, Math.round(ms / 100) / 10); return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

(async () => {
  const args = process.argv.slice(2);
  const file = args[0];
  const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  if (!file || !fs.existsSync(file)) { console.log('usage: check-local-log.js <Network_*.log> [--zone "<zone>"] [--pulls 1,3-5] [--errors] [--stats]'); return; }
  const want = opt('--pulls') ? new Set(opt('--pulls').split(',').flatMap((p) => { const [a, b] = p.split('-').map(Number); return Array.from({ length: (b || a) - a + 1 }, (_, i) => a + i); })) : null;

  const act = requireTsFromRoot('lib/local-log/act-report.ts');
  const cats = requireTsFromRoot('lib/local-log/status-categories.ts');
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const xp = requireTsFromRoot('lib/cross-pull-passes.ts');

  const blob = await fs.openAsBlob(file);
  let t0 = Date.now();
  const visits = await act.scanActLog(blob);
  console.log(`scan ${((Date.now() - t0) / 1000).toFixed(1)}s:`);
  for (const v of visits) console.log(`  ${v.zone}: ${v.pulls} combat spans, ${new Date(v.start).toISOString()} - ${new Date(v.end).toISOString()}`);
  const zone = opt('--zone');
  const chosen = zone ? visits.filter((v) => v.zone === zone) : visits;
  if (!chosen.length) { console.log('no matching duty'); return; }

  t0 = Date.now();
  const out = await act.parseActLog(blob, chosen, 'localcheck', { statusCategories: cats.fetchStatusCategories, itemNames: cats.fetchItemNames });
  console.log(`parse ${((Date.now() - t0) / 1000).toFixed(1)}s: ${out.report.fights.length} pulls, ${out.actors.length} actors, ${out.report.masterData.abilities.length} abilities, ${out.waymarks.length} waymark changes`);

  const abilityMap = lt.buildFFLAbilityMap(out.report.masterData.abilities);
  const imported = lt.transformFFReportToPulls(out.fightDataList, abilityMap, out.report.code, out.report.startTime);
  const state = xp.learnCrossPullState(imported);
  const pulls = imported.map((p) => xp.applyCrossPullPasses(p, state));

  // Job labels instead of names.
  const label = new Map();
  const seen = {};
  for (const p of pulls) for (const pl of p.players) {
    if (label.has(pl.name)) continue;
    const j = (pl.className || pl.spec || '?').replace(/[a-z]/g, '').slice(0, 3) || '?';
    seen[j] = (seen[j] || 0) + 1;
    label.set(pl.name, seen[j] > 1 ? `${j}${seen[j]}` : j);
  }
  const anon = (s) => { let r = String(s ?? ''); for (const [n, l] of label) r = r.split(n).join(l); return r; };

  for (const p of pulls) {
    if (want && !want.has(p.pullNumber)) continue;
    const fd = out.fightDataList.find((d) => d.fight.id === p.fightId);
    const phases = (p.phaseSegments ?? []).map((s) => `P${s.phase}@${clock(s.startMs)}`).join(' ');
    const byRule = {};
    for (const e of p.errors) byRule[`${e.severity} ${e.ruleId}`] = (byRule[`${e.severity} ${e.ruleId}`] || 0) + 1;
    console.log(`\n${p.name} pull ${p.pullNumber} (fight ${p.fightId}): ${p.result} ${clock(p.fightDuration)} | ${p.players.length} players | ${phases}`);
    console.log(`  deaths: ${p.deathEvents.map((d) => `${clock(d.timestamp)} ${anon(d.player)} (${d.cause})`).join(', ') || 'none'}`);
    console.log(`  errors: ${Object.entries(byRule).map(([k, v]) => `${k} x${v}`).join(', ') || 'none'}`);
    if (args.includes('--errors')) for (const e of p.errors) console.log(`    ${clock(e.timestamp)} ${e.severity} ${anon(e.player ?? '-')} ${e.ruleId}: ${anon(e.name)}`);
    if (args.includes('--stats') && fd) {
      console.log('  streams: ' + Object.entries(fd).filter(([k, v]) => Array.isArray(v) && k !== 'actors').map(([k, v]) => `${k} ${v.length}`).join(', '));
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
