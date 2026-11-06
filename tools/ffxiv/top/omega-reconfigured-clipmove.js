// TOP P3 (omega-reconfiguredd.ts, Hello World rot clips): who walked into whom at a rot clip on a new holder.
//   node tools/ffxiv/top/omega-reconfigured-clipmove.js <code> [pulls]
// Per rot hit (31578/31579) on a live victim that took the same rot in the previous 10s (the new holder): MM:SS,
// victim and each expiring carrier as JOB, and for [expiry-3s, expiry] the yalms each walked (V victim, C carrier)
// and the gap at -3s / 0s (gap closing = the carrier or the victim walked in). Jobs, never names. Read-only.
const { load, parseArgs, ivs, mmss, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [code] = a.pos;
if (!code) { console.log('usage: omega-reconfigured-clipmove.js <code> [pulls]'); process.exit(1); }
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const HIT = { 31578: 1003526, 31579: 1003429 };
const pos = (p, t) => pp.interpolatePlayerPosition(p, t, { windowMs: 2000, maxSpanMs: 3000 });
const dn = (x, y) => (x && y ? Math.hypot(x.x - y.x, x.y - y.y) / 100 : NaN);
const f = (v) => (Number.isNaN(v) ? '?' : v.toFixed(1));
for (const pl of ps) for (const v of pl.players) for (const e of v.damageTaken) {
  const id = HIT[e.abilityId];
  if (!id || e.healthBefore === 0) continue;
  const car = pl.players.filter((p) => p !== v && ivs(p, id).some((iv) => iv.end >= e.timestamp - 1000 && iv.end <= e.timestamp + 300));
  const got = ivs(v, id).some((iv) => iv.start < e.timestamp && iv.start > e.timestamp - 10000);
  if (!got) continue;
  for (const c of car) {
    const ex = ivs(c, id).find((iv) => iv.end >= e.timestamp - 1000 && iv.end <= e.timestamp + 300).end;
    console.log(`Pull ${pl.n} ${mmss(e.timestamp)} V ${J.label(v.name)} walked ${f(dn(pos(v, ex - 3000), pos(v, ex)))} | C ${J.label(c.name)} walked ${f(dn(pos(c, ex - 3000), pos(c, ex)))} | gap -3s ${f(dn(pos(v, ex - 3000), pos(c, ex - 3000)))} 0s ${f(dn(pos(v, ex), pos(c, ex)))}`);
  }
}
