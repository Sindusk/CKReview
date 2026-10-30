// FFXIV raise timing: per death, when the Weakness / Brink of Death debuff lands vs the player's first cast or real hit after it.
//   node tools/ffxiv/raise-timing.js <code> "<boss fight name>" [pulls] [--early] [--limit N]
// One line per death: "Pull N JOB died MM:SS weak MM:SS action MM:SS (weak is X.Xs earlier)". --early: only deaths
// where the debuff precedes the first action by >0.5s (the raise-detection question). Default --limit 40.
// Death windows end at the same player's next death. Jobs, never names. Read-only.

const { load, parseArgs, mmss } = require('./kit.js');
const a = parseArgs(process.argv.slice(2));
const [code, boss] = a.pos;
if (!code || !boss) { console.log('usage: raise-timing.js <code> "<boss>" [pulls] [--early] [--limit N]'); process.exit(1); }
const limit = Number.isFinite(a.limit) ? a.limit : 40;
const { ps, J } = load(code, boss, a.pulls);
const body = (e) => e.healthBefore === 0 || (e.healthAfter === 0 && !((e.amount ?? 0) > 0));
const lines = [];
for (const pl of ps) {
  for (const p of pl.players) {
    const own = pl.deaths.filter((d) => d.player === p.name).sort((x, y) => x.timestamp - y.timestamp);
    own.forEach((d, i) => {
      const next = own[i + 1]?.timestamp ?? Infinity;
      const inWin = (x) => x > d.timestamp && x < next;
      const act = [...p.damageTaken.filter((e) => !body(e)), ...p.casts].map((e) => e.timestamp).filter((x) => x > d.timestamp + 2000 && x < next).sort((x, y) => x - y)[0];
      const weak = p.debuffs.filter((e) => (e.abilityId === 1000043 || e.abilityId === 1000044) && e.debuffStatus === 'applied').map((e) => e.timestamp).filter(inWin).sort((x, y) => x - y)[0];
      const early = weak !== undefined && (act === undefined || act - weak > 500);
      if (a.flags.has('--early') && !early) return;
      lines.push(`Pull ${pl.n} ${J.label(p.name)} died ${mmss(d.timestamp)} weak ${weak !== undefined ? mmss(weak) : '-'} action ${act !== undefined ? mmss(act) : 'never'}${early ? ` (weak ${act !== undefined ? ((act - weak) / 1000).toFixed(1) + 's earlier' : 'only signal'})` : ''}`);
    });
  }
}
console.log(lines.slice(0, limit).join('\n') || 'no deaths');
if (lines.length > limit) console.log(`... ${lines.length - limit} more (--limit)`);
