// TOP (Omega) VOD-question probes: P2 Fire spots, P1 Program Loop Blaster trace. Jobs, never names.
//   node tools/ffxiv/top/top-probes.js fire-spots <code> [pulls] [--summary]
//   node tools/ffxiv/top/top-probes.js blaster-trace <code> [pulls]
// (more TOP probes: omega-probes.js, omega-mf-probes.js, omega-reconfigured-probes.js beside this)
//
// [pulls]: the app's pull numbers, e.g. 15,18,30-33 (default: every pull).
//
// fire-spots: Party Synergy's Fire spreads in the eye's frame, as
// synergy-order.ts reads them. First the report's learned Synergy order and
// the learned Fire spots (key M/R = Mid/Remote + rank from the eye; lat =
// yalms off the eye's line toward the row's side, al = along it, eye end
// positive). Then per pull, per player: symbol, expected row by the order
// (0 early / 1 late), lat, al, spot (yalms from their learned spot),
// geom (slotDeviations: from the geometric slot, the glitch narrowing's
// input), pair (yalms to the glitch partner), clean (one Fire, their own,
// no Vulnerability Up). --summary: only the clean players' spot distances
// (median, 90th percentile, max with pull and job), for threshold work.
//
// blaster-trace: Program Loop per round, interleaved in time: Blaster
// tether takes (tether 89, source = the taker), each Blaster (31498) cast
// by instance with its target and every player its instance hit, and
// deaths. Header: the In Line numbers. Round r's holders are In Line
// ((r+1)%4)+1 (omega.ts). A round lists what happened after the previous
// round's Blasters (+1.5s) up to its own. "target ?" = the cast lost its
// target (it hit several).
//
// Run from the repo root. Read-only, works on fetched sampledata only.

const path = require('path');
const SK = path.resolve(__dirname, '../../../.claude/skills');
const { pulls, mmss, requireTsFromRoot } = require(path.join(SK, 'build-module/tools/probe-pulls.js'));
const { jobLabels } = require(path.join(SK, 'refine-module/tools/job-labels.js'));

const BOSS = 'The Omega Protocol';
const [cmd, code, pullArg] = process.argv.slice(2);
const summary = process.argv.includes('--summary');
if (!cmd || !code || !['fire-spots', 'blaster-trace'].includes(cmd)) {
  console.log('usage: top-probes.js <fire-spots|blaster-trace> <code> [pulls] [--summary]');
  process.exit(1);
}
function parsePulls(s) {
  if (!s || s.startsWith('--')) return null;
  const out = new Set();
  for (const part of s.split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let n = a; n <= (b || a); n++) out.add(n);
  }
  return out;
}
const want = parsePulls(pullArg);
const all = [...pulls({ game: 'ff', reports: { X: code }, boss: BOSS })];
if (!all.length) { console.log(`no ${BOSS} pulls in sampledata/ff/${code}`); process.exit(1); }
const J = jobLabels(all, 'ff');
const y = (cy) => (cy / 100).toFixed(1);
const chosen = all.filter((p) => !want || want.has(p.n));

if (cmd === 'fire-spots') {
  const mf = requireTsFromRoot('lib/mechanics/ffxiv/top/omega-mf.ts');
  const so = requireTsFromRoot('lib/mechanics/ffxiv/top/synergy-order.ts');
  const pc = requireTsFromRoot('lib/mechanics/ffxiv/top/pantokrator-conga.ts');
  const like = all.map((p) => ({ n: p.n, players: p.players, deathEvents: p.deaths, enemyCasts: p.casts, headMarkers: p.headMarkers }));
  // Learned exactly as the app learns them (lib/cross-pull-passes.ts).
  const order = so.learnSynergyOrder(like, pc.learnPantokratorConga(like));
  if (!order) { console.log('no Party Synergy order learned for this report'); process.exit(0); }
  const keyLabel = (k) => (order.byName ? J.label(k) : J.sub(String(k)));
  const abbr = requireTsFromRoot('lib/ffl-job-data.ts').getFFJobAbbr;
  console.log(`order: ${order.orders[0].map((k) => (order.byName ? J.label(k) : abbr(k))).join(' ')}` +
    `  (${order.orders.length} best order(s), fit ${order.fits}/${order.pairs} clean pairs)`);
  if (order.slots) {
    console.log('learned spots (lat, al in yalms): ' + [...order.slots].sort().map(([k, s]) => `${k} (${y(s.lat)}, ${y(s.al)})`).join('  '));
  } else console.log('learned spots: none (too few clean players)');
  const cleanDevs = [];
  for (const p of like) {
    if (want && !want.has(p.n)) continue;
    const read = mf.readSynergy(p.players, p.deathEvents, p.enemyCasts, p.headMarkers ?? []);
    if (!read) continue;
    const exp = so.expectedRows(read, p.players, order);
    const frame = so.eyeFrame(read, exp);
    const geom = so.slotDeviations(read, (n) => (exp.has(n) ? exp.get(n) === 0 : undefined));
    const spotDev = (n) => {
      const s = frame && order.slots && frame.names.includes(n) ? order.slots.get(so.slotKey(read, frame.rank(n))) : undefined;
      if (!s) return undefined;
      const q = frame.pt(n);
      return Math.hypot(q.lat - s.lat, q.al - s.al);
    };
    if (summary) {
      for (const n of read.firePos.keys()) if (read.clean.has(n) && spotDev(n) !== undefined) cleanDevs.push([spotDev(n), p.n, J.label(n), read.remote]);
      continue;
    }
    console.log(`== Pull ${p.n} ${read.remote ? 'Remote' : 'Mid'} Glitch, Fire ${mmss(read.fireT)}` +
      `${frame ? '' : ' (no eye frame: lat/al are raw on the row axis)'}  vuln at Fire: ${[...read.vulnAtFire].map(J.label).join(', ') || '-'}`);
    const u = read.axis;
    const partnerDist = (n) => {
      const m = mf.partnerOf(read, n);
      const a = read.firePos.get(n), b = m && read.firePos.get(m);
      return a && b ? y(Math.hypot(a.x - b.x, a.y - b.y)) : '-';
    };
    const rows = [...read.firePos.keys()].map((n) => {
      let lat, al;
      if (frame && frame.names.includes(n)) ({ lat, al } = frame.pt(n));
      else if (u) { const q = read.firePos.get(n); lat = u.x * (q.y - 10000) - u.y * (q.x - 10000); al = u.x * (q.x - 10000) + u.y * (q.y - 10000); }
      return { n, lat, al, rank: frame && frame.names.includes(n) ? frame.rank(n) : 9 };
    }).sort((a, b) => (exp.get(a.n) ?? 9) - (exp.get(b.n) ?? 9) || a.rank - b.rank);
    for (const r of rows) {
      const d = spotDev(r.n), g = geom?.get(r.n);
      console.log(`  ${J.label(r.n).padEnd(5)} ${read.symbol.get(r.n) ?? '?'} row ${exp.get(r.n) ?? '?'}` +
        `  lat ${r.lat === undefined ? '-' : y(r.lat).padStart(6)}  al ${r.al === undefined ? '-' : y(r.al).padStart(6)}` +
        `  spot ${d === undefined ? '-' : y(d).padStart(5)}  geom ${g === undefined ? '-' : y(g).padStart(5)}` +
        `  pair ${partnerDist(r.n).padStart(5)}${read.clean.has(r.n) ? '  clean' : ''}`);
    }
  }
  if (summary) {
    cleanDevs.sort((a, b) => a[0] - b[0]);
    if (!cleanDevs.length) { console.log('no clean players with a learned spot'); process.exit(0); }
    const at = (q) => cleanDevs[Math.min(cleanDevs.length - 1, Math.floor(cleanDevs.length * q))][0];
    console.log(`clean players' distance from their learned spot: n ${cleanDevs.length}, median ${y(at(0.5))}y, p90 ${y(at(0.9))}y`);
    console.log('  largest: ' + cleanDevs.slice(-6).reverse().map(([d, n, j, rem]) => `${y(d)}y Pull ${n} ${j} (${rem ? 'Remote' : 'Mid'})`).join(' | '));
  }
}

if (cmd === 'blaster-trace') {
  const om = requireTsFromRoot('lib/mechanics/ffxiv/top/omega.ts');
  const BLASTER = 31498, TETHER = 89;
  for (const p of chosen) {
    const loop = p.casts.find((c) => c.abilityId === 31491);
    if (!loop) continue;
    const num = om.readLoopNumbers(p.players, p.casts) ?? new Map();
    const byNum = [1, 2, 3, 4].map((k) => `${k}: ${[...num].filter(([, v]) => v === k).map(([n]) => J.label(n)).join(' ') || '-'}`).join(' | ');
    console.log(`== Pull ${p.n}  Program Loop ${mmss(loop.timestamp)}  In Line ${byNum}`);
    let prev = loop.timestamp;
    for (const rd of om.loopRounds(p.casts, Infinity)) {
      const h = ((rd.r + 1) % 4) + 1;
      const until = rd.t + 1500;
      const ev = [];
      for (const t of p.tethers ?? []) {
        if (t.tetherId === TETHER && t.timestamp > prev && t.timestamp <= until) ev.push([t.timestamp, `take    ${J.label(t.source)}${J.map.has(t.target) ? ` (from ${J.label(t.target)})` : ''}`]);
      }
      for (const c of rd.casts.filter((x) => x.abilityId === BLASTER)) {
        const hit = p.players.filter((q) => q.damageTaken.some((e) => e.abilityId === BLASTER && e.sourceInstance === c.sourceInstance && Math.abs(e.timestamp - c.timestamp) <= 1500));
        ev.push([c.timestamp, `Blaster #${c.sourceInstance} target ${J.label(c.target) ?? '?'} hit ${hit.map((q) => J.label(q.name)).join(', ') || 'nobody'}`]);
      }
      for (const d of p.deaths) if (d.timestamp > prev && d.timestamp <= until) ev.push([d.timestamp, `death   ${J.label(d.player)}`]);
      console.log(`  Round ${rd.r} (${mmss(rd.t)}), holders In Line ${h}: ${[...num].filter(([, v]) => v === h).map(([n]) => J.label(n)).join(' ')}`);
      for (const [t, s] of ev.sort((a, b) => a[0] - b[0])) console.log(`    ${mmss(t).padStart(6)}  ${s}`);
      prev = until;
    }
  }
}
