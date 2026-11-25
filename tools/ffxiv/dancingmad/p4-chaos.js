// Dancing Mad P4 (kefka-says.ts): Chaos's Inferno / Tsunami real/fake (status 1002056 parity on Chaos), the
// shape each resolves as (Inferno real / Tsunami fake = circles "Move"; Inferno fake / Tsunami real = donut "Stay"),
// when its Stray Flames / Stray Spray (47906-47909) went off, and each P4 death relative to them. For the P4
// first-death cutoff (was a donut still pending at the death?). Also shows whether the raid reached P5.
//   node tools/ffxiv/dancingmad/p4-chaos.js <code> [pulls]
// One line per pull: "Pull N Inferno(real)=circle@13:48 Tsunami(fake)=circle@14:10 | deaths: 13:52 RPR Death Bomb
// [before: Inferno; pending: Tsunami] | P5 yes". Pulls that never reach P4 are skipped. Jobs, never names.
const { load, parseArgs, mmss } = require('../kit.js');
const { pos, pulls } = parseArgs(process.argv.slice(2));
const { ps, J } = load(pos[0], 'Dancing Mad', pulls);
const actors = require(require('path').resolve(__dirname, '../../../sampledata/ff', pos[0], 'meta.json')).masterData?.actors ?? [];
const SHAPE = { Inferno: { real: 'circle', fake: 'donut' }, Tsunami: { real: 'donut', fake: 'circle' } };
const RES = { Inferno: [47906, 47907], Tsunami: [47908, 47909] };
for (const p of ps) {
  const castsOf = (id) => p.casts.filter((c) => c.abilityId === id).map((c) => c.timestamp).sort((a, b) => a - b);
  const p4 = castsOf(47764).find((t) => t > 540000);
  if (p4 === undefined) continue;
  // Chaos actors by master-data name (the 1002056 target is a different "Chaos" actor than the caster).
  const chaosIds = new Set(actors.filter((a) => /chaos/i.test(a.name ?? '')).map((a) => a.id));
  const sig = (p.raw.enemyDebuffs?.data ?? [])
    .filter((e) => e.abilityGameID === 1002056 && e.type === 'applydebuff' && chaosIds.has(e.targetID) && e.timestamp >= p4 - 2000)
    .sort((a, b) => a.timestamp - b.timestamp);
  const order = [['Inferno', castsOf(47904).find((t) => t > p4)], ['Tsunami', castsOf(47905).find((t) => t > p4)]]
    .filter(([, t]) => t !== undefined).sort((a, b) => a[1] - b[1]);
  const mech = order.map(([n, t], i) => {
    const s = sig[i]?.extraInfo;
    const st = s === undefined ? 'unknown' : s % 2 === 0 ? 'real' : 'fake';
    const res = p.casts.filter((c) => RES[n].includes(c.abilityId) && c.timestamp > t).map((c) => c.timestamp).sort((a, b) => a - b);
    return { n, st, shape: SHAPE[n][st] ?? '?', at: res[0], ids: [...new Set(p.casts.filter((c) => RES[n].includes(c.abilityId) && c.timestamp > t).map((c) => c.abilityId))] };
  });
  const p5 = castsOf(47936)[0];
  const ds = p.deaths.filter((d) => d.timestamp >= p4 && (p5 === undefined || d.timestamp < p5)).sort((a, b) => a.timestamp - b.timestamp);
  const ab = (id) => p.players.flatMap((x) => x.damageTaken).find((e) => e.abilityId === id)?.abilityName ?? (id ? String(id) : 'no killing blow');
  const dl = ds.map((d) => {
    const t = d.timestamp - (d.killingAbilityGameId ? 2000 : 0);
    const pend = mech.filter((m) => m.at === undefined || m.at > t).map((m) => m.n + '/' + m.shape);
    return `${mmss(t)} ${J.label(d.player)} ${ab(d.killingAbilityGameId)} [pending: ${pend.join(',') || 'none'}]`;
  });
  console.log(`Pull ${p.n} ${mech.map((m) => `${m.n}(${m.st})=${m.shape}@${m.at !== undefined ? mmss(m.at) : '-'} ids ${m.ids.join('/')}`).join(' ')} | P4 deaths: ${dl.join('; ') || 'none'} | P5 ${p5 !== undefined ? 'yes' : 'no'}`);
}
