#!/usr/bin/env node
// scripts/fetch-ff-dps.js — fetches the light, table-based data that damage
// output analysis needs (scripts/analyze-dps.js reads it). Built from the
// first DPS-improvement study (Dancing Mad enrages vs clears); the method and
// its pitfalls are in docs/dps-analysis.md.
//
// Unlike fetch-ff-report.js this downloads FFLogs' aggregated TABLES plus
// the player cast stream, not every event stream: about 15 API points per
// fight instead of thousands of events. Fights are fetched strictly one at a
// time so several reports never hammer the API concurrently.
//
// Usage:
//   node scripts/fetch-ff-dps.js <reportCode|reportUrl> [options]
//
// A pasted URL's ?fight=<id> is used when no --fight/--pull is given.
//
// Options:
//   --fight <id>        FFLogs fight id (repeatable)
//   --pull <n>          per-boss pull number as the app numbers it (repeatable;
//                       can differ from the fight id when non-encounter fights
//                       exist: a report's "pull 11" was fight 12)
//   --kill              only kills
//   --min-phase <n>     only pulls that reached phase n
//   --phase <n>         focus phase for the window/bin/taken/debuff tables
//                       (default: each fight's last phase)
//   --window <s>        fixed comparison window from focus-phase start
//                       (default 210 — pick a length every compared kill
//                       reaches, see docs/dps-analysis.md "Equal windows")
//   --bin <s>           bin size inside the window (default 30)
//   --hits <Job>:<ids>  also fetch that job's damage events for these ability
//                       ids, whole fight (repeatable), e.g. Bard:7404 for
//                       Pitch Perfect stack sizes (analyze-dps.js stacks)
//   --debuffs <ids>     player debuff events to fetch, whole fight (default
//                       1002911 Damage Down, 1000043 Weakness, 1000044 Brink)
//   --creds <path>      default .credentials/ffl-token.json
//   --refetch           download fights again even if their file exists
//
// Output: sampledata/ff/<code>/dps/meta.json and fight<id>.json (gitignored).

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib/require-ts');
const { createNodeLogAuth } = require('./lib/node-log-auth');
const { withRateLimitWait, writeAtomic } = require('./lib/fetch-plan');

function parseArgs(argv) {
  const a = { fights: [], pulls: [], kill: false, minPhase: 0, phase: null, window: 210, bin: 30, hits: [], debuffs: '1002911,1000043,1000044', creds: null, refetch: false };
  let input = null;
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--fight') a.fights.push(Number(argv[++i]));
    else if (x === '--pull') a.pulls.push(Number(argv[++i]));
    else if (x === '--kill') a.kill = true;
    else if (x === '--min-phase') a.minPhase = Number(argv[++i]);
    else if (x === '--phase') a.phase = Number(argv[++i]);
    else if (x === '--window') a.window = Number(argv[++i]);
    else if (x === '--bin') a.bin = Number(argv[++i]);
    else if (x === '--hits') { const [job, ids] = argv[++i].split(':'); a.hits.push({ job, ids: ids.split(',').map(Number) }); }
    else if (x === '--debuffs') a.debuffs = argv[++i];
    else if (x === '--creds') a.creds = argv[++i];
    else if (x === '--refetch') a.refetch = true;
    else if (!input) input = x;
    else throw new Error(`Unrecognized argument: ${x}`);
  }
  if (!input) throw new Error('Usage: node scripts/fetch-ff-dps.js <reportCode|reportUrl> [--fight id]... [--pull n]... [--phase n] [--window s] [--bin s] [--hits Job:ids]');
  const code = (input.match(/(?:fflogs\.com\/reports\/)?([a-zA-Z0-9]{16,})/) || [])[1] || input;
  const urlFight = input.match(/[?&]fight=(\d+)/);
  if (urlFight && a.fights.length === 0 && a.pulls.length === 0) a.fights.push(Number(urlFight[1]));
  return { code, ...a };
}

const args = parseArgs(process.argv.slice(2));
const auth = createNodeLogAuth({
  providerLabel: 'FFLogs',
  clientId:      'a225e605-1025-4b97-ad2f-b71347ca2e64', // must match lib/log-auth.ts's FFLogs clientId
  tokenUrl:      'https://www.fflogs.com/oauth/token',
  credsPath:     args.creds ? path.resolve(args.creds) : path.join(ROOT, '.credentials', 'ffl-token.json'),
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastResetIn = null; // seconds, from the last rateLimitData seen

// Throws a message fetch-plan.js's withRateLimitWait understands when the
// short backoff doesn't clear a 429.
async function gql(query, variables) {
  let token = await auth.getAccessToken();
  let authRetried = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch('https://www.fflogs.com/api/v2/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401 && !authRetried) { authRetried = true; token = await auth.forceRefreshAccessToken(); attempt--; continue; }
    if (res.status === 429) { await sleep(10000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`FFLogs request failed (${res.status}): ${await res.text()}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`FFLogs GraphQL error: ${json.errors[0].message}`);
    if (json.data.rateLimitData) lastResetIn = json.data.rateLimitData.pointsResetIn;
    return json.data;
  }
  const s = lastResetIn ?? 300;
  throw new Error(`FFLogs rate limit (429). Retry after ~${Math.floor(s / 60)}m ${s % 60}s.`);
}

const REPORT_QUERY = `query($code:String!){
  rateLimitData{limitPerHour pointsSpentThisHour pointsResetIn}
  reportData{report(code:$code){title code startTime
    fights(killType:Encounters){id name startTime endTime kill fightPercentage bossPercentage lastPhase phaseTransitions{id startTime} friendlyPlayers}
    phases{encounterID phases{id name isIntermission}}
    masterData(translate:true){actors{id name type subType petOwner} abilities{gameID name}}}}}`;
const TABLE_QUERY = (dataType) => `query($code:String!,$f:[Int]!,$s:Float,$e:Float){reportData{report(code:$code){table(dataType:${dataType},fightIDs:$f,startTime:$s,endTime:$e)}}}`;
const EVENTS_QUERY = `query($code:String!,$f:[Int]!,$s:Float,$e:Float,$dt:EventDataType,$src:Int,$x:String){reportData{report(code:$code){
  events(dataType:$dt,hostilityType:Friendlies,fightIDs:$f,startTime:$s,endTime:$e,sourceID:$src,filterExpression:$x,limit:10000){data nextPageTimestamp}}}}`;

async function table(dataType, fid, s, e) {
  return (await gql(TABLE_QUERY(dataType), { code: args.code, f: [fid], s, e })).reportData.report.table.data;
}
async function events(vars, fight) {
  const out = [];
  let s = vars.s ?? fight.startTime;
  while (s) {
    const ev = (await gql(EVENTS_QUERY, { code: args.code, f: [fight.id], e: fight.endTime, ...vars, s })).reportData.report.events;
    out.push(...ev.data);
    s = ev.nextPageTimestamp;
  }
  return out;
}

// DamageDone table entries trimmed to what analyze-dps.js reads.
const slimDamage = (t) => ({
  totalTime: t.totalTime,
  entries: t.entries.map((e) => ({
    name: e.name, id: e.id, type: e.type, total: e.total, activeTime: e.activeTime,
    rdps: e.totalRDPS, rdpsTaken: e.totalRDPSTaken, rdpsGiven: e.totalRDPSGiven,
    given: (e.given || []).map((g) => ({ name: g.name, total: g.total })),
    // Only the top few abilities per player come back here; per-ability
    // totals need events (--hits). See docs/dps-analysis.md.
    abilities: (e.abilities || []).map((x) => ({ name: x.name, guid: x.guid, total: x.total })),
  })),
});

async function fetchFight(meta, fight, label) {
  const pt = fight.phaseTransitions || [];
  const phaseNames = new Map((meta.phases || []).flatMap((p) => p.phases).map((p) => [p.id, p.name]));
  const phases = pt.map((p, i) => ({ phase: p.id, name: phaseNames.get(p.id) ?? `P${p.id}`, start: p.startTime, end: i + 1 < pt.length ? pt[i + 1].startTime : fight.endTime }));
  if (phases.length === 0) phases.push({ phase: 1, name: 'Whole fight', start: fight.startTime, end: fight.endTime });
  const focusId = args.phase ?? phases[phases.length - 1].phase;
  const focus = phases.find((p) => p.phase === focusId);
  if (!focus) throw new Error(`${label} never reached phase ${focusId}`);

  const out = { code: args.code, label, fight, phases, focus: { phase: focusId, start: focus.start, end: focus.end, window: args.window, bin: args.bin }, tables: {} };
  out.tables.all = slimDamage(await table('DamageDone', fight.id, fight.startTime, fight.endTime));
  for (const p of phases) out.tables[`p${p.phase}`] = slimDamage(await table('DamageDone', fight.id, p.start, p.end));
  const wEnd = Math.min(focus.start + args.window * 1000, fight.endTime);
  out.focus.windowTable = slimDamage(await table('DamageDone', fight.id, focus.start, wEnd));
  out.focus.bins = [];
  for (let b = 0; b < args.window; b += args.bin) {
    const s = focus.start + b * 1000; if (s >= fight.endTime) break;
    out.focus.bins.push({ from: b, table: slimDamage(await table('DamageDone', fight.id, s, Math.min(s + args.bin * 1000, fight.endTime))) });
  }
  out.focus.taken = await table('DamageTaken', fight.id, focus.start, wEnd);
  out.focus.debuffs = (await table('Debuffs', fight.id, focus.start, wEnd)).auras.map((a) => ({ name: a.name, guid: a.guid, uses: a.totalUses, uptime: a.totalUptime }));
  out.deaths = (await table('Deaths', fight.id, fight.startTime, fight.endTime)).entries.map((d) => ({
    name: d.name, id: d.id, type: d.type, t: d.timestamp,
    killedBy: d.damage?.abilities?.map((x) => x.name) ?? [], damageTotal: d.damage?.total ?? 0,
  }));
  out.casts = (await events({ dt: 'Casts' }, fight)).filter((e) => e.type === 'cast').map((e) => ({ t: e.timestamp, src: e.sourceID, tgt: e.targetID, ab: e.abilityGameID }));
  out.debuffEvents = (await events({ dt: 'Debuffs', x: `ability.id in (${args.debuffs})` }, fight))
    .filter((e) => e.type === 'applydebuff' || e.type === 'removedebuff')
    .map((e) => ({ t: e.timestamp, type: e.type, tgt: e.targetID, ab: e.abilityGameID }));
  out.hits = {};
  for (const h of args.hits) {
    const actor = meta.masterData.actors.find((a) => a.subType === h.job && fight.friendlyPlayers.includes(a.id));
    if (!actor) continue;
    const ev = await events({ dt: 'DamageDone', src: actor.id, x: `ability.id in (${h.ids.join(',')})` }, fight);
    out.hits[h.job] = ev.filter((e) => e.type === 'damage').map((e) => ({
      t: e.timestamp, ab: e.abilityGameID, tgt: e.targetID, amount: e.amount + (e.absorbed || 0),
      crit: e.hitType === 2, dh: !!e.directHit, multiplier: e.multiplier ?? 1,
    }));
  }
  return out;
}

async function main() {
  const outDir = path.join(ROOT, 'sampledata', 'ff', args.code, 'dps');
  fs.mkdirSync(outDir, { recursive: true });
  const data = await withRateLimitWait(() => gql(REPORT_QUERY, { code: args.code }), 'the report');
  const meta = data.reportData.report;
  writeAtomic(path.join(outDir, 'meta.json'), JSON.stringify(meta));
  const rl = data.rateLimitData;
  console.log(`${meta.title}: ${meta.fights.length} fights (API points ${rl.pointsSpentThisHour}/${rl.limitPerHour}, reset in ${Math.round(rl.pointsResetIn / 60)}m)`);

  // Per-boss pull numbers, same rule as buildFFFightLogLabels in lib/ffl-client.ts.
  const pullNo = new Map(); const counters = new Map();
  for (const f of [...meta.fights].sort((a, b) => a.startTime - b.startTime)) {
    const n = (counters.get(f.name) ?? 0) + 1; counters.set(f.name, n); pullNo.set(f.id, n);
  }
  let targets = meta.fights.filter((f) => f.endTime > f.startTime);
  if (args.fights.length) targets = targets.filter((f) => args.fights.includes(f.id));
  if (args.pulls.length) targets = targets.filter((f) => args.pulls.includes(pullNo.get(f.id)));
  if (args.kill) targets = targets.filter((f) => f.kill);
  if (args.minPhase) targets = targets.filter((f) => (f.lastPhase ?? 0) >= args.minPhase);
  if (!targets.length) { console.log('No matching fights.'); return; }

  for (const f of targets) {
    const label = `${f.name} Pull ${pullNo.get(f.id)} (fight ${f.id})`;
    const file = path.join(outDir, `fight${f.id}.json`);
    if (!args.refetch && fs.existsSync(file)) { console.log(`Skipping ${label}: already fetched`); continue; }
    process.stdout.write(`Fetching ${label}${f.kill ? ' (kill)' : ` (${f.bossPercentage}%)`}... `);
    const out = await withRateLimitWait(() => fetchFight(meta, f, label), label);
    writeAtomic(file, JSON.stringify(out));
    console.log(`${out.casts.length} casts, phases ${out.phases.map((p) => `P${p.phase} ${((p.end - p.start) / 1000).toFixed(0)}s`).join(' ')}`);
  }
}

main().catch((err) => { console.error(err.message || err); process.exit(1); });
