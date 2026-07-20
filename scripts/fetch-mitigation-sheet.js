#!/usr/bin/env node
// scripts/fetch-mitigation-sheet.js
//
// Imports the Ikuya mitigation sheet (public Google Sheet) for Dancing Mad
// Ultimate into sampledata/ff/mitigation/. No auth needed — public sheets
// expose a per-tab CSV export endpoint.
//
// Writes:
//   sampledata/ff/mitigation/raw/<gid>_<slug>.csv   (raw tab exports, for reference)
//   sampledata/ff/mitigation/mitigation.json        (normalized structure)
//   lib/mechanics/ffxiv/dancingmad/mitigation-plans/ikuya.json
//     — committed copy of the same normalized structure, imported by the app
//       (sampledata/ is gitignored; the app must not depend on it)
//
// The sheet is formatted for humans (merged-cell padding columns, multi-line
// cells, ➔ carry-over markers, superscript footnotes), so this script parses
// it into a machine-usable shape:
//   - 5 phase tabs -> phases[] with mechanics[] (name, time, phase-relative
//     time, per-job assignment entries) + notes/footnotes
//   - 1 tank tab   -> tank.sections[] (one per phase, MT/OT columns)
//
// Usage:
//   node scripts/fetch-mitigation-sheet.js [--sheet <id>] [--out <dir>]

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const DEFAULT_SHEET_ID = '10C3ytfH3irHqkb45rchIq5oqdAs-v_OKTj57M-Twi3k';

// gid -> kind. Titles are read from the tabs themselves.
const TABS = [
  { gid: 161526414,  kind: 'phase' },
  { gid: 583362985,  kind: 'phase' },
  { gid: 247845947,  kind: 'phase' },
  { gid: 2072785902, kind: 'phase' },
  { gid: 696382883,  kind: 'phase' },
  { gid: 1548551521, kind: 'tank'  },
];

// Known sheet typos, normalized so ability names can later be matched
// against FFLogs ability names. Raw text is always preserved alongside.
const TYPO_FIXES = new Map([
  ['Fey Illumuniation', 'Fey Illumination'],
  ['Scared Soil', 'Sacred Soil'],
  ['Serpah', 'Seraph'],
  ['Ultimate Embrance', 'Ultimate Embrace'],
]);

// Exact-name normalizations applied after parsing (substring-unsafe).
const NAME_FIXES = new Map([
  ['Short', 'Short Mit'], // one tank cell says "40% + Short"
]);

const SUPERSCRIPTS = { '⁰': 0, '¹': 1, '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
const SUPERSCRIPT_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
const TIME_RE = /^(\d+):(\d{2})(\+?)$/;

function parseArgs(argv) {
  const args = { sheet: DEFAULT_SHEET_ID, out: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sheet') args.sheet = argv[++i];
    else if (argv[i] === '--out') args.out = argv[++i];
    else throw new Error(`Unrecognized argument: ${argv[i]}`);
  }
  return args;
}

// Minimal CSV parser handling quoted fields with embedded newlines/commas.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function superscriptsToNumbers(s) {
  const out = [];
  for (const m of s.matchAll(SUPERSCRIPT_RE)) {
    out.push(Number(m[0].split('').map((ch) => SUPERSCRIPTS[ch]).join('')));
  }
  return out;
}

function stripSuperscripts(s) {
  return s.replace(SUPERSCRIPT_RE, '').replace(/\s+/g, ' ').trim();
}

function parseTime(s) {
  const m = (s ?? '').trim().match(TIME_RE);
  if (!m) return null;
  return { text: m[0], seconds: Number(m[1]) * 60 + Number(m[2]), openEnded: m[3] === '+' };
}

function fixTypos(name) {
  let fixed = name;
  for (const [typo, correct] of TYPO_FIXES) fixed = fixed.split(typo).join(correct);
  return fixed;
}

// Parses one assignment cell into entries. Each line is an entry; a leading
// ➔ marks carry-over (the ability was cast for an earlier mechanic and its
// effect persists into this one). Within a line, " + " joins simultaneous
// abilities. "(...)" qualifiers (job conditions, targets) are kept per ability.
function parseAssignmentCell(raw) {
  const entries = [];
  let pendingQualifier = null;
  for (let line of raw.split('\n')) {
    line = line.trim();
    if (!line) continue;
    // Tank-tab cells lead with a target-order line ("First Hit") that
    // qualifies the abilities on the next line rather than naming one.
    if (/^(First|Second|Third) Hit$/.test(line)) { pendingQualifier = line; continue; }
    // A line starting with "+" continues the previous line's ability list
    // (the sheet wraps long "A + B" chains across lines).
    let continuation = false;
    if (line.startsWith('+')) { continuation = true; line = line.slice(1).trim(); }
    const carryOver = line.startsWith('➔');
    if (carryOver) line = line.slice(1).trim();
    const abilities = line.split(/\s\+\s/).map((part) => {
      const footnotes = superscriptsToNumbers(part);
      let text = stripSuperscripts(part);
      let qualifier = null;
      const qm = text.match(/\s*\(([^)]*)\)\s*$/);
      if (qm) { qualifier = qm[1]; text = text.slice(0, qm.index).trim(); }
      let name = fixTypos(text);
      if (NAME_FIXES.has(name)) name = NAME_FIXES.get(name);
      const ability = { name };
      if (qualifier) ability.qualifier = qualifier;
      if (footnotes.length) ability.footnotes = footnotes;
      return ability;
    });
    if (continuation && entries.length > 0) {
      const prev = entries[entries.length - 1];
      prev.raw += ' + ' + line;
      prev.abilities.push(...abilities);
    } else {
      const entry = { raw: line, carryOver, abilities };
      if (pendingQualifier) { entry.qualifier = pendingQualifier; pendingQualifier = null; }
      entries.push(entry);
    }
  }
  return entries;
}

// Parses a "Notes" cell: leading lines are general notes until the first
// superscript-prefixed line; after that, lines without a superscript prefix
// continue the previous footnote.
function parseNotes(raw) {
  const general = [];
  const footnotes = {};
  let currentFootnote = null;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) { currentFootnote = null; continue; }
    const m = trimmed.match(/^([⁰¹²³⁴⁵⁶⁷⁸⁹]+)\s*(.*)$/);
    if (m) {
      currentFootnote = String(superscriptsToNumbers(m[1])[0]);
      footnotes[currentFootnote] = m[2];
    } else if (currentFootnote !== null) {
      footnotes[currentFootnote] += '\n' + trimmed;
    } else {
      general.push(trimmed);
    }
  }
  return { general, footnotes };
}

function nonEmptyCells(row) {
  const out = [];
  row.forEach((cell, i) => { if ((cell ?? '').trim()) out.push({ col: i, value: cell.trim() }); });
  return out;
}

// Parses one table section: a title row (single non-empty cell), a header row
// containing "Time" plus column labels, then mechanic rows until the rows run
// out or another title row starts. Returns null if no header found.
// Both phase tabs and tank-tab sections share this shape; phase tabs have an
// extra unlabeled phase-relative time column right after "Time" (detected
// per-row by a second time-like value).
function parseSection(rows, startIndex) {
  let title = null;
  let headerIdx = -1;
  for (let i = startIndex; i < rows.length; i++) {
    const cells = nonEmptyCells(rows[i]);
    // Stray single-character cells ('f', 'z') exist on the sheet; skip them.
    // Keep the latest candidate so junk rows above the real title lose.
    if (cells.length === 1 && cells[0].value.length > 1) {
      title = cells[0].value;
    } else if (cells.some((c) => c.value === 'Time')) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) return null;

  const headerCells = nonEmptyCells(rows[headerIdx]);
  const timeCol = headerCells.find((c) => c.value === 'Time').col;
  const columns = headerCells.filter((c) => c.col > timeCol).map((c) => ({ col: c.col, label: c.value }));

  const mechanics = [];
  let notes = null;
  let nextIndex = rows.length;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = nonEmptyCells(row);
    if (cells.length === 0) continue;
    // A lone non-empty cell past the name column = next section's title row.
    if (cells.length === 1 && cells[0].col > 2) { nextIndex = i; break; }

    const rawName = (row[1] ?? '').trim();
    if (!rawName) continue;

    if (stripSuperscripts(rawName) === 'Notes') {
      notes = parseNotes((row[timeCol] ?? '').trim());
      continue;
    }

    const nameFootnotes = superscriptsToNumbers(rawName);
    const mech = { name: fixTypos(stripSuperscripts(rawName)) };
    if (nameFootnotes.length) mech.footnotes = nameFootnotes;

    const time = parseTime(row[timeCol]);
    if (!time) {
      // Rows like "Accretions" carry an inline note instead of a time.
      const note = (row[timeCol] ?? '').trim();
      if (note) mech.note = note;
      mechanics.push(mech);
      continue;
    }
    mech.time = time.text;
    mech.timeSeconds = time.seconds;
    if (time.openEnded) mech.timeOpenEnded = true;

    const phaseTime = parseTime(row[timeCol + 1]);
    if (phaseTime) {
      mech.phaseTime = phaseTime.text;
      mech.phaseTimeSeconds = phaseTime.seconds;
    }

    const assignments = {};
    for (const { col, label } of columns) {
      const raw = (row[col] ?? '').trim();
      if (!raw) continue;
      if (raw === '✔') { assignments[label] = [{ raw, carryOver: false, abilities: [{ name: '✔' }] }]; continue; }
      assignments[label] = parseAssignmentCell(raw);
    }
    mech.assignments = assignments;
    mechanics.push(mech);
  }

  return {
    section: { title, columns: columns.map((c) => c.label), mechanics, notes },
    nextIndex,
  };
}

function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function fetchTabCsv(sheetId, gid) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Fetch failed for gid ${gid}: HTTP ${res.status}`);
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    throw new Error(`gid ${gid} returned HTML instead of CSV — is the sheet still public?`);
  }
  return text;
}

async function main() {
  const { sheet, out } = parseArgs(process.argv.slice(2));
  const outDir = out ? path.resolve(out) : path.join(ROOT, 'sampledata', 'ff', 'mitigation');
  const rawDir = path.join(outDir, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const result = {
    sheetId: sheet,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheet}/htmlview`,
    fetchedAt: new Date().toISOString(),
    phases: [],
    tank: null,
  };

  for (const tab of TABS) {
    process.stdout.write(`Fetching gid ${tab.gid} (${tab.kind})... `);
    const csv = await fetchTabCsv(sheet, tab.gid);
    const rows = parseCsv(csv);

    if (tab.kind === 'phase') {
      const parsed = parseSection(rows, 0);
      if (!parsed) throw new Error(`gid ${tab.gid}: no Time header found`);
      const { section } = parsed;
      result.phases.push({ gid: tab.gid, title: section.title, jobs: section.columns, mechanics: section.mechanics, notes: section.notes });
      fs.writeFileSync(path.join(rawDir, `${tab.gid}_${slugify(section.title ?? 'phase')}.csv`), csv);
      console.log(`${section.title} — ${section.mechanics.length} mechanics`);
    } else {
      const sections = [];
      let idx = 0;
      while (idx < rows.length) {
        const parsed = parseSection(rows, idx);
        if (!parsed) break;
        sections.push(parsed.section);
        idx = parsed.nextIndex;
      }
      result.tank = { gid: tab.gid, sections };
      fs.writeFileSync(path.join(rawDir, `${tab.gid}_tank-mitigation.csv`), csv);
      console.log(`tank tab — ${sections.length} sections (${sections.map((s) => s.mechanics.length).join('/')} rows)`);
    }
  }

  const jsonPath = path.join(outDir, 'mitigation.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  const sizeKb = (fs.statSync(jsonPath).size / 1024).toFixed(0);
  console.log(`Wrote ${path.relative(ROOT, jsonPath)} (${sizeKb}KB)`);

  // Committed copy consumed by the app (StrategyDialog / mitigation-plan.ts).
  const planDir = path.join(ROOT, 'lib', 'mechanics', 'ffxiv', 'dancingmad', 'mitigation-plans');
  fs.mkdirSync(planDir, { recursive: true });
  const planPath = path.join(planDir, 'ikuya.json');
  fs.writeFileSync(planPath, JSON.stringify(result, null, 2));
  console.log(`Wrote ${path.relative(ROOT, planPath)}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
