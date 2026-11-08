// scripts/compare-local-log.js
//
// Checks the local-log importer (lib/local-log/act-report.ts) against
// FFLogs' own report of the same night: pairs each FFLogs sample pull
// (sampledata/ff/<code>, fetched with fetch-ff-report.js --fight) with the
// local pull that started within 15s of it, runs both through the app's
// pipeline (only the paired pulls, so cross-pull learning sees the same
// set), and prints per pair: the start / length offsets, each event
// stream's count on both sides, deaths that differ, and errors (rule +
// job) found on one side only. The log may be another raider's than the
// FFLogs upload: everything party-wide is the same, timing differs by ms.
// Players print as jobs.
//
//   node scripts/compare-local-log.js <Network_*.log> <fflogs code> [--times]
//
// --times  also list errors on both sides whose times differ by over 1s

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot } = require(path.join(__dirname, 'lib', 'require-ts'));

const clock = (ms) => { const s = Math.max(0, Math.round(ms / 100) / 10); return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

(async () => {
  const [file, code] = process.argv.slice(2);
  if (!file || !code) { console.log('usage: compare-local-log.js <Network_*.log> <fflogs code> [--times]'); return; }
  const act = requireTsFromRoot('lib/local-log/act-report.ts');
  const cats = requireTsFromRoot('lib/local-log/status-categories.ts');
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const xp = requireTsFromRoot('lib/cross-pull-passes.ts');
  const store = requireTsFromRoot('lib/sample-report-store.ts');

  const ff = await store.loadSampleReport('ffl', code);
  const blob = await fs.openAsBlob(file);
  const visits = await act.scanActLog(blob);
  const local = await act.parseActLog(blob, visits, 'localcmp', { statusCategories: cats.fetchStatusCategories, itemNames: cats.fetchItemNames });

  // Pair fights by real start time.
  const pairs = [];
  for (const fd of ff.fightDataList) {
    const at = ff.report.startTime + fd.fight.startTime;
    const ld = local.fightDataList.find((d) => Math.abs(local.report.startTime + d.fight.startTime - at) < 15000);
    if (ld) pairs.push([fd, ld]);
    else console.log(`FFLogs fight ${fd.fight.id}: no local pull within 15s`);
  }
  const run = (list, abilities, rc, start) => {
    const pulls = lt.transformFFReportToPulls(list, lt.buildFFLAbilityMap(abilities), rc, start);
    const st = xp.learnCrossPullState(pulls);
    return pulls.map((p) => xp.applyCrossPullPasses(p, st));
  };
  const ffPulls = run(pairs.map((p) => p[0]), ff.report.masterData.abilities, code, ff.report.startTime);
  const lcPulls = run(pairs.map((p) => p[1]), local.report.masterData.abilities, 'localcmp', local.report.startTime);

  // Jobs by name from the FFLogs side.
  const job = new Map();
  const n = {};
  for (const p of [...ffPulls, ...lcPulls]) for (const pl of p.players) {
    if (job.has(pl.name)) continue;
    const j = String(pl.className || '?').replace(/[^A-Z]/g, '') || '?';
    n[j] = (n[j] || 0) + 1;
    job.set(pl.name, n[j] > 1 ? `${j}${n[j]}` : j);
  }
  const J = (s) => (s ? job.get(s) ?? '?' : '-');
  const key = (e) => `${e.severity} ${e.ruleId} ${J(e.player)}`;

  for (let i = 0; i < pairs.length; i++) {
    const [fd, ld] = pairs[i];
    const fp = ffPulls.find((p) => p.fightId === fd.fight.id), lp = lcPulls.find((p) => p.fightId === ld.fight.id);
    const startOff = (local.report.startTime + ld.fight.startTime) - (ff.report.startTime + fd.fight.startTime);
    console.log(`\n== FFLogs fight ${fd.fight.id} / local ${ld.fight.id}: start ${startOff >= 0 ? '+' : ''}${startOff}ms, length ${clock(fp.fightDuration)} vs ${clock(lp.fightDuration)}, ${fp.result}/${lp.result}, phases ${(fp.phaseSegments ?? []).length}/${(lp.phaseSegments ?? []).length}`);
    const streams = Object.keys(fd).filter((k) => Array.isArray(fd[k]) && k !== 'actors');
    console.log('  streams (ffl/local): ' + streams.map((k) => `${k} ${fd[k].length}/${(ld[k] ?? []).length}`).join(', '));
    const dkey = (d) => `${J(d.player)} ${d.cause}`;
    const fdset = fp.deathEvents.map(dkey), ldset = lp.deathEvents.map(dkey);
    const onlyF = fdset.filter((k) => !ldset.includes(k)), onlyL = ldset.filter((k) => !fdset.includes(k));
    if (onlyF.length || onlyL.length) console.log(`  deaths only FFLogs: ${onlyF.join(', ') || '-'} | only local: ${onlyL.join(', ') || '-'}`);
    const dt = fp.deathEvents.map((d) => { const m = lp.deathEvents.find((x) => dkey(x) === dkey(d)); return m ? m.timestamp - d.timestamp : null; }).filter((x) => x !== null);
    if (dt.length) console.log(`  death time offset (local - ffl): ${Math.min(...dt)}..${Math.max(...dt)}ms`);
    const count = (list) => { const m = new Map(); for (const e of list) m.set(key(e), [...(m.get(key(e)) ?? []), e]); return m; };
    const fe = count(fp.errors), le = count(lp.errors);
    const diffs = [];
    for (const k of new Set([...fe.keys(), ...le.keys()])) {
      const a = fe.get(k) ?? [], b = le.get(k) ?? [];
      if (a.length !== b.length) diffs.push(`${k}: ffl ${a.length} [${a.map((e) => clock(e.timestamp)).join(' ')}] local ${b.length} [${b.map((e) => clock(e.timestamp)).join(' ')}]`);
      else if (process.argv.includes('--times')) {
        const off = a.map((e, j) => Math.abs(e.timestamp - b[j].timestamp)).filter((d) => d > 1000);
        if (off.length) diffs.push(`${k}: times ${a.map((e) => clock(e.timestamp)).join(' ')} vs ${b.map((e) => clock(e.timestamp)).join(' ')}`);
      }
    }
    console.log(`  errors: ${fp.errors.length} ffl / ${lp.errors.length} local${diffs.length ? '' : ', same rules and players'}`);
    for (const d of diffs) console.log(`    ${d}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
