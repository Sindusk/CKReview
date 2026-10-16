#!/usr/bin/env node
// scripts/ff-probe.js — a cheap look at one player in one FFLogs fight,
// to see whether a mistake happens there before downloading the pull
// (docs/xiva-audit-plan.md phase 3). Fetches only that player's casts,
// the buffs they put on themselves and the pull's deaths: a few API
// points. Read-only: prints, writes nothing.
//
// Usage:
//   node scripts/ff-probe.js <code> <fightId> <Job|player name> [options]
//
// Prints, per self-buff: how many were applied, used (removed within
// 0.1s of one of their casts) and lost (removed with no cast beside it:
// expired, or overwritten), with the lost ones' times, each marked when
// it fell within 3s of the player's death or the pull's end. Then the
// cast counts.
//
// Options:
//   --buff <text>    only buffs whose name contains this (repeatable)
//   --casts <text>   also list the times of casts whose name contains this
//                    (repeatable)
//   --creds <path>   default .credentials/ffl-token.json
//
// Find candidate pulls with scripts/ff-rankings.js; fetch the one you'll
// use with `node scripts/fetch-ff-report.js <code> --fight <id>` into its
// own report folder, then check the app's finding there. A "lost" here is
// a lead, not a verdict: overwrites, deaths and downtime still need the
// log (scripts/dump-player-events.js).

const path = require('path');
const { ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');

const argv = process.argv.slice(2);
const opt = { buffs: [], casts: [], creds: null, pos: [] };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--buff') opt.buffs.push(argv[++i].toLowerCase());
  else if (argv[i] === '--casts') opt.casts.push(argv[++i].toLowerCase());
  else if (argv[i] === '--creds') opt.creds = argv[++i];
  else opt.pos.push(argv[i]);
}
const [code, fightArg, who] = opt.pos;
if (!who) {
  console.log('usage: node scripts/ff-probe.js <code> <fightId> <Job|player name> [--buff text] [--casts text]');
  process.exit(1);
}
const fightId = Number(fightArg);

const auth = createNodeLogAuth({
  providerLabel: 'FFLogs',
  clientId:      'a225e605-1025-4b97-ad2f-b71347ca2e64', // must match lib/log-auth.ts's FFLogs clientId
  tokenUrl:      'https://www.fflogs.com/oauth/token',
  credsPath:     opt.creds ? path.resolve(opt.creds) : path.join(ROOT, '.credentials', 'ffl-token.json'),
});

let budget = null;
async function gql(query, variables) {
  let token = await auth.getAccessToken();
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://www.fflogs.com/api/v2/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401 && attempt === 0) { token = await auth.forceRefreshAccessToken(); continue; }
    if (!res.ok) throw new Error(`FFLogs request failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`FFLogs GraphQL error: ${json.errors[0].message}`);
    budget = json.data.rateLimitData ?? budget;
    return json.data;
  }
  throw new Error('FFLogs auth failed twice');
}

const META_QUERY = `query($code:String!,$f:[Int]!){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  reportData{report(code:$code){
    fights(fightIDs:$f){id name startTime endTime kill friendlyPlayers}
    masterData(translate:true){actors(type:"Player"){id name subType} abilities{gameID name}}}}}`;
const EVENTS_QUERY = `query($code:String!,$f:[Int]!,$s:Float,$e:Float,$dt:EventDataType,$src:Int){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  reportData{report(code:$code){
    events(dataType:$dt,hostilityType:Friendlies,fightIDs:$f,startTime:$s,endTime:$e,sourceID:$src,limit:10000){data nextPageTimestamp}}}}`;

async function events(fight, dt, src) {
  const out = [];
  for (let s = fight.startTime; s;) {
    const ev = (await gql(EVENTS_QUERY, { code, f: [fight.id], s, e: fight.endTime, dt, src })).reportData.report.events;
    out.push(...ev.data);
    s = ev.nextPageTimestamp;
  }
  return out;
}

const clock = (ms) => { const s = Math.round(ms / 100) / 10; return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`; };

(async () => {
  const report = (await gql(META_QUERY, { code, f: [fightId] })).reportData.report;
  const fight = report.fights[0];
  if (!fight) throw new Error(`no fight ${fightId} in ${code}`);
  const lower = who.toLowerCase();
  const actor = report.masterData.actors.find((a) => fight.friendlyPlayers.includes(a.id) && (a.subType.toLowerCase() === lower || a.name.toLowerCase() === lower));
  if (!actor) throw new Error(`no ${who} in fight ${fightId}; players: ${report.masterData.actors.filter((a) => fight.friendlyPlayers.includes(a.id)).map((a) => `${a.name} (${a.subType})`).join(', ')}`);
  const name = new Map(report.masterData.abilities.map((a) => [a.gameID, a.name]));
  const t0 = fight.startTime, end = fight.endTime - t0;

  const casts = (await events(fight, 'Casts', actor.id)).filter((e) => e.type === 'cast');
  const buffs = (await events(fight, 'Buffs', actor.id)).filter((e) => e.targetID === actor.id);
  const deaths = (await events(fight, 'Deaths')).filter((e) => e.targetID === actor.id).map((e) => e.timestamp - t0);

  console.log(`${code} fight ${fightId} ${fight.name} (${fight.kill ? 'kill' : 'wipe'}, ${clock(end)}): ${actor.name} (${actor.subType})` +
    (deaths.length ? `, died ${deaths.map(clock).join(', ')}` : ''));
  const castAt = (t) => casts.filter((c) => Math.abs(c.timestamp - t) <= 100).map((c) => name.get(c.abilityGameID) ?? `#${c.abilityGameID}`);
  const mark = (t) => (deaths.some((d) => t <= d && d - t <= 3000) ? ' (death)' : end - t <= 3000 ? ' (end)' : '');

  const byBuff = new Map();
  for (const b of buffs) {
    const n = name.get(b.abilityGameID) ?? `#${b.abilityGameID}`;
    if (opt.buffs.length && !opt.buffs.some((x) => n.toLowerCase().includes(x))) continue;
    const row = byBuff.get(n) ?? { applied: 0, by: new Map(), lost: [] };
    if (b.type === 'applybuff') row.applied++;
    else if (b.type === 'removebuff' || b.type === 'removebuffstack') {
      const at = castAt(b.timestamp);
      if (at.length) { const k = at.join(' + '); row.by.set(k, [...(row.by.get(k) ?? []), b.timestamp - t0]); }
      else if (b.type === 'removebuff') row.lost.push(b.timestamp - t0);
    }
    byBuff.set(n, row);
  }
  // Removals at a cast, by that cast: the rarer ones (a proc cleared by
  // the wrong action) with their times.
  for (const [n, r] of [...byBuff].sort((a, b) => b[1].lost.length - a[1].lost.length)) {
    const by = [...r.by].sort((a, b) => b[1].length - a[1].length)
      .map(([k, ts], i) => `${k} ${ts.length}` + (i > 0 && ts.length <= 3 ? ` (${ts.map(clock).join(', ')})` : '')).join(', ');
    console.log(`  ${n}: ${r.applied} applied; removed at ${by || 'no cast'}; ${r.lost.length} with no cast` +
      (r.lost.length ? `: ${r.lost.map((t) => clock(t) + mark(t)).join(', ')}` : ''));
  }
  const counts = new Map();
  for (const c of casts) { const n = name.get(c.abilityGameID) ?? `#${c.abilityGameID}`; counts.set(n, (counts.get(n) ?? 0) + 1); }
  console.log(`  casts: ${[...counts].sort((a, b) => b[1] - a[1]).map(([n, k]) => `${n} ${k}`).join(', ')}`);
  for (const x of opt.casts) {
    const hits = casts.filter((c) => (name.get(c.abilityGameID) ?? '').toLowerCase().includes(x));
    console.log(`  "${x}": ${hits.map((c) => `${name.get(c.abilityGameID)} ${clock(c.timestamp - t0)}`).join(', ') || 'none'}`);
  }
  console.log(`[points: ${budget.pointsSpentThisHour.toFixed(0)} of ${budget.limitPerHour} this hour, resets in ${Math.ceil(budget.pointsResetIn / 60)} min]`);
})().catch((e) => { console.error(e.message); process.exit(1); });
