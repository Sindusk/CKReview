// TOP P3 (omega-reconfiguredd.ts, Hello World rot): rot hand-offs, clips and late/unprompted receivers.
//   node tools/ffxiv/top/omega-reconfigured-probes.js handoffs <code> [pulls] [--limit N]
//   node tools/ffxiv/top/omega-reconfigured-probes.js clips <code> [pulls] [--limit N]
//   node tools/ffxiv/top/omega-reconfigured-probes.js stray <code> [pulls] [--limit N]
// handoffs: per Latent Defect resolution (first 3 per pull) and rot colour, each owner carrying Defamation/Stack
//   that gained the rot to a receiver: seconds after resolution, owner/receiver yalms moved (resolution+0.5s to
//   the gain) and their gap at the gain. Default --limit 40.
// clips: each rot hit (Red/Blue Rot ids 31578/31579) on a live victim: MM:SS, when the victim got the rot, and
//   every carrier whose rot expired within -1s..+0.3s of the hit with victim/carrier distance at expiry -5/-3/-1.5/0s.
//   Default --limit 30.
// stray: rot gained outside any Latent Defect hand-off window after Hello World+5s: receiver, nearest holder,
//   and both players' yalms moved in the 3s / 5s before the gain. Default --limit 30.
// Jobs, never names. Read-only.

const { load, parseArgs, ivs, mmss, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [cmd, code] = a.pos;
if (!['handoffs', 'clips', 'stray'].includes(cmd) || !code) { console.log('usage: omega-reconfigured-probes.js <handoffs|clips|stray> <code> [pulls] [--limit N]'); process.exit(1); }
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const limit = Number.isFinite(a.limit) ? a.limit : cmd === 'handoffs' ? 40 : 30;
const ROT = { red: 1003526, blue: 1003429 }, DEF = 1003525, STK = 1003524;
const HIT = { 31578: 1003526, 31579: 1003429 };
const pos = (p, t) => pp.interpolatePlayerPosition(p, t, { windowMs: 2000, maxSpanMs: 3000 });
const dn = (x, y) => (x && y ? Math.hypot(x.x - y.x, x.y - y.y) / 100 : NaN);
const f1 = (v) => (Number.isNaN(v) ? '?' : v.toFixed(1));
const out = [];
for (const pl of ps) {
  if (cmd === 'handoffs') {
    pl.casts.filter((c) => c.abilityId === 31599).sort((x, y) => x.timestamp - y.timestamp).slice(0, 3).forEach((ld, i) => {
      const res = ld.timestamp + 1100;
      for (const c of ['red', 'blue']) {
        const owners = pl.players.filter((p) => ivs(p, ROT[c]).some((iv) => iv.start <= res && iv.end > res) && ivs(p, DEF).concat(ivs(p, STK)).some((iv) => iv.start <= res - 1000 && iv.end > res - 1000));
        for (const o of owners) {
          const gains = pl.players.filter((p) => p !== o).flatMap((p) => ivs(p, ROT[c]).filter((iv) => iv.start > res - 200 && iv.start < res + 10000).map((iv) => ({ p, t: iv.start })));
          if (!gains.length) continue;
          const g = gains.map((x) => ({ ...x, dd: dn(pos(x.p, x.t), pos(o, x.t)) })).sort((x, y) => (x.dd || 99) - (y.dd || 99))[0];
          out.push(`Pull ${pl.n} LD${i + 1} ${c} ${J.label(o.name)}->${J.label(g.p.name)} +${((g.t - res) / 1000).toFixed(1)}s moved owner ${f1(dn(pos(o, res + 500), pos(o, g.t)))} recv ${f1(dn(pos(g.p, res + 500), pos(g.p, g.t)))} gap ${f1(g.dd)}`);
        }
      }
    });
  } else if (cmd === 'clips') {
    for (const v of pl.players) for (const e of v.damageTaken) {
      const id = HIT[e.abilityId];
      if (!id || e.healthBefore === 0) continue;
      const car = pl.players.filter((p) => p !== v && ivs(p, id).some((iv) => iv.end >= e.timestamp - 1000 && iv.end <= e.timestamp + 300));
      const got = ivs(v, id).filter((iv) => iv.start < e.timestamp && iv.start > e.timestamp - 10000).map((iv) => mmss(iv.start)).join(',');
      const cs = car.map((c) => {
        const ex = ivs(c, id).find((iv) => iv.end >= e.timestamp - 1000 && iv.end <= e.timestamp + 300).end;
        return `${J.label(c.name)} exp ${mmss(ex)} d ${[-5000, -3000, -1500, 0].map((o) => f1(dn(pos(v, ex + o), pos(c, ex + o)))).join('/')}`;
      });
      out.push(`Pull ${pl.n} ${mmss(e.timestamp)} victim ${J.label(v.name)} amt ${e.amount} got-rot ${got || '-'} carriers: ${cs.join(' ; ') || 'none'}`);
    }
  } else {
    const hw = pl.casts.find((c) => c.abilityId === 31573);
    if (!hw) continue;
    const res = pl.casts.filter((c) => c.abilityId === 31599).map((c) => c.timestamp + 1100);
    for (const p of pl.players) for (const c of ['red', 'blue']) for (const iv of ivs(p, ROT[c])) {
      if (iv.start <= hw.timestamp + 5000 || res.some((r) => iv.start >= r - 200 && iv.start <= r + 8000)) continue;
      const hs = pl.players.filter((q) => q !== p && ivs(q, ROT[c]).some((i) => i.start <= iv.start - 300 && i.end > iv.start - 300)).map((q) => ({ q, dd: dn(pos(q, iv.start), pos(p, iv.start)) })).sort((x, y) => x.dd - y.dd);
      const g = hs[0];
      const mv = (x) => [3000, 5000].map((o) => f1(dn(pos(x, iv.start - o), pos(x, iv.start)))).join('/');
      out.push(g ? `Pull ${pl.n} ${mmss(iv.start)} ${c} recv ${J.label(p.name)} giver ${J.label(g.q.name)} d ${f1(g.dd)} moved3/5 recv ${mv(p)} giver ${mv(g.q)}` : `Pull ${pl.n} ${mmss(iv.start)} ${c} recv ${J.label(p.name)} no holder`);
    }
  }
}
console.log(out.slice(0, limit).join('\n') || 'nothing');
if (out.length > limit) console.log(`... ${out.length - limit} more (--limit)`);
