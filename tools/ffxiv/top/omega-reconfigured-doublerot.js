// TOP P3 (omega-reconfiguredd.ts, Hello World rots): a player holding both rot colours at once.
//   node tools/ffxiv/top/omega-reconfigured-doublerot.js <code> [pulls]
// Per overlap of Cascading (red 1003526) and Latent (blue 1003429) rot on one player: pull, MM:SS the overlap
// starts, JOB, overlap seconds, which colour was gained second and by whose contact (the player who lost
// nothing at that moment = giver is not tracked), the first cutoff-ish event after it (a Hello World penalty
// cast or a death) and the pull length. Jobs, never names. Read-only.
const { load, parseArgs, ivs, mmss } = require('../kit.js');
const a = parseArgs(process.argv.slice(2));
const [code] = a.pos;
if (!code) { console.log('usage: omega-reconfigured-doublerot.js <code> [pulls]'); process.exit(1); }
const { ps, J } = load(code, 'The Omega Protocol', a.pulls);
const RED = 1003526, BLUE = 1003429;
const PEN = { 31581: 'RedUncleansed', 31582: 'BlueUncleansed', 31585: 'RedEmpty', 31586: 'BlueEmpty', 32505: 'Patch', 31559: 'P3end' };
for (const pl of ps) {
  for (const p of pl.players) {
    const r = ivs(p, RED), b = ivs(p, BLUE);
    for (const x of r) for (const y of b) {
      const s = Math.max(x.start, y.start), e = Math.min(x.end, y.end);
      if (e <= s) continue;
      const second = x.start > y.start ? 'red' : 'blue';
      const pen = (pl.casts || []).filter((c) => PEN[c.abilityId] && c.timestamp >= s).sort((m, n) => m.timestamp - n.timestamp)[0];
      const death = (pl.deaths || []).filter((d) => d.timestamp >= s).sort((m, n) => m.timestamp - n.timestamp)[0];
      console.log(`Pull ${pl.n} ${mmss(s)} ${J.label(p.name)} both ${((Math.min(e, 1e12) - s) / 1000).toFixed(1)}s, ${second} second | next ${pen ? `${PEN[pen.abilityId]} ${mmss(pen.timestamp)}` : '-'} first death ${death ? `${J.label(death.player)} ${mmss(death.timestamp)}` : '-'} | pull ${mmss(pl.dur)}`);
    }
  }
}
