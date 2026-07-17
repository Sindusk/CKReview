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
// ── sampledata/wow/7-16/ naming ─────────────────────────────────────────
// Files there follow "MFPull<AppPullNumber>P<PageNumber>.json" — the pull
// number matches the app's own per-boss "Pull N" numbering (see
// buildFightLogLabels in lib/wcl-client.ts), NOT the raw WCL fight.id the
// files used before 2026-07-17 (fight.id is a global index across every
// encounter in the whole report, which drifts from the app's per-boss
// count whenever other bosses were attempted in between — e.g. old
// "MFPull13.json"/fight-id-13 is actually app Pull 12; old
// "MFPull21.json"/fight-id-21 is actually app Pull 19). A page-less name
// (no "P<n>" suffix) is an older single-page-only capture predating the
// merged-dump console logging change; the harness treats it as page 1 of
// a 1-page group. Every stream's .data arrays are concatenated across a
// pull's pages before building players/deaths/events — see mergeReport().
//
// Expected results (any deviation is a regression) — ONLY for pulls that
// have actually been analyzed; others intentionally omitted pending
// review, not because they're assumed to produce 0 errors:
//   7-16 Pull 4   -> P9 Heaven's Glaives death (+91s); P2 Death to Dark
//                    Quasar (+199.5s); ONE Light's End raid error
//                    (+201.9s — 18 near-simultaneous hits deduped),
//                    description names P14's Starsplinter detonation
//                    0.28s earlier as the breaker
//   7-16 Pull 11  -> P15 Death to Dark Quasar (+125.2s); ONE Dissonance
//                    raid error attributed to P14 (+174.5s — first of 4
//                    recipients within 0.5s, rest suppressed as chain
//                    fallout); ONE Light's End raid error (+183.7s),
//                    description notes carrier P6 dying with the crystal
//   7-16 Pull 12  -> (formerly captured as fight-id 13/"MFPull13.json";
//                    now correctly named MFPull12P1.json — same data)
//                    P10/P28/P6 Heaven's Glaives deaths (+94-95s); ONE
//                    Light's End raid error (+95.3s; the second
//                    detonation at +99.1s only landed 0/81k hits on the
//                    already-dead raid, filtered by minEffectiveDamage),
//                    description notes carriers P10 and P6 dying with
//                    crystals in hand (their Glaives deaths stripped
//                    Glimmering 0.96s/0.12s before the LE); ONE Naaru's
//                    Lament raid error (+97.8s — 13 hits deduped)
//   7-16 Pull 19  -> (page 1 formerly captured as fight-id 21/
//                    "MFPull21.json"; page 2 is a NEW addition not
//                    previously analyzed — re-verify this pull's full
//                    output before trusting it) previously observed on
//                    page 1 alone: P17 Caught in Starsplinter (+195.0s,
//                    ~487k splash attributed to P22's detonation 0.28s
//                    earlier); TWO Light's End raid errors (+215.0s and
//                    +220.7s — two separate crystals 5.7s apart,
//                    correctly NOT deduped): #1 names P2's detonation
//                    0.11s earlier (P2 had dropped their own crystal at
//                    their feet 1.2s before), #2 names P12's detonation
//                    (the other two simultaneous marker removals were
//                    death-strips of already-dead owners and must NOT be
//                    named)
//   7-16 Pull 13, Pull 21, Pull 22, Pull 33 -> NOT YET ANALYZED. Pulls 13
//                    and 21 are brand-new multi-page captures; 22 and 33
//                    replace earlier single-page captures whose event
//                    streams were empty (stale pagination cursors) with
//                    real paginated data, so their previous "0 errors"
//                    result no longer applies and must not be assumed.
//   MFDissonanceFailPull1    -> ONE Dissonance raid error (was 5 before
//                               dedup) + any Light's End/Naaru's fallout
//                               errors present in that log
//   MFDissonanceSuccessPull55-> no Dissonance error
//   MFTerminateFailPull2     -> ONE Terminate Cast raid error
//   MFLightsEndPull31        -> Light's End + Naaru's Lament raid errors
//                               (one each); the LE names carriers
//                               P27/P17/P7 dying with crystals
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
const STREAM_KEYS = ['deaths', 'combatantInfo', 'casts', 'damageDone', 'damageTaken', 'healing', 'debuffs', 'enemyCasts', 'enemyBuffs'];

/**
 * Reads one raw dump file (the {query, variables, json} console-log
 * shape) down to its report object, or null if the file is empty/corrupt
 * — e.g. a clipboard copy that silently truncated on a big pull (see
 * scripts/fetch-wow-report.js, built specifically to stop this from
 * happening for new captures). Callers should skip nulls with a warning
 * rather than crash the whole run over one bad file.
 */
function readReport(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.trim().length === 0) return null;
  try {
    return JSON.parse(raw).json.data.reportData.report;
  } catch (err) {
    console.warn(`  WARNING: ${filePath} failed to parse (${err.message}) — skipping`);
    return null;
  }
}

/** Concatenates every stream's .data array across an ordered list of page reports into one merged report. */
function mergeReports(reports) {
  const merged = {};
  for (const key of STREAM_KEYS) {
    merged[key] = { data: reports.flatMap((r) => r[key]?.data ?? []) };
  }
  return merged;
}

/**
 * Discovers every "...Pull<N>P<M>.json" (or page-less "...Pull<N>.json")
 * file in sampledata/wow/7-16/, groups by pull number N, sorts each
 * group's pages, and returns [{ label, rep }] with pages pre-merged.
 * Matches both the hand-copied "MFPull<N>.json" convention and
 * scripts/fetch-wow-report.js's "<Boss Name>_Pull<N>.json" output — the
 * regex only anchors on the "Pull<N>" suffix, not any particular prefix.
 */
function discover7_16Pulls() {
  const dir = path.join(DATA_DIR, '7-16');
  if (!fs.existsSync(dir)) return [];

  const groups = new Map(); // pullNumber -> [{page, filePath}]
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(/Pull(\d+)(?:P(\d+))?\.json$/);
    if (!m) continue;
    const pullNumber = Number(m[1]);
    const page = m[2] ? Number(m[2]) : 1;
    const list = groups.get(pullNumber) ?? [];
    list.push({ page, filePath: path.join(dir, name) });
    groups.set(pullNumber, list);
  }

  const results = [];
  for (const [pullNumber, pages] of [...groups.entries()].sort((a, b) => a[0] - b[0])) {
    pages.sort((a, b) => a.page - b.page);
    const reports = pages.map((p) => readReport(p.filePath)).filter((r) => r !== null);
    if (reports.length === 0) {
      console.warn(`  WARNING: 7-16 Pull ${pullNumber} — all ${pages.length} page(s) empty/unparseable, skipping`);
      continue;
    }
    if (reports.length < pages.length) {
      console.warn(`  WARNING: 7-16 Pull ${pullNumber} — only ${reports.length}/${pages.length} page(s) readable, results may be incomplete`);
    }
    results.push({
      label: `7-16 Pull ${pullNumber} (${reports.length}/${pages.length} page${pages.length === 1 ? '' : 's'})`,
      rep: mergeReports(reports),
    });
  }
  return results;
}

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

const FLAT_FILES = [
  'MFDissonanceFailPull1.json', 'MFDissonanceSuccessPull55.json',
  'MFTerminateFailPull2.json', 'MFLightsEndPull31.json',
];

const cases = [
  ...discover7_16Pulls(),
  ...FLAT_FILES.map((f) => ({ label: f, filePath: path.join(DATA_DIR, f) })),
];

for (const c of cases) {
  let rep = c.rep;
  if (!rep) {
    if (!fs.existsSync(c.filePath)) { console.log(c.label, '-> MISSING'); continue; }
    rep = readReport(c.filePath);
  }
  const { players, deaths, enemyCasts, enemyBuffs } = buildAll(rep);
  const errors = detectMidnightFallsErrors(players, deaths, enemyCasts, enemyBuffs);
  console.log('='.repeat(70));
  console.log(c.label, '->', errors.length, 'errors');
  for (const e of errors) {
    console.log(`  [${e.severity}] [${e.ruleId}] t=+${(e.timestamp / 1000).toFixed(1)}s ${e.player ?? '(raid)'}: ${e.name}`);
    // Light's End descriptions carry the detonation-source attribution —
    // print them so regressions in annotateLightsEndSources are visible.
    if (e.ruleId === 'wow-raid-lights-end') console.log(`      ${e.description}`);
  }
}
