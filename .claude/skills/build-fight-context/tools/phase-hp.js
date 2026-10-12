// Per pull and phase, each enemy the raid hit: max HP, damage dealt, HP%
// at its first and last hit, and when it first went under 75/50/30/25/20/
// 15/10/5/0%. Read from players' hits (healthAfter / maxHealth). For
// finding a phase's pool (dealt ≈ max HP on every kill = a fixed pool),
// its check (where passes and enrages sit), and holds (an HP curve that
// slows to a crawl before a transition).
//
//   node .claude/skills/build-fight-context/tools/phase-hp.js <ff|wow> <code> "<boss>" [pull|all] [--target <substring>]
//
// Pull numbers are the per-boss numbering after load, not file names; use
// `all` when unsure. Instances of one add are listed separately (#2...).
// Run from the repo root. Read-only.

const path = require('path');
const { requireTsFromRoot } = require(path.join(process.cwd(), 'scripts/lib/require-ts'));
const clock = (t) => { const s = Math.round(t / 100) / 10; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };
const MARKS = [0.75, 0.5, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05, 0.001];

(async () => {
  const args = process.argv.slice(2);
  const ti = args.indexOf('--target');
  const filter = ti >= 0 ? args[ti + 1].toLowerCase() : undefined;
  const [game, code, boss, which = 'all'] = args.filter((_, i) => ti < 0 || (i !== ti && i !== ti + 1));
  const store = requireTsFromRoot('lib/sample-report-store.ts');
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const payload = await store.loadSampleReport(game === 'wow' ? 'wcl' : 'ffl', code);
  const pulls = game === 'wow'
    ? lt.transformReportToPulls(payload.fightDataList, lt.buildWCLAbilityMap(payload.report.masterData.abilities), code)
    : await lt.transformFFReportToPulls(payload.fightDataList, lt.buildFFLAbilityMap(payload.report.masterData.abilities), code, payload.report.startTime);
  const list = pulls.filter((p) => p.name === boss && (which === 'all' || p.pullNumber === Number(which)));
  if (list.length === 0) { console.log(`no pulls of "${boss}"; bosses: ${[...new Set(pulls.map((p) => p.name))].join(', ')}`); return; }
  for (const pull of list) {
    const segs = pull.phaseSegments?.length ? pull.phaseSegments : [{ phase: 0, startMs: 0, endMs: pull.fightDuration }];
    console.log(`######## pull ${pull.pullNumber} ${pull.result} ${clock(pull.fightDuration)}  phases: ${segs.map((s) => `P${s.phase} ${clock(s.startMs)}-${clock(s.endMs)}`).join(' | ')}`);
    const hits = pull.players.flatMap((p) => p.damageDone)
      .filter((e) => e.maxHealth && e.healthAfter !== undefined && !(filter && !(e.target ?? '').toLowerCase().includes(filter)))
      .sort((a, b) => a.timestamp - b.timestamp);
    for (const s of segs) {
      const by = new Map();
      for (const e of hits) {
        if (e.timestamp < s.startMs || e.timestamp > s.endMs) continue;
        const key = `${e.target}#${e.targetInstance ?? 1}`;
        const x = by.get(key) ?? { max: e.maxHealth, first: e, last: e, dealt: 0, marks: new Map() };
        x.last = e; x.dealt += e.amount ?? 0;
        for (const m of MARKS) if (e.healthAfter / e.maxHealth <= m && !x.marks.has(m)) x.marks.set(m, e.timestamp);
        by.set(key, x);
      }
      if (by.size === 0) continue;
      console.log(`  == P${s.phase}`);
      for (const [k, x] of [...by].sort((a, b) => b[1].dealt - a[1].dealt)) {
        const pct = (e) => `${(e.healthAfter / x.max * 100).toFixed(1)}%@${clock(e.timestamp)}`;
        const marks = [...x.marks].map(([m, t]) => `${m < 0.01 ? '1HP' : Math.round(m * 100) + '%'}@${clock(t)}`).join(' ');
        console.log(`    ${k.padEnd(26)} max ${(x.max / 1e6).toFixed(2)}M dealt ${(x.dealt / 1e6).toFixed(2)}M  ${pct(x.first)} → ${pct(x.last)}  ${marks}`);
      }
    }
  }
})();
