// TOP P3 (omega-reconfiguredd.ts, Hello World stacks): where the stack owner and its Remote partner stood.
//   node tools/ffxiv/top/omega-reconfigured-stackpos.js <code> [pulls]
// Per Critical Synchronization Bug resolution (cycles 1-3): MM:SS, owners (Critical Synchronization bug holders at
// the cast) as JOB with position (yalms from the centre, +x E, +y S) at resolution+0.6s, each owner's Remote partner
// with position, the owner-partner gap, and OK when the partner was among the owner's hit group, else MISS.
// Jobs, never names. Read-only.
const { load, parseArgs, ivs, mmss, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [code] = a.pos;
if (!code) { console.log('usage: omega-reconfigured-stackpos.js <code> [pulls]'); process.exit(1); }
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const STACK_HIT = 31574, STACK_BUG = 1003524, REMOTE = 1003530;
const held = (p, id, t) => ivs(p, id).some((iv) => iv.start <= t && iv.end > t);
const teth = (p, t) => ivs(p, REMOTE).some((iv) => iv.start >= t - 4500 && iv.start <= t + 500);
const pos = (p, t) => pp.interpolatePlayerPosition(p, t, { windowMs: 2000, maxSpanMs: 3000 });
const xy = (q) => (q ? `(${(q.x / 100 - 100).toFixed(1)},${(q.y / 100 - 100).toFixed(1)})` : '(-)');
const d = (x, y) => (x && y ? (Math.hypot(x.x - y.x, x.y - y.y) / 100).toFixed(1) : '?');
for (const pl of ps) {
  const res = [];
  for (const c of pl.casts.filter((c) => c.abilityId === STACK_HIT).sort((m, n) => m.timestamp - n.timestamp)) if (!res.some((r) => c.timestamp - r < 2000)) res.push(c.timestamp);
  res.forEach((t, i) => {
    const owners = pl.players.filter((p) => held(p, STACK_BUG, t - 1000));
    const bits = [];
    const inAny = new Set();
    for (const o of owners) {
      const hits = pl.players.filter((p) => p !== o && p.damageTaken.some((e) => e.abilityId === STACK_HIT && Math.abs(e.timestamp - t) <= 1500 && o.damageTaken.some((x) => x.abilityId === STACK_HIT && x.sourceInstance === e.sourceInstance && x.source === e.source)));
      hits.forEach((h) => inAny.add(h));
      inAny.add(o);
      bits.push(`${J.label(o.name)}${xy(pos(o, t + 600))} +[${hits.map((h) => `${J.label(h.name)}${xy(pos(h, t + 600))} ${d(pos(o, t + 600), pos(h, t + 600))}y${teth(h, t) ? ' R' : ''}`).join(', ')}]`);
    }
    for (const p of pl.players) if (teth(p, t) && !inAny.has(p)) bits.push(`NOSTACK R ${J.label(p.name)}${xy(pos(p, t + 600))} to ${owners.map((o) => `${J.label(o.name)} ${d(pos(o, t + 600), pos(p, t + 600))}y`).join('/')}`);
    console.log(`Pull ${pl.n} ${mmss(t)} c${i + 1}: ${bits.join(' | ')}`);
  });
}
