// Regression harness for lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts
// against WCL report folders in sampledata/wow/ (gitignored) produced by
// scripts/fetch-wow-report.js. Builds PlayerInfo[] / DeathEvent[] /
// EnemyEvent[] the same way the WCL pipeline does (fight-relative
// timestamps, tick→isDoT, enemyCasts "cast"-only, enemyBuffs
// "applybuff"-only), runs detectMidnightFallsErrors, and prints every
// error per pull — with REAL player names/classes/abilities resolved
// from each report folder's meta.json, not P<actorId> placeholders.
//
// Unlike the Dancing Mad harnesses, midnightfalls.ts has a RUNTIME import
// (evaluateRuleSet/suppressDuplicateRaidErrors from lib/error-detection.ts),
// so this transpiles that module (and its error-rules dependency) too and
// wires them together with a tiny require shim. Also loads lib/spec-data.ts
// (getSpecInfo) the same way, for real class/role from combatantInfo.specID.
//
// Run from the repo root:  node scripts/validate-midnightfalls.js [reportDir]
//
// With no argument, runs against every report folder found under
// sampledata/wow/ (any subdirectory containing a meta.json — see
// scripts/lib/load-report-folder.js). Pass a specific folder to narrow to
// one report. Every pull in a folder is processed regardless of boss name
// — detectMidnightFallsErrors self-gates on Midnight Falls debuff
// signatures, so a non-Midnight-Falls pull just reports 0 errors safely.
//
// 2026-07-17: sampledata/wow/7-16/ (the hand-copied, partially-truncated
// captures previously validated here) was deleted and replaced with a
// full-session capture fetched via scripts/fetch-wow-report.js — no
// verified expected-results table exists yet for the new data; that's
// the next session's job. This harness's role for now is regression
// protection (no crashes, no exceptions) plus a quick per-pull error
// summary to sanity-check the new capture pipeline end-to-end.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap } = require('./lib/load-report-folder');

function transpile(relPath) {
  const src = fs.readFileSync(path.join(ROOT, ...relPath.split('/')), 'utf8');
  return ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
}

function loadModule(relPath, shims) {
  const mod = { exports: {} };
  const fakeRequire = (spec) => {
    if (shims[spec]) return shims[spec];
    return require(spec);
  };
  new Function('exports', 'require', 'module', transpile(relPath))(mod.exports, fakeRequire, mod);
  return mod.exports;
}

// types/PullError has runtime exports but none used by these modules —
// type-only imports are erased at transpile time, so an empty shim works.
const errorRules     = loadModule('lib/error-rules.ts', { '@/types/PullError': {} });
const errorDetection = loadModule('lib/error-detection.ts', { './error-rules': errorRules });
const midnightfalls  = loadModule('lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts', {
  '../../../error-detection': errorDetection,
});
const { detectMidnightFallsErrors } = midnightfalls;
const { getSpecInfo } = loadModule('lib/spec-data.ts', {});

const WOW_DATA_DIR = path.join(ROOT, 'sampledata', 'wow');

function fightStartOf(rep) {
  let t0 = Infinity;
  for (const k of Object.keys(rep)) {
    for (const e of (rep[k]?.data ?? [])) if (e.timestamp < t0) t0 = e.timestamp;
  }
  return t0 === Infinity ? 0 : t0;
}

function buildAll(rep, actorMap, abilityMap) {
  const t0 = fightStartOf(rep);
  const playerIds = [...new Set((rep.combatantInfo?.data ?? []).map((e) => e.sourceID))];
  const specByPlayer = new Map((rep.combatantInfo?.data ?? []).map((e) => [e.sourceID, e.specID ?? 0]));
  const abilityName = (id) => abilityMap.get(id) ?? `Ability ${id}`;
  const playerName = (id) => actorMap.get(id)?.name || `P${id}`;

  const players = playerIds.map((id) => {
    const spec = getSpecInfo(specByPlayer.get(id) ?? 0);
    return {
      actorId: id,
      name: playerName(id),
      className: spec.className,
      specId: specByPlayer.get(id) ?? 0,
      specName: spec.name,
      role: spec.role,
      rangeType: spec.rangeType,
      game: 'wow',
      damageDone: [], healing: [], casts: [],
      damageTaken: (rep.damageTaken?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        amount: e.amount ?? 0,
        overkill: e.overkill,
        isDoT: e.tick === true,
      })),
      debuffs: (rep.debuffs?.data ?? []).filter((e) => e.targetID === id).map((e) => ({
        timestamp: e.timestamp - t0,
        abilityId: e.abilityGameID ?? 0,
        abilityName: abilityName(e.abilityGameID ?? 0),
        debuffStatus:
          e.type === 'removedebuff' ? 'removed' :
          e.type === 'applydebuffstack' ? 'stack' :
          e.type === 'removedebuffstack' ? 'stackRemoved' : 'applied',
      })),
    };
  });

  const deaths = (rep.deaths?.data ?? []).map((e) => {
    const spec = getSpecInfo(specByPlayer.get(e.targetID) ?? 0);
    return {
      timestamp: e.timestamp - t0,
      player: playerName(e.targetID),
      class: spec.className, specId: specByPlayer.get(e.targetID) ?? 0, role: spec.role,
      killingAbilityGameId: e.killingAbilityGameID ?? 0,
      cause: abilityName(e.killingAbilityGameID ?? 0),
    };
  });

  const enemyCasts = (rep.enemyCasts?.data ?? []).filter((e) => e.type === 'cast').map((e) => ({
    timestamp: e.timestamp - t0,
    actorId: e.sourceID,
    actorName: actorMap.get(e.sourceID)?.name || `NPC${e.sourceID}`,
    abilityId: e.abilityGameID ?? 0,
    abilityName: abilityName(e.abilityGameID ?? 0),
  }));

  const enemyBuffs = (rep.enemyBuffs?.data ?? []).filter((e) => e.type === 'applybuff').map((e) => ({
    timestamp: e.timestamp - t0,
    actorId: e.targetID,
    actorName: actorMap.get(e.targetID)?.name || `NPC${e.targetID}`,
    abilityId: e.abilityGameID ?? 0,
    abilityName: abilityName(e.abilityGameID ?? 0),
  }));

  return { players, deaths, enemyCasts, enemyBuffs };
}

const explicitDir = process.argv[2] ? path.resolve(process.argv[2]) : null;
const reportDirs = explicitDir ? [explicitDir] : discoverReportFolders(WOW_DATA_DIR);

if (reportDirs.length === 0) {
  console.log(`No report folders found under ${WOW_DATA_DIR} (looked for subdirectories containing meta.json).`);
  console.log('Fetch one with: node scripts/fetch-wow-report.js <reportCode>');
  process.exit(0);
}

for (const dir of reportDirs) {
  const loaded = loadReportFolder(dir);
  if (!loaded) { console.log(`${dir} -> no meta.json, skipping`); continue; }
  const { meta, pulls } = loaded;
  const actorMap = buildActorMap(meta);
  const abilityMap = buildAbilityMap(meta);

  console.log('#'.repeat(70));
  console.log(`${meta.title ?? meta.code} (${dir})`);
  console.log(`  ${pulls.length} pull(s)`);

  for (const { bossName, pullNumber, rep } of pulls) {
    const { players, deaths, enemyCasts, enemyBuffs } = buildAll(rep, actorMap, abilityMap);
    const errors = detectMidnightFallsErrors(players, deaths, enemyCasts, enemyBuffs);
    console.log('='.repeat(70));
    console.log(`${bossName} Pull ${pullNumber} ->`, errors.length, 'errors');
    for (const e of errors) {
      console.log(`  [${e.severity}] [${e.ruleId}] t=+${(e.timestamp / 1000).toFixed(1)}s ${e.player ?? '(raid)'}: ${e.name}`);
      // Light's End descriptions carry the detonation-source attribution —
      // print them so regressions in annotateLightsEndSources are visible.
      if (e.ruleId === 'wow-raid-lights-end') console.log(`      ${e.description}`);
    }
  }
}
