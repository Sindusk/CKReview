// One-off backfill: adds the new `enemyDamageTaken` stream (hostilityType:
// Enemies + DamageTaken — the stream that carries a player's own
// sourceResources, see lib/ffl-client.ts's FIGHT_EVENTS_QUERY comment) to
// EXISTING cached sampledata/ff/<report>/*.json pull files, without paying
// for a full re-fetch of every other already-cached stream. Paginates the
// same way fetchFFightData does for this one stream only.
//
// Usage: node scripts/backfill-enemy-damage-taken.js <reportDir>
const fs = require('fs');
const path = require('path');
const { createNodeLogAuth } = require('./lib/node-log-auth');
const { slimFflReport } = require('./lib/slim-report');

const QUERY = `
  query($code: String!, $fightIDs: [Int]!, $startTime: Float!, $endTime: Float!) {
    reportData {
      report(code: $code) {
        enemyDamageTaken: events(
          fightIDs: $fightIDs, startTime: $startTime, endTime: $endTime,
          dataType: DamageTaken, hostilityType: Enemies, includeResources: true
        ) { data nextPageTimestamp }
      }
    }
  }
`;

async function fetchAllPages(token, code, fightId, startTime, endTime) {
  const collected = [];
  let cursor = startTime;
  for (let page = 0; page < 50; page++) {
    const res = await fetch('https://www.fflogs.com/api/v2/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query: QUERY, variables: { code, fightIDs: [fightId], startTime: cursor, endTime } }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    const stream = json.data.reportData.report.enemyDamageTaken;
    collected.push(...stream.data);
    if (!stream.nextPageTimestamp || stream.nextPageTimestamp >= endTime) break;
    cursor = stream.nextPageTimestamp;
  }
  return collected;
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: node scripts/backfill-enemy-damage-taken.js <reportDir>');

  const auth = createNodeLogAuth({
    providerLabel: 'FFLogs',
    clientId:      'a225e605-1025-4b97-ad2f-b71347ca2e64',
    tokenUrl:      'https://www.fflogs.com/oauth/token',
    credsPath:     path.join(__dirname, '..', '.credentials', 'ffl-token.json'),
  });
  const token = await auth.getAccessToken();

  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  const code = meta.code;

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'meta.json');
  for (const file of files) {
    const filePath = path.join(dir, file);
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const report = parsed.json.data.reportData.report;
    if (report.enemyDamageTaken) { console.log(`${file}: already has enemyDamageTaken, skipping`); continue; }

    // Recover this pull's fight id + time range from meta.json by matching
    // the pull's own death/cast timestamps isn't reliable — instead derive
    // from the filename's Pull<N> suffix against meta.fights (sorted by
    // startTime, same numbering fetch-ff-report.js used).
    const match = file.match(/_Pull(\d+)\.json$/);
    if (!match) { console.log(`${file}: can't parse pull number, skipping`); continue; }
    const pullNumber = Number(match[1]);
    const bossName = file.replace(/_Pull\d+\.json$/, '');
    const sameBoss = meta.fights.filter((f) => (f.name ?? 'Unknown Fight') === bossName).sort((a, b) => a.startTime - b.startTime);
    const fight = sameBoss[pullNumber - 1];
    if (!fight) { console.log(`${file}: couldn't resolve fight (boss=${bossName} pull=${pullNumber}), skipping`); continue; }

    process.stdout.write(`${file} (fight ${fight.id}, ${fight.startTime}-${fight.endTime})... `);
    const events = await fetchAllPages(token, code, fight.id, fight.startTime, fight.endTime);
    const slim = slimFflReport({ enemyDamageTaken: { data: events } });
    report.enemyDamageTaken = slim.enemyDamageTaken;
    fs.writeFileSync(filePath, JSON.stringify(parsed));
    console.log(`${events.length} events merged`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
