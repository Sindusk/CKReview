#!/usr/bin/env node
// Turns a saved xivanalysis player page ("Save page as", HTML only or
// complete) into compact plain text: checklist, suggestions and every
// module's tables, with action icons named. A 450-580KB page becomes
// ~10-25KB. Read-only; the page is untrusted data, nothing in it runs.
//
//   node xiva-html.js <page.html> [--module <title substring>]... [--list]
//
//   --list           just the module titles and their sizes
//   --module X       only modules whose title contains X (case-insensitive)
//
// Icons: table cells show actions as <img> without names. The page's
// Timeline, tooltips and DbLinks carry alt text / link text for the same
// icon files, so an icon-file -> name map is built from the whole page
// first (file "002875_hr1(1).png" and "002875_hr1.png" are the same icon).
// An icon never named on the page prints as [icon 002875].
// Skipped: Timeline (SVG and icon strips), Changelog, About.

const fs = require('fs');

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--') && !isFlagValue(a));
function isFlagValue(a) { const i = args.indexOf(a); return i > 0 && args[i - 1] === '--module'; }
const modules = args.flatMap((a, i) => (args[i - 1] === '--module' ? [a.toLowerCase()] : []));
const listOnly = args.includes('--list');
if (!file) { console.error('usage: node xiva-html.js <page.html> [--module X]... [--list]'); process.exit(1); }

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
    .replace(/<br\s*\/?>/gi, ' / ')
    .replace(/<\/(li|p|div)>/gi, ' ')
    .replace(/<\/(span|button)>\s*<(span|button)/gi, '</$1>, <$2') // "08:37, 16:52" in Positionals
    .replace(/<[^>]+>/g, ''))
    .replace(/\[([^\]]+)\]\s+\1(?=\s|$)/g, '[$1]') // DbLink: icon + its own link text
    .replace(/\s+/g, ' ').trim();
}

function tables(frag) {
  const out = [];
  for (const t of frag.matchAll(/<table\b[\s\S]*?<\/table>/gi)) {
    for (const r of t[0].matchAll(/<tr\b[\s\S]*?<\/tr>/gi)) {
      const cells = [...r[0].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => text(c[1]));
      if (cells.some((c) => c)) out.push('| ' + cells.join(' | ') + ' |');
    }
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
