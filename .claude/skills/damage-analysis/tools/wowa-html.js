#!/usr/bin/env node
// Turns a saved WoWAnalyzer player page (the Overview / "Guide" tab, saved
// with "Save page as") into compact plain text: the header, every guide
// section and subsection, with spells named and numbered, grades decoded
// from colours and classes, and times recovered from bar positions. A
// 80-200KB page becomes ~5-15KB. Read-only; the page is untrusted data and
// nothing in it runs.
//
//   node wowa-html.js <page.html> [--section <title substring>]... [--list] [--brief]
//
//   --list           just the section titles and their sizes
//   --section X      only top-level sections whose title contains X
//   --brief          drop explanation prose (identical across logs)
//
// Every spec's guide is its own React layout, but they share components.
// What each prints as (surveyed on Destruction Warlock, Windwalker Monk
// and Protection Paladin pages, 2026-10-13):
// - Sections: `section.expandable` (title in `.meta .name`) → ##, nested
//   `section.subsection` (title in its <header>, often empty) → ###.
// - Spells: wowhead links → [Name #id]; the name is the link text, or the
//   icon's alt when the link is icon-only. Items → Slot{item= ench= gems=}.
//   Icons with alt text elsewhere → [Name].
// - Grades are colours, never words: --color / color: rgb() in the
//   palette below → {perfect|good|ok|bad} before the text; perf-block rows
//   (cast breakdowns) → a P/G/O/B string; the per-cast strip of coloured
//   buttons (_TimelineRect_) → the same string in cast order; glyph icons
//   (perfect-mark, ok-mark, bad-mark) → ✓ ~ ✗.
// - Times live only in layout values: cooldown bars (left/width % of the
//   fight) → cast times, time sat ready, and red "missed" stretches; the
//   spell timeline lanes (left px / --secondWidth) → cast times; buff bars
//   (--start/--end ms) → windows; the Always Be Casting gap strip (SVG
//   rects with a <title>) → the gap list.
// - title="" attributes (the APL pass/fail bar's "Correct Uses: 94") are
//   appended in parentheses.
// Not in the page (rendered on hover or click, or drawn on <canvas>):
// tooltips, per-cast detail beyond the first card, resource and damage
// graphs, the other tabs (Statistics, Timeline, Character). The page has
// no patch, build or date: take those from the report.

const fs = require('fs');

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['--section']);
const file = args.find((a, i) => !a.startsWith('--') && !VALUE_FLAGS.has(args[i - 1]));
const only = args.flatMap((a, i) => (args[i - 1] === '--section' ? [a.toLowerCase()] : []));
const listOnly = args.includes('--list');
const brief = args.includes('--brief');
if (!file) { console.error('usage: node wowa-html.js <page.html> [--section X]... [--list] [--brief]'); process.exit(1); }

const html = fs.readFileSync(file, 'utf8');

// ── HTML → tree ─────────────────────────────────────────────────────────────

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const RAW = new Set(['script', 'style', 'textarea', 'title']);

function decode(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&amp;/g, '&');
}

function parseAttrs(s) {
  const a = {};
  for (const m of s.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    a[m[1].toLowerCase()] = decode(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return a;
}

function parse(src) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<![^>]*>|<(\/?)([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+|<)/g;
  let m;
  while ((m = re.exec(src))) {
    const top = stack[stack.length - 1];
    if (m[4] !== undefined) { top.children.push({ text: decode(m[4]) }); continue; }
    if (!m[2]) continue; // comment / doctype
    const tag = m[2].toLowerCase();
    if (m[1]) {
      const i = stack.map((n) => n.tag).lastIndexOf(tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const node = { tag, attrs: parseAttrs(m[3]), children: [], parent: top };
    top.children.push(node);
    if (RAW.has(tag)) {
      const end = src.toLowerCase().indexOf(`</${tag}`, re.lastIndex);
      const body = src.slice(re.lastIndex, end < 0 ? src.length : end);
      if (tag === 'title') node.children.push({ text: decode(body) });
      re.lastIndex = end < 0 ? src.length : src.indexOf('>', end) + 1;
      continue;
    }
    if (!VOID.has(tag) && !/\/\s*$/.test(m[3])) stack.push(node);
  }
  return root;
}

const cls = (n) => n.attrs?.class ?? '';
const has = (n, c) => (typeof c === 'string' ? cls(n).split(/\s+/).includes(c) : c.test(cls(n)));
const style = (n) => n.attrs?.style ?? '';
function* walk(n) { yield n; for (const c of n.children ?? []) yield* walk(c); }
const find = (n, pred) => { for (const x of walk(n)) if (x.tag && pred(x)) return x; return undefined; };
const findAll = (n, pred) => [...walk(n)].filter((x) => x.tag && pred(x));
const rawText = (n) => [...walk(n)].filter((x) => x.text !== undefined).map((x) => x.text).join('').replace(/\s+/g, ' ').trim();
const num = (s, re) => { const m = re.exec(s); return m ? parseFloat(m[1]) : undefined; };

// ── context from the whole page ─────────────────────────────────────────────

const root = parse(html);
const titleNode = find(root, (n) => n.tag === 'title');
const pageTitle = titleNode ? rawText(titleNode) : '';
const savedFrom = (/saved from url=\(\d+\)(\S+)/.exec(html) || [])[1] ?? '';
let fightMs = num(html, /--fightDuration:\s*([\d.]+)/);
if (fightMs === undefined) {
  const d = /\((\d+):(\d\d)\)/.exec(pageTitle);
  if (d) fightMs = (+d[1] * 60 + +d[2]) * 1000;
}

const mmss = (sec, dec = 0) => {
  const neg = sec < 0; sec = Math.abs(sec);
  const m = Math.floor(sec / 60); const s = sec - m * 60;
  const ss = dec ? s.toFixed(dec).padStart(3 + dec, '0') : String(Math.floor(s)).padStart(2, '0');
  return `${neg ? '-' : ''}${m}:${ss}`;
};
const pctToSec = (p) => (fightMs !== undefined ? (p / 100) * fightMs / 1000 : undefined);

// ── grades ──────────────────────────────────────────────────────────────────

const PALETTE = {
  '#2090c0': 'perfect', 'rgb(32, 144, 192)': 'perfect',
  '#4ec04e': 'good', 'rgb(78, 192, 78)': 'good',
  '#ffc84a': 'ok', 'rgb(255, 200, 74)': 'ok',
  '#ac1f39': 'bad', 'rgb(172, 31, 57)': 'bad',
  '#c8c8c8': 'none',
};
const colorOf = (n) => {
  const s = style(n);
  const m = /--color:\s*(#[0-9a-f]{3,8}|rgb\([^)]*\))/i.exec(s) || /(?:^|;)\s*color:\s*(#[0-9a-f]{3,8}|rgb\([^)]*\))/i.exec(s);
  return m ? m[1].toLowerCase().replace(/\s+/g, ' ').replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/, 'rgb($1, $2, $3)') : undefined;
};
const gradeOf = (n) => { const c = colorOf(n); return c ? PALETTE[c] ?? c : undefined; };
const LETTER = { perfect: 'P', good: 'G', ok: 'O', bad: 'B', none: '-' };
const tally = (grades) => {
  const counts = {};
  for (const g of grades) counts[g] = (counts[g] ?? 0) + 1;
  return Object.entries(counts).map(([g, c]) => `${c} ${g}`).join(', ');
};

// ── rendering ───────────────────────────────────────────────────────────────
// render() returns text with '\n' at block boundaries; post-processing trims.

const SKIP_TAGS = new Set(['script', 'style', 'canvas', 'form', 'select', 'audio', 'noscript', 'head', 'link', 'meta', 'iframe', 'nav', 'footer', 'foreignobject', 'title']);
const SKIP_CLASS = /\b(chevron|react-toggle|toggle-control|vg-tooltip|wowhead-tooltip|_ShowMeButton_|_HelperText_|_outer_container_|_TabStrip_|_TabSelect_|_HeaderNav|_Legend_|legend-container|vega-embed)/;
const PROSE_CLASS = /(_StyledExplanation_|_Para_|\balert-info\b)/;
const INLINE_TAGS = new Set(['a', 'span', 'strong', 'b', 'i', 'em', 'small', 'dfn', 'abbr', 'code', 'sup', 'sub', 'img', 'label', 'kbd', 'mark', 'u']);
// Divs that sit side by side on the page and read as one line.
const INLINE_DIV = /(_PerfBadge|_StatCard(Value|Label|Divider)_|_MiniBox(Name|Subtext)_|\bflex-(sub|main)\b|\bbar-label\b|_ClaimCount|_CastLabel_|_HeaderPerfBadge_)/;
// Elements whose colour is a verdict worth printing.
const GRADED = /(_ColoredStrong_|_ColoredText_|_RoundedPanelWithColorBoxShadow_|_Highlight_)/;

function spellLink(n) {
  const href = n.attrs.href ?? '';
  const img = find(n, (x) => x.tag === 'img');
  const name = rawText(n) || img?.attrs.alt || '';
  const spell = /wowhead\.com\/(?:[a-z-]+\/)?spell=(\d+)/.exec(href);
  if (spell) return ` [${name} #${spell[1]}] `;
  const item = /wowhead\.com\/(?:[a-z-]+\/)?item=(\d+)/.exec(href);
  if (item) {
    const q = (k) => (new RegExp(`[?&]${k}=([^&]+)`).exec(href) || [])[1];
    const parts = [`item=${item[1]}`, q('ench') && `ench=${q('ench')}`, q('gems') && `gems=${q('gems')}`].filter(Boolean);
    return ` ${name}{${parts.join(' ')}} `;
  }
  return name ? ` [${name}] ` : '';
}

function cooldownBar(bar) {
  const win = find(bar, (x) => has(x, 'cooldown-bar-window')) ?? bar;
  const casts = [];
  const ready = [];
  const missed = [];
  const recharge = []; // unavailable segments: the cooldown as WoWAnalyzer models it (talents included)
  for (const c of win.children.filter((x) => x.tag)) {
    const left = num(style(c), /left:\s*([\d.]+)%/);
    const width = num(style(c), /width:\s*([\d.]+)%/);
    if (left === undefined) continue;
    if (has(c, 'cooldown-unavailable')) {
      if (find(c, (x) => has(x, 'cast-chip') || x.tag === 'img')) casts.push(left);
      if (left + (width ?? 0) < 99.9) recharge.push(width ?? 0); // a segment cut by the kill isn't a full recharge
    } else if (has(c, 'cooldown-available-bad')) missed.push([left, width ?? 0]);
    else if (has(c, 'cooldown-available')) ready.push(width ?? 0);
    else if (find(c, (x) => x.tag === 'img' || has(x, 'cast-chip'))) casts.push(left); // charge spells: loose markers
  }
  casts.sort((a, b) => a - b);
  const sec = (p) => pctToSec(p);
  const out = [];
  if (fightMs === undefined) {
    out.push(`casts ${casts.length}`);
  } else {
    out.push(`casts (${casts.length}): ${casts.map((p) => mmss(sec(p))).join(', ')}`);
    const readySec = ready.reduce((s, w) => s + sec(w), 0) + missed.reduce((s, [, w]) => s + sec(w), 0);
    out.push(`sat ready ${readySec.toFixed(1)}s`);
    // Several charges merge segments, so print the shortest and the most common.
    if (recharge.length) {
      const secs = recharge.map((p) => sec(p)).sort((a, b) => a - b);
      out.push(`unavailable stretches ${secs[0].toFixed(1)}s shortest, ${secs[Math.floor(secs.length / 2)].toFixed(1)}s median`);
    }
    if (missed.length) out.push(`missed (red): ${missed.map(([l, w]) => `${mmss(sec(l))}-${mmss(sec(l + w))}`).join(', ')}`);
  }
  return `\n  ${out.join('; ')}\n`;
}

function spellTimeline(n) {
  const host = [n, ...ancestors(n)].find((x) => /--secondWidth/.test(style(x)));
  const pxPerSec = host ? num(style(host), /--secondWidth:\s*([\d.]+)/) : undefined;
  const lines = [];
  for (const lane of findAll(n, (x) => has(x, 'lane'))) {
    const byName = new Map();
    for (const a of findAll(lane, (x) => x.tag === 'a' && has(x, 'cast'))) { // fight-relative
      const label = spellLink(a).trim();
      const left = num(style(a), /left:\s*([\d.]+)px/);
      if (!byName.has(label)) byName.set(label, []);
      byName.get(label).push(pxPerSec && left !== undefined ? mmss(left / pxPerSec) : '?');
    }
    for (const [label, times] of byName) lines.push(`  ${label} casts (${times.length}): ${times.join(', ')}`);
  }
  if (lines.length) return `\nTimeline:\n${lines.join('\n')}\n`;
  // A problem snippet (Blood DK "Problem Point"): one `.casts` strip whose
  // offsets are from the snippet's start, not the fight's.
  const casts = findAll(n, (x) => x.tag === 'a' && has(x, 'cast'))
    .map((a) => ({ label: (find(a, (x) => x.tag === 'img')?.attrs.alt ?? spellLink(a).trim()), left: num(style(a), /left:\s*(-?[\d.]+)px/) ?? 0 }))
    .sort((a, b) => a.left - b.left);
  if (!casts.length) return '';
  const t0 = casts[0].left;
  return `\nSnippet casts: ${casts.map((c) => `${c.label}${pxPerSec ? ` +${((c.left - t0) / pxPerSec).toFixed(1)}s` : ''}`).join(' → ')}\n`;
}

function ancestors(n) { const out = []; for (let p = n.parent; p; p = p.parent) out.push(p); return out; }

function buffBars(n) {
  const bars = findAll(n, (x) => /_BuffBar_/.test(cls(x)) && /--start/.test(style(x)));
  if (!bars.length) return '';
  bars.sort((a, b) => num(style(a), /--start:\s*([\d.]+)/) - num(style(b), /--start:\s*([\d.]+)/));
  const w = bars.map((b) => `${mmss(num(style(b), /--start:\s*([\d.]+)/) / 1000, 1)}-${mmss(num(style(b), /--end:\s*([\d.]+)/) / 1000, 1)}`);
  return `\nBuff windows (${w.length}): ${w.join(', ')}\n`;
}

// SVG: only the Always Be Casting gap strip carries data (rect <title>s).
function svg(n) {
  const rects = findAll(n, (x) => x.tag === 'rect' && x.children.some((c) => c.tag === 'title'));
  if (!rects.length) return '';
  const spans = rects.map((r) => {
    const t = rawText(r);
    const m = /(\d+):(\d+(?:\.\d+)?)\s*-\s*(\d+):(\d+(?:\.\d+)?)/.exec(t);
    return { t, len: m ? (+m[3] * 60 + +m[4]) - (+m[1] * 60 + +m[2]) : 0, color: (r.attrs.fill ?? '').toLowerCase() };
  });
  // One series per colour. On the Protection Paladin ABC strip: red = gaps
  // between casts, yellow = Stasis stretches (downtime it excuses), #222 =
  // a second track (melee swings?) — printed raw, named by colour.
  const series = new Map();
  for (const x of spans) {
    const k = PALETTE[x.color] ?? x.color;
    if (!series.has(k)) series.set(k, []);
    series.get(k).push(x);
  }
  let out = '';
  for (const [k, xs] of series) {
    const total = xs.reduce((s, x) => s + x.len, 0);
    const longest = [...xs].sort((a, b) => b.len - a.len).slice(0, 5).map((x) => `${x.t.replace(/\s+/g, '')} (${x.len.toFixed(1)}s)`);
    out += `\nGaps {${k}} (${xs.length}, total ${total.toFixed(1)}s; longest ${longest.join(', ')}): ${xs.map((x) => x.t.replace(/\s+/g, '')).join(', ')}\n`;
  }
  return out;
}

function headingLevel(n) {
  let d = 0;
  for (const a of ancestors(n)) if (a.tag === 'section' && (has(a, 'expandable') || has(a, 'subsection'))) d++;
  return d;
}

function render(n) {
  if (n.text !== undefined) return n.text.replace(/\s+/g, ' ');
  const tag = n.tag;
  if (SKIP_TAGS.has(tag)) return '';
  const c = cls(n);
  if (SKIP_CLASS.test(c)) return '';
  // --brief: drop paragraphs, keep any bars / tables inside the prose block
  // (a _Para_ can wrap a whole subsection: Protection Paladin's cooldown bars)
  if (brief && (/_Para_|\balert-info\b/.test(c) || (tag === 'p' && ancestors(n).some((a) => PROSE_CLASS.test(cls(a)))))
    && !find(n, (x) => x.tag === 'table' || x.tag === 'section' || /cooldown-bar|performance-block|_TimelineRect|spell-timeline|_StatCard|_BuffBar/.test(cls(x)))) return '';
  if (tag === 'svg') return svg(n);
  if (tag === 'button' && !/_TimelineRect_/.test(c)) return ''; // Filter, Show Me!, Prev/Next

  if (tag === 'section' && has(n, 'expandable')) {
    const meta = n.children.find((x) => x.tag && has(x, 'meta'));
    const name = meta ? rawText(find(meta, (x) => has(x, 'name')) ?? meta) : '';
    const body = n.children.filter((x) => x !== meta).map(render).join('');
    return `\n\n${'#'.repeat(Math.min(headingLevel(n) + 2, 6))} ${name}\n${body}\n`;
  }
  if (tag === 'section' && has(n, 'subsection')) {
    const header = n.children.find((x) => x.tag === 'header');
    const name = header ? rawText(header) : '';
    const body = n.children.filter((x) => x !== header).map(render).join('');
    return `\n${name ? `\n${'#'.repeat(Math.min(headingLevel(n) + 2, 6))} ${name}\n` : ''}${body}\n`;
  }
  if (tag === 'a' && /wowhead\.com/.test(n.attrs.href ?? '')) return spellLink(n);
  if (tag === 'img') { const alt = (n.attrs.alt ?? '').trim(); return alt ? ` [${alt}] ` : ''; }
  if (tag === 'i' && /glyphicon/.test(c)) {
    if (/perfect-mark/.test(c)) return ' ✓ ';
    if (/ok-mark/.test(c)) return ' ~ ';
    if (/bad-mark|glyphicon-remove/.test(c)) return ' ✗ ';
    if (/glyphicon-ok\b/.test(c)) return ' ✓ ';
    return '';
  }
  if (tag === 'br') return '\n';

  if (has(n, 'performance-block-row')) {
    const g = findAll(n, (x) => has(x, 'performance-block')).map((b) => (/\b(perfect|good|ok|bad)-block\b/.exec(cls(b)) || [])[1] ?? '?');
    // name it after the nearest spell link around it (defensive subsections have empty headers)
    let label = '';
    for (const a of ancestors(n)) {
      const link = find(a, (x) => x.tag === 'a' && /wowhead\.com\/(?:[a-z-]+\/)?spell=/.test(x.attrs.href ?? ''));
      if (link) { label = spellLink(link).trim() + ' '; break; }
    }
    return `\n${label}Cast breakdown (${g.length}):${g.map((x) => LETTER[x] ?? '?').join('')} (${tally(g)})\n`;
  }
  if (/_TimelineRectContainer_/.test(c)) {
    const g = findAll(n, (x) => /_TimelineRect_/.test(cls(x)) && x.tag === 'button').map((b) => gradeOf(b) ?? '?');
    return `\nPer cast (${g.length}): ${g.map((x) => LETTER[x] ?? '?').join('')} (${tally(g)})\n`;
  }
  if (has(n, 'cooldown-bar')) return cooldownBar(n);
  if (has(n, 'uptime-bar')) return '';
  if (has(n, 'spell-timeline')) return spellTimeline(n);
  if (/_BuffBarContainer_/.test(c)) return buffBars(n);
  if (/_Sequence_/.test(c)) {
    const icons = findAll(n, (x) => /_SpellIcon_/.test(cls(x)));
    const seq = icons.map((i) => {
      const alt = find(i, (x) => x.tag === 'img')?.attrs.alt ?? '?';
      const col = colorOf(i);
      return (/_ghosted_/.test(cls(i)) ? `(${alt})` : alt) + (col && col !== '#2ecc71' ? `{${col}}` : '');
    });
    return `\nSequence: ${seq.join(' → ')}\n`;
  }
  if (/_FilterBadge_/.test(c)) {
    const count = rawText(find(n, (x) => /_PerfBadgeCount_/.test(cls(x))) ?? n);
    const label = rawText(find(n, (x) => /_PerfBadgeLabel_/.test(cls(x))) ?? n);
    return ` ${label} ${count}, `;
  }
  if (tag === 'tr') {
    const cells = n.children.filter((x) => x.tag === 'td' || x.tag === 'th')
      .map((x) => x.children.map(render).join('').replace(/\s+/g, ' ').trim() + (x.attrs.title ? ` (${x.attrs.title})` : ''));
    return cells.some((x) => x) ? `\n| ${cells.join(' | ')} |\n` : '';
  }

  const inner = n.children.map(render).join('');
  const titleAttr = n.attrs.title && !['td', 'th'].includes(tag) ? ` (${n.attrs.title}) ` : '';
  // gear blocks (enchants, gems): the verdict is a class suffix
  const block = /_(good|potential|ok|bad)-block_/.exec(c);
  const grade = block ? block[1] : GRADED.test(c) || (tag === 'div' && /^\s*color:/.test(style(n))) ? gradeOf(n) : undefined;
  if (block && !inner.trim()) return ` {${grade}} `; // icon-only block; its slot link follows
  const pre = grade && inner.trim() ? `{${grade}} ` : '';
  if (tag === 'li') return `\n- ${pre}${inner}${titleAttr}\n`;
  if (tag === 'dt' || tag === 'dd') return ` ${pre}${inner}${titleAttr} `;
  if (/^h[1-6]$/.test(tag)) return `\n**${inner.trim()}**\n`;
  if (INLINE_TAGS.has(tag)) return `${pre}${inner}${titleAttr}`;
  if (tag === 'div' && INLINE_DIV.test(c)) return ` ${pre}${inner}${titleAttr} `;
  if (tag === 'div' && /\bflex\b/.test(c) && !inner.includes('\n')) return `\n${pre}${inner}${titleAttr}\n`;
  return `\n${pre}${inner}${titleAttr}\n`;
}

function tidy(s) {
  const lines = s.split('\n').map((l) => l.replace(/[ \t]+/g, ' ').replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '(').replace(/,\s*$/, '').trim())
    .filter((l) => l && l !== ',' && !/^Click (a filter|on a box|the timeline)/.test(l) && !/^(Cast Details|Timeline|Hide Explanations|Hide Good Casts)$/.test(l));
  // a panel's grade lands on its own line before the panel's title
  // (and a list item whose content is a block starts with a bare "-")
  for (let i = lines.length - 2; i >= 0; i--) if (/^(\{\w+\}|-)$/.test(lines[i])) lines.splice(i, 2, `${lines[i]} ${lines[i + 1]}`);
  return lines.filter((l, i) => l !== lines[i - 1]).join('\n').replace(/\n(#+ )/g, '\n\n$1').trim();
}

// ── output ──────────────────────────────────────────────────────────────────

const main = find(root, (n) => n.tag === 'main') ?? root;
const guide = find(main, (n) => has(n, 'guide-container'));
const header = find(main, (n) => /_Section_/.test(cls(n)) && n.tag === 'section');
const credits = guide && find(main, (n) => n.tag === 'small' && rawText(n) === 'Provided by');

const report = /report\/([A-Za-z0-9]+)\/(\d+)-[^/]*\/(\d+)-([^/]+)/.exec(savedFrom);
const tops = guide ? findAll(guide, (n) => n.tag === 'section' && has(n, 'expandable') && headingLevel(n) === 0) : [];
const titleOf = (s) => rawText(find(s.children.find((x) => x.tag && has(x, 'meta')) ?? s, (x) => has(x, 'name')) ?? s);

if (listOnly) {
  for (const s of tops) console.log(`${titleOf(s)}: ${tidy(render(s)).length} chars`);
  process.exit(0);
}

const head = [];
head.push(`# ${pageTitle}`);
if (report) head.push(`report ${report[1]} fight ${report[2]} source ${report[3]}${/\/standard\/(\w+)/.test(savedFrom) ? ` tab ${/\/standard\/(\w+)/.exec(savedFrom)[1]}` : ''}`);
if (fightMs !== undefined) head.push(`fight length ${mmss(fightMs / 1000, 1)}`);
if (header) {
  const tabsless = { ...header, children: header.children };
  head.push(tidy(render(tabsless)).split('\n').join(' · '));
}
// Maintainer warnings above the guide ("mostly updated for 12.1.0",
// "still missing the Implacable module"): the only patch hints on a page.
for (const al of findAll(main, (n) => has(n, 'alert') && !(guide && ancestors(n).includes(guide)))) {
  head.push(`Note: ${tidy(render({ ...al, attrs: { ...al.attrs, class: '' } })).split('\n').join(' ')}`);
}
if (credits) {
  const block = credits.parent?.parent ?? credits.parent;
  head.push(tidy(rawText(block)).replace(/^Provided by\s*/, 'Provided by: ').replace(/\s*View on.*$/, ''));
}
if (!only.length) console.log(head.join('\n'));

for (const s of tops) {
  if (only.length && !only.some((o) => titleOf(s).toLowerCase().includes(o))) continue;
  console.log('\n' + tidy(render(s)));
}
if (!guide) console.log('\n(no guide-container found: not an Overview/Guide page?)\n' + tidy(render(main)));
