#!/usr/bin/env node
// scripts/fetch-wow-spell-geometry.js — builds lib/replay/wow-spell-geometry.json,
// the AoE radius and target type of every enemy spell the WoW replay may
// draw (lib/replay/wow-shapes.ts). Game data from Blizzard's db2 tables via
// wago.tools: SpellEffect (ImplicitTarget, EffectRadiusIndex) and SpellRadius.
// Run in development; the app never calls wago.tools (it sends no CORS
// headers, and the table is small enough to check in).
//
// Spell ids come from every saved WoW replay (sampledata/wow/*/replay/*.json:
// enemy hits and casts) and every 6-7 digit number in the Venomous Abyss
// module headers (lib/mechanics/wow/va/*.ts), plus any given on the command
// line. Ids already in the table are kept; --refresh looks them up again.
//
// Usage: node scripts/fetch-wow-spell-geometry.js [id ...] [--refresh]

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'lib', 'replay', 'wow-spell-geometry.json');
const WAGO = 'https://wago.tools/db2';
// Prefer the Mythic raid row, then the difficulty-less default.
const DIFFICULTY_ORDER = ['16', '0', '15', '14'];

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0 || lines[0].startsWith('{')) return [];
  const head = lines[0].split(',');
  // db2 numeric tables have no quoted commas in the columns read here.
  return lines.slice(1).map((l) => Object.fromEntries(l.split(',').map((v, i) => [head[i], v])));
}

async function getCsv(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    if (res.ok) return parseCsv(await res.text());
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  throw new Error(`wago.tools request failed: ${url}`);
}

function collectIds() {
  const ids = new Set();
  const wowDir = path.join(ROOT, 'sampledata', 'wow');
  if (fs.existsSync(wowDir)) {
    for (const code of fs.readdirSync(wowDir)) {
      const dir = path.join(wowDir, code, 'replay');
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir).filter((n) => n.endsWith('.json'))) {
        const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const h of d.enemyHits ?? []) ids.add(h[1]);
        for (const c of d.enemyCasts ?? []) if (c[4] !== undefined) ids.add(c[4]);
      }
    }
  }
  const vaDir = path.join(ROOT, 'lib', 'mechanics', 'wow', 'va');
  for (const f of fs.readdirSync(vaDir).filter((n) => n.endsWith('.ts'))) {
    for (const m of fs.readFileSync(path.join(vaDir, f), 'utf8').matchAll(/\b(1\d{5,6})\b/g)) ids.add(Number(m[1]));
  }
  ids.delete(1);   // melee
  return ids;
}

async function main() {
  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh');
  const table = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const ids = collectIds();
  for (const a of args) if (/^\d+$/.test(a)) ids.add(Number(a));
  const todo = [...ids].filter((id) => refresh || !(id in table)).sort((a, b) => a - b);
  console.log(`${ids.size} spell ids, ${todo.length} to look up`);

  const radius = new Map((await getCsv(`${WAGO}/SpellRadius/csv`)).map((r) => [r.ID, Number(r.Radius)]));
  let done = 0;
  for (const id of todo) {
    const rows = await getCsv(`${WAGO}/SpellEffect/csv?filter%5BSpellID%5D=${id}`);
    const diff = DIFFICULTY_ORDER.find((d) => rows.some((r) => r.DifficultyID === d)) ?? rows[0]?.DifficultyID;
    let r = 0;
    const targets = new Set();
    for (const row of rows.filter((x) => x.DifficultyID === diff)) {
      const rr = Math.max(radius.get(row.EffectRadiusIndex_0) ?? 0, radius.get(row.EffectRadiusIndex_1) ?? 0);
      if (rr > r) r = rr;
      for (const t of [row.ImplicitTarget_0, row.ImplicitTarget_1]) if (t && t !== '0') targets.add(Number(t));
    }
    table[id] = { r, t: [...targets].sort((a, b) => a - b) };
    if (++done % 20 === 0) console.log(`  ${done}/${todo.length}`);
  }

  const sorted = Object.fromEntries(Object.keys(table).sort((a, b) => a - b).map((k) => [k, table[k]]));
  fs.writeFileSync(OUT, JSON.stringify(sorted, null, 0).replace(/},"/g, '},\n"') + '\n');
  const withRadius = Object.values(sorted).filter((g) => g.r > 0);
  const hist = {};
  for (const g of withRadius) for (const t of g.t) hist[t] = (hist[t] ?? 0) + 1;
  console.log(`Saved ${OUT}: ${Object.keys(sorted).length} spells, ${withRadius.length} with a radius; implicit targets: ${JSON.stringify(hist)}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
