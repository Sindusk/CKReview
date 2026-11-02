// TOP P2 (omega-mf.ts, Limitless Synergy): Beyond Defense hits and Bladedance cone geometry. Jobs, never names.
//   node tools/ffxiv/top/omega-mf-limitless.js bd <code> [pulls]
//   node tools/ffxiv/top/omega-mf-limitless.js blade <code> [pulls]
// bd: per pull with a Beyond Defense (jump damage 31528): time, each player hit as JOB[T]@r (T = tank, r = yalms from
//   the center at the hit) amount, and deaths within 4s after.
// blade: per pull, each Bladedance cone (32629 by source and instance, first cast): victims JOB[T]@r (r = yalms from
//   the center), the cone's source (caster) distance from center, and the angle (deg) between the caster->tank line
//   and the caster->center line (small = the cone sweeps the middle), plus deaths within 4s.
const { load, parseArgs, mmss, requireTsFromRoot } = require('./../kit.js');
const a = parseArgs(process.argv.slice(2));
const [cmd, code] = a.pos;
if (!['bd', 'blade'].includes(cmd) || !code) { console.log('usage: omega-mf-limitless.js <bd|blade> <code> [pulls]'); process.exit(1); }
const pp = requireTsFromRoot('lib/mechanics/player-position.ts');
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const TANKS = new Set(['WAR', 'DRK', 'PLD', 'GNB']);
const BD = 31528, BLADE = 32629;
const pos = (q, t) => pp.interpolatePlayerPosition(q, t, { windowMs: 2000, maxSpanMs: 3000 });
const r = (q) => (q ? (Math.hypot(q.x - 10000, q.y - 10000) / 100).toFixed(1) : '-');
for (const p of ps) {
  const id = cmd === 'bd' ? BD : BLADE;
  const hits = p.players.flatMap((q) => q.damageTaken.filter((e) => e.abilityId === id).map((e) => ({ q, e })));
  if (!hits.length) continue;
  const lab = (q) => `${J.label(q.name)}${TANKS.has(J.label(q.name)) ? 'T' : ''}`;
  const deathsAfter = (t) => p.deaths.filter((d) => d.timestamp >= t && d.timestamp <= t + 4000).map((d) => `${J.label(d.player)}@${((d.timestamp - t) / 1000).toFixed(1)}`).join(',');
  if (cmd === 'bd') {
    const t0 = Math.min(...hits.map((h) => h.e.timestamp));
    const fmt = hits.filter((h) => h.e.timestamp - t0 < 2000).map((h) => `${lab(h.q)}@${r(pos(h.q, h.e.timestamp))} ${(((h.e.unmitigatedAmount ?? h.e.amount) || 0) / 1000) | 0}k`);
    console.log(`Pull ${p.n} ${mmss(t0)} ${fmt.join(' ')} died ${deathsAfter(t0) || '-'}`);
  } else {
    const by = new Map();
    for (const h of hits) { const k = `${h.e.source}#${h.e.sourceInstance}`; by.set(k, [...(by.get(k) ?? []), h]); }
    for (const [k, hs] of by) {
      const t0 = Math.min(...hs.map((h) => h.e.timestamp));
      const cast = p.casts.filter((c) => c.sourceInstance === hs[0].e.sourceInstance && c.actorName === hs[0].e.source && Math.abs(c.timestamp - t0) < 4000 && c.x !== undefined)[0];
      const tank = hs.map((h) => h.q).find((q) => TANKS.has(J.label(q.name)));
      let ang = '-', cd = '-';
      if (cast && tank) {
        const tp = pos(tank, t0);
        if (tp) {
          const v1 = [tp.x - cast.x, tp.y - cast.y], v2 = [10000 - cast.x, 10000 - cast.y];
          ang = (Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))) * 180 / Math.PI).toFixed(0);
          cd = (Math.hypot(...v2) / 100).toFixed(1);
        }
      }
      console.log(`Pull ${p.n} ${mmss(t0)} cone ${k.slice(0, 12)} src r${cd} ang ${ang} : ${hs.map((h) => `${lab(h.q)}@${r(pos(h.q, h.e.timestamp))}`).join(' ')} died ${deathsAfter(t0) || '-'}`);
    }
  }
}
