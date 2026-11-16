// TOP P5 (run-dynamis.ts, Delta monitors 31597): per volley (P5 start +50..+85s) CLEAN/DIRTY (four hits, one per
// Local), the Loading holder, Locals and others with positions and hit counts, and each cannon source's hits. Jobs, never names.
//   node tools/ffxiv/top/delta-mon.js <code> [pulls]
const { load, parseArgs, mmss, requireTsFromRoot } = require('./../kit.js');
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const a = parseArgs(process.argv.slice(2)); const code = a.pos[0];
if (!code) { console.log('usage: delta-mon.js <code> [pulls]'); process.exit(1); }
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const xy = (p, t) => { const q = pp.interpolatePlayerPosition(p, t, { windowMs: 2500, maxSpanMs: 4000 }); return q ? `(${(q.x / 100 - 100).toFixed(0)},${(q.y / 100 - 100).toFixed(0)})` : '(-)'; };
for (const pl of ps) {
  const st = pl.casts.find((c) => c.abilityId === 31621 || c.abilityId === 31622); if (!st) continue;
  const cs = pl.casts.filter((c) => c.abilityId === 31597 && c.timestamp > st.timestamp + 50000 && c.timestamp < st.timestamp + 85000);
  if (!cs.length) continue; const t = cs[0].timestamp;
  const hits = pl.players.flatMap((p) => p.damageTaken.filter((e) => e.abilityId === 31597 && Math.abs(e.timestamp - t) < 2500).map((e) => ({ p, e })));
  const loc = pl.players.filter((p) => p.debuffs.some((d) => /Local Regression/.test(d.abilityName) && d.timestamp < t && d.timestamp > st.timestamp && d.debuffStatus === 'applied'));
  const load_ = pl.players.filter((p) => p.debuffs.some((d) => /Wave Cannon Loading/.test(d.abilityName) && d.timestamp < t && d.timestamp > t - 15000));
  const cnt = (p) => hits.filter((h) => h.p === p).length;
  const clean = loc.length === 4 && loc.every((p) => cnt(p) === 1) && hits.length === 4;
  const src = cs.map((c) => `s${c.sourceInstance}@(${(c.x / 100 - 100).toFixed(0)},${(c.y / 100 - 100).toFixed(0)})f${Math.round(c.facing / 100 * 180 / Math.PI)}:${hits.filter((h) => h.e.sourceInstance === c.sourceInstance).map((h) => J.label(h.p.name)).join('+') || '-'}`).join(' ');
  console.log(`P${pl.n} ${mmss(t)} ${clean ? 'CLEAN' : 'DIRTY'} load ${load_.map((p) => J.label(p.name) + xy(p, t - 600)).join(',')} loc ${loc.map((p) => J.label(p.name) + xy(p, t - 600) + 'x' + cnt(p)).join(' ')} oth ${pl.players.filter((p) => !loc.includes(p)).map((p) => J.label(p.name) + xy(p, t - 600) + (cnt(p) ? 'x' + cnt(p) : '')).join(' ')} | ${src}`);
}
