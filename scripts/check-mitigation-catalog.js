#!/usr/bin/env node
// scripts/check-mitigation-catalog.js
//
// Checks lib/mitigation/ffxiv-catalog.ts against the FFXIV sample data
// (read-only, no API calls):
//   1. IDs: every action ID should show up as a player cast and every
//      status ID on a damage event's `buffs` or a shield absorb. Lists
//      `verified: true` entries whose IDs never appear, and IDs whose
//      masterData name disagrees with the catalog.
//   2. Percentages: on every hit carrying FFLogs' `multiplier` and a known
//      damage type, the product of the catalog's % statuses should equal
//      the multiplier (2-decimal rounding). Mismatches are grouped by the
//      set of statuses present, so one wrong value shows up as one line.
//      Needs captures fetched after 2026-10-06 (multiplier + ability type).
//   3. Cooldowns: the shortest gap between one player's casts of an action
//      (across `charges` casts) is an upper bound on its cooldown.
//
// Usage: node scripts/check-mitigation-catalog.js [sampledata/ff/<code> ...]

const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');

const cat = requireTsFromRoot('lib/mitigation/ffxiv-catalog.ts');
const { FFXIV_MITIGATION_CATALOG: CATALOG, FFXIV_STATUS_INDEX: STATUS, FFXIV_DAMAGE_TYPE: DT } = cat;
const { levelOf } = requireTsFromRoot('lib/damage/ffxiv/patches.ts');

const dirs = process.argv.slice(2).length
  ? process.argv.slice(2).map((d) => path.resolve(d))
  : fs.readdirSync(path.join(ROOT, 'sampledata/ff')).map((d) => path.join(ROOT, 'sampledata/ff', d))
      .filter((d) => fs.existsSync(path.join(d, 'meta.json')));

const seenAction = new Map();   // id -> masterData name
const seenStatus = new Map();   // id -> masterData name
const castTimes = new Map();    // `${code}|${fight}|${source}|${actionId}` -> [ts]
const multGroups = new Map();   // statusKey -> { n, bad, examples }
let multHits = 0, multBad = 0;
const implied2 = new Map();     // `${status} ${col}` -> { expected, bins: factor(0.05 steps) -> n }
const shieldOpen = new Map();   // `${code}|${fight}|${target}|${source}|${status}` -> current application
const shieldApps = new Map();   // status id -> [{ total, max }]

for (const dir of dirs) {
  const code = path.basename(dir);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const abil = new Map(meta.masterData.abilities.map((a) => [a.gameID, a]));
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'meta.json')) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const r = j.json.data.reportData.report;
    const fight = j.variables.fightIDs[0];
    // Sections 2 and 3 judge a hit by the catalog at the fight's sync level
    // (ffxivMitigationAt): a TEA hit is level 80's values.
    const level = levelOf({ name: meta.fights.find((x) => x.id === fight)?.name });
    const LEVEL_STATUS = cat.ffxivMitigationAt(level).statusIndex;
    for (const e of r.casts.data) {
      if (e.type !== 'cast') continue;
      const entry = cat.FFXIV_ACTION_INDEX.get(e.abilityGameID);
      if (!entry) continue;
      seenAction.set(e.abilityGameID, abil.get(e.abilityGameID)?.name);
      const k = `${code}|${fight}|${e.sourceID}|${entry.key}|${level ?? ''}`;
      (castTimes.get(k) || castTimes.set(k, []).get(k)).push(e.timestamp);
    }
    for (const e of r.healing.data) {
      if (e.type === 'absorbed' && STATUS.has(e.abilityGameID)) seenStatus.set(e.abilityGameID, abil.get(e.abilityGameID)?.name);
      // One application's absorbs: the same shield, caster and target
      // within the entry's duration (+1s) of the first.
      if (e.type !== 'absorbed' || !STATUS.get(e.abilityGameID)?.status.shield || !e.targetResources?.maxHitPoints) continue;
      const s = STATUS.get(e.abilityGameID);
      const k = `${code}|${fight}|${e.targetID}|${e.sourceID}|${e.abilityGameID}`;
      const open = shieldOpen.get(k);
      if (open && e.timestamp - open.start <= s.entry.durationMs + 1000) {
        open.total += e.amount;
        continue;
      }
      const app = { start: e.timestamp, total: e.amount, max: e.targetResources.maxHitPoints };
      shieldOpen.set(k, app);
      (shieldApps.get(e.abilityGameID) || shieldApps.set(e.abilityGameID, []).get(e.abilityGameID)).push(app);
    }
    for (const e of r.damageTaken.data) {
      const ids = (e.buffs || '').split('.').filter(Boolean).map(Number);
      for (const id of ids) if (STATUS.has(id)) seenStatus.set(id, abil.get(id)?.name);
      const type = Number(abil.get(e.abilityGameID)?.type);
      if (e.multiplier === undefined || (type !== DT.physical && type !== DT.magical)) continue;
      if (e.multiplier > 1) continue; // vulnerability-up on the hit
      const col = type === DT.physical ? 'physical' : 'magical';
      let product = 1;
      const names = [];
      for (const id of ids) {
        const s = LEVEL_STATUS.get(id);
        if (!s || s.status.shield || s.entry.kind === 'invuln') continue;
        if (s.status[col] > 0) { product *= 1 - s.status[col]; names.push(s.status.name); }
      }
      multHits++;
      // Per status: the factor this hit implies for it, given the catalog
      // values of everything else on the hit.
      for (const id of new Set(ids)) {
        const s = LEVEL_STATUS.get(id);
        if (!s || s.status.shield || s.entry.kind === 'invuln' || !(s.status[col] > 0)) continue;
        const implied = e.multiplier / (product / (1 - s.status[col]));
        const k = `${s.status.name}(${id}) ${col}${level ? ` @${level}` : ''}`;
        const h = implied2.get(k) || implied2.set(k, { expected: 1 - s.status[col], bins: new Map() }).get(k);
        const bin = Math.round(implied * 20) / 20;
        h.bins.set(bin, (h.bins.get(bin) || 0) + 1);
      }
      const ok = Math.abs(product - e.multiplier) <= 0.011;
      if (!ok) multBad++;
      const key = `${col}${level ? ` @${level}` : ''}: ${names.sort().join(' + ') || '(none)'}`;
      const g = multGroups.get(key) || multGroups.set(key, { n: 0, bad: 0, product, logged: new Map() }).get(key);
      g.n++;
      if (!ok) { g.bad++; g.logged.set(e.multiplier, (g.logged.get(e.multiplier) || 0) + 1); }
    }
  }
}

console.log('== 1. IDs');
for (const entry of CATALOG) {
  const missingA = entry.actionIds.filter((id) => !seenAction.has(id));
  const missingS = entry.statuses.filter((s) => !seenStatus.has(s.id)).map((s) => `${s.name}(${s.id})`);
  const tag = entry.verified ? 'verified' : 'unverified';
  if (missingA.length || missingS.length) {
    console.log(`  ${entry.key} [${tag}]: unseen actions ${JSON.stringify(missingA)} unseen statuses ${JSON.stringify(missingS)}`);
  } else if (!entry.verified) {
    console.log(`  ${entry.key} [unverified]: every ID seen — can be marked verified`);
  }
  for (const id of entry.actionIds) {
    const n = seenAction.get(id);
    if (n && n !== entry.name && !entry.statuses.some((s) => s.name === n)) console.log(`  ${entry.key}: action ${id} is named "${n}" in the log`);
  }
  for (const s of entry.statuses) {
    const n = seenStatus.get(s.id);
    if (n && n !== s.name) console.log(`  ${entry.key}: status ${s.id} is named "${n}" in the log, catalog says "${s.name}"`);
  }
}

console.log(`\n== 2. Multiplier vs catalog: ${multHits} hits, ${multBad} mismatched`);
const groups = [...multGroups].filter(([, g]) => g.bad > 0).sort((a, b) => b[1].bad - a[1].bad);
for (const [key, g] of groups.slice(0, 40)) {
  const logged = [...g.logged].sort((a, b) => b[1] - a[1]).map(([m, n]) => `${m}x${n}`).join(' ');
  console.log(`  ${g.bad}/${g.n}  catalog ${g.product.toFixed(3)}  logged ${logged}  — ${key}`);
}

console.log('\n== 2b. Factor each status implies, given the rest of the hit (catalog value in brackets)');
for (const [k, h] of [...implied2].sort()) {
  const total = [...h.bins.values()].reduce((a, b) => a + b, 0);
  const atExpected = h.bins.get(Math.round(h.expected * 20) / 20) || 0;
  const top = [...h.bins].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([b, n]) => `${b.toFixed(2)}:${Math.round(100 * n / total)}%`).join(' ');
  console.log(`  ${k} [${h.expected.toFixed(2)}] n=${total} at-catalog=${Math.round(100 * atExpected / total)}%  ${top}`);
}

console.log('\n== 3. Shortest cast gap per player (upper bound on cooldown)');
const gapByEntry = new Map();
// Per entry and sync level, against that level's version of the entry.
for (const [k, times] of castTimes) {
  const [, , , key, lv] = k.split('|');
  const entry = cat.ffxivCatalogAt(lv ? Number(lv) : undefined).find((e) => e.key === key);
  if (!entry) continue;
  const c = entry.charges || 1;
  times.sort((a, b) => a - b);
  for (let i = c; i < times.length; i++) {
    const gap = times[i] - times[i - c];
    const g = gapByEntry.get(`${key}|${lv}`);
    if (!g || gap < g.gap) gapByEntry.set(`${key}|${lv}`, { gap, entry, lv });
  }
}
for (const { gap, entry, lv } of [...gapByEntry.values()].sort((a, b) => a.entry.key.localeCompare(b.entry.key) || String(a.lv).localeCompare(String(b.lv)))) {
  if (entry.cooldownMs === 0) continue;
  const flag = entry.gated ? `  (gated: ${entry.gated})`
    : gap < entry.cooldownMs - 1000 ? '  <-- shorter than catalog cooldown' : '';
  console.log(`  ${entry.key}${lv ? ` @${lv} (${entry.name})` : ''}: catalog ${entry.cooldownMs / 1000}s, shortest seen ${(gap / 1000).toFixed(1)}s${flag}`);
}

// A shield scaling with the target's max HP (The Blackest Night: 25%)
// tops out at the same % on every target; a potency-based one doesn't.
console.log('\n== 4. Shield size per application, % of the target\'s max HP (catalog shieldPctMaxHp in brackets)');
for (const [id, apps] of [...shieldApps].sort((a, b) => STATUS.get(a[0]).entry.key.localeCompare(STATUS.get(b[0]).entry.key))) {
  const s = STATUS.get(id);
  const pcts = apps.map((a) => a.total / a.max).sort((a, b) => a - b);
  const top = pcts[pcts.length - 1];
  const atTop = pcts.filter((p) => p >= top - 0.01).length;
  const med = pcts[Math.floor(pcts.length / 2)];
  // The most common size (0.5pt bins): a fully consumed HP-scaled shield.
  const bins = new Map();
  for (const p of pcts) { const b = Math.round(p * 200) / 200; bins.set(b, (bins.get(b) || 0) + 1); }
  const [mode, modeN] = [...bins].sort((a, b) => b[1] - a[1])[0];
  const cat = s.entry.shieldPctMaxHp;
  const flag = cat === undefined ? '' : Math.abs(cat - mode) <= 0.005 ? '  ok' : '  <-- differs from catalog';
  console.log(`  ${s.entry.key} / ${s.status.name}(${id}) [${cat === undefined ? '-' : `${Math.round(cat * 100)}%`}]: n=${pcts.length} ` +
    `most common ${(mode * 100).toFixed(1)}% (${Math.round(100 * modeN / pcts.length)}%) max ${(top * 100).toFixed(1)}% (${atTop} within 1pt) median ${(med * 100).toFixed(1)}%${flag}`);
}
