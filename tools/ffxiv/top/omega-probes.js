// TOP P1 (omega.ts / pantokrator-conga.ts): Program Loop tower priority and Same Tower verdicts.
//   node tools/ffxiv/top/omega-probes.js tower-prio <code> [pulls] [--limit N]
// tower-prio: first the report's learned tower priority (fits, agreement, start angles, an example order) and
// holder agreement; then per pull that has a raw "Same Tower": MM:SS, who was flagged before the Pantokrator
// learned order was applied vs after (Same Tower / Wrong Tower), who soaked which cardinal, and holders
// (job@bearing). Default --limit 25 pulls. Jobs, never names. Read-only.

const { load, parseArgs, mmss, requireTsFromRoot } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [cmd, code] = a.pos;
if (cmd !== 'tower-prio' || !code) { console.log('usage: omega-probes.js tower-prio <code> [pulls] [--limit N]'); process.exit(1); }
const limit = Number.isFinite(a.limit) ? a.limit : 25;
const om = requireTsFromRoot('lib/mechanics/ffxiv/top/omega.ts');
const cg = requireTsFromRoot('lib/mechanics/ffxiv/top/pantokrator-conga.ts');
const { ps, J } = load(code, 'The Omega Protocol', null);
const L = (n) => J.label(n);
const pl = ps.map((p) => ({ n: p.n, players: p.players, deathEvents: p.deaths, enemyCasts: p.casts, tethers: p.tethers }));
const conga = cg.learnPantokratorConga(pl);
const tw = conga?.tower, lp = conga?.loop;
let clean = 0;
for (const p of pl) for (const rd of om.readProgramLoop(p.players, p.deathEvents, p.enemyCasts) ?? []) if (rd.towerClean) clean++;
console.log(`${code} towerClean rounds ${clean}; tower prio ${tw ? `${tw.fits.length} fits ${tw.agree}/${tw.rounds} starts ${[...new Set(tw.fits.map((f) => f.start))]} ex ${tw.fits[0].order.map(L).join(' ')}` : 'none'}; holder ${lp ? `${lp.agree}/${lp.rounds}` : 'none'}`);
let n = 0;
for (const p of pl) {
  if (a.pulls && !a.pulls.has(p.n)) continue;
  const errs = om.detectOmegaErrors(p.players, p.deathEvents, p.enemyCasts, undefined, p.tethers);
  const before = errs.filter((e) => e.name === 'Same Tower');
  if (!before.length) continue;
  if (n++ >= limit) { console.log('... more (--limit)'); break; }
  const after = cg.applyPantokratorConga(errs, p.players, p.deathEvents, p.enemyCasts, conga).filter((e) => e.ruleId === 'ffxiv-top1-tower' && (e.name === 'Same Tower' || e.name === 'Wrong Tower'));
  const rd = (om.readProgramLoop(p.players, p.deathEvents, p.enemyCasts) ?? []).find((r) => Math.abs(r.t - before[0].timestamp) <= 1500);
  console.log(`  Pull ${p.n} ${mmss(before[0].timestamp)} before ${before.map((e) => L(e.player)).join('+')} after ${after.map((e) => e.name + ':' + L(e.player)).join(' ') || '-'} soaks ${rd?.soaks.map((s) => L(s.name) + '@' + s.card).join(' ') ?? '?'} holders ${rd?.holders.map((h) => L(h.name) + '@' + h.bearing.toFixed(0)).join(' ') ?? '?'}`);
}
