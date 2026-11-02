// TOP P2 (omega-mf.ts, Party Synergy): where glitch partners stood at the Fire, in the eye's frame.
//   node tools/ffxiv/top/omega-mf-geom.js clean <code> [pulls]      per mode (M/R): clean players' |lateral| and along
//     (yalms from the center, relative to read.lineAxis; along sign flips with the axis, so it's folded: |along|)
//   node tools/ffxiv/top/omega-mf-geom.js pairs <code> [pulls] [--all]   per pull, each glitch pair that holds the
//     vuln at the Fire (--all: every pair): job*(lat,along) signed by the first partner's side (* = holds vuln), gap.
// Jobs, never names. Read-only.
const { load, parseArgs, mmss, requireTsFromRoot } = require('./../kit.js');
const a = parseArgs(process.argv.slice(2));
const [cmd, code] = a.pos;
if (!['clean', 'pairs'].includes(cmd) || !code) { console.log('usage: omega-mf-geom.js <clean|pairs> <code> [pulls] [--all]'); process.exit(1); }
const mf = requireTsFromRoot('lib/mechanics/ffxiv/top/omega-mf.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const VULN = 1003366;
const holds = (p, t) => { let on = false; for (const e of p.debuffs) if (e.abilityId === VULN && e.timestamp <= t) on = e.debuffStatus !== 'removed'; return on; };
for (const p of ps) {
  const read = mf.readSynergy(p.players, p.deaths, p.casts, p.headMarkers ?? []);
  const u = read && (read.lineAxis || read.axis);
  if (!read || !u) continue;
  const lat = (q) => (u.x * (q.y - 10000) - u.y * (q.x - 10000)) / 100;
  const al = (q) => (u.x * (q.x - 10000) + u.y * (q.y - 10000)) / 100;
  const mode = read.remote ? 'R' : 'M';
  if (cmd === 'clean') {
    const out = [...read.clean].map((n) => read.firePos.get(n)).filter(Boolean).map((q) => `${Math.abs(lat(q)).toFixed(1)},${Math.abs(al(q)).toFixed(1)}`);
    if (out.length) console.log(`${mode} Pull ${p.n} ${out.join(' ')}`);
  } else {
    const by = new Map(p.players.map((x) => [x.name, x]));
    for (const [n1, n2] of read.pairs) {
      const A = by.get(n1), B = by.get(n2), qa = read.firePos.get(n1), qb = read.firePos.get(n2);
      if (!A || !B || !qa || !qb) continue;
      const held = holds(A, read.fireT) || holds(B, read.fireT);
      if (!held && !a.flags.has('--all')) continue;
      const side = Math.sign(lat(qa)) || 1;
      // The pair's two spots by its symbol (clean players, 16 reports): X/T pairs |along| 15, S/O pairs ~4.5-5. Mid: both
      // at |lat| 11.5, same along. Remote: S/O horizontal (|lat| 18.4, same along); X/T diagonal (|lat| 11.5, opposite).
      const sym = read.symbol.get(n1);
      const g = sym === 'X' || sym === 'T' ? 15 : read.remote ? 5 : 4.5;
      const l = read.remote && !(sym === 'X' || sym === 'T') ? 18.4 : 11.5;
      const diag = read.remote && (sym === 'X' || sym === 'T');
      const opts = [1, -1].map((e) => [[l, e * g], [-l, diag ? -e * g : e * g]]);
      const d = (q, s) => Math.hypot(lat(q) - s[0], al(q) - s[1]);
      const best = opts.flatMap(([s1, s2]) => [[d(qa, s1), d(qb, s2)], [d(qa, s2), d(qb, s1)]]).sort((x, y) => x[0] + x[1] - y[0] - y[1])[0];
      const f = (q, n, pl, dv) => `${J.label(n)}${holds(pl, read.fireT) ? '*' : ''}(${(lat(q) * side).toFixed(1)},${(al(q) * side).toFixed(1)}) dev ${dv.toFixed(1)}`;
      console.log(`Pull ${p.n} ${mmss(read.fireT)} ${mode}${sym} ${f(qa, n1, A, best[0])} ${f(qb, n2, B, best[1])} gap ${(Math.hypot(qa.x - qb.x, qa.y - qb.y) / 100).toFixed(1)}`);
    }
  }
}
