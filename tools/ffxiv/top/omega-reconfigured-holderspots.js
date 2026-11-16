// TOP P3 monitors (omega-reconfiguredd.ts): each monitor holder's offset from its nearest clean holder spot.
//   node tools/ffxiv/top/omega-reconfigured-holderspots.js <code> [pulls]
// Per volley (Oversampled Wave Cannon 31597 within 3s of the boss cast 31595/31596; all 8 alive): clean / FAIL
// (a player hit by 2+ cannon sources, or one hit by none), the boss side, then each holder as JOB (x,y) at
// volley-1s in the boss-R frame (x mirrored for boss L), the nearest spot and the offset in yalms. Jobs only.
const { load, parseArgs, ivs, mmss, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [code] = a.pos;
if (!code) { console.log('usage: omega-reconfigured-holderspots.js <code> [pulls]'); process.exit(1); }
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const SPOTS = [[10, -9], [10, 9], [-10, 10]];
for (const pl of ps) {
  const boss = pl.casts.find((c) => c.abilityId === 31595 || c.abilityId === 31596); if (!boss) continue;
  const cs = pl.casts.filter((c) => c.abilityId === 31597 && Math.abs(c.timestamp - boss.timestamp) <= 3000); if (!cs.length) continue;
  const t = cs[0].timestamp, sg = boss.abilityId === 31595 ? 1 : -1;
  const hits = pl.players.map((p) => new Set(p.damageTaken.filter((e) => e.abilityId === 31597 && Math.abs(e.timestamp - t) <= 2500).map((e) => e.sourceInstance)).size);
  const fail = hits.some((h) => h >= 2) || hits.some((h) => h === 0);
  const hold = pl.players.filter((p) => [1003452, 1003453].some((id) => ivs(p, id).some((i) => i.start <= t - 500 && i.end > t - 500)));
  const bits = hold.map((p) => {
    const q = pp.interpolatePlayerPosition(p, t - 1000, { windowMs: 2000, maxSpanMs: 3000 });
    if (!q) return `${J.label(p.name)}(-)`;
    const x = (q.x / 100 - 100) * sg, y = q.y / 100 - 100;
    const best = SPOTS.map((s, i) => ({ i, d: Math.hypot(x - s[0], y - s[1]) })).sort((m, n) => m.d - n.d)[0];
    return `${J.label(p.name)}(${x.toFixed(1)},${y.toFixed(1)}) s${best.i} ${best.d.toFixed(1)}`;
  });
  console.log(`Pull ${pl.n} ${mmss(t)} ${fail ? 'FAIL' : 'ok'} ${sg > 0 ? 'R' : 'L'} ${pl.players.length}p hold ${bits.join(' | ')}`);
}
