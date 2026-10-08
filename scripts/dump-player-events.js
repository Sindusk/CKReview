// scripts/dump-player-events.js
//
// Prints one FFXIV player's raw event stream for one pull, through the
// app's real transform (the same Pull the damage analysis sees). For
// checking a damage finding, or an outside claim (xivanalysis), against
// the log itself. Times are M:SS.ss into the pull.
//
//   node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>" [--from M:SS] [--to M:SS] [mode]
//
// Modes (default: casts + the player's own buffs, interleaved):
//   --all-buffs        also buffs others put on the player (raid buffs)
//   --hits [name...]   damage hits instead: amount, bonusPercent (combo /
//                      positional share; absent = no bonus), multiplier,
//                      target. Names filter by substring.
//
// Example (the DNC checks in lib/damage/ffxiv/jobs/ranged.ts):
//   node scripts/dump-player-events.js jN3XDrf2z8PmLgRJ "Vamp Fatale" 8 "Chauzey Solstice" --from 8:10 --to 8:45
//
// Reads sampledata/ff/<code>/ (fetch it first, docs/dev-tooling.md).
// Writes nothing.

const path = require('path');
const { requireTsFromRoot } = require('./lib/require-ts');

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const toMs = (s) => { if (!s) return undefined; const [m, sec] = s.split(':'); return (Number(m) * 60 + Number(sec)) * 1000; };
const clock = (t) => { const s = t / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`; };

(async () => {
  const [code, boss, pullNumber, who] = args;
  if (!who) {
    console.log('usage: node scripts/dump-player-events.js <code> "<boss>" <pull> "<player>" [--from M:SS] [--to M:SS] [--all-buffs | --hits [name...]]');
    process.exit(1);
  }
  const from = toMs(value('--from')) ?? 0;
  const to = toMs(value('--to')) ?? Infinity;
  const store = requireTsFromRoot('lib/sample-report-store.ts');
  const lt = requireTsFromRoot('lib/log-transforms.ts', { './log-auth': {} });
  const payload = await store.loadSampleReport('ffl', path.basename(code));
  const abilityMap = lt.buildFFLAbilityMap(payload.report.masterData.abilities);
  const pulls = await lt.transformFFReportToPulls(payload.fightDataList, abilityMap, path.basename(code));
  const pull = pulls.find((p) => p.name === boss && p.pullNumber === Number(pullNumber));
  if (!pull) { console.log(`no pull "${boss}" ${pullNumber}; bosses: ${[...new Set(pulls.map((p) => p.name))].join(', ')}`); process.exit(1); }
  const player = pull.players.find((p) => p.name === who);
  if (!player) { console.log(`no player "${who}"; players: ${pull.players.map((p) => p.name).join(', ')}`); process.exit(1); }
  const inRange = (e) => e.timestamp >= from && e.timestamp <= to;

  if (flag('--hits')) {
    const i = args.indexOf('--hits');
    const names = args.slice(i + 1).filter((a) => !a.startsWith('--') && a !== value('--from') && a !== value('--to'));
    for (const e of player.damageDone.filter(inRange)) {
      if (names.length && !names.some((n) => e.abilityName.includes(n))) continue;
      console.log(clock(e.timestamp), e.abilityName, e.abilityId, e.amount,
        `bonus=${e.bonusPercent ?? '-'}`, `mult=${e.multiplier ?? '-'}`, e.isDoT ? 'DoT' : '', e.target ?? '');
    }
    return;
  }

  const allBuffs = flag('--all-buffs');
  const events = [
    ...player.casts.map((e) => ({ ...e, kind: 'cast' })),
    ...(player.buffs ?? []).filter((e) => allBuffs || e.source === who).map((e) => ({ ...e, kind: 'buff' })),
  ].filter(inRange).sort((a, b) => a.timestamp - b.timestamp);
  for (const e of events) {
    if (e.kind === 'cast') console.log(clock(e.timestamp), 'CAST', e.abilityName, e.abilityId, e.target ?? '');
    else console.log(clock(e.timestamp), '    buff', e.buffStatus, e.abilityName, e.abilityId,
      e.source === who ? '' : `from ${e.source}`, e.durationMs ? `${e.durationMs / 1000}s` : '');
  }
})();
