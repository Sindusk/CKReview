// scripts/lib/load-sample-pull.js
//
// One sample report's pulls through the app's live transform, for either
// game: sampledata/ff/<code>/ (FFLogs) or sampledata/wow/<code>/ (Warcraft
// Logs). The damage-analysis skill's tools and dump-player-events.js use
// it, so they work on a report from either game by its code alone; the
// damage game (FFXIV_DAMAGE / WOW_DAMAGE) comes with it.
//
//   const { loadPulls, loadPull } = require('./lib/load-sample-pull');
//   const { pull, game, mod } = await loadPull(code, 'Entombed Sentinels', 3);
//
// WoW pull numbers are the per-boss numbers in the file names
// ("Entombed Sentinels_Pull3.json" is Pull 3), the same numbers the app
// shows. Pulls get reportStartedAt from meta.json's startTime (WoW reports
// fetched before 2026-10-13 lack it: re-run fetch-wow-report.js, which
// skips pulls already on disk and only rewrites meta.json).

const fs = require('fs');
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./require-ts');

function gameOf(code) {
  const c = path.basename(code);
  if (fs.existsSync(path.join(ROOT, 'sampledata', 'wow', c, 'meta.json'))) return 'wow';
  if (fs.existsSync(path.join(ROOT, 'sampledata', 'ff', c))) return 'ff';
  throw new Error(`no sample report ${c} under sampledata/ff or sampledata/wow`);
}

/** WoW: one pull file through transformFightToPull (validate.js uses this too). */
function transformWowPullFile(lt, meta, abilityMap, file, pullNumber) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fight = meta.fights.find((f) => f.id === raw?.variables?.fightIDs?.[0]);
  if (!fight) return undefined;
  const s = raw.json.data.reportData.report;
  const d = (k) => s[k]?.data ?? [];
  const pull = lt.transformFightToPull({
    fight, actors: meta.masterData.actors,
    deathEvents: d('deaths'), combatantInfos: d('combatantInfo'), castEvents: d('casts'),
    damageDoneEvents: d('damageDone'), damageTakenEvents: d('damageTaken'), healingEvents: d('healing'),
    debuffEvents: d('debuffs'), enemyCastEvents: d('enemyCasts'), enemyBuffEvents: d('enemyBuffs'),
    playerBuffEvents: d('playerBuffs'), enemyDebuffEvents: d('enemyDebuffs'),
  }, abilityMap, meta.code);
  pull.pullNumber = pullNumber;
  if (meta.startTime) pull.reportStartedAt = meta.startTime;
  return pull;
}

/**
 * Every pull of a sample report (WoW: optionally only one boss / pull
 * number, since each file goes through the whole transform), plus the
 * damage game and the analysis modules.
 */
async function loadPulls(code, { boss, pullNumber } = {}) {
  const c = path.basename(code);
  const game = gameOf(c);
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const mod = {
    ...requireTsFromRoot('lib/damage/analyze.ts'), ...requireTsFromRoot('lib/damage/timeline.ts'),
    ...requireTsFromRoot('lib/damage/checks.ts'), ...requireTsFromRoot('lib/damage/contexts.ts'),
  };
  if (game === 'ff') {
    const store = requireTsFromRoot('lib/sample-report-store.ts');
    const payload = await store.loadSampleReport('ffl', c);
    const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
    const pulls = await lt.transformFFReportToPulls(payload.fightDataList, abilityMap, c, payload.report.startTime);
    return { pulls, game: requireTsFromRoot('lib/damage/ffxiv/game.ts').FFXIV_DAMAGE, gameKey: game, mod };
  }
  const dir = path.join(ROOT, 'sampledata', 'wow', c);
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const abilityMap = lt.buildWCLAbilityMap(meta.masterData.abilities);
  const pulls = [];
  for (const file of fs.readdirSync(dir).sort()) {
    const m = file.match(/^(.*)_Pull(\d+)\.json$/);
    if (!m) continue;
    if (boss && m[1] !== boss) continue;
    if (pullNumber !== undefined && Number(m[2]) !== pullNumber) continue;
    const pull = transformWowPullFile(lt, meta, abilityMap, path.join(dir, file), Number(m[2]));
    if (pull) pulls.push(pull);
  }
  return { pulls, game: requireTsFromRoot('lib/damage/wow/game.ts').WOW_DAMAGE, gameKey: game, mod };
}

/** One pull by boss name and pull number; exits with the choices when it isn't there. */
async function loadPull(code, boss, pullNumber) {
  const r = await loadPulls(code, { boss, pullNumber: Number(pullNumber) });
  const pull = r.pulls.find((p) => p.name === boss && p.pullNumber === Number(pullNumber));
  if (!pull) {
    const all = (await loadPulls(code)).pulls;
    console.log(`no pull "${boss}" ${pullNumber}; have: ${[...new Set(all.map((p) => `${p.name} ${p.pullNumber}`))].join(', ')}`);
    process.exit(1);
  }
  return { ...r, pull };
}

module.exports = { gameOf, loadPulls, loadPull, transformWowPullFile };
