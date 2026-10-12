// Lists one player's casts of named actions, and what they cast inside each
// window of a status. Reads scripts/dump-player-events.js output on stdin.
//
//   node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>" \
//     | node .claude/skills/damage-analysis/tools/casts.js "Action A" "Action B" [--win "<Status>"]
//
// Read-only.

const lines = require('fs').readFileSync(0, 'utf8').split('\n');
const toS = (s) => { const [m, x] = s.split(':'); return Number(m) * 60 + Number(x); };
const clock = (s) => { const r = Math.round(s * 10) / 10; return `${Math.floor(r / 60)}:${(r % 60).toFixed(1).padStart(4, '0')}`; };
const ev = [];
for (const l of lines) {
  let m = l.match(/^(\d+:\d+\.\d+) CAST (.+?) (\d+) ?(.*)$/);
  if (m) { ev.push({ t: toS(m[1]), kind: 'cast', name: m[2] }); continue; }
  m = l.match(/^(\d+:\d+\.\d+)\s+buff (\w+) (.+?) (\d+)/);
  if (m) ev.push({ t: toS(m[1]), kind: m[2], name: m[3] });
}
const args = process.argv.slice(2);
const wi = args.indexOf('--win');
for (const n of wi >= 0 ? args.slice(0, wi) : args) {
  const c = ev.filter((e) => e.kind === 'cast' && e.name === n).map((e) => clock(e.t));
  console.log(`${n} ×${c.length}: ${c.join(' ')}`);
}
if (wi >= 0) {
  const st = args[wi + 1];
  let open;
  for (const e of ev) {
    if (e.name !== st) continue;
    // A removal with no application before it was applied before the pull.
    if (e.kind === 'removed') {
      const from = open ?? 0;
      const inside = ev.filter((x) => x.kind === 'cast' && x.t >= from && x.t <= e.t).map((x) => x.name);
      console.log(`${st} ${clock(from)}-${clock(e.t)}${open === undefined ? ' (pre-pull)' : ''}: ${inside.join(', ')}`);
      open = undefined;
    } else if (e.kind === 'applied' && open === undefined) open = e.t;
  }
}
