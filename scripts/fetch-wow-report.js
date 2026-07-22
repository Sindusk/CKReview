#!/usr/bin/env node
// scripts/fetch-wow-report.js
//
// Fetches a WarcraftLogs report straight to disk — no browser console,
// no clipboard. Built because copying big Midnight Falls pulls out of
// devtools started silently truncating (Windows clipboard limits) on the
// larger fights, and the raw dumps were eating hundreds of MB even when
// they DID copy correctly.
//
// Solves both problems:
//   1. Reuses lib/wcl-client.ts's fetchReport/fetchFightData UNCHANGED
//      (loaded under Node via scripts/lib/require-ts.js), so pagination
//      and the GraphQL query itself never drift from the live app — this
//      script can't get out of sync with what the UI actually fetches.
//   2. Slims every event via scripts/lib/slim-report.js before writing —
//      drops fields nothing in this codebase reads (measured ~75-85%
//      smaller per fight; see that file's header for what's kept/dropped).
//
// One-time auth setup — see scripts/lib/node-log-auth.js's header comment.
//
// Usage:
//   node scripts/fetch-wow-report.js <reportCode|reportUrl> [options]
//
// <reportCode|reportUrl> accepts either the bare code or a full
// WarcraftLogs report URL (e.g. https://www.warcraftlogs.com/reports/AbCd1234EfGh5678)
// — the code is extracted automatically.
//
// Options:
//   --out <dir>      Output directory (default: sampledata/wow/<reportCode>)
//   --fight <id>     Restrict to this WCL fight id — repeatable
//   --boss <name>    Restrict to fights whose name contains this (case-insensitive)
//   --creds <path>   Credentials file (default: .credentials/wcl-token.json)
//
// Output: <outDir>/meta.json (report + fights + actors + abilities, once)
// plus one <outDir>/<Boss>_Pull<N>.json per fight — N is the SAME
// per-boss-name pull numbering the app displays (via buildFightLogLabels),
// not the raw WCL fight.id, so file names always match what you see on
// screen (unlike some pre-2026-07-17 hand-copied files, which used
// fight.id and drifted whenever other bosses were pulled in between).
//
// Example:
//   node scripts/fetch-wow-report.js AbCd1234EfGh5678 --boss "Midnight Falls"

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot, ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');
const { slimWclReport } = require('./lib/slim-report');

function parseArgs(argv) {
  const args = { fights: [], out: null, boss: null, creds: null };
  let reportCode = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') args.out = argv[++i];
    else if (a === '--fight') args.fights.push(Number(argv[++i]));
    else if (a === '--boss') args.boss = argv[++i];
    else if (a === '--creds') args.creds = argv[++i];
    else if (!reportCode) reportCode = a;
    else throw new Error(`Unrecognized argument: ${a}`);
  }
  if (!reportCode) {
    throw new Error(
      'Usage: node scripts/fetch-wow-report.js <reportCode> [--out dir] [--fight id]... [--boss name] [--creds path]'
    );
  }
  return { reportCode: extractReportCode(reportCode), ...args };
}

function sanitizeForFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

function extractReportCode(input) {
  const match = input.match(/(?:warcraftlogs\.com\/reports\/)?([a-zA-Z0-9]{16,})/);
  return match ? match[1] : input;
}

async function main() {
  const { reportCode, out, fights, boss, creds } = parseArgs(process.argv.slice(2));
  const outDir    = out   ? path.resolve(out)   : path.join(ROOT, 'sampledata', 'wow', reportCode);
  const credsPath = creds ? path.resolve(creds) : path.join(ROOT, '.credentials', 'wcl-token.json');

  const nodeAuth = createNodeLogAuth({
    providerLabel: 'WarcraftLogs',
    clientId:      'a22351f8-ab0e-4861-88c3-f27023c99156', // must match lib/log-auth.ts's WCL clientId
    tokenUrl:      'https://www.warcraftlogs.com/oauth/token',
    credsPath,
  });

  const wclClient = requireTsFromRoot('lib/wcl-client.ts', {
    './log-auth': {
      getAccessToken:        nodeAuth.getAccessToken,
      refreshWCLAccessToken: nodeAuth.forceRefreshAccessToken,
      logout:                () => {},
    },
  });

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Fetching report ${reportCode}...`);
  const report = await wclClient.fetchReport(reportCode);

  fs.writeFileSync(
    path.join(outDir, 'meta.json'),
    JSON.stringify({ code: report.code, title: report.title, fights: report.fights, masterData: report.masterData }, null, 2)
  );
  console.log(`  wrote meta.json (${report.fights.length} fights, ${report.masterData.actors.length} actors)`);

  let targetFights = report.fights.filter((f) => f.endTime > f.startTime);
  if (fights.length > 0) targetFights = targetFights.filter((f) => fights.includes(f.id));
  if (boss) targetFights = targetFights.filter((f) => f.name.toLowerCase().includes(boss.toLowerCase()));

  if (targetFights.length === 0) {
    console.log('No matching fights — nothing to fetch.');
    return;
  }

  // Same per-boss-name numbering the app shows, computed from the FULL
  // fight list (not targetFights) so numbers stay correct even when
  // --fight/--boss narrows what actually gets downloaded.
  const labels = wclClient.buildFightLogLabels(report.fights);

  for (const fight of targetFights) {
    const label = labels.get(fight.id) ?? `${fight.name} (fight ${fight.id})`;
    process.stdout.write(`Fetching ${label}... `);

    const data = await wclClient.fetchFightData(reportCode, fight, report.masterData.actors, label, true /* skipConsoleDump */);

    const slim = slimWclReport({
      deaths:        { data: data.deathEvents },
      combatantInfo: { data: data.combatantInfos },
      casts:         { data: data.castEvents },
      damageDone:    { data: data.damageDoneEvents },
      damageTaken:   { data: data.damageTakenEvents },
      healing:       { data: data.healingEvents },
      debuffs:       { data: data.debuffEvents },
      enemyCasts:    { data: data.enemyCastEvents },
      enemyBuffs:    { data: data.enemyBuffEvents },
    });

    // WCL's "Interrupts" tab — a pure aggregate (per-player kick totals +
    // uninterrupted-completion timestamps), not per-kick detail; see
    // fetchInterruptsTable's header comment in lib/wcl-client.ts. Not run
    // through slimWclReport (unknown key, already small/aggregate).
    const interrupts = await wclClient.fetchInterruptsTable(reportCode, fight);

    const pullNumberMatch = label.match(/Pull (\d+)$/);
    const pullSuffix = pullNumberMatch ? `Pull${pullNumberMatch[1]}` : `Fight${fight.id}`;
    const fileName = `${sanitizeForFilename(fight.name)}_${pullSuffix}.json`;
    const filePath = path.join(outDir, fileName);

    // Same {query, variables, json} wrapper shape the browser console dump
    // used, so this is a drop-in replacement for how existing harnesses
    // already read sample files (.json.data.reportData.report.<stream>.data)
    // — no harness changes needed to consume these. `interrupts` is a new,
    // additive key alongside the existing streams.
    fs.writeFileSync(filePath, JSON.stringify({
      query:     null,
      variables: { code: reportCode, fightIDs: [fight.id] },
      json:      { data: { reportData: { report: { ...slim, interrupts } } } },
    }));

    const sizeMb = (fs.statSync(filePath).size / 1e6).toFixed(1);
    console.log(`wrote ${fileName} (${sizeMb}MB)`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
