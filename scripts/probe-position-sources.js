#!/usr/bin/env node
// One-off probe: is there a DENSER player-position source than
// hostilityType:Enemies+DamageTaken (which we already fetch, and which
// turned out to be extremely sparse — 11/652 events in Q3GzJNZg64k1hLRm
// fight 18, all ground-DoT ticks)? Tests dataType:Debuffs and
// dataType:Casts under hostilityType:Enemies (player DoTs/casts landing ON
// the boss) for sourceResources density. Scratch script — not part of the
// permanent fetch pipeline.
const path = require('path');
const { createNodeLogAuth } = require('./lib/node-log-auth');

async function main() {
  const [, , reportCode, fightIdArg] = process.argv;
  const fightId = Number(fightIdArg);
  const credsPath = path.join(__dirname, '..', '.credentials', 'ffl-token.json');
  const nodeAuth = createNodeLogAuth({
    providerLabel: 'FFLogs',
    clientId: 'a225e605-1025-4b97-ad2f-b71347ca2e64',
    tokenUrl: 'https://www.fflogs.com/oauth/token',
    credsPath,
  });
  const token = await nodeAuth.getAccessToken();

  async function gql(query, variables) {
    const res = await fetch('https://www.fflogs.com/api/v2/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    const json = await res.json();
    if (json.errors) throw new Error(JSON.stringify(json.errors));
    return json.data;
  }

  const fightsData = await gql(
    `query($code: String!) { reportData { report(code: $code) { fights(killType: Encounters) { id startTime endTime } } } }`,
    { code: reportCode }
  );
  const fight = fightsData.reportData.report.fights.find((f) => f.id === fightId);
  if (!fight) throw new Error(`fight ${fightId} not found`);

  const dataTypes = [
    { dataType: 'Debuffs', hostilityType: 'Enemies' },
    { dataType: 'Casts', hostilityType: 'Enemies' },
    { dataType: 'Buffs', hostilityType: 'Enemies' },
  ];

  for (const { dataType, hostilityType } of dataTypes) {
    let start = fight.startTime;
    let total = 0;
    let withRes = 0;
    let page = 0;
    const samples = [];
    while (page < 50) {
      page += 1;
      const data = await gql(
        `query($code: String!, $fightIDs: [Int]!, $startTime: Float!, $endTime: Float!, $dataType: EventDataType, $hostilityType: HostilityType) {
          reportData { report(code: $code) {
            events(fightIDs: $fightIDs, startTime: $startTime, endTime: $endTime, dataType: $dataType, hostilityType: $hostilityType, includeResources: true) {
              data nextPageTimestamp
            }
          } }
        }`,
        { code: reportCode, fightIDs: [fightId], startTime: start, endTime: fight.endTime, dataType, hostilityType }
      );
      const stream = data.reportData.report.events;
      total += stream.data.length;
      for (const e of stream.data) {
        if (e.sourceResources) {
          withRes += 1;
          if (samples.length < 5) samples.push(e);
        }
      }
      if (!stream.nextPageTimestamp || stream.nextPageTimestamp >= fight.endTime) break;
      start = stream.nextPageTimestamp;
    }
    console.log(`${dataType}/${hostilityType}: ${withRes}/${total} with sourceResources`);
    if (samples.length) console.log('  sample:', JSON.stringify(samples[0]));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
