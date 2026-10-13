#!/usr/bin/env node
// Audits xiva-html.js against a saved page: every visible text node and
// every icon outside the skipped modules (Timeline, Changelog, About) must
// show up in the extract. Prints what didn't, so a page whose layout the
// extractor doesn't know is caught before a claim is missed.
//
//   node xiva-html-audit.js <page.html>...     (XIVA_DIR=<checkout> to name icons)
//
// Read-only. Text split by an inline link can show as "missing" fragments
// that are in the extract joined to the link's [Name]; read the list.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const norm = (s) => decode(s).replace(/\s+/g, ' ').trim();

for (const file of process.argv.slice(2)) {
  const extract = execFileSync('node', [path.join(__dirname, 'xiva-html.js'), file], { encoding: 'utf8', maxBuffer: 1 << 26 });
  const flat = extract.replace(/\s+/g, ' ');
  let html = fs.readFileSync(file, 'utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<svg[\s\S]*?<\/svg>/gi, '');
  // The page body only (sidebar / header carry navigation, not analysis).
  const start = html.indexOf('Analyse-module_resultsContainer');
  if (start > 0) html = html.slice(start);
  // Drop the skipped modules: from their header to the next module header.
  for (const h of ['timeline', 'changelog']) {
    const i = html.indexOf(`id="module-${h}-title"`);
    if (i < 0) continue;
    const j = html.indexOf('id="module-', i + 10);
    html = html.slice(0, i) + (j > 0 ? html.slice(j) : '');
  }
  const about = html.indexOf('About-module_container');
  const firstModule = html.indexOf('id="module-');
  if (about >= 0 && firstModule > about) html = html.slice(0, about) + html.slice(firstModule);

  const missingText = new Set();
  for (const m of html.matchAll(/>([^<>]+)</g)) {
    const t = norm(m[1]);
    if (t.length < 2 || /^[\s\W]*$/.test(t)) continue;
    if (!flat.includes(t)) missingText.add(t);
  }
  const missingIcons = new Set();
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    const alt = (/alt="([^"]+)"/.exec(m[0]) || [])[1];
    const title = (/title="([^"]+)"/.exec(m[0]) || [])[1];
    for (const n of [alt, title]) if (n && !flat.includes(norm(n))) missingIcons.add(norm(n));
  }
  const titles = new Set();
  for (const m of html.matchAll(/\b(?:title|data-tooltip|aria-label)="([^"]+)"/g)) {
    const t = norm(m[1]);
    if (!flat.includes(t)) titles.add(t);
  }
  console.log(`== ${path.basename(file)}: extract ${extract.length} chars`);
  console.log(`  text nodes missing (${missingText.size}): ${[...missingText].slice(0, 40).join(' | ')}`);
  console.log(`  icon names missing (${missingIcons.size}): ${[...missingIcons].slice(0, 20).join(' | ')}`);
  console.log(`  tooltip/title attributes missing (${titles.size}): ${[...titles].slice(0, 20).join(' | ')}`);
  const unnamed = [...new Set(extract.match(/\[icon \d+\]/g) || [])];
  console.log(`  unnamed icons in extract (${unnamed.length}): ${unnamed.join(' ')}`);
}
