// TOP P2 (omega-mf.ts, Party Synergy): Vulnerability Up at the Fire cast, and who moved before it.
//   node tools/ffxiv/top/omega-mf-probes.js fire-vuln <code> [pulls] [--all] [--limit N]
//   node tools/ffxiv/top/omega-mf-probes.js movers <code> [pulls] [--limit N]
// fire-vuln: per pull with a Synergy read, the Fire time, Fire cast offsets (ms from the read's fireT) and M/R;
// then each Fire-hit player holding Vulnerability Up at the cast (* = status on at fireT, + = the module's
// vulnAtFire), hit as unmitigated/taken, D = overkill, S/s = hit carries the status, n = hits, [events: a/r + ms
// from fireT within 4s]. --all lists every Fire-hit player. Default --limit 40 pulls.
// movers: per glitch pair where either partner holds the vuln at the cast: pair distance at -1s / 0, and each
// partner's yalms moved in -3..-2s, -2..-1s, -1..0s, last 0.5s, plus vuln removal offsets (ms). Default --limit 30.
// Jobs, never names. Read-only.

const { load, parseArgs, mmss, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [cmd, code] = a.pos;
if (!['fire-vuln', 'movers'].includes(cmd) || !code) { console.log('usage: omega-mf-probes.js <fire-vuln|movers> <code> [pulls] [--all] [--limit N]'); process.exit(1); }
const mf = requireTsFromRoot('lib/mechanics/ffxiv/top/omega-mf.ts');
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const VULN = 1003366, FIRE = 31535;
const holds = (p, t) => { let on = false; for (const e of p.debuffs) if (e.abilityId === VULN && e.timestamp <= t) on = e.debuffStatus !== 'removed'; return on; };
let shown = 0;
const limit = Number.isFinite(a.limit) ? a.limit : cmd === 'movers' ? 30 : 40;
const cap = () => { if (shown++ >= limit) { console.log('... more (--limit)'); return true; } return false; };
for (const p of ps) {
  const read = mf.readSynergy(p.players, p.deaths, p.casts, p.headMarkers ?? []);
  if (!read) continue;
  const t = read.fireT;
  if (cmd === 'fire-vuln') {
    const rows = [];
    for (const pl of p.players) {
      const hits = pl.damageTaken.filter((e) => e.abilityId === FIRE && Math.abs(e.timestamp - t) < 1500);
      if (!hits.length) continue;
      const on = holds(pl, t), plus = read.vulnAtFire.has(pl.name);
      if (!a.flags.has('--all') && !on && !plus) continue;
      const ev = pl.debuffs.filter((e) => e.abilityId === VULN && Math.abs(e.timestamp - t) < 4000).map((e) => `${e.debuffStatus[0]}${e.timestamp - t}`);
      const h = hits[0];
      const st = h.statusIds ? (h.statusIds.some((s) => s % 1000000 === 3366) ? 'S' : 's') : '';
      rows.push(`${J.label(pl.name)}${on ? '*' : ''}${plus ? '+' : ''} ${((h.unmitigatedAmount ?? h.amount ?? 0) / 1000) | 0}k/${((h.amount ?? 0) / 1000) | 0}k${h.overkill ? 'D' : ''}${st} n${hits.length} [${ev.join(' ')}]`);
    }
    if (cap()) break;
    const offs = p.casts.filter((c) => c.abilityId === FIRE && Math.abs(c.timestamp - t) < 1500).map((c) => c.timestamp - t);
    console.log(`Pull ${p.n} fire ${mmss(t)} ${read.remote ? 'R' : 'M'} casts ${offs.length} (${offs.length ? Math.min(...offs) + '..' + Math.max(...offs) : '-'}ms)  ${rows.join(' ; ') || '-'}`);
  } else {
    const pos = (q, tt) => pp.interpolatePlayerPosition(q, tt, { windowMs: 2000, maxSpanMs: 3000 });
    const d = (x, y) => (x && y ? (Math.hypot(x.x - y.x, x.y - y.y) / 100).toFixed(1) : '-');
    const rem = (q) => { const r = q.debuffs.filter((e) => e.abilityId === VULN && e.debuffStatus === 'removed' && e.timestamp > t - 6000 && e.timestamp < t + 1500); return r.length ? r.map((e) => e.timestamp - t).join('/') : '-'; };
    const by = new Map(p.players.map((x) => [x.name, x]));
    for (const [n1, n2] of read.pairs) {
      const A = by.get(n1), B = by.get(n2);
      if (!A || !B || (!holds(A, t) && !holds(B, t))) continue;
      if (cap()) process.exit(0);
      const fmt = (q) => `${J.label(q.name)}${holds(q, t) ? '*' : ''} mv ${d(pos(q, t - 3000), pos(q, t - 2000))}/${d(pos(q, t - 2000), pos(q, t - 1000))}/${d(pos(q, t - 1000), pos(q, t))}/${d(pos(q, t - 500), pos(q, t))} rem ${rem(q)}`;
      console.log(`Pull ${p.n} ${mmss(t)} ${read.remote ? 'R' : 'M'} pair ${d(pos(A, t - 1000), pos(B, t - 1000))}->${d(pos(A, t), pos(B, t))} | ${fmt(A)} | ${fmt(B)}`);
    }
  }
}
