// scripts/render-replay.js — renders the real replay panel
// (components/ReplayPanel.tsx) at chosen moments of a saved replay into
// one contact-sheet PNG, so an agent can look at what the replay draws
// without a dev server or a browser session. Each frame is the panel's
// first render with its clock at that moment (server-side, no effects),
// screenshotted by the installed Chrome or Edge in headless mode. Map art
// and icons load from their CDNs, so it needs the network.
//
// Usage:
//   node scripts/render-replay.js <replay.json> --at 7:25,7:31.5 [options]
//   node scripts/render-replay.js <replay.json> --from 7:20 --to 8:00 --every 2
// Options:
//   --out <file.png>   default: <scratch>/replay-<code>-<fight>.png (os.tmpdir())
//   --cols <n>         frames per row (default 4)
//   --size <px>        each frame's width and height (default 520)
//   --helpers          also draw untargetable helper actors
// Times are M:SS(.s) from the pull's start, as the user reads them.
//
// The pull's roster is built from the replay's own actors (job -> role),
// enough for icons, role colours and strategy slots.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { requireTsFromRoot, ROOT } = require('./lib/require-ts');
const PUBLIC = 'file:///' + path.join(ROOT, 'public').replace(/\\/g, '/') + '/';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && a.endsWith('.json'));
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
if (!file) { console.error('usage: node scripts/render-replay.js <replay.json> --at M:SS,... | --from M:SS --to M:SS --every S'); process.exit(1); }

const parseTime = (s) => { const [m, sec] = s.includes(':') ? s.split(':') : ['0', s]; return Math.round((Number(m) * 60 + Number(sec)) * 1000); };
const fmt = (ms) => { const s = ms / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

const data = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
let times = [];
if (opt('at')) times = opt('at').split(',').map(parseTime);
else if (opt('from') && opt('to')) {
  const step = Number(opt('every', '2')) * 1000;
  for (let t = parseTime(opt('from')); t <= parseTime(opt('to')); t += step) times.push(t);
} else { console.error('give --at or --from/--to'); process.exit(1); }
const cols = Number(opt('cols', '4')), size = Number(opt('size', '520'));
const out = path.resolve(opt('out', path.join(os.tmpdir(), `replay-${data.reportCode}-${data.fightId}.png`)));

const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Panel = requireTsFromRoot('components/ReplayPanel.tsx').default;
const { FF_JOB_BY_NAME } = requireTsFromRoot('lib/ffl-job-data.ts');

const wow = data.game === 'wow';
const players = data.actors.filter((a) => a.kind === 'player').map((a, i) => ({
  name: a.name, className: a.job ?? '', specId: 0, specName: '', role: wow ? 'DPS' : (FF_JOB_BY_NAME[a.job]?.role ?? 'DPS'),
  actorId: a.actorId, id: a.actorId, index: i,
  damageTaken: [], damageDone: [], healingDone: [], casts: [], buffs: [], debuffs: [], events: [],
}));
const pull = {
  id: 1, pullNumber: data.fightId, name: '', startTime: 0, endTime: data.durationMs / 1000, result: 'Wipe',
  fightDuration: data.durationMs / 1000, deathEvents: [], players, errors: [],
  game: wow ? 'wow' : 'ffxiv', reportCode: data.reportCode, logSource: wow ? 'wcl' : 'ffl', fightId: data.fightId,
};

// Helper actors are a layer toggle; the first render shows its default.
if (args.includes('--helpers')) for (const a of data.actors) if (a.kind === 'enemy') a.targetable = true;

const frames = times.map((t) => {
  const svg = renderToStaticMarkup(React.createElement(Panel, { pull, data, loading: false, progress: null, error: null, onLoad: () => {}, startTimeMs: t }))
    // The app's own icons are root-relative (/icons/...): point them at public/.
    .replace(/href="\/(?!\/)/g, `href="${PUBLIC}`);
  return `<div class="f"><div class="t">${fmt(t)}</div><div class="p">${svg}</div></div>`;
});
const rows = Math.ceil(frames.length / cols);
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
:root { --ck-bg-deep:#101218; --ck-line:#333a46; --ck-text:#e8e6df; --ck-text-2:#a9adb8; }
body { margin:0; background:#0b0c10; color:#e8e6df; font:13px system-ui, sans-serif; }
.g { display:grid; grid-template-columns:repeat(${cols}, ${size}px); gap:6px; padding:6px; }
.f { width:${size}px; height:${size + 60}px; position:relative; background:#14161c; overflow:hidden; }
.t { position:absolute; right:8px; top:6px; z-index:2; font-weight:800; font-size:16px; background:#000a; padding:1px 6px; border-radius:4px; }
.p { width:100%; height:100%; }
.p > div { height:100% !important; }
button, select, input, .ck-btn { font:12px system-ui; }
</style></head><body><div class="g">${frames.join('')}</div></body></html>`;

const htmlPath = out.replace(/\.png$/, '.html');
fs.writeFileSync(htmlPath, html);
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const browser = browsers.find((b) => fs.existsSync(b));
if (!browser) { console.error('no Chrome or Edge found; the HTML is at', htmlPath); process.exit(1); }
const W = cols * (size + 6) + 6, H = rows * (size + 66) + 6;
execFileSync(browser, [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', `--user-data-dir=${path.join(os.tmpdir(), `render-replay-${process.pid}`)}`,
  `--window-size=${W},${H}`, '--virtual-time-budget=8000', `--screenshot=${out}`, 'file:///' + htmlPath.replace(/\\/g, '/'),
], { stdio: 'ignore', timeout: 90000 });
console.log(`${frames.length} frames -> ${out}`);
