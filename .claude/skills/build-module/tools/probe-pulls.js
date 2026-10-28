// Probe loader for verification work: every pull of a boss across one or more
// fetched reports, built the way the modules receive them, with timestamps in
// ms from the pull start. For scratchpad probes that the analyze-report.js
// commands can't answer. Require it from a probe in the session scratchpad:
//
//   const { pulls, mmss, requireTsFromRoot } = require('<repo>/.claude/skills/build-module/tools/probe-pulls.js');
//   for (const pl of pulls({ game: 'ff', reports: { A: 'QwNr…', B: 'H9fn…' }, boss: 'Lindwurm' })) {
//     pl.label  // "A23": report letter + the app's per-boss pull number
//     pl.players, pl.deaths, pl.casts (enemy casts), pl.dur (ms)
//     // WoW also: pl.enemyBuffs, pl.enemyBuffRemovals, pl.friendlyNpcDamage
//     // pl.raw: the fight-relative raw streams, for fields the builders drop
//   }
//
// `only` limits to report letters (e.g. 'A'). Read-only: loads
// sampledata/<ff|wow>/<code>/ through the same builders validate.js uses.

const path = require('path');
const ROOT = path.resolve(__dirname, '../../../..');
const { requireTsFromRoot } = require(path.join(ROOT, 'scripts/lib/require-ts'));
const { loadReportFolder, buildActorMap, buildAbilityMap, STREAM_KEYS } = require(path.join(ROOT, 'scripts/lib/load-report-folder'));

function rel(rep) {
  let min = Infinity;
  for (const k of STREAM_KEYS) for (const e of rep[k]?.data ?? []) if (e.timestamp < min) min = e.timestamp;
  const out = {};
  for (const k of STREAM_KEYS) out[k] = { data: (rep[k]?.data ?? []).map((e) => ({ ...e, timestamp: e.timestamp - min })) };
  return out;
}

function* pulls({ game, reports, boss, only }) {
  const ff = game === 'ff';
  const ffb = ff ? require(path.join(ROOT, 'scripts/lib/build-ff-players')) : null;
  const wb = ff ? null : require(path.join(ROOT, 'scripts/lib/build-wow-players'));
  const { getFFJobByName } = ff ? requireTsFromRoot('lib/ffl-job-data.ts') : {};
  const { getSpecInfo } = ff ? {} : requireTsFromRoot('lib/spec-data.ts');
  for (const [L, code] of Object.entries(reports)) {
    if (only && !only.includes(L)) continue;
    const loaded = loadReportFolder(path.join(ROOT, 'sampledata', game, code));
    if (!loaded) { console.error(`no sampledata/${game}/${code}`); continue; }
    const am = buildActorMap(loaded.meta), ab = buildAbilityMap(loaded.meta);
    for (const p of loaded.pulls) {
      if (p.bossName !== boss) continue;
      const r = rel(p.rep);
      let dur = 0;
      for (const k of STREAM_KEYS) for (const e of r[k].data) if (e.timestamp > dur) dur = e.timestamp;
      const base = { label: `${L}${p.pullNumber}`, L, n: p.pullNumber, dur, raw: r };
      if (ff) {
        yield { ...base, players: ffb.buildFFPlayers(r, am, getFFJobByName, ab), deaths: ffb.buildFFDeaths(r, am, getFFJobByName), casts: ffb.buildFFEnemyCastEvents(r, am, ab), headMarkers: ffb.buildFFHeadMarkers(r, am), tethers: ffb.buildFFTethers(r, am) };
      } else {
        const w = wb.buildWowPull(p.rep, am, ab, getSpecInfo);
        yield { ...base, players: w.players, deaths: w.deaths, casts: w.enemyCasts, enemyBuffs: w.enemyBuffs, enemyBuffRemovals: w.enemyBuffRemovals, friendlyNpcDamage: w.friendlyNpcDamage };
      }
    }
  }
}

const mmss = (ms) => { const s = Math.round(ms / 100) / 10; const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
module.exports = { pulls, mmss, requireTsFromRoot, ROOT };
