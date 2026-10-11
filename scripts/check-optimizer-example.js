// scripts/check-optimizer-example.js — the mitigation optimizer's synthetic
// test (lib/mitigation/optimize.ts): the user's three-hit example
// (2026-10-11). Three magical raidwides 20s apart; the party uses Feint (90s)
// on hit 1 and Kerachole (30s) on hit 2 and has nothing for hit 3, which
// lands under. Kerachole on hit 1 and Feint on hit 2 bring Kerachole back in
// time for hit 3: three changes, and the first on its own makes a hit worse,
// so a one-step planner can't find it.
//
// Built from a real pull (Red Hot and Deep Blue, report d3vRbwfpNBLzJ2Xh,
// needs its sampledata): its players, with their Feint and Kerachole casts
// rewritten, and three Divers' Dare hits (Red Hot's copy, which Red Hot
// Feint reaches) with hand-set damage. The search is narrowed to Feint and
// Kerachole. Exits 1 when the expected plan isn't found.
//
// Usage: node scripts/check-optimizer-example.js

const { requireTsFromRoot } = require('./lib/require-ts');
const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const ag = requireTsFromRoot('lib/mitigation/aggregate.ts');
const op = requireTsFromRoot('lib/mitigation/optimize.ts');
const dr = requireTsFromRoot('lib/mitigation/debuff-reach.ts');
const { FFXIV_MITIGATION: G } = requireTsFromRoot('lib/mitigation/ffxiv-catalog.ts');

const CODE = 'd3vRbwfpNBLzJ2Xh';
const FEINT = { status: 1001195, action: 7549, player: 'Sayacissa Morsaelth' };
const KERACHOLE = { status: 1002618, action: 24298, player: 'Sin Dusk' };
const RAW = 88_000;      // per target, before mitigation
const MAX_HP = 100_000;
const HITS = [300_000, 320_000, 340_000];

function makeHit(n, atMs, statusId, caster, key, name, factor) {
  const damage = Math.round(RAW * factor);
  return (players) => {
    const targets = players.map((p, i) => {
      const t = atMs + i * 45;
      return {
        player: p.name, job: p.className, tank: p.role === 'Tank', maxHealth: MAX_HP, healthBefore: MAX_HP,
        healthAfter: MAX_HP - damage, damage, absorbed: 0, unmitigated: RAW, multiplier: factor, catalogProduct: factor,
        consistent: true, margin: (MAX_HP - damage) / MAX_HP, laterDrop: 0, died: false, vulnerable: false, invulnerable: false,
        statusIds: statusId ? [statusId] : [], shieldAbsorbs: [],
        parts: [{ abilityName: "Divers' Dare", source: 'Red Hot', timestampMs: t, damage, absorbed: 0, healthAfter: MAX_HP - damage,
          column: 'magical', statusIds: statusId ? [statusId] : [], shieldAbsorbs: [] }],
      };
    });
    const margin = (MAX_HP - damage) / MAX_HP;
    return {
      id: `|Example#${n}`, abilityId: 1, abilityName: 'Example', abilityNames: ["Divers' Dare"], occurrence: n,
      timestampMs: atMs, endMs: atMs + 400, damageColumn: 'magical', sequenceId: n, waves: 1, tankOnly: false,
      targets, active: statusId ? [{ key, name, kind: 'partyBuff', casters: [caster], targets: targets.length }] : [],
      players: [], totalDamage: damage * targets.length, rawDamage: RAW, takenDamage: damage, absorbedDamage: 0,
      lowestBefore: 1, margin, sequenceMargin: margin, deaths: 0, cleanDeaths: 0,
      verdict: margin < 0.15 ? 'under' : margin < 0.3 ? 'good' : 'over',
      droppable: { keys: [], names: [], worstMargin: margin, alternatives: [], candidates: 0 }, note: '',
    };
  };
}

(async () => {
  const payload = await store.loadSampleReport('ffl', CODE);
  const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
  const real = lt.transformFFReportToPulls(payload.fightDataList, abilityMap, CODE).filter((p) => p.name === 'Red Hot and Deep Blue');
  const reach = dr.buildDebuffReach(real, G);
  const src = real[real.length - 1];

  const players = src.players.map((p) => {
    const casts = p.casts.filter((c) => c.abilityId !== FEINT.action && c.abilityId !== KERACHOLE.action);
    if (p.name === FEINT.player) casts.push({ ...p.casts[0], abilityId: FEINT.action, timestamp: HITS[0] - 2000 });
    if (p.name === KERACHOLE.player) casts.push({ ...p.casts[0], abilityId: KERACHOLE.action, timestamp: HITS[1] - 2000 });
    return { ...p, casts: casts.sort((a, b) => a.timestamp - b.timestamp) };
  });
  const builders = [
    makeHit(1, HITS[0], FEINT.status, FEINT.player, 'feint', 'Feint', 0.95),
    makeHit(2, HITS[1], KERACHOLE.status, KERACHOLE.player, 'kerachole', 'Kerachole', 0.90),
    makeHit(3, HITS[2], null, null, null, null, 1),
  ];
  const window = [1, 2, 3].map((i) => {
    const pull = { ...src, id: 9000 + i, pullNumber: i, players, deathEvents: [] };
    return { pull, pullId: pull.id, pullNumber: i, durationMs: 400_000, hits: builders.map((b) => b(players)) };
  });
  const rows = ag.aggregateMitigation(window, G, reach);
  const only = (entry) => entry.key === 'feint' || entry.key === 'kerachole';
  const plan = op.partyPlan(window, rows, window.map((w) => w.hits), G, reach, only);

  const pct = (x) => `${Math.round(x * 100)}%`;
  console.log(`failing ${plan.summary.before.failing} -> ${plan.summary.after.failing}; ${plan.evaluated} plans`);
  const lines = [];
  for (const g of plan.groups) {
    for (const c of g.changes) {
      const line = `${c.kind} ${c.name}${c.from ? ` #${c.from.occurrence}` : ''} -> #${c.to.occurrence}${c.gated ? ` [needs ${c.gated}]` : ''}`;
      lines.push(line);
      console.log(`  group(${g.purpose}) ${line} fits ${c.legal}/${c.pulls}`);
    }
    for (const h of g.hits) console.log(`    #${h.hit.occurrence}: ${pct(h.before.median)} -> ${pct(h.after.median)}`);
  }
  const want = ['move Kerachole #2 -> #1', 'move Feint #1 -> #2', 'add Kerachole -> #3 [needs Addersgall]'];
  const ok = plan.summary.after.failing === 0 && plan.groups.length === 1
    && want.every((w) => lines.includes(w)) && lines.length === want.length;
  console.log(ok ? 'PASS' : `FAIL: expected one group with ${want.join('; ')}`);
  process.exit(ok ? 0 : 1);
})();
