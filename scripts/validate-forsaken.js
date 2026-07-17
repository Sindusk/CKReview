// Regression harness for lib/mechanics/ffxiv/dancingmad/forsaken.ts against the raw FFLogs
// dumps in sampledata/ (gitignored). Builds PlayerInfo[] the same way the
// real pipeline does (onlyLanded filter, debuffStatus mapping,
// sourceInstance/x/y plumbing), runs detectForsakenTowerErrors, and prints
// every error per log.
//
// Run from the repo root:  node scripts/validate-forsaken.js
//
// Expected results (any deviation is a regression):
//   ForsakenSuccess        -> 0 errors
//   ForsakenPull1Fail      -> PLD + PCT wrong-tower (#8)
//   ForsakenPull8Fail      -> PLD missed (#7); DNC + SGE missed (#8)
//   Forsaken3Playertower   -> SCH extra-player (#3) only
//   ForsakenPull2Fail      -> DRK wrong-spot (#5)
//   ForsakenPull10Fail     -> DRK wrong-tower (#8); PCT wrong-spot (#8)
//   ForsakenSuccessPull1   -> 0 errors (deep-but-clean Stack anchor at #7)
//   ForsakenSuccessPull7   -> 0 errors (shallow-but-clean Cone flare at #5)
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));

const SRC = fs.readFileSync(path.join(ROOT, 'lib', 'mechanics', 'ffxiv', 'dancingmad', 'forsaken.ts'), 'utf8');
const out = ts.transpileModule(SRC, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const mod = { exports: {} };
new Function('exports', 'require', 'module', out.outputText)(mod.exports, require, mod);
const { detectForsakenTowerErrors } = mod.exports;

const JOBS = {
  default:               { 4:'DNC', 37:'PLD', 38:'SCH', 39:'SGE', 40:'RPR', 41:'PCT', 42:'VPR', 43:'DRK' },
  'ForsakenPull2Fail.json':  { 11:'DNC', 12:'DRK', 13:'PLD', 14:'AST', 15:'VPR', 16:'PCT', 17:'RPR', 18:'SGE' },
  'ForsakenPull10Fail.json': { 11:'DNC', 12:'DRK', 13:'PLD', 14:'AST', 15:'VPR', 16:'PCT', 17:'RPR', 18:'SGE' },
  'ForsakenSuccessPull1.json': { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'ForsakenSuccessPull7.json': { 177:'AST', 178:'DRK', 179:'PLD', 180:'BLM', 181:'SAM', 182:'BRD', 183:'SGE', 184:'DRG' },
  'ff/ForsakenFail17-4.json':  { 148:'AST', 149:'DRG', 150:'SAM', 151:'SGE', 152:'DRK', 153:'BLM', 154:'PLD', 155:'BRD' },
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
      abilityName: 'Assignment ' + (e.abilityGameID % 100),
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

for (const f of ['ForsakenPull1Fail.json', 'ForsakenSuccess.json', 'ForsakenPull8Fail.json', 'Forsaken3Playertower.json', 'ForsakenPull2Fail.json', 'ForsakenPull10Fail.json', 'ForsakenSuccessPull1.json', 'ForsakenSuccessPull7.json', 'ff/ForsakenFail17-4.json']) {
  JOB = JOBS[f] ?? JOBS.default;
  const rep = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')).json.data.reportData.report;
  const errors = detectForsakenTowerErrors(buildPlayers(rep), buildDeaths(rep));
  console.log('='.repeat(70));
  console.log(f, '->', errors.length, 'errors');
  for (const e of errors) {
    console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player}: ${e.description}`);
  }
}
