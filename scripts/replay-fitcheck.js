// scripts/replay-fitcheck.js — checks the replay's AoE shapes against the
// log without a VOD: for every shape that lands in the range, who stood
// inside it when it landed (players' interpolated positions, 0.5y hitbox)
// against who the log says that ability hit. A wrong angle, origin, aim or
// size shows up as hit-not-drawn / drawn-not-hit. Read-only.
//
// Usage: node scripts/replay-fitcheck.js <replay.json> [--from M:SS] [--to M:SS] [--verbose]
//
// Expect some noise: positions are sampled 1-2 times a second (FFXIV), a
// player can be hit at the edge on a stale sample, and towers, stacks and
// knockbacks are meant to be stood in. Look at abilities that miss again
// and again, not at single misses. --verbose lists every mismatch.

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot } = require('./lib/require-ts');

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.json'));
const opt = (k) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const parseTime = (s) => { const [m, sec] = s.includes(':') ? s.split(':') : ['0', s]; return Math.round((Number(m) * 60 + Number(sec)) * 1000); };
const clock = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
const verbose = args.includes('--verbose');

const d = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
const from = opt('from') ? parseTime(opt('from')) : 0, to = opt('to') ? parseTime(opt('to')) : d.durationMs;
const fr = requireTsFromRoot('lib/replay/ffxiv-replay.ts');
const shapes = d.game === 'wow' ? requireTsFromRoot('lib/replay/wow-shapes.ts').buildWowAoeShapes(d) : requireTsFromRoot('lib/replay/action-shapes.ts').buildAoeShapes(d);
const players = d.actors.filter((a) => a.kind === 'player');
const names = d.abilityNames ?? {};
const R = 50;

function inside(s, x, y) {
  const dx = x - s.x, dy = y - s.y, dist = Math.hypot(dx, dy);
  const brg = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
  const off = Math.abs(((brg - s.bearing) % 360 + 540) % 360 - 180);
  if (s.kind === 'circle') return dist <= s.range + R;
  if (s.kind === 'donut') return dist <= s.range + R && dist >= s.inner - R;
  if (s.kind === 'cone') return dist <= s.range + R && off <= s.angle / 2 + 2;
  const lanes = s.kind === 'cross' ? [0, 90] : [0];
  return lanes.some((l) => {
    const b = ((s.bearing + l) * Math.PI) / 180, ux = Math.sin(b), uy = -Math.cos(b);
    const along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
    return along >= (s.kind === 'cross' ? -s.range : 0) - R && along <= s.range + R && across <= s.width / 2 + R;
  });
}

const rows = {};
for (const s of shapes) {
  if (s.resolve < from || s.resolve > to || s.noFlash || s.style === 'puddle') continue;
  if (s.follow) continue;   // riding on a player: placed by its debuff, nothing to check
  const ids = Object.keys(names).filter((k) => names[k] === s.name).map(Number);
  const hit = new Set((d.enemyHits ?? []).filter((h) => ids.includes(h[1]) && h[0] >= s.resolve - 200 && h[0] - s.resolve <= 1500).map((h) => h[3]));
  const drawn = new Set(players.filter((p) => { const q = fr.poseAt(p, s.resolve); return q && q.hp !== 0 && inside(s, q.x, q.y); }).map((p) => p.key));
  const r = rows[s.name] ??= { kind: s.kind, style: s.style, n: 0, exact: 0, missed: 0, extra: 0, ex: [] };
  const missed = [...hit].filter((k) => !drawn.has(k)), extra = [...drawn].filter((k) => !hit.has(k));
  r.n++; r.missed += missed.length; r.extra += extra.length;
  if (!missed.length && !extra.length) r.exact++;
  else r.ex.push(`${clock(s.resolve)} hit ${hit.size} drawn ${drawn.size} at (${(s.x / 100).toFixed(1)}, ${(s.y / 100).toFixed(1)}) bearing ${Math.round(s.bearing)} range ${s.range / 100}${s.angle ? ` angle ${s.angle}` : ''}${s.width ? ` width ${s.width / 100}` : ''}${s.estimated ? ' (estimated)' : ''}`);
}
console.log(`${d.reportCode} fight ${d.fightId}, ${clock(from)} to ${clock(to)}`);
console.log('ability | shape style | shapes | exact | hit-not-drawn | drawn-not-hit');
for (const [n, r] of Object.entries(rows).sort((a, b) => (b[1].missed + b[1].extra) - (a[1].missed + a[1].extra))) {
  console.log(`${n} | ${r.kind} ${r.style} | ${r.n} | ${r.exact} | ${r.missed} | ${r.extra}`);
  for (const x of r.ex.slice(0, verbose ? Infinity : 3)) console.log('    ' + x);
}
