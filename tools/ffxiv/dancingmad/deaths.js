// Dancing Mad: every death with its phase, killing blow, Damage Down state, when the player came back,
// and the dead / alive-healer counts at it. For cutoff work
// (kefka-says.ts first-death cutoff, limitcut.ts dead-during-mechanic, ffxiv/common.ts healers-dead).
//   node tools/ffxiv/dancingmad/deaths.js <code> [pulls] [--p4]
// One line per death: "Pull N MM:SS P<phase> JOB killed-by (id) [DD] back MM:SS|never  dead=K heal=H".
// Phase from boss casts: P4 = Kefka Says block (first Mystery Magic 47764 after 9:00), P5 = Ultima Repeater 47936.
// back = the player's first damage taken or cast >2s after the death (the rezzedAt rule).
// dead = players down right after this death; heal = healers alive. --p4: only P4 deaths. Jobs, never names.
const { load, parseArgs, mmss, ivs } = require('../kit.js');
const { pos, pulls, flags } = parseArgs(process.argv.slice(2));
const code = pos[0];
const DD = 1002911;
const { ps, J } = load(code, 'Dancing Mad', pulls);
for (const p of ps) {
  const first = (id, after = 0) => p.casts.filter((c) => c.abilityId === id && c.timestamp > after).map((c) => c.timestamp).sort((a, b) => a - b)[0];
  const p4 = first(47764, 540000), p5 = first(47936);
  const phase = (t) => (p5 !== undefined && t >= p5 ? 5 : p4 !== undefined && t >= p4 ? 4 : '<4');
  const byName = new Map(p.players.map((x) => [x.name, x]));
  const ds = [...p.deaths].sort((a, b) => a.timestamp - b.timestamp);
  const wins = ds.map((d, i) => {
    const pl = byName.get(d.player);
    const next = ds.slice(i + 1).find((x) => x.player === d.player)?.timestamp ?? Infinity;
    const back = pl && [...pl.damageTaken, ...pl.casts].map((e) => e.timestamp).filter((x) => x > d.timestamp + 2000 && x < next).sort((a, b) => a - b)[0];
    return { d, pl, start: d.timestamp - 2000, end: back ?? next - 2000, back };
  });
  console.log(`Pull ${p.n} dur ${mmss(p.dur)} P4 ${p4 !== undefined ? mmss(p4) : '-'} P5 ${p5 !== undefined ? mmss(p5) : '-'}`);
  for (const w of wins) {
    const ph = phase(w.d.timestamp);
    if (flags.has('--p4') && ph !== 4) continue;
    const t = w.d.timestamp;
    const down = wins.filter((x) => t >= x.start && t < x.end);
    const heal = p.players.filter((x) => x.role === 'Healer' && !down.some((y) => y.d.player === x.name)).length;
    const dd = w.pl && ivs(w.pl, DD).some((iv) => iv.start <= t && iv.end >= t - 2500) ? ' [DD]' : '';
    const ab = w.d.killingAbilityGameId ? (p.players.flatMap((x) => x.damageTaken).find((e) => e.abilityId === w.d.killingAbilityGameId)?.abilityName ?? '?') : (w.d.cause || '-');
    console.log(`  ${mmss(t)} P${ph} ${J.label(w.d.player)} ${ab} (${w.d.killingAbilityGameId})${dd} back ${w.back !== undefined ? mmss(w.back) : 'never'} dead=${down.length} heal=${heal}`);
  }
}
