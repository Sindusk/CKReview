// TOP P5 (run-dynamis.ts, Delta Optical Laser 31521): eye position/facing and each player's lateral/along offset
// (yalms) from the line half a second before the hit; * = hit. Jobs, never names.
//   node tools/ffxiv/top/delta-laser.js <code> [pulls]
const { load, parseArgs, mmss, requireTsFromRoot } = require('./../kit.js');
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const a = parseArgs(process.argv.slice(2)); const code = a.pos[0];
if (!code) { console.log('usage: delta-laser.js <code> [pulls]'); process.exit(1); }
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
for (const pl of ps) {
  const st = pl.casts.find((c) => c.abilityId === 31621 || c.abilityId === 31622); if (!st) continue;
  const cs = pl.casts.filter((c) => c.abilityId === 31521 && c.timestamp > st.timestamp + 40000 && c.timestamp < st.timestamp + 75000);
  const c = cs.find((x) => x.x !== undefined); if (!c) continue;
  const hits = pl.players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === 31521 && e.timestamp >= c.timestamp - 500 && e.timestamp < c.timestamp + 5000).map((e) => ({ p, e })));
  const t = hits.length ? hits[0].e.timestamp : c.timestamp + 1000;
  const f = c.facing / 100; const dx = Math.sin(f), dy = Math.cos(f); // FFLogs facing: 0 = south (+y)
  const row = pl.players.map((p) => { const q = pp.interpolatePlayerPosition(p, t - 500, { windowMs: 2500, maxSpanMs: 4000 }); if (!q) return `${J.label(p.name)}(-)`;
    const rx = q.x / 100 - c.x / 100, ry = q.y / 100 - c.y / 100; const al = rx * dx + ry * dy, lat = rx * dy - ry * dx;
    return `${J.label(p.name)}${hits.some((h) => h.p === p) ? '*' : ''}${lat.toFixed(1)}/${al.toFixed(0)}`; });
  console.log(`P${pl.n} cast ${mmss(c.timestamp)} (+${((c.timestamp - st.timestamp) / 1000).toFixed(1)}) hit ${mmss(t)} eye(${(c.x / 100 - 100).toFixed(0)},${(c.y / 100 - 100).toFixed(0)}) f${Math.round(f * 180 / Math.PI)} n${cs.length} | ${row.join(' ')}`);
}
