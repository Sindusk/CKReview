// Regression harness for lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts
// against the raw WCL dumps in sampledata/wow/ (gitignored). Builds
// PlayerInfo[] / DeathEvent[] / EnemyEvent[] the same way the WCL pipeline
// does (fight-relative timestamps, tick→isDoT, enemyCasts "cast"-only,
// enemyBuffs "applybuff"-only), runs detectMidnightFallsErrors, and prints
// every error per log.
//
// Unlike the Dancing Mad harnesses, midnightfalls.ts has a RUNTIME import
// (evaluateRuleSet/suppressDuplicateRaidErrors from lib/error-detection.ts),
// so this transpiles that module (and its error-rules dependency) too and
// wires them together with a tiny require shim.
//
// Run from the repo root:  node scripts/validate-midnightfalls.js
//
// Players are labeled P<actorId> — these dumps carry no roster names.
//
// Expected results (any deviation is a regression):
//   7-16/MFPull4   -> P9 Heaven's Glaives death (+91s); P2 Death to Dark
//                     Quasar (+199.5s); ONE Light's End raid error
//                     (+201.9s — 18 near-simultaneous hits deduped)
//   7-16/MFPull11  -> P15 Death to Dark Quasar (+125.2s); ONE Dissonance
//                     raid error attributed to P14 (+174.5s — first of 4
//                     recipients within 0.5s, rest suppressed as chain
//                     fallout); ONE Light's End raid error (+183.7s)
//   7-16/MFPull13  -> P10/P28/P6 Heaven's Glaives deaths (+94-95s); ONE
//                     Light's End raid error (+95.3s; the second
//                     detonation at +99.1s only landed 0/81k hits on the
//                     already-dead raid, filtered by minEffectiveDamage);
//                     ONE Naaru's Lament raid error (+97.8s — 13 hits
//                     deduped)
//   7-16/MFPull21  -> P17 Caught in Starsplinter (+195.0s, ~487k splash
//                     attributed to P22's detonation 0.28s earlier); TWO
//                     Light's End raid errors (+215.0s and +220.7s — two
//                     separate crystals 5.7s apart, correctly NOT deduped)
//   7-16/MFPull22, MFPull33 -> 0 errors (stale-cursor captures, event
//                     streams empty)
//   MFDissonanceFailPull1    -> ONE Dissonance raid error (was 5 before
//                               dedup) + any Light's End/Naaru's fallout
//                               errors present in that log
//   MFDissonanceSuccessPull55-> no Dissonance error
//   MFTerminateFailPull2     -> ONE Terminate Cast raid error
//   MFLightsEndPull31        -> Light's End + Naaru's Lament raid errors
//                               (one each)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));

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

const DATA_DIR = path.join(ROOT, 'sampledata', 'wow');

function fightStartOf(rep) {
  let t0 = Infinity;
  for (const k of Object.keys(rep)) {
    for (const e of (rep[k]?.data ?? [])) if (e.timestamp < t0) t0 = e.timestamp;
  }
  return t0 === Infinity ? 0 : t0;
}

function buildAll(rep) {
  const t0 = fightStartOf(rep);
  const playerIds = [...new Set((rep.combatantInfo?.data ?? []).map(e => e.sourceID))];

  const players = playerIds.map(id => ({
    actorId: id,
    name: `P${id}`,
    className: '?',
    specId: 0, specName: '', role: 'DPS', rangeType: 'Melee', game: 'wow',
    damageDone: [], healing: [], casts: [],
    damageTaken: (rep.damageTaken?.data ?? []).filter(e => e.targetID === id).map(e => ({
      timestamp: e.timestamp - t0,
      abilityId: e.abilityGameID ?? 0,
      abilityName: '',
      amount: e.amount ?? 0,
      overkill: e.overkill,
      isDoT: e.tick === true,
    })),
    debuffs: (rep.debuffs?.data ?? []).filter(e => e.targetID === id).map(e => ({
      timestamp: e.timestamp - t0,
      abilityId: e.abilityGameID ?? 0,
      abilityName: '',
      debuffStatus:
        e.type === 'removedebuff' ? 'removed' :
        e.type === 'applydebuffstack' ? 'stack' :
        e.type === 'removedebuffstack' ? 'stackRemoved' : 'applied',
    })),
  }));

  const deaths = (rep.deaths?.data ?? []).map(e => ({
    timestamp: e.timestamp - t0,
    player: `P${e.targetID}`,
    class: '?', specId: 0, role: 'DPS',
    killingAbilityGameId: e.killingAbilityGameID ?? 0,
    cause: '',
  }));

  const enemyCasts = (rep.enemyCasts?.data ?? []).filter(e => e.type === 'cast').map(e => ({
    timestamp: e.timestamp - t0,
    actorId: e.sourceID,
    actorName: `NPC${e.sourceID}`,
    abilityId: e.abilityGameID ?? 0,
    abilityName: '',
  }));

  const enemyBuffs = (rep.enemyBuffs?.data ?? []).filter(e => e.type === 'applybuff').map(e => ({
    timestamp: e.timestamp - t0,
    actorId: e.targetID,
    actorName: `NPC${e.targetID}`,
    abilityId: e.abilityGameID ?? 0,
    abilityName: '',
  }));

  return { players, deaths, enemyCasts, enemyBuffs };
}

const FILES = [
  '7-16/MFPull4.json', '7-16/MFPull11.json', '7-16/MFPull13.json',
  '7-16/MFPull21.json', '7-16/MFPull22.json', '7-16/MFPull33.json',
  'MFDissonanceFailPull1.json', 'MFDissonanceSuccessPull55.json',
  'MFTerminateFailPull2.json', 'MFLightsEndPull31.json',
];

for (const f of FILES) {
  const filePath = path.join(DATA_DIR, ...f.split('/'));
  if (!fs.existsSync(filePath)) { console.log(f, '-> MISSING'); continue; }
  const rep = JSON.parse(fs.readFileSync(filePath, 'utf8')).json.data.reportData.report;
  const { players, deaths, enemyCasts, enemyBuffs } = buildAll(rep);
  const errors = detectMidnightFallsErrors(players, deaths, enemyCasts, enemyBuffs);
  console.log('='.repeat(70));
  console.log(f, '->', errors.length, 'errors');
  for (const e of errors) {
    console.log(`  [${e.severity}] [${e.ruleId}] t=+${(e.timestamp / 1000).toFixed(1)}s ${e.player ?? '(raid)'}: ${e.name}`);
  }
}
