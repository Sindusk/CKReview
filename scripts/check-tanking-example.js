// scripts/check-tanking-example.js — the Tanking optimizer's synthetic test
// (lib/mitigation/tanking-plan.ts buildTankingPlan): the user's example
// (2026-10-11). Rampart is used on a buster the tank survives without it
// (Guardian is up too), and a heavy run of autos follows with nothing on
// it. Moving Rampart onto the autos saves more, and the buster stays good,
// so the plan is one change: Rampart, buster -> the autos.
//
// Built from a real pull (Vamp Fatale kill, report jN3XDrf2z8PmLgRJ, needs
// its sampledata): its players, with the Paladin's damage taken and casts
// replaced by a hand-set buster at 100s (magical, 100% of max HP raw),
// three 10% autos after it and seven 25% autos from 140s. The search is
// narrowed to the Paladin's Rampart and Guardian. Exits 1 when the
// expected plan isn't found.
//
// Usage: node scripts/check-tanking-example.js

const { requireTsFromRoot } = require('./lib/require-ts');
const store = requireTsFromRoot('lib/sample-report-store.ts');
const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
const an = requireTsFromRoot('lib/mitigation/analyze.ts');
const tk = requireTsFromRoot('lib/mitigation/tanking.ts');
const tp = requireTsFromRoot('lib/mitigation/tanking-plan.ts');
const { FFXIV_MITIGATION: G } = requireTsFromRoot('lib/mitigation/ffxiv-catalog.ts');

const CODE = 'jN3XDrf2z8PmLgRJ';
const PLD = 'Kade Kansado';
const GUARDIAN = { action: 36920, status: 1003829, r: 0.4, duration: 15_000 };
const RAMPART = { action: 7531, status: 1001191, r: 0.2, duration: 20_000 };
const BUSTER_MS = 100_000;
const CAST_MS = BUSTER_MS - 2_000;
const pct = (x) => `${Math.round(x * 100)}%`;

function damage(max, t, name, rawPct, type) {
  const statuses = [GUARDIAN, RAMPART].filter((s) => t >= CAST_MS && t - CAST_MS <= s.duration);
  const mult = statuses.reduce((m, s) => m * (1 - s.r), 1);
  const raw = Math.round(rawPct * max);
  const amount = Math.round(raw * mult);
  return {
    timestamp: t, abilityId: name === 'Attack' ? 7 : 99999, abilityName: name, source: 'Vamp Fatale',
    amount, absorbed: 0, unmitigatedAmount: raw, multiplier: mult, damageType: type,
    healthBefore: max, healthAfter: max - amount, maxHealth: max,
    statusIds: statuses.map((s) => s.status), activeBuffNames: [],
  };
}

(async () => {
  const payload = await store.loadSampleReport('ffl', CODE);
  const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
  const src = lt.transformFFReportToPulls(payload.fightDataList, abilityMap, CODE).find((p) => p.name === 'Vamp Fatale' && p.result === 'Kill');
  const max = src.players.find((p) => p.name === PLD).damageTaken.find((e) => e.maxHealth).maxHealth;
  const taken = [
    damage(max, BUSTER_MS, 'Example Buster', 1.0, 1024),
    ...[103_000, 106_000, 109_000].map((t) => damage(max, t, 'Attack', 0.10, 128)),
    ...[140, 143, 146, 149, 152, 155, 158].map((s) => damage(max, s * 1000, 'Attack', 0.25, 128)),
  ];
  const players = src.players.map((p) => {
    if (p.role !== 'Tank') return { ...p, damageTaken: [] };
    if (p.name !== PLD) return { ...p, damageTaken: [], casts: [] };
    const casts = [
      { ...p.casts[0], abilityId: GUARDIAN.action, abilityName: 'Guardian', timestamp: CAST_MS },
      { ...p.casts[0], abilityId: RAMPART.action, abilityName: 'Rampart', timestamp: CAST_MS },
    ];
    return { ...p, damageTaken: taken, casts, shieldAbsorbs: [] };
  });
  const window = [1, 2, 3].map((i) => {
    const pull = { ...src, id: 9000 + i, pullNumber: i, players, deathEvents: [], fightDuration: 200_000, enemyCasts: [], phaseSegments: undefined };
    const hits = an.analyzePullMitigation(pull, G);
    return { pull, pullId: pull.id, pullNumber: i, durationMs: 200_000, hits, tanking: tk.analyzePullTanking(pull, hits, G) };
  });
  const only = (entry, player) => player.name === PLD && (entry.key === 'rampart' || entry.key === 'guardian');
  const plan = tp.buildTankingPlan(window, G, only);

  console.log(`anchors: ${plan.anchors.map((a) => a.name).join(', ')}`);
  console.log(`busters failing ${plan.summary.before.failing} -> ${plan.summary.after.failing}, tank damage ${pct(plan.summary.before.damage)} -> ${pct(plan.summary.after.damage)}`);
  for (const g of plan.groups) {
    for (const c of g.changes) console.log(`  ${c.kind} ${c.name} (${c.player})${c.from ? ` ${c.from.name} ->` : ' on'} ${c.to.name}`);
    for (const b of g.busters) console.log(`    ${b.buster.name}: ${pct(b.before.median)} -> ${pct(b.after.median)}`);
    console.log(`    damage on touched anchors ${pct(g.damage.before)} -> ${pct(g.damage.after)}`);
  }
  const changes = plan.groups.flatMap((g) => g.changes);
  const ok = changes.length === 1 && changes[0].key === 'rampart' && changes[0].kind === 'move'
    && changes[0].from?.kind === 'buster' && changes[0].to.kind === 'autos'
    && plan.groups[0].busters.every((b) => b.after.median >= tk.TANK_MARGIN_UNDER);
  console.log(ok ? 'PASS' : 'FAIL: expected one move of Rampart from the buster to the autos, buster still good');
  process.exit(ok ? 0 : 1);
})();
