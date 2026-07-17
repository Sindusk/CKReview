// Regression harness for lib/mechanics/ffxiv/dancingmad/limitcut.ts against the raw FFLogs
// dumps in sampledata/ (gitignored). Builds PlayerInfo[] + DeathEvent[] the
// same way the real pipeline does and prints every error per log.
//
// Run from the repo root:  node scripts/validate-limitcut.js
//
// Expected results (any deviation is a regression):
//   ff/BlackHoleFailPull13 -> WHM pushed off (~+518.7s) ONLY. WHM's clone
//                             re-fired into VPR+PCT, but dead-forced
//                             re-targets are deliberately unflagged and
//                             disable the whole dash analysis for the set.
//   BlackHoleFailPull5     -> BRD pushed off (~+520.4s) ONLY (BRD's clone
//                             re-fired at DRG — same exclusion). The
//                             unrelated fall death at +56s must NOT flag.
//   ForsakenSuccess        -> RPR + PCT pushed off (~+519.3s) ONLY (their
//                             clones re-fired at SGE/PLD — same
//                             exclusion). Wipe-cascade fall deaths at
//                             +540/+557 must NOT flag.
//   ff/LimitCutFail17-9    -> BRD + BLM "Wrong Dash Position" (#6/#7 spot
//                             swap; both dashes landed 45° off their
//                             fitted slots; BRD died to the amplified
//                             mispositioned hit)
//   ff/LimitCutFailPull1   -> SMN out of position for the dashes (~5.6
//                             yalms off slot 67.5°, clipped by clone 4's
//                             chord near its spawn) — and ONLY SMN: dash
//                             8's re-fire into VPR+PLD (no victim near
//                             its slot) is fallout and must not flag VPR.
//   everything else        -> 0 errors (Limit Cut passed cleanly, or the
//                             pull wiped before it).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const ts = require(path.join(ROOT, 'node_modules', 'typescript'));

const SRC = fs.readFileSync(path.join(ROOT, 'lib', 'mechanics', 'ffxiv', 'dancingmad', 'limitcut.ts'), 'utf8');
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
  'ff/LimitCutFailPull1.json':    { 3:'DNC', 8:'DRK', 9:'SMN', 10:'PLD', 11:'WHM', 12:'RPR', 13:'SGE', 14:'VPR' },
  'ff/LimitCutFail17-9.json':     { 148:'AST', 149:'DRG', 150:'SAM', 151:'SGE', 152:'DRK', 153:'BLM', 154:'PLD', 155:'BRD' },
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
  'ff/LimitCutFail17-9.json', 'ff/LimitCutFailPull1.json',
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
