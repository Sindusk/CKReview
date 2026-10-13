#!/usr/bin/env node
// Checks wowa-html.js against saved WoWAnalyzer pages: lists visible text,
// icon names and title="" values inside the page's <main> that the
// extract doesn't contain. Read-only; the pages are untrusted data.
//
//   node wowa-html-audit.js <page.html>...
//
// Expected leftovers (by design, see wowa-html.js): tab names, button
// labels (Filter, Show Me!), "Click ..." hints, axis labels from the SVG
// timeline, and legend swatch text.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const files = process.argv.slice(2);
if (!files.length) { console.error('usage: node wowa-html-audit.js <page.html>...'); process.exit(1); }
const tool = path.join(__dirname, 'wowa-html.js');
const norm = (s) => s.replace(/&nbsp;|\s+/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
const squash = (s) => norm(s).replace(/\s+/g, '').toLowerCase();

for (const f of files) {
  const extract = squash(execFileSync(process.execPath, [tool, f], { encoding: 'utf8', maxBuffer: 1 << 26 }));
  let html = fs.readFileSync(f, 'utf8');
  const a = html.indexOf('<main'); const b = html.indexOf('</main>');
  html = html.slice(a < 0 ? 0 : a, b < 0 ? html.length : b)
    .replace(/<(script|style|select|canvas|nav)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, (s) => (/<title>/.test(s) ? s.replace(/<text\b[\s\S]*?<\/text>/gi, '') : ''));
  const missing = new Set();
  const check = (t, kind) => {
    const n = norm(t);
    if (!n || n.length < 2 || /^[\s\d.,:%/·-]+$/.test(n) && n.length < 4) return;
    if (!extract.includes(squash(n))) missing.add(`${kind}: ${n.slice(0, 120)}`);
  };
  for (const m of html.matchAll(/>([^<]+)</g)) check(m[1], 'text');
  for (const m of html.matchAll(/<img\b[^>]*\balt="([^"]+)"/gi)) check(m[1], 'alt');
  for (const m of html.matchAll(/\btitle="([^"]+)"/gi)) check(m[1], 'title');
  console.log(`== ${path.basename(f)}: ${missing.size} missing`);
  for (const x of missing) console.log('  ' + x);
}
