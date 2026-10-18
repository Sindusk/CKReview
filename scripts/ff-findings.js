// scripts/ff-findings.js — every damage finding whose label or detail
// matches a pattern, for every player of one job, across the FFXIV sample
// reports on disk (or the named ones). For checking a new or changed job
// check for false positives across all samples (docs/xiva-audit-plan.md
// phase 3). Read-only: prints, writes nothing.
//
// Usage:
//   node scripts/ff-findings.js <Job> "<regex>" [code ...]
//   node scripts/ff-findings.js Dancer "No dance partner|Partner swap late"
//   node scripts/ff-findings.js Bard "outside the burst window" KzamJYNWgqx3TLdw
//
// <Job> is the FFLogs subType as meta.json writes it (BlackMage, Dancer,
// RedMage ...). Prints one line per finding (report, boss, pull, result,
// player, time, loss, FORCED when forced, detail) and a count at the end.
// A full run over every report takes a few minutes.

const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { loadPulls } = require('./lib/load-sample-pull');

const [job, pattern, ...only] = process.argv.slice(2);
if (!job || !pattern) {
  console.log('usage: node scripts/ff-findings.js <Job> "<regex>" [code ...]');
  process.exit(1);
}
const rx = new RegExp(pattern);
const { getDamageContext } = requireTsFromRoot('lib/damage/contexts.ts');
const clock = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

(async () => {
  const dir = path.join(ROOT, 'sampledata', 'ff');
  let pulls = 0, players = 0, hits = 0;
  for (const code of only.length ? only : fs.readdirSync(dir)) {
    let meta;
    try { meta = JSON.parse(fs.readFileSync(path.join(dir, code, 'meta.json'), 'utf8')); } catch { continue; }
    if (!meta.masterData?.actors?.some((a) => a.type === 'Player' && a.subType === job)) continue;
    let r;
    try { r = await loadPulls(code); } catch (e) { console.log(`skip ${code}: ${e.message}`); continue; }
    for (const pull of r.pulls) {
      const a = r.mod.analyzePullDamage(pull, r.game, getDamageContext(pull.name));
      pulls++;
      for (const p of a.players) {
        if (p.job.replace(/\s/g, '') !== job) continue;
        players++;
        for (const f of p.findings ?? []) {
          if (!rx.test(f.label ?? '') && !rx.test(f.detail ?? '')) continue;
          hits++;
          console.log(`${code} ${pull.name} P${pull.pullNumber} ${pull.result} ${p.player}: ${clock(f.startMs)} ` +
            `${Math.round(f.lostDamage / 1000)}k${f.forced ? ' FORCED' : ''} ${f.detail ?? f.label}`);
        }
      }
    }
  }
  console.log(`pulls ${pulls}, ${job} player-pulls ${players}, findings ${hits}`);
})();
