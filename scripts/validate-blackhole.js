// Regression harness for lib/mechanics/blackhole.ts against the raw FFLogs
// dumps in sampledata/ (gitignored). Builds PlayerInfo[] + DeathEvent[] the
// same way the real pipeline does (onlyLanded filter, debuffStatus mapping),
// runs detectBlackHoleErrors, and prints every error per log. Also runs the
// Forsaken sample logs through it to confirm cross-mechanic silence.
//
// Run from the repo root:  node scripts/validate-blackhole.js
//
// Expected results (any deviation is a regression):
//   BlackHoleFailPull5     -> SGE incorrect tether (#1); assigned 3-5 as
//                             First in Line + Accretion
//   BlackHoleSuccessPull14 -> 0 errors (tethers 1-8 clean; the 4th set fires
//                             mid-wipe and is suppressed by the 2+-deaths
//                             rule)
//   all Forsaken logs      -> 0 errors (those pulls died before Black Hole)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));

const SRC = fs.readFileSync(path.join(ROOT, 'lib', 'mechanics', 'blackhole.ts'), 'utf8');
const out = ts.transpileModule(SRC, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const mod = { exports: {} };
new Function('exports', 'require', 'module', out.outputText)(mod.exports, require, mod);
const { detectBlackHoleErrors } = mod.exports;

// Both Black Hole logs share the ForsakenSuccessPull1 roster.
const JOBS = {
  default:               { 4:'DNC', 37:'PLD', 38:'SCH', 39:'SGE', 40:'RPR', 41:'PCT', 42:'VPR', 43:'DRK' },
  'ForsakenPull2Fail.json':  { 11:'DNC', 12:'DRK', 13:'PLD', 14:'AST', 15:'VPR', 16:'PCT', 17:'RPR', 18:'SGE' },
  'ForsakenPull10Fail.json': { 11:'DNC', 12:'DRK', 13:'PLD', 14:'AST', 15:'VPR', 16:'PCT', 17:'RPR', 18:'SGE' },
  'ForsakenSuccessPull1.json':    { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'BlackHoleFailPull5.json':      { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'BlackHoleSuccessPull14.json':  { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
};
let JOB = JOBS.default;
const DATA_DIR = path.join(ROOT, 'sampledata');

function buildPlayers(rep) {
  const playerIds = [...new Set(rep.combatantInfo.data.map(e => e.sourceID))];
  const onlyLanded = evs => evs.filter(e => e.type === 'damage' || (e.type === 'calculateddamage' && e.unpaired === true));
  const dt = onlyLanded(rep.damageTaken.data);
  const statusMap = { removedebuff: 'removed', applydebuffstack: 'stack', removedebuffstack: 'stackRemoved' };
  return playerIds.map(id => ({
    actorId: id,
    name: JOB[id] ?? `P${id}`,
    className: JOB[id] ?? '?',
    specId: 0, specName: '', role: 'DPS', rangeType: 'Melee', game: 'ffxiv',
    damageDone: [], healing: [], casts: [],
    damageTaken: dt.filter(e => e.targetID === id).map(e => ({
      timestamp: e.timestamp,
      abilityId: e.abilityGameID ?? 0,
      abilityName: '',
      amount: e.amount ?? 0,
      sourceInstance: e.sourceInstance,
      x: e.targetResources?.x,
      y: e.targetResources?.y,
    })),
    debuffs: rep.debuffs.data.filter(e => e.targetID === id).map(e => ({
      timestamp: e.timestamp,
      abilityId: e.abilityGameID ?? 0,
      abilityName: 'Debuff ' + e.abilityGameID,
      debuffStatus: statusMap[e.type] ?? 'applied',
    })),
  }));
}

function buildDeaths(rep) {
  return rep.deaths.data.map(e => ({
    timestamp: e.timestamp,
    player: JOB[e.targetID] ?? `P${e.targetID}`,
    class: JOB[e.targetID] ?? '?',
    specId: 0, role: 'DPS',
    killingAbilityGameId: e.killingAbilityGameID ?? 0,
    cause: '',
  }));
}

const FILES = [
  'BlackHoleFailPull5.json', 'BlackHoleSuccessPull14.json',
  'ForsakenSuccess.json', 'ForsakenSuccessPull1.json', 'ForsakenPull1Fail.json',
  'ForsakenPull8Fail.json', 'Forsaken3Playertower.json', 'ForsakenPull2Fail.json', 'ForsakenPull10Fail.json',
];
for (const f of FILES) {
  JOB = JOBS[f] ?? JOBS.default;
  const rep = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')).json.data.reportData.report;
  const errors = detectBlackHoleErrors(buildPlayers(rep), buildDeaths(rep));
  console.log('='.repeat(70));
  console.log(f, '->', errors.length, 'errors');
  for (const e of errors) {
    console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
  }
}
