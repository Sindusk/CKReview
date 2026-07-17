#!/usr/bin/env node
// scripts/fetch-ff-report.js
//
// FFLogs mirror of scripts/fetch-wow-report.js — see that file's header
// for the full rationale (bypasses the browser console/clipboard, reuses
// lib/ffl-client.ts unchanged, slims events via scripts/lib/slim-report.js
// before writing). One-time auth setup: scripts/lib/node-log-auth.js.
//
// Usage:
//   node scripts/fetch-ff-report.js <reportCode> [options]
//
// Options:
//   --out <dir>      Output directory (default: sampledata/ff/<reportCode>)
//   --fight <id>     Restrict to this FFLogs fight id — repeatable
//   --boss <name>    Restrict to fights whose name contains this (case-insensitive)
//   --creds <path>   Credentials file (default: .credentials/ffl-token.json)
//
// Example:
//   node scripts/fetch-ff-report.js AbCd1234EfGh5678 --boss "Kefka"

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot, ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');
const { slimFflReport } = require('./lib/slim-report');

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
      'Usage: node scripts/fetch-ff-report.js <reportCode> [--out dir] [--fight id]... [--boss name] [--creds path]'
    );
  }
  return { reportCode, ...args };
}

function sanitizeForFilename(name) {
  return name.replace(/[<>:"/\\|?*]/g, '').trim();
}

async function main() {
  const { reportCode, out, fights, boss, creds } = parseArgs(process.argv.slice(2));
  const outDir    = out   ? path.resolve(out)   : path.join(ROOT, 'sampledata', 'ff', reportCode);
  const credsPath = creds ? path.resolve(creds) : path.join(ROOT, '.credentials', 'ffl-token.json');

  const nodeAuth = createNodeLogAuth({
    providerLabel: 'FFLogs',
    clientId:      'a225e605-1025-4b97-ad2f-b71347ca2e64', // must match lib/log-auth.ts's FFLogs clientId
    tokenUrl:      'https://www.fflogs.com/oauth/token',
    credsPath,
  });

  const fflClient = requireTsFromRoot('lib/ffl-client.ts', {
    './log-auth': { getFFAccessToken: nodeAuth.getAccessToken },
  });

  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Fetching report ${reportCode}...`);
  const report = await fflClient.fetchFFReport(reportCode);

  fs.writeFileSync(
    path.join(outDir, 'meta.json'),
    JSON.stringify({ code: report.code, title: report.title, fights: report.fights, masterData: report.masterData }, null, 2)
  );
  console.log(`  wrote meta.json (${report.fights.length} fights, ${report.masterData.actors.length} actors)`);

  let targetFights = report.fights.filter((f) => f.endTime > f.startTime);
  if (fights.length > 0) targetFights = targetFights.filter((f) => fights.includes(f.id));
  if (boss) targetFights = targetFights.filter((f) => (f.name ?? '').toLowerCase().includes(boss.toLowerCase()));

  if (targetFights.length === 0) {
    console.log('No matching fights — nothing to fetch.');
    return;
  }

  const labels = fflClient.buildFFFightLogLabels(report.fights);

  for (const fight of targetFights) {
    const label = labels.get(fight.id) ?? `${fight.name ?? 'Unknown Fight'} (fight ${fight.id})`;
    process.stdout.write(`Fetching ${label}... `);

    const data = await fflClient.fetchFFightData(reportCode, fight, report.masterData.actors, label, true /* skipConsoleDump */);

    const slim = slimFflReport({
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

    const pullNumberMatch = label.match(/Pull (\d+)$/);
    const pullSuffix = pullNumberMatch ? `Pull${pullNumberMatch[1]}` : `Fight${fight.id}`;
    const fileName = `${sanitizeForFilename(fight.name ?? 'UnknownFight')}_${pullSuffix}.json`;
    const filePath = path.join(outDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify({
      query:     null,
      variables: { code: reportCode, fightIDs: [fight.id] },
      json:      { data: { reportData: { report: slim } } },
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
