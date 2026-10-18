// scripts/replay-inventory.js — what a stretch of a saved replay contains,
// for building a fight's replay spec (lib/replay/fight-spec.ts): every
// enemy ability (game-data shape, casts, hits, casters and their sample
// counts, first times, whether a spec already overrides it), tethers,
// head markers, player statuses and enemy actors. Read-only.
//
// Usage:
//   node scripts/replay-inventory.js <replay.json> [--from M:SS] [--to M:SS]
//   node scripts/replay-inventory.js <replay.json> --start-ability 40265 [--end-ability 40300]
// Times print as M:SS.s from the pull's start (what the user reads), and
// as +s from --from / the start ability.

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot } = require('./lib/require-ts');

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.json'));
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const parseTime = (s) => { const [m, sec] = s.includes(':') ? s.split(':') : ['0', s]; return Math.round((Number(m) * 60 + Number(sec)) * 1000); };
const clock = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

const d = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const casts = d.enemyCasts ?? [], hits = d.enemyHits ?? [];
let t0 = opt('from') ? parseTime(opt('from')) : 0, t1 = opt('to') ? parseTime(opt('to')) : d.durationMs;
if (opt('start-ability')) t0 = casts.find((c) => c[4] === Number(opt('start-ability')))?.[0] ?? t0;
if (opt('end-ability')) t1 = (casts.find((c) => c[4] === Number(opt('end-ability')) && c[0] > t0 && c[3] === 0)?.[0] ?? t1) + 3000;
const rel = (ms) => `${clock(ms)} (+${((ms - t0) / 1000).toFixed(1)})`;
const actor = new Map(d.actors.map((a) => [a.key, a]));

const { fightReplaysFor, overridesFor } = requireTsFromRoot('lib/replay/fights.ts');
const specs = fightReplaysFor(d), over = overridesFor(d);
console.log(`${d.reportCode} fight ${d.fightId}: ${clock(t0)} to ${clock(t1)}; specs that apply: ${specs.map((f) => f.key).join(', ') || 'none'}`);
console.log('id | name | game data (castType range width omen) | begincasts / resolves / hits / with target | cast ms | casters#samples | first resolves | override');
const by = {};
const blank = () => ({ begin: 0, res: 0, hits: 0, casters: new Set(), times: [], first: Infinity, durs: new Set(), targets: 0 });
for (const c of casts) if (c[0] >= t0 && c[0] <= t1 && c[4] !== undefined) {
  const e = by[c[4]] ??= blank();
  e.first = Math.min(e.first, c[0]);
  if (c[3] > 0) { e.begin++; e.durs.add(c[3]); } else { e.res++; e.times.push(c[0]); }
  if (c[5] && c[5] !== c[1]) e.targets++;
  const a = actor.get(c[1]);
  e.casters.add(`${a?.name ?? c[1]}#${a?.samples.length ?? 0}`);
}
for (const h of hits) if (h[0] >= t0 && h[0] <= t1) { const e = by[h[1]] ??= blank(); e.hits++; e.first = Math.min(e.first, h[0]); }
const names = { ...(d.abilityNames ?? {}) };
for (const c of casts) if (c[4] !== undefined && !names[c[4]]) names[c[4]] = c[2];
for (const [id, e] of Object.entries(by).sort((a, b) => a[1].first - b[1].first)) {
  const g = d.actionGeometry?.[id];
  console.log([id, names[id] ?? '?', g ? `ct${g.castType} r${g.range} w${g.width} ${g.omen || '-'}` : 'no game data',
    `${e.begin}/${e.res}/${e.hits}/${e.targets}`, [...e.durs].join(',') || '-', [...e.casters].slice(0, 3).join(', '),
    e.times.slice(0, 5).map(clock).join(' ') || `hit ${clock(e.first)}`, over[id] ? JSON.stringify(over[id]) : ''].join(' | '));
}
console.log('\nTETHERS (time, source -> target, id)');
for (const t of d.tethers ?? []) if (t[0] >= t0 && t[0] <= t1) console.log(rel(t[0]), actor.get(t[1])?.name, '->', actor.get(t[2])?.name, t[3]);
console.log('\nHEAD MARKERS (id: time player, ...)');
const hm = {};
for (const m of d.headMarkers ?? []) if (m[0] >= t0 && m[0] <= t1) (hm[m[2]] ??= []).push(`${clock(m[0])} ${actor.get(m[1])?.name}`);
for (const [k, v] of Object.entries(hm)) console.log(k, v.join(', '));
console.log('\nPLAYER STATUSES (id name: count, first, durations)');
const au = {};
for (const a of d.playerAuras ?? []) if (a[0] >= t0 && a[0] <= t1) { const e = au[a[3]] ??= { n: 0, first: a[0], durs: new Set() }; e.n++; e.durs.add(Math.round((a[1] - a[0]) / 1000)); }
for (const [k, v] of Object.entries(au)) console.log(k, d.auraInfo?.[k]?.name ?? '?', `x${v.n}`, clock(v.first), [...v.durs].join('/') + 's');
if (d.enemyAuras?.length) {
  console.log('\nWOW DEBUFFS FETCHED (id: applications)');
  const wa = {};
  for (const a of d.enemyAuras) if (a[0] >= t0 && a[0] <= t1 && a[3]) wa[a[1]] = (wa[a[1]] ?? 0) + 1;
  for (const [k, v] of Object.entries(wa)) console.log(k, v);
}
console.log('\nENEMY ACTORS (key name: samples in range, first sample time and spot in yalms/yards)');
for (const a of d.actors) if (a.kind !== 'player') {
  const s = a.samples.filter((x) => x[0] >= t0 && x[0] <= t1);
  if (s.length) console.log(a.key, a.name, a.targetable ? 'targetable' : 'helper', `samples ${s.length}`, clock(s[0][0]), (s[0][1] / 100).toFixed(1), (s[0][2] / 100).toFixed(1), a.hitbox ? `hitbox ${(a.hitbox / 100).toFixed(1)}` : '');
}
