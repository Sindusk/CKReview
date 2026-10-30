// Shared helpers for the tools/ffxiv probes (not a command): load one report's pulls, parse args.
//   const { load, parseArgs, ivs, mmss } = require('<tools>/ffxiv/kit.js');
//   const { ps, J } = load(code, boss, pullSet)   // ps: pulls, J: jobLabels (J.label(name) -> job)
//   parseArgs(argv) -> { pos: [...], pulls: Set|null, limit: number, flags: Set }
// Pull lists are the app's numbers: 15,18,30-33. Read-only.

const path = require('path');
const SK = path.resolve(__dirname, '../../.claude/skills');
const { pulls, mmss, requireTsFromRoot } = require(path.join(SK, 'build-module/tools/probe-pulls.js'));
const { jobLabels } = require(path.join(SK, 'refine-module/tools/job-labels.js'));

function parsePullSet(s) {
  if (!s) return null;
  const out = new Set();
  for (const part of s.split(',')) {
    const [a, b] = part.split('-').map(Number);
    for (let n = a; n <= (b || a); n++) out.add(n);
  }
  return out;
}

function parseArgs(argv) {
  const pos = [], flags = new Set();
  let limit = Infinity;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--limit') limit = Number(argv[++i]);
    else if (argv[i].startsWith('--')) flags.add(argv[i]);
    else pos.push(argv[i]);
  }
  return { pos, flags, limit, pulls: parsePullSet(pos.find((x) => /^[\d,-]+$/.test(x) && x.length < 12)) };
}

function load(code, boss, want) {
  const all = [...pulls({ game: 'ff', reports: { X: code }, boss })];
  if (!all.length) { console.log(`no ${boss} pulls in sampledata/ff/${code}`); process.exit(1); }
  const J = jobLabels(all, 'ff');
  return { ps: all.filter((p) => !want || want.has(p.n)), J };
}

// Debuff intervals [{start,end}] for one status id on one player.
function ivs(p, id) {
  const out = [];
  let s;
  for (const e of p.debuffs.filter((e) => e.abilityId === id).sort((a, b) => a.timestamp - b.timestamp)) {
    if (e.debuffStatus === 'applied') { if (s === undefined) s = e.timestamp; }
    else if (e.debuffStatus === 'removed' && s !== undefined) { out.push({ start: s, end: e.timestamp }); s = undefined; }
  }
  if (s !== undefined) out.push({ start: s, end: Infinity });
  return out;
}

module.exports = { load, parseArgs, ivs, mmss, requireTsFromRoot };
