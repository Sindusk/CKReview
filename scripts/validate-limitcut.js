// Regression harness for lib/mechanics/limitcut.ts against the raw FFLogs
// dumps in sampledata/ (gitignored). Builds PlayerInfo[] + DeathEvent[] the
// same way the real pipeline does and prints every error per log.
//
// Run from the repo root:  node scripts/validate-limitcut.js
//
// Expected results (any deviation is a regression):
//   ff/BlackHoleFailPull13 -> WHM pushed off (~+518.7s, fall death 2.5s
//                             after the gaze resolution)
//   BlackHoleFailPull5     -> BRD pushed off (~+520.4s). The same log's
//                             unrelated fall death at +56s must NOT flag.
//   ForsakenSuccess        -> RPR + PCT pushed off (~+519.3s) — that pull
//                             cleared Forsaken but failed Limit Cut; its
//                             later wipe-cascade fall deaths at +540/+557
//                             are outside the grace window and must NOT
//                             flag.
//   everything else        -> 0 errors (Limit Cut passed, or the pull
//                             wiped before it)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));

const SRC = fs.readFileSync(path.join(ROOT, 'lib', 'mechanics', 'limitcut.ts'), 'utf8');
const out = ts.transpileModule(SRC, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const mod = { exports: {} };
new Function('exports', 'require', 'module', out.outputText)(mod.exports, require, mod);
const { detectLimitCutErrors } = mod.exports;

const JOBS = {
  default:               { 4:'DNC', 37:'PLD', 38:'SCH', 39:'SGE', 40:'RPR', 41:'PCT', 42:'VPR', 43:'DRK' },
  'ForsakenPull2Fail.json':  { 11:'DNC', 12:'DRK', 13:'PLD', 14:'AST', 15:'VPR', 16:'PCT', 17:'RPR', 18:'SGE' },
  'ForsakenPull10Fail.json': { 11:'DNC', 12:'DRK', 13:'PLD', 14:'AST', 15:'VPR', 16:'PCT', 17:'RPR', 18:'SGE' },
  'ForsakenSuccessPull1.json':    { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'ForsakenSuccessPull7.json':    { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'BlackHoleFailPull5.json':      { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'BlackHoleSuccessPull14.json':  { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'ff/BlackHoleFailPull13.json':  { 3:'DNC', 8:'DRK', 10:'PLD', 11:'WHM', 12:'RPR', 13:'SGE', 14:'VPR', 39:'PCT' },
  'ff/BlackHoleFailPull21.json':  { 3:'DNC', 8:'DRK', 10:'PLD', 11:'WHM', 12:'RPR', 13:'SGE', 14:'VPR', 39:'PCT' },
};
let JOB = JOBS.default;
const DATA_DIR = path.join(ROOT, 'sampledata');

function buildPlayers(rep) {
  const playerIds = [...new Set(rep.combatantInfo.data.map(e => e.sourceID))];
  const statusMap = { removedebuff: 'removed', applydebuffstack: 'stack', removedebuffstack: 'stackRemoved' };
  return playerIds.map(id => ({
    actorId: id,
    name: JOB[id] ?? `P${id}`,
    className: JOB[id] ?? '?',
    specId: 0, specName: '', role: 'DPS', rangeType: 'Melee', game: 'ffxiv',
    damageDone: [], healing: [], casts: [], damageTaken: [],
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
  'ff/BlackHoleFailPull13.json', 'BlackHoleFailPull5.json', 'BlackHoleSuccessPull14.json',
  'ff/BlackHoleFailPull21.json', 'ForsakenSuccess.json', 'ForsakenSuccessPull1.json',
  'ForsakenSuccessPull7.json', 'ForsakenPull1Fail.json', 'ForsakenPull8Fail.json',
  'Forsaken3Playertower.json', 'ForsakenPull2Fail.json', 'ForsakenPull10Fail.json',
];
for (const f of FILES) {
  JOB = JOBS[f] ?? JOBS.default;
  const rep = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')).json.data.reportData.report;
  const errors = detectLimitCutErrors(buildPlayers(rep), buildDeaths(rep));
  console.log('='.repeat(70));
  console.log(f, '->', errors.length, 'errors');
  for (const e of errors) {
    console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player ?? '(raid)'}: ${e.description}`);
  }
}
