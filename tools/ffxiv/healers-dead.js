// FFXIV ffxiv-healers-dead (lib/mechanics/ffxiv/common.ts) audit: per pull, the first instant both healers count
// as dead under the rule (fatal hit = death event - 2s, back = first action >2s later), whether either healer was
// holding a pending Raise (status 1000148, applied before that instant) and when the first healer came back
// (Weakness 1000043 / Brink 1000044). Every boss in every sampledata/ff report unless codes are given.
//   node tools/ffxiv/healers-dead.js [code ...] [--boss "<name>"]
// One line per pull with a both-dead instant: "<code4> <boss> Pull N MM:SS both dead (WHM,SGE) pendingRaise=WHM
// firstBack MM:SS (+X.Xs) pullEnd MM:SS". Pulls with a Red Mage / Summoner or a kill are skipped, as the rule does.
const fs = require('fs');
const path = require('path');
const { pulls, mmss } = require('../../.claude/skills/build-module/tools/probe-pulls.js');
const { jobLabels } = require('../../.claude/skills/refine-module/tools/job-labels.js');
const argv = process.argv.slice(2);
const bi = argv.indexOf('--boss');
const onlyBoss = bi >= 0 ? argv[bi + 1] : null;
const root = path.resolve(__dirname, '../../sampledata/ff');
const codes = argv.filter((a, i) => !a.startsWith('--') && i !== bi + 1);
for (const code of codes.length ? codes : fs.readdirSync(root)) {
  const dir = path.join(root, code);
  if (!fs.existsSync(path.join(dir, 'meta.json'))) continue;
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const bosses = [...new Set(fs.readdirSync(dir).map((f) => f.match(/^(.*)_Pull\d+/)?.[1]).filter(Boolean))];
  for (const fileBoss of bosses) {
    const boss = meta.fights.find((f) => f.name.replace(/[^\w\s-]/g, '') === fileBoss || f.name === fileBoss)?.name ?? fileBoss;
    if (onlyBoss && boss !== onlyBoss) continue;
    const all = [...pulls({ game: 'ff', reports: { X: code }, boss })];
    if (!all.length) continue;
    const J = jobLabels(all, 'ff');
    for (const p of all) {
      const healers = p.players.filter((x) => x.role === 'Healer');
      if (healers.length < 2 || p.players.some((x) => /red ?mage|summoner/i.test(x.specName))) continue;
      const fight = meta.fights.filter((f) => f.name === boss)[p.n - 1];
      if (fight?.kill) continue;
      const raw = [...(p.raw.playerBuffs?.data ?? []), ...(p.raw.debuffs?.data ?? [])];
      const wins = healers.map((h) => {
        const own = p.deaths.filter((d) => d.player === h.name).sort((a, b) => a.timestamp - b.timestamp);
        return own.map((d, i) => {
          const next = own[i + 1]?.timestamp ?? Infinity;
          const back = [...h.damageTaken, ...h.casts].map((e) => e.timestamp).filter((x) => x > d.timestamp + 2000 && x < next).sort((a, b) => a - b)[0];
          const weak = raw.filter((e) => e.targetID === h.actorId && (e.abilityGameID === 1000043 || e.abilityGameID === 1000044) && /apply/.test(e.type) && e.timestamp > d.timestamp - 2000 && e.timestamp < next).map((e) => e.timestamp).sort((a, b) => a - b)[0];
          return { h, start: d.timestamp - 2000, end: back ?? next - 2000, weak };
        });
      });
      const dead = (i, t) => wins[i].find((w) => t >= w.start && t < w.end);
      const t = wins.flat().map((w) => w.start).sort((a, b) => a - b).find((x) => healers.every((_, i) => dead(i, x)));
      if (t === undefined) continue;
      const pending = healers.filter((h) => {
        const ev = raw.filter((e) => e.targetID === h.actorId && e.abilityGameID === 1000148 && e.timestamp <= t).sort((a, b) => a.timestamp - b.timestamp);
        return ev.length && /apply/.test(ev[ev.length - 1].type) && ev[ev.length - 1].timestamp > dead(healers.indexOf(h), t).start;
      }).map((h) => J.label(h.name));
      const backs = healers.map((_, i) => dead(i, t)).map((w) => w.weak ?? (w.end < Infinity ? w.end : undefined)).filter((x) => x !== undefined);
      const fb = backs.length ? Math.min(...backs) : undefined;
      // Both healers raised again after t (a Weakness / Brink on each, and alive 10s after the later one).
      const rev = healers.map((h, i) => dead(i, t).weak);
      const both = rev.every((x) => x !== undefined) && Math.max(...rev) + 10000 < p.dur ? mmss(Math.max(...rev)) : 'no';
      console.log(`${code.slice(0, 4)} ${boss} Pull ${p.n} ${mmss(t)} both dead (${healers.map((h) => J.label(h.name)).join(',')}) pendingRaise=${pending.join(',') || '-'} firstBack ${fb !== undefined ? `${mmss(fb)} (+${((fb - t) / 1000).toFixed(1)}s)` : 'never'} bothBack ${both} pullEnd ${mmss(p.dur)}`);
    }
  }
}
