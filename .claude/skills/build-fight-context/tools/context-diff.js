// What a damage context changes on one pull: unforced lost damage per
// phase, per player and kind, with the boss's context against without it,
// and every forced window the context adds (cause and span). Use it to
// confirm a new context forces only the stretches it means to.
//
//   node .claude/skills/build-fight-context/tools/context-diff.js <ff|wow> <code> "<boss>" <pull>
//
// Run from the repo root. Read-only.

const path = require('path');
const { requireTsFromRoot } = require(path.join(process.cwd(), 'scripts/lib/require-ts'));
const clock = (t) => { const s = Math.round(t / 100) / 10; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
const k = (n) => `${Math.round(n / 1000)}k`;

(async () => {
  const [game, code, boss, pullNumber] = process.argv.slice(2);
  const store = requireTsFromRoot('lib/sample-report-store.ts');
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const mod = {
    ...requireTsFromRoot('lib/damage/analyze.ts'), ...requireTsFromRoot('lib/damage/contexts.ts'),
    ...(game === 'wow' ? requireTsFromRoot('lib/damage/wow/game.ts') : requireTsFromRoot('lib/damage/ffxiv/game.ts')),
  };
  const dmgGame = game === 'wow' ? mod.WOW_DAMAGE : mod.FFXIV_DAMAGE;
  const payload = await store.loadSampleReport(game === 'wow' ? 'wcl' : 'ffl', code);
  const pulls = game === 'wow'
    ? lt.transformReportToPulls(payload.fightDataList, lt.buildWCLAbilityMap(payload.report.masterData.abilities), code)
    : await lt.transformFFReportToPulls(payload.fightDataList, lt.buildFFLAbilityMap(payload.report.masterData.abilities), code, payload.report.startTime);
  const pull = pulls.find((p) => p.name === boss && p.pullNumber === Number(pullNumber));
  if (!pull) { console.log(`no pull "${boss}" ${pullNumber}`); return; }
  const ctx = mod.getDamageContext(pull.name);
  if (!ctx) { console.log(`no damage context registered for "${pull.name}" (lib/damage/contexts.ts)`); return; }

  for (const w of ctx.forcedWindows?.(pull) ?? []) {
    console.log(`forced ${clock(w.startMs)}-${clock(w.endMs)} (${((w.endMs - w.startMs) / 1000).toFixed(1)}s): ${w.cause}${w.players ? ` [${w.players.join(', ')}]` : ''}`);
  }
  const without = mod.analyzePullDamage(pull, dmgGame);
  const withCtx = mod.analyzePullDamage(pull, dmgGame, ctx);
  for (const ph of withCtx.phases) {
    const before = without.phases.find((x) => x.phaseId === ph.phaseId);
    console.log(`P${ph.phaseId} ${ph.name}: lost ${k(before?.raidLostDamage ?? 0)} -> ${k(ph.raidLostDamage)}` +
      `${ph.context?.decidesEnrage ? ' (decides enrage)' : ''}${ph.bossHpLeft !== undefined ? `, boss HP left ${k(ph.bossHpLeft)}` : ''}`);
  }
  const sum = (a) => {
    const m = new Map();
    for (const p of a.players) for (const f of p.findings) {
      if (f.forced) continue;
      const key = `P${f.phaseId ?? '-'} ${p.job.padEnd(12)} ${f.kind}`;
      m.set(key, (m.get(key) ?? 0) + f.lostDamage);
    }
    return m;
  };
  const a = sum(without), b = sum(withCtx);
  for (const key of [...new Set([...a.keys(), ...b.keys()])].sort()) {
    const x = a.get(key) ?? 0, y = b.get(key) ?? 0;
    if (Math.abs(x - y) >= 1000) console.log(`  ${key.padEnd(36)} ${k(x)} -> ${k(y)}`);
  }
})();
