// TOP P1 (omega.ts, Pantokrator): for each Guided Missile Kyrios (31502) that hit 2+
// players, each hit player's damage from the missile vs from the condensed lines
// (31503) within 2s, and whether they died within 4s. Jobs only. Read-only.
//   node tools/ffxiv/top/omega-missile-share.js <code> [pulls]
// Output: P<pull> m:ss.s carrier=JOB  JOB m<k>/l<k>[X = died] ...  (k = thousands of damage)
const path = require('path');
const ROOT = path.resolve(__dirname, '../../..');
const { pulls, mmss } = require(path.join(ROOT, '.claude/skills/build-module/tools/probe-pulls.js'));
const code = process.argv[2]; const only = process.argv[3] ? process.argv[3].split(',').map(Number) : null;
for (const pl of pulls({ game: 'ff', reports: { R: code }, boss: 'The Omega Protocol' })) {
  if (only && !only.includes(pl.n)) continue;
  const job = {}; for (const p of pl.players) job[p.name] = p.className.slice(0, 3).toUpperCase();
  for (const c of pl.casts.filter((x) => x.abilityId === 31502)) {
    const rows = [];
    for (const p of pl.players) {
      const hit = p.damageTaken.find((e) => e.abilityId === 31502 && e.sourceInstance === c.sourceInstance && Math.abs(e.timestamp - c.timestamp) <= 1500);
      if (!hit) continue;
      const sum = (id) => p.damageTaken.filter((e) => e.abilityId === id && Math.abs(e.timestamp - c.timestamp) <= 2000).reduce((a, e) => a + (e.unmitigatedAmount ?? e.amount ?? 0), 0);
      const died = pl.deaths.some((d) => d.player === p.name && d.timestamp >= c.timestamp && d.timestamp - c.timestamp <= 4000);
      rows.push(`${job[p.name]} m${(sum(31502) / 1000).toFixed(0)}/l${(sum(31503) / 1000).toFixed(0)}${died ? 'X' : ''}`);
    }
    if (rows.length > 1) console.log(`P${pl.n} ${mmss(c.timestamp)} carrier=${c.target ? job[c.target] : '?'}  ${rows.join('  ')}`);
  }
}
