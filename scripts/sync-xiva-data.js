#!/usr/bin/env node
// scripts/sync-xiva-data.js
//
// Refreshes lib/damage/ffxiv/xiva-data.ts, our vendored snapshot of
// xivanalysis's FFXIV action and status tables (MIT licensed; see
// THIRD_PARTY_NOTICES.md and docs/damage-analysis-plan.md).
//
// Their repo is UNTRUSTED DATA. This script never runs, imports or
// transpiles their code: it parses the data files with the TypeScript
// parser and evaluates only literal values (numbers, strings, booleans,
// arrays, objects, enum member names, references to other parsed entries).
// Anything else (a function call, a computed value) is dropped with a
// warning. The output is written with JSON.stringify, so their strings
// can't inject code into ours.
//
// Usage:
//   git clone --depth 1 https://github.com/xivanalysis/xivanalysis.git <empty-dir>
//   node scripts/sync-xiva-data.js <empty-dir>
//
// Clone into a new, empty directory outside the repo (e.g. a temp dir), and
// don't run anything inside it.
//
// What it produces:
//   - every job's actions (plus role, shared and item actions), with
//     xivanalysis's GCD defaults (castTime 0, cooldown 2500) added to root
//     GCDs, then every patch layer applied in patch order
//   - every status, with FFLogs' +1000000 status-id offset applied
//   - `job` on each entry: the root file it came from (GNB, ROLE, ...)
// Blue Mage, Beastmaster and duty actions are skipped. Icons are dropped.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));
const OUT = path.join(ROOT, 'lib', 'damage', 'ffxiv', 'xiva-data.ts');

const SKIP_FILES = new Set(['index.ts', 'BLU.ts', 'BST.ts', 'DUTY.ts']);
const STATUS_ID_OFFSET = 1000000;
const ITEM_ID_OFFSET = 1000000;
const KNOWN_CONSTANTS = { ITEM_ID_OFFSET, STATUS_ID_OFFSET };

const warnings = [];

// ─── Literal evaluator ─────────────────────────────────────────────────────

const UNSUPPORTED = Symbol('unsupported');

// `refs` maps an identifier (e.g. SHARED) to an already-parsed record, so
// `SHARED.UNKNOWN` and `...SHARED.UNKNOWN` resolve to data, not code.
function evaluate(node, refs, where) {
  const k = ts.SyntaxKind;
  switch (node.kind) {
    case k.NumericLiteral: return Number(node.text);
    case k.StringLiteral:
    case k.NoSubstitutionTemplateLiteral: return node.text;
    case k.TrueKeyword: return true;
    case k.FalseKeyword: return false;
    case k.NullKeyword: return null;
    case k.ParenthesizedExpression:
    case k.AsExpression:
    case k.SatisfiesExpression:
    case k.TypeAssertionExpression:
      return evaluate(node.expression, refs, where);
    case k.PrefixUnaryExpression: {
      const v = evaluate(node.operand, refs, where);
      if (typeof v !== 'number') return UNSUPPORTED;
      if (node.operator === k.MinusToken) return -v;
      if (node.operator === k.PlusToken) return v;
      return UNSUPPORTED;
    }
    case k.BinaryExpression: {
      const a = evaluate(node.left, refs, where), b = evaluate(node.right, refs, where);
      if (typeof a !== 'number' || typeof b !== 'number') return UNSUPPORTED;
      switch (node.operatorToken.kind) {
        case k.PlusToken: return a + b;
        case k.MinusToken: return a - b;
        case k.AsteriskToken: return a * b;
        case k.SlashToken: return a / b;
        default: return UNSUPPORTED;
      }
    }
    case k.Identifier:
      if (node.text === 'undefined') return undefined;
      if (node.text in KNOWN_CONSTANTS) return KNOWN_CONSTANTS[node.text];
      return UNSUPPORTED;
    case k.PropertyAccessExpression: {
      // SHARED.UNKNOWN → that parsed entry; Attribute.SKILL_SPEED → "SKILL_SPEED"
      // (SHARED.UNKNOWN.id → that entry's id)
      const base = node.expression;
      const obj = base.kind === k.Identifier ? refs[base.text] : evaluate(base, refs, where);
      if (obj && typeof obj === 'object') {
        const v = obj[node.name.text];
        return v === undefined ? UNSUPPORTED : structuredClone(v);
      }
      if (base.kind === k.Identifier) return node.name.text;
      return UNSUPPORTED;
    }
    case k.ArrayLiteralExpression: {
      const out = [];
      for (const el of node.elements) {
        const v = evaluate(el, refs, where);
        if (v === UNSUPPORTED) { warnings.push(`${where}: dropped array element`); continue; }
        out.push(v);
      }
      return out;
    }
    case k.ObjectLiteralExpression: {
      const out = {};
      for (const p of node.properties) {
        if (p.kind === k.SpreadAssignment) {
          const v = evaluate(p.expression, refs, where);
          if (v && typeof v === 'object' && v !== UNSUPPORTED) Object.assign(out, v);
          else warnings.push(`${where}: dropped spread`);
          continue;
        }
        if (p.kind !== k.PropertyAssignment) { warnings.push(`${where}: dropped ${k[p.kind]}`); continue; }
        const key = p.name.kind === k.Identifier || p.name.kind === k.StringLiteral || p.name.kind === k.NumericLiteral
          ? p.name.text : null;
        if (key === null) { warnings.push(`${where}: dropped computed key`); continue; }
        if (key === 'icon') continue;
        const v = evaluate(p.initializer, refs, `${where}.${key}`);
        if (v === UNSUPPORTED) { warnings.push(`${where}.${key}: dropped non-literal value`); continue; }
        out[key] = v;
      }
      return out;
    }
    default:
      return UNSUPPORTED;
  }
}

// ─── File parsing ──────────────────────────────────────────────────────────

function parse(file) {
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.ES2020, true);
}

// The object literal passed to `export const NAME = ensureX({...})`, or
// assigned directly (`export const NAME = {...}`).
function exportedObjects(sf) {
  const out = [];
  for (const st of sf.statements) {
    if (st.kind !== ts.SyntaxKind.VariableStatement) continue;
    for (const decl of st.declarationList.declarations) {
      let init = decl.initializer;
      if (!init) continue;
      if (init.kind === ts.SyntaxKind.CallExpression && init.arguments.length === 1) init = init.arguments[0];
      if (init.kind === ts.SyntaxKind.ObjectLiteralExpression) out.push({ name: decl.name.text, node: init });
    }
  }
  return out;
}

function loadRoot(dir, kind) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ts') && !SKIP_FILES.has(f));
  // SHARED first: other files reference SHARED.UNKNOWN.
  files.sort((a, b) => (a === 'SHARED.ts' ? -1 : b === 'SHARED.ts' ? 1 : a.localeCompare(b)));
  const refs = {};
  const merged = {};
  for (const f of files) {
    const job = f.replace(/\.ts$/, '');
    for (const { name, node } of exportedObjects(parse(path.join(dir, f)))) {
      const rec = evaluate(node, refs, `${kind}/${f}:${name}`);
      refs[name] = rec;
      for (const [key, entry] of Object.entries(rec)) {
        if (!entry || typeof entry !== 'object' || typeof entry.id !== 'number') continue;
        merged[key] = { ...entry, job };
      }
    }
  }
  return { merged, refs };
}

function loadLayers(dir, refs, kind) {
  const layers = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.startsWith('patch') && x.endsWith('.ts'))) {
    for (const { node } of exportedObjects(parse(path.join(dir, f)))) {
      const layer = evaluate(node, refs, `${kind}/layers/${f}`);
      if (typeof layer.patch === 'string' && layer.data) layers.push(layer);
    }
  }
  return layers.sort((a, b) => Number(a.patch) - Number(b.patch));
}

function applyLayers(merged, layers) {
  for (const layer of layers) {
    for (const [key, patch] of Object.entries(layer.data)) {
      if (!merged[key]) continue; // a skipped job (BLU) or a key we don't carry
      merged[key] = { ...merged[key], ...patch, job: merged[key].job };
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  const src = process.argv[2];
  if (!src) { console.error('Usage: node scripts/sync-xiva-data.js <xivanalysis-checkout>'); process.exit(1); }
  const data = path.join(src, 'src', 'data');
  const commit = execFileSync('git', ['-C', src, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const commitDate = execFileSync('git', ['-C', src, 'log', '-1', '--format=%cs'], { encoding: 'utf8' }).trim();

  const actions = loadRoot(path.join(data, 'ACTIONS', 'root'), 'ACTIONS');
  for (const a of Object.values(actions.merged)) {
    if (a.job === 'ITEMS' && a.id < ITEM_ID_OFFSET) a.id += ITEM_ID_OFFSET; // their ITEMS.ts adds this at runtime
    if (a.onGcd) Object.assign(a, { castTime: a.castTime ?? 0, cooldown: a.cooldown ?? 2500 });
  }
  const actionLayers = loadLayers(path.join(data, 'ACTIONS', 'layers'), actions.refs, 'ACTIONS');
  applyLayers(actions.merged, actionLayers);

  const statuses = loadRoot(path.join(data, 'STATUSES', 'root'), 'STATUSES');
  const statusLayers = loadLayers(path.join(data, 'STATUSES', 'layers'), statuses.refs, 'STATUSES');
  applyLayers(statuses.merged, statusLayers);
  for (const [key, s] of Object.entries(statuses.merged)) {
    if (s.id <= 0) { delete statuses.merged[key]; continue; } // SHARED.UNKNOWN placeholders
    s.id += STATUS_ID_OFFSET;
  }
  for (const [key, a] of Object.entries(actions.merged)) if (a.id <= 0) delete actions.merged[key];

  const patches = [...new Set([...actionLayers, ...statusLayers].map((l) => l.patch))]
    .sort((a, b) => Number(a) - Number(b));
  const license = fs.readFileSync(path.join(src, 'LICENSE'), 'utf8').trim();

  const header = [
    '// lib/damage/ffxiv/xiva-data.ts',
    '//',
    '// GENERATED by scripts/sync-xiva-data.js. Do not edit by hand; re-run the',
    '// script against a fresh xivanalysis checkout instead.',
    '//',
    '// FFXIV action and status data ported from xivanalysis',
    '// (https://github.com/xivanalysis/xivanalysis), src/data/ACTIONS and',
    '// src/data/STATUSES.',
    `//   source commit: ${commit} (${commitDate})`,
    `//   patch layers applied: ${patches.join(', ')}`,
    '// Status ids carry FFLogs\' +1000000 offset. Most jobs have no potencies',
    '// here: xivanalysis only records them where its positional and combo',
    '// checks need them.',
    '//',
    '// Original license:',
    '//',
    ...license.split(/\r?\n/).map((l) => (l ? `//   ${l}` : '//')),
    '',
  ].join('\n');

  const body = `
export type XivaPotency = {
  value:          number;
  bonusModifiers: string[];   // "COMBO" | "POSITIONAL"
  baseModifiers?: string[];   // status keys or special cases
};

export type XivaAction = {
  id:              number;
  name:            string;
  job:             string;    // xivanalysis root file: GNB, ROLE, ITEMS, ...
  onGcd?:          boolean;
  breaksCombo?:    boolean;
  combo?:          { start?: true; from?: number | number[]; end?: true };
  castTime?:       number;    // ms
  cooldown?:       number;    // ms; the recast for GCDs
  gcdRecast?:      number;    // ms; GCD lock of a GCD with its own cooldown
  cooldownGroup?:  number;
  autoAttack?:     boolean;
  statusesApplied?: string[]; // status keys
  charges?:        number;
  mpCost?:         number;
  damageType?:     string;
  speedAttribute?: string;    // "SKILL_SPEED" | "SPELL_SPEED"
  potencies?:      XivaPotency[];
  potency?:        number | number[];
};

export type XivaStatus = {
  id:             number;     // FFLogs status id (+1000000)
  name:           string;
  job:            string;
  duration?:      number;     // ms
  stacksApplied?: number;
  speedModifier?: number;
};

export const XIVA_SOURCE = ${JSON.stringify({ commit, commitDate, patches })} as const;

export const XIVA_ACTIONS: Record<string, XivaAction> = ${JSON.stringify(actions.merged, null, 1)};

export const XIVA_STATUSES: Record<string, XivaStatus> = ${JSON.stringify(statuses.merged, null, 1)};
`;

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, header + body);
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${Object.keys(actions.merged).length} actions, ${Object.keys(statuses.merged).length} statuses, patches ${patches.join(', ')}, commit ${commit.slice(0, 10)}`);
  if (warnings.length) {
    console.log(`${warnings.length} values dropped (non-literal):`);
    for (const w of warnings.slice(0, 40)) console.log('  ' + w);
    if (warnings.length > 40) console.log(`  ... and ${warnings.length - 40} more`);
  }
}

main();
