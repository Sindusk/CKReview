// scripts/validate.js — THE unified regression harness for every mechanic
// detection module, replacing the old per-mechanic validate-<mechanic>.js
// scripts (which were ten near-identical copies of the same loop).
//
// Usage (from the repo root):
//   node scripts/validate.js                          # every mechanic, every report
//   node scripts/validate.js forsaken                 # one mechanic, every report
//   node scripts/validate.js forsaken blackhole       # several mechanics
//   node scripts/validate.js sampledata/ff/<code>     # every mechanic, one report
//   node scripts/validate.js stompies sampledata/ff/<code>
//   node scripts/validate.js --list                   # print mechanic names
//
// Args that match a mechanic name select mechanics; anything else is treated
// as a report folder path. With no folder args, every report folder under
// sampledata/ff/ and sampledata/wow/ (any subdirectory containing a
// meta.json, as produced by scripts/fetch-{ff,wow}-report.js) is processed.
//
// Each mechanic entry in MECHANICS below declares which game it belongs to,
// how to load its detection module(s) (transpiled on the fly from .ts via
// scripts/lib/require-ts.js), and how to run it over one report. Per-pull
// inputs (PlayerInfo[]/DeathEvent[]/etc.) are built once per report through
// a lazy, memoized pull context and shared across all selected mechanics —
// running everything is barely more expensive than running one.
//
// Two timestamp conventions coexist, matching the live pipeline exactly:
// most FF modules receive raw absolute report-ms timestamps, but phase1 and
// graven-image gate on fight-relative windows and receive streams shifted by
// the pull's own earliest event (same as log-transforms.ts's fightStart).
// WoW pulls are always fight-relative (build-wow-players.js shifts them).
//
// No verified expected-results table exists yet for the current sample
// captures — this harness's role is regression protection (no crashes, no
// warnings) plus a readable per-pull error summary to eyeball after any
// mechanic change. Also run `npx tsc --noEmit`.
const path = require('path');
const { ROOT, requireTsFromRoot } = require('./lib/require-ts');
const { discoverReportFolders, loadReportFolder, buildActorMap, buildAbilityMap, STREAM_KEYS } = require('./lib/load-report-folder');
const ffb = require('./lib/build-ff-players');
const { buildWowPull } = require('./lib/build-wow-players');

// ── shared helpers ──────────────────────────────────────────────────────────

// phase1.ts / graven-image.ts gate on fight-relative time windows (matching
// the real pipeline, where every timestamp is already event.timestamp -
// fightStart) — but load-report-folder's raw streams keep absolute report-ms
// timestamps. Shift every stream by this pull's own earliest event.
function toFightRelative(rep) {
  const allTimestamps = STREAM_KEYS.flatMap((k) => (rep[k]?.data ?? []).map((e) => e.timestamp));
  const fightStart = Math.min(...allTimestamps);
  const shifted = {};
  for (const key of STREAM_KEYS) {
    shifted[key] = { data: (rep[key]?.data ?? []).map((e) => ({ ...e, timestamp: e.timestamp - fightStart })) };
  }
  return shifted;
}

// Lazy, memoized per-pull input builders so pulls are only transformed for
// the streams a selected mechanic actually needs, and only once per report
// no matter how many mechanics run.
function makeFFPullCtx(pull, actorMap, abilityMap, getFFJobByName) {
  const cache = new Map();
  const memo = (key, fn) => {
    if (!cache.has(key)) cache.set(key, fn());
    return cache.get(key);
  };
  const rel = () => memo('rel', () => toFightRelative(pull.rep));
  return {
    bossName: pull.bossName,
    pullNumber: pull.pullNumber,
    players:         () => memo('players', () => ffb.buildFFPlayers(pull.rep, actorMap, getFFJobByName, abilityMap)),
    deaths:          () => memo('deaths', () => ffb.buildFFDeaths(pull.rep, actorMap, getFFJobByName)),
    enemyCasts:      () => memo('enemyCasts', () => ffb.buildFFEnemyCastEvents(pull.rep, actorMap, abilityMap)),
    geometry:        () => memo('geometry', () => ffb.buildFFBlackHoleGeometry(pull.rep, actorMap, abilityMap)),
    puddleSamples:   () => memo('puddleSamples', () => ffb.buildFFStompiesPuddleSamples(pull.rep, actorMap, abilityMap)),
    positionSamples: () => memo('positionSamples', () => ffb.buildFFPlayerPositionSamples(pull.rep, actorMap)),
    relPlayers:      () => memo('relPlayers', () => ffb.buildFFPlayers(rel(), actorMap, getFFJobByName, abilityMap)),
    relDeaths:       () => memo('relDeaths', () => ffb.buildFFDeaths(rel(), actorMap, getFFJobByName)),
    relEnemyCasts:   () => memo('relEnemyCasts', () => ffb.buildFFEnemyCastEvents(rel(), actorMap, abilityMap)),
  };
}

function printPullErrors(ctx, errors, extraLists = []) {
  const extraSummary = extraLists.map(([label, list]) => `, ${list.length} ${label}`).join('');
  console.log('='.repeat(70));
  console.log(`${ctx.bossName} Pull ${ctx.pullNumber} ->`, errors.length, 'errors' + extraSummary);
  for (const e of [...errors, ...extraLists.flatMap(([, list]) => list)]) {
    console.log(`  [${e.ruleId}] t=${e.timestamp} ${e.player ?? '(raid)'}: ${e.description}`);
  }
}

// ── mechanic manifest ───────────────────────────────────────────────────────
//
// game: 'ff' | 'wow' — which sampledata/ subtree the mechanic runs against.
// load(): transpile + return the detection module(s); called once, lazily.
// run({ mod, ctxs, ... }): process ONE report and print its results.
//   FF entries get `ctxs` (one lazy pull context per pull, see above);
//   the wow entry builds its own pulls; the mitigation pair goes through the
//   real app pipeline (lib/sample-report-store.ts + lib/log-transforms.ts)
//   instead, because it needs properly-resolved ability names — so it loads
//   the report itself by code and only works for folders under sampledata/.

const MECHANICS = {
  forsaken: {
    game: 'ff',
    load: () => requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/forsaken.ts'),
    run({ mod, ctxs }) {
      for (const c of ctxs) printPullErrors(c, mod.detectForsakenTowerErrors(c.players(), c.deaths(), c.enemyCasts()));
    },
  },

  limitcut: {
    game: 'ff',
    load: () => requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/limitcut.ts'),
    run({ mod, ctxs }) {
      for (const c of ctxs) printPullErrors(c, mod.detectLimitCutErrors(c.players(), c.deaths()));
    },
  },

  exdeath: {
    game: 'ff',
    load: () => requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/exdeath.ts'),
    run({ mod, ctxs }) {
      for (const c of ctxs) printPullErrors(c, mod.detectExdeathErrors(c.players(), c.deaths()));
    },
  },

  phase1: {
    game: 'ff',
    load: () => requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/phase1.ts'),
    run({ mod, ctxs }) {
      for (const c of ctxs) printPullErrors(c, mod.detectPhase1Errors(c.relPlayers(), c.relDeaths(), c.relEnemyCasts()));
    },
  },

  stompies: {
    game: 'ff',
    load: () => requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/stompies.ts'),
    run({ mod, ctxs }) {
      for (const c of ctxs) {
        printPullErrors(c, mod.detectStompiesErrors(c.players(), c.deaths(), c.enemyCasts(), c.geometry(), c.puddleSamples(), c.positionSamples()));
      }
    },
  },

  blackhole: {
    game: 'ff',
    load: () => ({
      ...requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/blackhole.ts'),
      ...requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/blackhole-strategy.ts'),
    }),
    run({ mod, ctxs }) {
      // Pull-like objects — the minimum the cross-pull strategy analysis
      // needs — built once so it sees every pull in the report, same as the
      // app's page.tsx does over its live `pulls` state.
      const pullLikes = ctxs.map((c) => ({
        game: 'ffxiv',
        players: c.players(),
        deathEvents: c.deaths(),
        blackHoleGeometry: c.geometry(),
        bossName: c.bossName, pullNumber: c.pullNumber,
      }));

      const strategy = mod.detectBlackHoleStrategy(pullLikes);
      if (strategy) {
        console.log('-'.repeat(70));
        console.log(`  Black Hole strategy: ${strategy.strategyId} (shape: ${strategy.shape}, from ${strategy.pullsAnalyzed} pull(s))`);
        for (const lane of strategy.lanes) {
          console.log(`    ${lane.slotLabel.padEnd(20)} ${lane.player} (${lane.className}) -> tethers ${lane.moments.join(',')}`);
        }
      } else {
        console.log('  Black Hole strategy: not enough recognized-composition pulls to resolve');
      }

      for (const p of pullLikes) {
        printPullErrors(p, mod.detectBlackHoleErrors(p.players, p.deathEvents), [
          ['missed-assigned-tether', mod.detectMissedAssignedTetherErrors(p, strategy)],
          ['clipped-by-neighbor',    mod.detectClippedByNeighborTetherErrors(p, strategy)],
          ['incorrect-direction',    mod.detectIncorrectBlackHoleDirectionErrors(p, strategy)],
        ]);
      }
    },
  },

  'graven-image': {
    game: 'ff',
    load: () => requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/graven-image.ts'),
    run({ mod, ctxs }) {
      // Cross-pull: learns the report's own layout from ALL its pulls, then
      // checks each pull against it. Fight-relative, like phase1.
      const pullLikes = ctxs.map((c) => ({
        game: 'ffxiv',
        players: c.relPlayers(),
        deathEvents: c.relDeaths(),
        bossName: c.bossName, pullNumber: c.pullNumber,
      }));

      const layout = mod.learnGravenImageLayout(pullLikes);
      console.log('-'.repeat(70));
      console.log('  Learned layout:');
      for (const [className, { north, south }] of Object.entries(layout)) {
        console.log(`    ${className.padEnd(12)} north=${north ? `${north.x},${north.y}` : '—'}  south=${south ? `${south.x},${south.y}` : '—'}`);
      }

      for (const p of pullLikes) printPullErrors(p, mod.detectGravenImageSpreadErrors(p, layout));
    },
  },

  midnightfalls: {
    game: 'wow',
    load: () => ({
      ...requireTsFromRoot('lib/mechanics/wow/vs-dr-mqd/midnightfalls.ts'),
      ...requireTsFromRoot('lib/mechanics/wow/vs-dr-mqd/terminate-kicks.ts'),
      ...requireTsFromRoot('lib/mechanics/wow/vs-dr-mqd/crystal-assignments.ts'),
      ...requireTsFromRoot('lib/spec-data.ts'),
    }),
    run({ mod, pulls, actorMap, abilityMap }) {
      const builtPulls = [];
      for (const { bossName, pullNumber, rep } of pulls) {
        const { players, deaths, enemyCasts, enemyBuffs, friendlyNpcDamage } = buildWowPull(rep, actorMap, abilityMap, mod.getSpecInfo);
        builtPulls.push({ players });
        const errors = mod.detectMidnightFallsErrors(players, deaths, enemyCasts, enemyBuffs, friendlyNpcDamage);
        console.log('='.repeat(70));
        console.log(`${bossName} Pull ${pullNumber} ->`, errors.length, 'errors');
        for (const e of errors) {
          console.log(`  [${e.severity}] [${e.ruleId}] t=+${(e.timestamp / 1000).toFixed(1)}s ${e.player ?? '(raid)'}: ${e.name}`);
          // These rules put their real payload in the description (Light's
          // End source attribution, crystal healer breakdown, Terminate
          // no-hit downgrade) — print it so regressions are visible.
          if (['wow-raid-lights-end', 'wow-raid-dusk-crystal-unhealed', 'wow-raid-terminate-cast',
               'wow-mf-radiance', 'wow-mf-accidental-crystal-pickup'].includes(e.ruleId)) {
            console.log(`      ${e.description}`);
          }
        }
      }

      // Report-level Terminate kick-order detection (feeds the Strategy dialog).
      const strategy = mod.detectTerminateKickOrder(builtPulls);
      console.log('='.repeat(70));
      if (!strategy) {
        console.log('Terminate kick order: no interrupt data detected');
      } else {
        console.log(`Terminate kick order (${strategy.pullsAnalyzed} pulls, ${strategy.wavesAnalyzed} waves):`);
        if (strategy.chains) {
          for (const chain of strategy.chains) {
            console.log(`  ${chain.label}: ${chain.slots.map((s) => `${s.player} (${s.ability})`).join(' -> ')}`);
          }
        } else {
          console.log('  (declared boss-frame chains did NOT validate against detection — showing raw rounds)');
          strategy.rounds.forEach((round, i) => {
            console.log(`  Round ${i + 1}: ${round.map((s) => `${s.player} (${s.ability})`).join(' / ')}`);
          });
        }
        if (strategy.fillIns.length) {
          console.log(`  Fill-ins: ${strategy.fillIns.map((s) => `${s.player} (${s.ability}, ${s.wavesSeen}/${strategy.wavesAnalyzed} waves)`).join(', ')}`);
        }
      }

      // Report-level Dawn Crystal assignment detection (feeds the Strategy dialog).
      const crystals = mod.detectCrystalAssignments(builtPulls);
      console.log('='.repeat(70));
      if (!crystals) {
        console.log('Crystal assignments: no Glimmering data detected');
      } else {
        console.log(`Dawn Crystal assignments (${crystals.pullsAnalyzed} pulls, declared match: ${crystals.matchesDeclared}):`);
        console.log(`  Set 1: ${crystals.set1.map((s) => `${s.player} (${s.pullsSeen})`).join(', ')}`);
        console.log(`  Set 2: ${crystals.set2.map((s) => `${s.player} (${s.pullsSeen})`).join(', ')}`);
        for (const swap of crystals.swaps) {
          console.log(`  Intermission: ${swap.from.player} -> ${swap.to.player} (${swap.pullsSeen} pulls)`);
        }
      }
    },
  },

  mitigation: {
    game: 'ff',
    // Goes through the real pipeline (sample-report-store + log-transforms'
    // transformFFReportToPulls) rather than build-ff-players — mitigation
    // detection needs properly-resolved ability names on casts/deaths, not
    // the shortcut '' placeholders the shared raw builder uses.
    load: () => ({
      store: requireTsFromRoot('lib/sample-report-store.ts'),
      lt: requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} }),
      ...requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts'),
      ...requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-detection.ts'),
    }),
    async run({ mod, dir }) {
      const pulls = await loadThroughRealPipeline(mod, dir);
      if (!pulls) return;
      const plan = mod.getMitigationPlan('ikuya');
      for (const pull of pulls) {
        if (pull.name !== 'Dancing Mad' && !/Kefka/i.test(pull.name)) continue;
        const errors = mod.detectMitigationErrors(pull, plan);
        console.log('='.repeat(70));
        console.log(`${pull.name} Pull ${pull.pullNumber} (${pull.deathEvents.length} deaths) ->`, errors.length, 'mitigation errors');
        for (const e of errors) {
          console.log(`  t=${(e.timestamp / 1000).toFixed(1)}s ${e.player} (${e.class}): ${e.description}`);
        }
      }
    },
  },

  'mitigation-review': {
    game: 'ff',
    load: () => ({
      store: requireTsFromRoot('lib/sample-report-store.ts'),
      lt: requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} }),
      ...requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-plan.ts'),
      ...requireTsFromRoot('lib/mechanics/ffxiv/dancingmad/mitigation-review.ts'),
    }),
    // Sanity check of the Review-tab row builder: first 3 pulls per report,
    // printing each pull's row counts plus the reached/future boundary rows.
    async run({ mod, dir }) {
      const pulls = await loadThroughRealPipeline(mod, dir);
      if (!pulls) return;
      const plan = mod.getMitigationPlan('ikuya');
      for (const pull of pulls.slice(0, 3)) {
        const rows = mod.buildMitigationReview(pull, plan);
        const enemyCastCount = (pull.enemyCasts || []).length;
        const reachedCount = rows.filter((r) => r.reached).length;
        console.log(`Pull ${pull.pullNumber}: enemyCasts=${enemyCastCount}, review rows=${rows.length} (reached=${reachedCount}, future=${rows.length - reachedCount})`);
        const lastReachedIdx = rows.map((r) => r.reached).lastIndexOf(true);
        const toShow = [rows[0], rows[lastReachedIdx], rows[lastReachedIdx + 1], rows[rows.length - 1]].filter(Boolean);
        for (const row of toShow) {
          const cells = [...row.cellsByActorId.entries()].map(([id, c]) => {
            const p = pull.players.find((pl) => pl.actorId === id);
            const checks = c.checks.map((chk) => `${chk.status}:${chk.abilityName}${chk.carryOver ? '(carry)' : ''}`).join('+');
            return `${p ? p.name : id}:${checks}${c.tentativeSlot ? '?' : ''}(${c.slotLabel})`;
          }).join(', ');
          console.log(`  [${(row.anchorMs / 1000).toFixed(1)}s] reached=${row.reached} ${row.phaseTitle} / ${row.mech.name} -> ${cells}`);
        }
      }
    },
  },
};

// Shared by the two mitigation entries: resolve the report folder to a code,
// load it through the app's own sample-report-store, and transform it with
// the real transformFFReportToPulls. Returns null (with a note) for folders
// the store can't see (i.e. anything outside sampledata/ff/<code>/).
async function loadThroughRealPipeline(mod, dir) {
  const code = path.basename(dir);
  if (!(await mod.store.sampleReportExists('ffl', code))) {
    console.log(`  (skipped: sample-report-store can't load '${code}' — mitigation checks only run on sampledata/ff/<code> folders)`);
    return null;
  }
  const payload = await mod.store.loadSampleReport('ffl', code);
  if (payload.source !== 'ffl') return null;
  const abilityMap = mod.lt.buildFFLAbilityMap(payload.report.masterData.abilities);
  return mod.lt.transformFFReportToPulls(payload.fightDataList, abilityMap, code);
}

// ── CLI driver ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
if (args.includes('--list') || args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node scripts/validate.js [mechanic ...] [reportDir ...]');
  console.log('Mechanics:', Object.keys(MECHANICS).join(', '));
  console.log('No mechanic args = all. No reportDir args = every folder under sampledata/{ff,wow}/.');
  process.exit(0);
}

const selectedNames = [];
const explicitDirs = [];
for (const a of args) {
  if (MECHANICS[a]) selectedNames.push(a);
  else explicitDirs.push(path.resolve(a));
}
const selected = selectedNames.length ? selectedNames : Object.keys(MECHANICS);

// A report folder's game: from its sampledata/{ff,wow}/ path segment when
// present; folders elsewhere run against both games' mechanics (every
// detection self-gates on its mechanic's signatures, so the wrong game's
// modules just report nothing).
function gamesOfDir(dir) {
  const segs = dir.split(path.sep);
  if (segs.includes('ff')) return ['ff'];
  if (segs.includes('wow')) return ['wow'];
  return ['ff', 'wow'];
}

(async () => {
  const loadedMods = new Map(); // mechanic name -> load() result
  const modFor = (name) => {
    if (!loadedMods.has(name)) loadedMods.set(name, MECHANICS[name].load());
    return loadedMods.get(name);
  };
  const { getFFJobByName } = requireTsFromRoot('lib/ffl-job-data.ts');

  for (const game of ['ff', 'wow']) {
    const mechs = selected.filter((n) => MECHANICS[n].game === game);
    if (mechs.length === 0) continue;

    const dirs = explicitDirs.length
      ? explicitDirs.filter((d) => gamesOfDir(d).includes(game))
      : discoverReportFolders(path.join(ROOT, 'sampledata', game));

    if (dirs.length === 0 && explicitDirs.length === 0) {
      console.log(`No report folders found under sampledata/${game}/ (looked for subdirectories containing meta.json).`);
      console.log(`Fetch one with: node scripts/fetch-${game}-report.js <reportCode>`);
      continue;
    }

    for (const dir of dirs) {
      const loaded = loadReportFolder(dir);
      if (!loaded) { console.log(`${dir} -> no meta.json, skipping`); continue; }
      const { meta, pulls } = loaded;
      const actorMap = buildActorMap(meta);
      const abilityMap = buildAbilityMap(meta);

      console.log('#'.repeat(70));
      console.log(`${meta.title ?? meta.code} (${dir})`);
      console.log(`  ${pulls.length} pull(s)`);

      const ctxs = game === 'ff' ? pulls.map((p) => makeFFPullCtx(p, actorMap, abilityMap, getFFJobByName)) : null;

      for (const name of mechs) {
        console.log('~'.repeat(70));
        console.log(`~ mechanic: ${name}`);
        await MECHANICS[name].run({ mod: modFor(name), dir, meta, pulls, ctxs, actorMap, abilityMap });
      }
    }
  }
})().catch((err) => { console.error(err); process.exit(1); });
