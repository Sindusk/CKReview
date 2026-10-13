// A player's forced windows through the app's own analysis (downtime, HP
// checks passed, holds, death, limit breaks), merged, with their causes.
// For deciding whether a xivanalysis / WoWAnalyzer claim falls in time where damage
// changed nothing.
//
//   node .claude/skills/damage-analysis/tools/forced.js <code> "<boss>" <pull> "<player>" [--from M:SS] [--to M:SS]
//
// Run from the repo root. Read-only.

const path = require('path');
const { loadPull } = require(path.join(process.cwd(), 'scripts/lib/load-sample-pull')); // FFXIV or WoW
const clock = (t) => { const s = Math.round(t / 100) / 10; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
const parse = (s) => { const [m, sec] = s.split(':'); return (Number(m) * 60 + Number(sec)) * 1000; };

(async () => {
  const argv = process.argv.slice(2);
  const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv.splice(i, 2)[1] : undefined; };
  const from = opt('--from'), to = opt('--to');
  const [code, boss, pullNumber, who] = argv;
  if (!who) { console.log('usage: forced.js <code> "<boss>" <pull> "<player>" [--from M:SS] [--to M:SS]'); process.exit(1); }
  const { pull, game, mod } = await loadPull(code, boss, pullNumber);
  const a = mod.analyzePullDamage(pull, game, mod.getDamageContext(pull.name));
  const ps = a.players.find((p) => p.player === who);
  if (!ps) { console.log(`no player "${who}"`); process.exit(1); }
  const lo = from ? parse(from) : -Infinity, hi = to ? parse(to) : Infinity;
  const ws = [...ps.timeline.forced].sort((x, y) => x.startMs - y.startMs).filter((w) => w.endMs >= lo && w.startMs <= hi);
  for (const w of ws) console.log(`${clock(w.startMs)}-${clock(w.endMs)}  ${w.cause ?? ''}`);
})();
