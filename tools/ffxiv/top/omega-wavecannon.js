// TOP P1 (omega.ts, Wave Cannon Kyrios 31505): every line that hit 2+ players,
// with who it was aimed at (cast target; blank = the one non-tank no other line
// in the pull is aimed at), each hit player's bearing from the source and that
// job's usual bearing (median over this report's single-hit lines). Jobs only.
//   node tools/ffxiv/top/omega-wavecannon.js <code> [pulls]
// Output: P<pull> m:ss owner=JOB hits JOB@bearing(usual median, off by deg) ...
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { pulls, mmss } = require(path.join(ROOT, '.claude/skills/build-module/tools/probe-pulls.js'));
const AB = { Gunbreaker: 'GNB', 'Dark Knight': 'DRK', Scholar: 'SCH', Sage: 'SGE', Reaper: 'RPR', Monk: 'MNK', 'Red Mage': 'RDM', Dancer: 'DNC', Warrior: 'WAR', Paladin: 'PLD', 'White Mage': 'WHM', Astrologian: 'AST', Samurai: 'SAM', Ninja: 'NIN', Dragoon: 'DRG', Viper: 'VPR', Bard: 'BRD', Machinist: 'MCH', 'Black Mage': 'BLM', Summoner: 'SMN', Pictomancer: 'PCT', 'Blue Mage': 'BLU' };
const TANK = new Set(['GNB', 'DRK', 'WAR', 'PLD']);
const code = process.argv[2]; const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
const rows = [];
for (const pl of pulls({ game: 'ff', reports: { R: code }, boss: 'The Omega Protocol' })) {
  const job = {}; for (const p of pl.players) job[p.name] = AB[p.className] || p.className;
  const casts = pl.casts.filter((x) => x.abilityId === 31505);
  for (const c of casts) {
    const hits = [];
    for (const p of pl.players) for (const e of p.damageTaken) {
      if (e.abilityId !== 31505 || e.sourceInstance !== c.sourceInstance || Math.abs(e.timestamp - c.timestamp) > 1000 || e.x === undefined) continue;
      hits.push({ j: job[p.name], b: Math.atan2(e.x - c.x, e.y - c.y) * 180 / Math.PI });
    }
    const aimed = new Set(casts.filter((x) => x !== c && x.target).map((x) => job[x.target]));
    const owner = c.target ? job[c.target] : [...new Set(pl.players.map((p) => job[p.name]))].filter((j) => !TANK.has(j) && !aimed.has(j) && !casts.some((x) => x.target && job[x.target] === j)).join('/') || '?';
    // * = this player is the named target of another line in the pull (their own line is elsewhere)
    for (const h of hits) h.other = casts.some((x) => x !== c && x.target && job[x.target] === h.j) ? '*' : '';
    rows.push({ n: pl.n, t: c.timestamp, owner: c.target ? job[c.target] : '?', hits });
  }
}
const by = {};
for (const r of rows) if (r.hits.length === 1) (by[r.hits[0].j] ??= []).push(r.hits[0].b);
const med = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const usual = Object.fromEntries(Object.entries(by).map(([j, a]) => [j, med(a)]));
for (const r of rows) {
  if (r.hits.length < 2 || (only && !only.includes(r.n))) continue;
  console.log(`P${r.n} ${mmss(r.t)} tg=${r.owner} hits ${r.hits.map((h) => `${h.j}${h.other}@${h.b.toFixed(0)}(${usual[h.j] === undefined ? '?' : `${usual[h.j].toFixed(0)}, ${(h.b - usual[h.j]).toFixed(0)}`})`).join(' ')}`);
}
