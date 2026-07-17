// scripts/lib/load-report-folder.js
//
// Shared loader for report folders produced by scripts/fetch-wow-report.js /
// scripts/fetch-ff-report.js: a directory containing meta.json (report +
// fights + masterData, fetched once) plus one "<Boss>_Pull<N>.json" per
// fight. Used by every validate-*.js harness so the "discover files, merge
// pages, tolerate blank/corrupt captures" logic exists in exactly one
// place instead of copy-pasted per harness (which is how the old
// discover7_16Pulls in validate-midnightfalls.js started out).
//
// Multi-page grouping ("<Boss>_Pull<N>P<M>.json") is kept for resilience
// even though the fetch scripts always write one fully-merged file per
// fight today — costs nothing and matches some older hand-copied captures.

const fs = require('fs');
const path = require('path');

const STREAM_KEYS = ['deaths', 'combatantInfo', 'casts', 'damageDone', 'damageTaken', 'healing', 'debuffs', 'enemyCasts', 'enemyBuffs'];

function readJsonReport(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  if (raw.trim().length === 0) return null;
  try {
    return JSON.parse(raw).json.data.reportData.report;
  } catch (err) {
    console.warn(`  WARNING: ${filePath} failed to parse (${err.message}) — skipping`);
    return null;
  }
}

function mergeReports(reports) {
  const merged = {};
  for (const key of STREAM_KEYS) {
    merged[key] = { data: reports.flatMap((r) => r[key]?.data ?? []) };
  }
  return merged;
}

/** Every immediate subdirectory of `baseDir` that contains a meta.json — i.e. every fetched report folder. */
function discoverReportFolders(baseDir) {
  if (!fs.existsSync(baseDir)) return [];
  return fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(baseDir, d.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'meta.json')))
    .sort();
}

/**
 * Loads one report folder: { meta, pulls: [{ bossName, pullNumber, rep }] }.
 * `rep` has the same `{ <stream>: { data: [...] } }` shape a raw dump's
 * `.json.data.reportData.report` has, pages pre-merged. Pulls are sorted
 * by boss name then pull number. Blank/corrupt files are skipped with a
 * console warning rather than throwing.
 */
function loadReportFolder(dir) {
  const metaPath = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaPath)) return null;
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

  const groups = new Map(); // "boss::pullNumber" -> { bossName, pullNumber, pages: [{page, filePath}] }
  for (const name of fs.readdirSync(dir)) {
    const m = name.match(/^(.*)_Pull(\d+)(?:P(\d+))?\.json$/);
    if (!m) continue;
    const [, bossName, pullNumStr, pageStr] = m;
    const pullNumber = Number(pullNumStr);
    const page = pageStr ? Number(pageStr) : 1;
    const key = `${bossName}::${pullNumber}`;
    const group = groups.get(key) ?? { bossName, pullNumber, pages: [] };
    group.pages.push({ page, filePath: path.join(dir, name) });
    groups.set(key, group);
  }

  const pulls = [];
  for (const { bossName, pullNumber, pages } of groups.values()) {
    pages.sort((a, b) => a.page - b.page);
    const reports = pages.map((p) => readJsonReport(p.filePath)).filter((r) => r !== null);
    if (reports.length === 0) {
      console.warn(`  WARNING: ${bossName} Pull ${pullNumber} — all ${pages.length} page(s) empty/unparseable, skipping`);
      continue;
    }
    if (reports.length < pages.length) {
      console.warn(`  WARNING: ${bossName} Pull ${pullNumber} — only ${reports.length}/${pages.length} page(s) readable, results may be incomplete`);
    }
    pulls.push({ bossName, pullNumber, rep: mergeReports(reports) });
  }
  pulls.sort((a, b) => a.bossName.localeCompare(b.bossName) || a.pullNumber - b.pullNumber);

  return { meta, pulls };
}

/** actorId -> raw actor record ({id, name, type, subType}) from meta.masterData.actors. */
function buildActorMap(meta) {
  return new Map(meta.masterData.actors.map((a) => [a.id, a]));
}

/** abilityGameID -> ability name from meta.masterData.abilities. */
function buildAbilityMap(meta) {
  return new Map(meta.masterData.abilities.map((a) => [a.gameID, a.name]));
}

module.exports = { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap, STREAM_KEYS };
