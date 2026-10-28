// What the app shows for a boss's pulls, as a VOD reviewer reads it: per
// pull, the result and length, the cutoff (first Raid error), every error
// at MM:SS with its player and severity, and the deaths no error explains
// (no error on that player within 4s before the death event, which lands
// ~2s after the fatal hit). Runs the real pipeline: per-pull detection
// (log-transforms.ts), then the cross-pull passes the app applies on top
// (lib/cross-pull-passes.ts: assigned duties, fallback, TOP's Pantokrator
// conga and Party Synergy order, Dancing Mad's Black Hole / Graven Image /
// Wave Cannon), learned from the whole report, so it matches the app, not
// just one mechanic's harness output. Strategy overrides set in the app's
// Strategy dialog aren't applied (auto-detected only).
//
//   node .claude/skills/refine-module/tools/pull-errors.js <ff|wow> <code> "<boss>" [--pulls 1,3-5] [--rule <ruleId prefix>] [--all] [--full] [--summary] [--jobs] [--roster]
//
// --roster   print only the report's roster for that boss: character name ->
//            the --jobs label, one per line, from the sample data on disk (no
//            fetch, no detection). The main thread maps every name in the
//            user's VOD answers through it. The only mode that prints names
//            on purpose: keep its output out of committed files.
// --jobs     print players as their job (DRK, SCH, ...; "DRK2" for a second
//            DRK), names inside descriptions too. Use it for anything an
//            agent passes on or writes down.
// --pulls    only these pull numbers (the app's per-boss numbering)
// --rule     only errors whose ruleId starts with this (e.g. ffxiv-lw1-chain)
// --all      also list errors after the cutoff (default: count them only)
// --full     print whole descriptions (default: cut at 220 characters)
// --summary  instead of per-pull lists: counts per rule/name/severity with
//            example pulls, the cutoff each pull got (wipes without one are
//            listed), and every error in a kill
// Run from the repo root. Read-only.

const path = require('path');
const { requireTsFromRoot } = require(path.join(process.cwd(), 'scripts/lib/require-ts'));
const clock = (t) => { const s = Math.max(0, Math.round(t / 100) / 10); return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

function parsePulls(s) {
  if (!s) return null;
  const out = new Set();
  for (const part of s.split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let n = a; n <= (b || a); n++) out.add(n);
  }
  return out;
}

(async () => {
  const args = process.argv.slice(2);
  const [game, code, boss] = args;
  const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  if (!game || !code || !boss) {
    console.log('usage: pull-errors.js <ff|wow> <code> "<boss>" [--pulls 1,3-5] [--rule <prefix>] [--all] [--full] [--summary] [--jobs] [--roster]');
    return;
  }
  const want = parsePulls(opt('--pulls'));
  const rule = opt('--rule');
  const all = args.includes('--all');
  const full = args.includes('--full');

  const store = requireTsFromRoot('lib/sample-report-store.ts');
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const payload = await store.loadSampleReport(game === 'wow' ? 'wcl' : 'ffl', code);
  const imported = game === 'wow'
    ? lt.transformReportToPulls(payload.fightDataList, lt.buildWCLAbilityMap(payload.report.masterData.abilities), code)
    : await lt.transformFFReportToPulls(payload.fightDataList, lt.buildFFLAbilityMap(payload.report.masterData.abilities), code, payload.report.startTime);
  if (args.includes('--roster')) {
    const { jobLabels } = require('./job-labels');
    const R = jobLabels(imported.filter((p) => p.name === boss), game);
    if (!R.map.size) console.log(`no players: no pulls named "${boss}" in sampledata for ${code}`);
    for (const [name, label] of [...R.map].sort((a, b) => a[1].localeCompare(b[1]))) console.log(`${name} -> ${label}`);
    return;
  }
  // Cross-pull passes, learned from every pull in the report as the app does.
  const xp = requireTsFromRoot('lib/cross-pull-passes.ts');
  const state = xp.learnCrossPullState(imported);
  const pulls = imported.map((p) => xp.applyCrossPullPasses(p, state));

  const chosen = pulls.filter((p) => p.name === boss && (!want || want.has(p.pullNumber)));
  const { jobLabels, identity } = require('./job-labels');
  const J = args.includes('--jobs') ? jobLabels(pulls.filter((p) => p.name === boss), game) : identity;
  const who = (name) => (name ? J.label(name) : '(raid)');
  if (args.includes('--summary')) {
    // Per rule + name + severity: count and example pulls; per cutoff kind:
    // the pulls it ended; every error in a kill (a kill should be near-clean).
    const byName = new Map(), cuts = new Map();
    for (const pull of chosen) {
      const errors = [...pull.errors].sort((a, b) => a.timestamp - b.timestamp);
      const cut = errors.find((e) => e.severity === 'Raid');
      const ck = cut ? `${cut.ruleId} (${cut.name})` : pull.result === 'Kill' ? 'none (kill)' : 'NONE: wipe without a cutoff';
      cuts.set(ck, [...(cuts.get(ck) ?? []), `${pull.pullNumber}@${clock(cut ? cut.timestamp : pull.fightDuration)}`]);
      for (const e of errors) {
        if (rule && !e.ruleId.startsWith(rule)) continue;
        const k = `${e.ruleId} | ${J.sub(e.name)} |${e.severity}${cut && e.timestamp > cut.timestamp ? ' (after cutoff)' : ''}`;
        byName.set(k, [...(byName.get(k) ?? []), `${pull.pullNumber}@${clock(e.timestamp)}`]);
      }
      if (pull.result === 'Kill') {
        console.log(`KILL pull ${pull.pullNumber} (${clock(pull.fightDuration)}): ${errors.length} errors`);
        for (const e of errors) console.log(`  ${clock(e.timestamp)} [${e.severity}] ${who(e.player)} — ${J.sub(e.name)}`);
      }
    }
    console.log('\nErrors by rule | name | severity (count, first pulls):');
    for (const [k, v] of [...byName].sort()) console.log(`${String(v.length).padStart(5)}  ${k}   e.g. ${v.slice(0, 6).join(' ')}`);
    console.log('\nCutoffs:');
    for (const [k, v] of [...cuts].sort((a, b) => b[1].length - a[1].length)) console.log(`${String(v.length).padStart(5)}  ${k}: ${v.join(' ')}`);
    return;
  }
  for (const pull of chosen) {
    const errors = [...pull.errors].sort((a, b) => a.timestamp - b.timestamp);
    const cut = errors.find((e) => e.severity === 'Raid');
    console.log(`== Pull ${pull.pullNumber} (${pull.result.toLowerCase()}, ${clock(pull.fightDuration)})` +
      `  cutoff: ${cut ? `${cut.name} @ ${clock(cut.timestamp)}` : 'none'}`);
    let after = 0;
    for (const e of errors) {
      if (rule && !e.ruleId.startsWith(rule)) continue;
      const late = cut && e.timestamp > cut.timestamp;
      if (late && !all) { after++; continue; }
      const d0 = J.sub(e.description);
      const desc = full || d0.length <= 220 ? d0 : `${d0.slice(0, 217)}...`;
      console.log(`  ${clock(e.timestamp).padStart(6)} ${late ? '(after cutoff) ' : ''}[${e.severity}] ${who(e.player)} — ${J.sub(e.name)} [${e.ruleId}]: ${desc}`);
    }
    if (after) console.log(`  … ${after} more after the cutoff (--all to list)`);
    // Explained: an error on that player, or an error naming them (a missed
    // tower's victims), within the 4s before the death event.
    const unexplained = (pull.deathEvents ?? []).filter((d) =>
      !(cut && d.timestamp - 2000 >= cut.timestamp) &&
      !errors.some((e) => (e.player === d.player || e.description.includes(d.player)) && e.timestamp <= d.timestamp && e.timestamp >= d.timestamp - 4000));
    for (const d of unexplained) {
      const blow = d.killingAbilityGameId ? `${d.cause} (${d.killingAbilityGameId})` : 'none';
      console.log(`  ${clock(d.timestamp - 2000).padStart(6)} UNEXPLAINED DEATH ${who(d.player)} — killing blow: ${J.sub(blow)}; death event ${clock(d.timestamp)}`);
    }
  }
})();
