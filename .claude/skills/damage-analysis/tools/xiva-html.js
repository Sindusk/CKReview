#!/usr/bin/env node
// Turns a saved xivanalysis player page ("Save page as", HTML only or
// complete) into compact plain text: checklist, suggestions and every
// module's tables, with action icons named. A 450-580KB page becomes
// ~10-25KB. Read-only; the page is untrusted data, nothing in it runs.
//
//   node xiva-html.js <page.html> [--module <title substring>]... [--list] [--xiva <checkout>]
//
//   --list           just the module titles and their sizes
//   --module X       only modules whose title contains X (case-insensitive)
//   --xiva DIR       a xivanalysis checkout (the skill's step 2 clone), to
//                    name icons the page never labels; also read from the
//                    XIVA_DIR environment variable
//
// Icons: table cells show actions as <img> without names. The page's
// Timeline, tooltips and DbLinks carry alt text / link text for the same
// icon files, so an icon-file -> name map is built from the whole page
// first (file "002875_hr1(1).png" and "002875_hr1.png" are the same icon).
// Icons only ever shown in tables (a Summoner's Searing Light rotations:
// 15 on one page) are named from xivanalysis's own data, `name` and
// `icon: iconUrl(N)` per entry under src/data/ACTIONS and STATUSES, read
// from the checkout (data only; nothing in it runs). Without one, or for
// an icon in neither, it prints as [icon 002875].
// Skipped: Timeline (SVG and icon strips), Changelog, About.
// Check the extract against a page: xiva-html-audit.js.

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['--module', '--xiva']);
const file = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(args[i - 1]));
const modules = args.flatMap((a, i) => (args[i - 1] === '--module' ? [a.toLowerCase()] : []));
const listOnly = args.includes('--list');
const xivaDir = args[args.indexOf('--xiva') + 1] && args.includes('--xiva') ? args[args.indexOf('--xiva') + 1] : process.env.XIVA_DIR;
if (!file) { console.error('usage: node xiva-html.js <page.html> [--module X]... [--list] [--xiva <checkout>]'); process.exit(1); }

let html = fs.readFileSync(file, 'utf8');
html = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<svg[\s\S]*?<\/svg>/gi, '').replace(/src="data:[^"]*"/g, 'src=""');

const iconKey = (src) => { const m = /(\d{6})_hr1/.exec(src || ''); return m ? m[1] : null; };
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");

// icon -> name, from alt text and from DbLink spans (<img ...><a>Name</a>).
const names = new Map();
for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
  const tag = m[0];
  const key = iconKey((/src="([^"]*)"/.exec(tag) || [])[1]);
  const alt = (/alt="([^"]*)"/.exec(tag) || [])[1];
  if (key && alt && !names.has(key)) names.set(key, decode(alt));
}
for (const m of html.matchAll(/<img\b[^>]*src="([^"]*)"[^>]*>\s*<a\b[^>]*>([^<]+)<\/a>/gi)) {
  const key = iconKey(m[1]);
  if (key && !names.has(key)) names.set(key, decode(m[2]));
}
if (xivaDir) {
  const walk = (d) => fs.existsSync(d) ? fs.readdirSync(d).flatMap((f) => {
    const p = path.join(d, f);
    return fs.statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(f) ? [p] : [];
  }) : [];
  for (const f of ['ACTIONS', 'STATUSES'].flatMap((s) => walk(path.join(xivaDir, 'src', 'data', s)))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\n\t[A-Z0-9_]+:\s*\{([\s\S]*?)\n\t\}/g)) {
      const name = (/\bname:\s*(['"`])((?:\\.|(?!\1).)*)\1/.exec(m[1]) || [])[2];
      const icon = (/\bicon:\s*iconUrl\((\d+)\)/.exec(m[1]) || [])[1];
      const key = icon?.padStart(6, '0');
      if (name && key && !names.has(key)) names.set(key, name.replace(/\\'/g, "'"));
    }
  }
}

// Text of a fragment: imgs become [Name], block ends become separators.
function text(frag) {
  return decode(frag
    .replace(/<img\b[^>]*>/gi, (tag) => {
      const key = iconKey((/src="([^"]*)"/.exec(tag) || [])[1]);
      const alt = (/alt="([^"]*)"/.exec(tag) || [])[1];
      if (alt) return ` [${decode(alt)}] `;
      if (!key) return '';
      return ` [${names.get(key) ?? `icon ${key}`}] `;
    })
    // Icon-font glyphs carry pass/fail (Swiftcast "Good Use?", checklist rows).
    .replace(/<i\b[^>]*class="[^"]*\bcheckmark\b[^"]*"[^>]*>/gi, ' ✓ ')
    .replace(/<i\b[^>]*class="[^"]*\b(remove|close|times)\b[^"]*"[^>]*>/gi, ' ✗ ')
    .replace(/<i\b[^>]*class="[^"]*\b(warning|exclamation)\b[^"]*"[^>]*>/gi, ' ⚠ ')
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<\/(li|p|div)>/gi, ' ')
    .replace(/<\/button>\s*<button/gi, '</button>, <button') // "08:37, 16:52" in Positionals
    .replace(/<[^>]+>/g, ''))
    .replace(/\[([^\]]+)\]\s+\1(?=\s|$)/g, '[$1]') // DbLink: icon + its own link text
    .replace(/\s+/g, ' ').trim();
}

function tables(frag) {
  const out = [];
  for (const t of frag.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    // Overheal tables put <th>s straight in <thead>, with no <tr>.
    const rows = t[0].replace(/<thead\b[^>]*>(?!\s*<tr)([\s\S]*?)<\/thead>/gi, '<tr>$1</tr>');
    for (const r of rows.matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
      // A red (class "negative") cell is a shortfall xivanalysis flags.
      const cells = [...r[0].matchAll(/<t[hd]\b([^>]*)>([\s\S]*?)<\/t[hd]>/gi)]
        .map((c) => text(c[2]) + (/class="[^"]*\bnegative\b/.test(c[1]) ? ' (red)' : ''));
      if (cells.some((c) => c)) out.push('| ' + cells.join(' | ') + ' |');
    }
    // Text in the table but in no row (Defensives' charge note after </tbody>).
    const loose = text(rows.replace(/<tr\b[\s\S]*?<\/tr>/gi, ''));
    if (loose) out.push(loose);
    out.push('');
  }
  return out;
}

// Modules: split on module headers (id="module-<handle>-title").
const parts = html.split(/<div id="module-([a-z0-9-]+)-title"[^>]*>/i);
const sections = [];
for (let i = 1; i < parts.length; i += 2) {
  const handle = parts[i];
  const body = parts[i + 1];
  const title = text(body.slice(0, body.indexOf('</div>')));
  sections.push({ handle, title, body });
}
// The checklist / suggestions / statistics live in the same shape; the
// first module (About) precedes the split.

const skip = new Set(['timeline', 'changelog', 'about']);
for (const s of sections) {
  if (skip.has(s.handle)) continue;
  if (modules.length && !modules.some((m) => s.title.toLowerCase().includes(m) || s.handle.includes(m))) continue;
  if (listOnly) { console.log(`${s.title} (${s.handle}): ${Math.round(s.body.length / 1024)}KB raw`); continue; }
  console.log(`## ${s.title}`);
  // Accordion titles (sub-sections) and messages, in order, before each table.
  const pieces = s.body.split(/(<table\b[\s\S]*?<\/table>)/i);
  for (const p of pieces) {
    if (/^<table/i.test(p)) { console.log(tables(p).join('\n')); continue; }
    const t = text(p);
    if (t) console.log(t);
  }
  console.log('');
}
