#!/usr/bin/env node
// scripts/fetch-wow-replay.js — saves one WoW pull's replay tracks
// (lib/replay/wow-replay.ts) to sampledata/wow/<code>/replay/fight<N>.json,
// where a sample-data load of that report picks them up instead of
// spending rate-limit points on the live fetch. WoW mirror of
// fetch-ff-replay.js.
//
// Usage: node scripts/fetch-wow-replay.js <code-or-URL> --fight <N>
// Auth: same .credentials/wcl-token.json as fetch-wow-report.js.

const fs = require('fs');
const path = require('path');
const { requireTsFromRoot, ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');

async function main() {
  const args = process.argv.slice(2);
  const input = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--fight');
  const fightArg = args[args.indexOf('--fight') + 1];
  const urlFight = input && input.match(/[?&]fight=(\d+)/);
  const fightId = Number(args.includes('--fight') ? fightArg : urlFight && urlFight[1]);
  const match = input && input.match(/(?:reports\/)?([a-zA-Z0-9]{16,})/);
  if (!match || !fightId) {
    console.error('Usage: node scripts/fetch-wow-replay.js <code-or-URL> --fight <N>');
    process.exit(1);
  }
  const code = match[1];

  const nodeAuth = createNodeLogAuth({
    providerLabel: 'WarcraftLogs',
    clientId:      'a22351f8-ab0e-4861-88c3-f27023c99156', // must match lib/log-auth.ts's WCL clientId
    tokenUrl:      'https://www.warcraftlogs.com/oauth/token',
    credsPath:     path.join(ROOT, '.credentials', 'wcl-token.json'),
  });
  const wclClient = requireTsFromRoot('lib/wcl-client.ts', {
    './log-auth': {
      getAccessToken:        nodeAuth.getAccessToken,
      refreshWCLAccessToken: nodeAuth.forceRefreshAccessToken,
      logout:                () => {},
    },
  });

  const started = Date.now();
  const data = await wclClient.fetchWowReplayData(code, fightId, (f) =>
    process.stdout.write(`\r  ${Math.round(f * 100)}%`));
  process.stdout.write('\n');

  // A subfolder, like dps/: every report-folder loader reads each top-level
  // *.json except meta.json as a fight file.
  const outDir = path.join(ROOT, 'sampledata', 'wow', code, 'replay');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `fight${fightId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data));

  const players = data.actors.filter((a) => a.kind === 'player');
  const enemies = data.actors.filter((a) => a.kind === 'enemy');
  const durS = data.durationMs / 1000;
  console.log(`Saved ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(1)} MB) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  for (const p of players) {
    const gaps = p.samples.slice(1).map((s, i) => s[0] - p.samples[i][0]);
    const maxGap = gaps.length ? Math.max(...gaps) : 0;
    console.log(`  ${p.name.padEnd(24)} ${String(p.job).padEnd(14)} ${p.samples.length} samples (${(p.samples.length / durS).toFixed(2)}/s, longest gap ${(maxGap / 1000).toFixed(1)}s, power ${p.powerType})`);
  }
  console.log(`  map: ${data.mapName ?? 'none'}; ${data.enemyCasts.length} enemy casts, ${data.enemyHits.length} enemy hits`);
  console.log(`  ${enemies.length} enemy tracks, ${enemies.filter((e) => e.targetable).length} targetable: ` +
    enemies.filter((e) => e.targetable).map((e) => e.name).join(', '));
}

main().catch((err) => { console.error(err); process.exit(1); });
