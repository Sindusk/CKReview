// TOP P2 (omega-mf.ts, Limitless Synergy): the Sagittarius Arrow (31539) cast's own target, position and facing,
// and who it hit. Jobs, never names.
//   node tools/ffxiv/top/omega-mf-arrow.js <code> [pulls]   per Arrow cast: time, target job, x/y/facing, hit jobs (dmg)
const { load, parseArgs, mmss } = require('./../kit.js');
const a = parseArgs(process.argv.slice(2));
const [code] = a.pos;
if (!code) { console.log('usage: omega-mf-arrow.js <code> [pulls]'); process.exit(1); }
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
for (const p of ps) {
  for (const c of p.casts.filter((e) => e.abilityId === 31539)) {
    const hit = p.players.filter((q) => q.damageTaken.some((e) => e.abilityId === 31539 && Math.abs(e.timestamp - c.timestamp) < 3000)).map((q) => J.label(q.name));
    console.log(`Pull ${p.n} ${mmss(c.timestamp)} target ${c.target ? J.label(c.target) : '-'} at (${c.x},${c.y}) facing ${c.facing} hit ${hit.join('/') || '-'}`);
  }
}
