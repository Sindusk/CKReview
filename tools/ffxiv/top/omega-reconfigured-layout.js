// TOP P3 (omega-reconfiguredd.ts, Oversampled Wave Cannon): where each job stands at the monitor snapshot.
//   node tools/ffxiv/top/omega-reconfigured-layout.js <code> [pulls] [--pos]
// Per pull with a cannon volley and all eight alive: CLEAN (everyone hit once, no shared circle) or DIRTY, the
// monitor holders (job + R/L by Loading 1003452/1003453) and boss side (31595 R / 31596 L). With --pos each job's
// (x,y) yalms from the arena centre (+x east, +y south) at the first cannon hit minus 1s, with 'M' on holders.
// Jobs, never names. Read-only.
const { load, parseArgs, ivs, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [code] = a.pos;
if (!code) { console.log('usage: omega-reconfigured-layout.js <code> [pulls] [--pos]'); process.exit(1); }
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const pos = (p, t) => pp.interpolatePlayerPosition(p, t, { windowMs: 2000, maxSpanMs: 3000 });
for (const pl of ps) {
  const boss = pl.casts.find((c) => c.abilityId === 31595 || c.abilityId === 31596);
  if (!boss) continue;
  const shots = pl.casts.filter((c) => c.abilityId === 31597 && Math.abs(c.timestamp - boss.timestamp) <= 3000);
  const t = shots[0]?.timestamp ?? boss.timestamp;
  const hits = pl.players.map((p) => ({ p, h: p.damageTaken.filter((e) => e.abilityId === 31597 && Math.abs(e.timestamp - t) <= 2500 && e.healthBefore !== 0) }));
  const clean = hits.every((x) => new Set(x.h.map((e) => e.sourceInstance)).size === 1);
  const byShot = new Map();
  for (const x of hits) for (const e of x.h) byShot.set(e.sourceInstance, (byShot.get(e.sourceInstance) || 0) + 1);
  const shared = [...byShot.values()].some((n) => n >= 2);
  const mons = pl.players.map((p) => ({ p, s: ivs(p, 1003452).some((i) => i.start <= t && i.end >= t - 500) ? 'R' : ivs(p, 1003453).some((i) => i.start <= t && i.end >= t - 500) ? 'L' : '' })).filter((x) => x.s);
  let line = `Pull ${pl.n} ${clean && !shared ? 'CLEAN' : 'DIRTY'} boss ${boss.abilityId === 31595 ? 'R' : 'L'} mon ${mons.map((m) => J.label(m.p.name) + m.s).join(',')}`;
  if (a.flags && a.flags.pos || process.argv.includes('--pos')) {
    line += ' | ' + pl.players.map((p) => { const q = pos(p, t - 1000); return q ? `${J.label(p.name)}${mons.some((m) => m.p === p) ? 'M' : ''}(${(q.x / 100 - 100).toFixed(0)},${(q.y / 100 - 100).toFixed(0)})` : `${J.label(p.name)}-`; }).join(' ');
  }
  if (process.argv.includes('--tankdnc')) {
    // Non-holder tank minus non-holder DNC, in yalms of y (north = negative), at the snapshot -1s; clean pulls: always < 0.
    const nm = pl.players.filter((p) => !mons.some((m) => m.p === p));
    const dnc = nm.find((p) => p.className === 'Dancer');
    const yy = (p) => { const q = pos(p, t - 1000); return q ? q.y / 100 - 100 : NaN; };
    const r = dnc ? nm.filter((p) => p.role === 'Tank').map((p) => `${J.label(p.name)}-DNC dy ${(yy(p) - yy(dnc)).toFixed(1)}`) : [];
    if (r.length) console.log(`Pull ${pl.n} ${clean && !shared ? 'CLEAN' : 'DIRTY'} ${r.join(' ')}`);
    continue;
  }
  if (process.argv.includes('--order')) {
    // Non-holders by nearest of the five wall/centre spots (west for boss R, mirrored for L): N, NW, WN, WS, S.
    const SP = [[-1, -19], [-9, -11], [-18, -5], [-18, 5], [-1, 19]];
    const sg = boss.abilityId === 31595 ? 1 : -1;
    const non = pl.players.filter((p) => !mons.some((m) => m.p === p));
    const slot = new Map();
    for (const p of non) { const q = pos(p, t - 1000); if (!q) continue; const x = (q.x / 100 - 100) * sg, y = q.y / 100 - 100; let b = 0, bd = 1e9; SP.forEach((s, i) => { const d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; b = i; } }); slot.set(p, { b, bd }); }
    const ok = non.length === 5 && slot.size === 5 && new Set([...slot.values()].map((v) => v.b)).size === 5 && [...slot.values()].every((v) => v.bd < 5);
    line = `Pull ${pl.n} ${clean && !shared ? 'CLEAN' : 'DIRTY'} ${ok ? 'ORDER ' + [...slot].sort((x, y) => x[1].b - y[1].b).map(([p]) => J.label(p.name)).join(' ') : 'noorder'} maxd ${Math.max(0, ...[...slot.values()].map((v) => v.bd)).toFixed(1)}`;
  }
  console.log(line);
}
